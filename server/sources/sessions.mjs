// Sessions on boris and their conversations, read from Claude Code's own records. Shapes: server/CONTRACT.md.
// Live sessions: `claude agents --json` and ~/.claude/sessions/<pid>.json. Conversations: the transcripts in
// ~/.claude/projects/<escaped cwd>/<sessionId>.jsonl, read once and then only their new bytes. Cost: Prometheus
// (agent-os telemetry), falling back to the transcript's own cost record. Everything is cached and refreshed on an
// interval, so a request never waits on a transcript.
import { execFile } from 'node:child_process';
import { open, readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { isSeen } from '../seen.mjs';
import { isArchived } from '../acted.mjs';

const HOME = homedir();
const PROJECTS = join(HOME, 'projects');
const TRANSCRIPTS = join(HOME, '.claude', 'projects');
const LIVE_DIR = join(HOME, '.claude', 'sessions');
const PROM = process.env.BILLBOARD_PROMETHEUS || 'http://127.0.0.2:9090';
const SINCE = Date.parse('2026-11-02T00:00:00-06:00'); // nothing from before the Nov 2 Agent OS rules
const REFRESH_MS = 10_000;
const COST_MS = 60_000;
const THREAD_MAX = 40;   // messages per thread sent to the phone, the latest ones
const TEXT_MAX = 1500;   // characters per agent message
const TZ = 'America/Chicago';

// ---------- reading one transcript, incrementally ----------

const files = new Map(); // path -> { size, mtimeMs, offset, rest, st }

function fresh(id, dir) {
  return {
    id, dir, cwd: '', title: '', aiTitle: '', firstPrompt: '', queued: '', bridge: '', startedAt: 0, lastAt: 0,
    thread: [], toolCalls: 0, pending: new Map(), prs: new Map(), merged: new Set(), mergeTries: new Map(),
    branch: '', lastText: '', lastTextAt: 0, turnEndedAt: 0, lastBenAt: 0, costState: null, hits: {}
  };
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
}
function resultText(b) {
  return typeof b.content === 'string' ? b.content : Array.isArray(b.content) ? b.content.map((x) => x.text || '').join('\n') : '';
}

function pushTools(st, at) {
  const last = st.thread[st.thread.length - 1];
  if (last && last.who === 'tools') { last.n++; last.last = at; }
  else st.thread.push({ who: 'tools', n: 1, first: at, last: at });
}

function noteCommand(st, cmd) {
  for (const m of cmd.matchAll(/\/home\/ben\/projects\/([\w.-]+)/g)) st.hits[m[1]] = (st.hits[m[1]] || 0) + 1;
  const b = /git\s+(?:worktree\s+add\b[^;&|]*?\s-b|checkout\s+-b|switch\s+-c)\s+([^\s;&|]+)/.exec(cmd);
  if (b) st.branch = b[1];
}

function apply(st, r) {
  const at = r.timestamp ? Date.parse(r.timestamp) : 0;
  if (at) { if (!st.startedAt) st.startedAt = at; if (at > st.lastAt) st.lastAt = at; }
  switch (r.type) {
    case 'custom-title': if (r.customTitle) st.title = r.customTitle; return;
    case 'ai-title': if (r.aiTitle) st.aiTitle = r.aiTitle; return;
    case 'bridge-session': if (r.bridgeSessionId) st.bridge = r.bridgeSessionId.replace(/^cse_/, 'session_'); return;
    case 'relocated': if (r.relocatedCwd) st.cwd = r.relocatedCwd; return;
    case 'cost-state': if (typeof r.totalCostUSD === 'number') st.costState = r.totalCostUSD; return;
    case 'pr-link': if (r.prNumber) st.prs.set(r.prNumber, { n: r.prNumber, url: r.prUrl || '', repo: r.prRepository || '', at }); return;
    case 'queue-operation': if (!st.queued && r.operation === 'enqueue' && typeof r.content === 'string') st.queued = r.content.trim(); return;
    case 'user': case 'assistant': break;
    default: return;
  }
  if (r.isSidechain) return;
  if (!st.cwd && r.cwd) st.cwd = r.cwd;
  if (r.gitBranch && !st.branch && !/^(main|master|HEAD)$/.test(r.gitBranch) && !/bridge-cse/.test(r.gitBranch)) st.branch = r.gitBranch;
  const content = r.message && r.message.content;

  if (r.type === 'user') {
    if (Array.isArray(content)) {
      for (const b of content) {
        if (b.type !== 'tool_result') continue;
        st.pending.delete(b.tool_use_id);
        const pr = st.mergeTries.get(b.tool_use_id);
        if (pr) {
          st.mergeTries.delete(b.tool_use_id);
          if (!b.is_error && !/not mergeable|could not|failed|error/i.test(resultText(b))) st.merged.add(pr);
        }
      }
    }
    const kind = r.origin && r.origin.kind;
    if (r.isMeta || r.isCompactSummary || r.isVisibleInTranscriptOnly || (kind && kind !== 'human')) return;
    if (Array.isArray(content) && content.some((b) => b.type === 'tool_result')) return;
    const text = textOf(content).replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim();
    if (!text || (!kind && text.startsWith('<'))) return;
    if (!st.firstPrompt && /\S+\s+\S+\s+\S+/.test(text)) st.firstPrompt = text;
    st.lastBenAt = at;
    st.turnEndedAt = 0;
    st.thread.push({ who: 'ben', at, text: text.slice(0, TEXT_MAX) });
    return;
  }

  // assistant: one record per content block
  for (const b of Array.isArray(content) ? content : []) {
    if (b.type === 'text' && b.text && b.text.trim()) {
      st.thread.push({ who: 'agent', text: b.text.trim() });
      st.lastText = b.text.trim();
      st.lastTextAt = at;
    } else if (b.type === 'tool_use') {
      st.toolCalls++;
      st.pending.set(b.id, { name: b.name, input: b.input || {}, at });
      pushTools(st, at);
      const cmd = b.input && typeof b.input.command === 'string' ? b.input.command : '';
      if (cmd) {
        noteCommand(st, cmd);
        const m = /gh\s+pr\s+merge\s+(\d+)/.exec(cmd);
        if (m) st.mergeTries.set(b.id, Number(m[1]));
      }
      if (b.name && /merge_pull_request$/.test(b.name) && b.input && b.input.pullNumber) st.mergeTries.set(b.id, Number(b.input.pullNumber));
    }
  }
  if (r.message && r.message.stop_reason === 'end_turn') { st.turnEndedAt = at; st.pending.clear(); }
}

async function readTranscript(path, id, dir) {
  const s = await stat(path);
  let f = files.get(path);
  if (f && f.size === s.size && f.mtimeMs === s.mtimeMs) return f.st;
  if (!f || s.size < f.offset) { f = { offset: 0, rest: '', st: fresh(id, dir) }; files.set(path, f); }
  const fh = await open(path, 'r');
  try {
    const len = s.size - f.offset;
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, f.offset);
    const chunk = f.rest + buf.toString('utf8');
    const lines = chunk.split('\n');
    f.rest = lines.pop();
    for (const line of lines) {
      if (!line) continue;
      try { apply(f.st, JSON.parse(line)); } catch { /* a line being written */ }
    }
    f.offset = s.size;
  } finally { await fh.close(); }
  f.size = s.size; f.mtimeMs = s.mtimeMs;
  return f.st;
}

// Main-session transcripts under ~/.claude/projects/-home-ben-projects-*; subagents live in subfolders and are skipped.
async function scanTranscripts() {
  const out = new Map();
  let dirs = [];
  try { dirs = await readdir(TRANSCRIPTS); } catch { return out; }
  for (const d of dirs) {
    if (!d.startsWith('-home-ben-projects')) continue;
    let names = [];
    try { names = await readdir(join(TRANSCRIPTS, d)); } catch { continue; }
    for (const n of names) {
      if (!n.endsWith('.jsonl')) continue;
      const path = join(TRANSCRIPTS, d, n);
      try {
        const s = await stat(path);
        if (s.mtimeMs < SINCE) continue;
        out.set(n.slice(0, -6), await readTranscript(path, n.slice(0, -6), d));
      } catch { /* gone meanwhile */ }
    }
  }
  return out;
}

// ---------- live sessions ----------

function run(cmd, args) {
  return new Promise((resolve) => execFile(cmd, args, { timeout: 5000, maxBuffer: 1 << 22 }, (err, stdout) => resolve(err ? '' : stdout)));
}

async function liveSessions() {
  const live = new Map();
  let list = [];
  try { list = JSON.parse(await run('claude', ['agents', '--json']) || '[]'); } catch { list = []; }
  for (const a of list) {
    if (!a || !a.sessionId) continue;
    let extra = {};
    try { extra = JSON.parse(await readFile(join(LIVE_DIR, `${a.pid}.json`), 'utf8')); } catch { /* ended meanwhile */ }
    live.set(a.sessionId, {
      cwd: a.cwd || extra.cwd || '', status: extra.status || a.status || '', kind: a.kind || extra.kind || '',
      bridge: extra.bridgeSessionId || '', startedAt: extra.startedAt || a.startedAt || 0, statusAt: extra.statusUpdatedAt || 0
    });
  }
  return live;
}

// ---------- cost and merged PRs from Prometheus ----------

let promCache = { at: 0, cost: new Map(), merged: new Map() };
async function promQuery(q) {
  const res = await fetch(`${PROM}/api/v1/query?query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(3000) });
  const j = await res.json();
  return j.status === 'success' ? j.data.result : [];
}
async function refreshProm() {
  if (Date.now() - promCache.at < COST_MS) return promCache;
  try {
    const [cost, prs] = await Promise.all([
      promQuery('sum by (session_id) (last_over_time(claude_code_cost_usage_USD_total[45d]))'),
      promQuery('last_over_time(agent_os_session_pr[45d])')
    ]);
    const c = new Map(), m = new Map();
    for (const r of cost) c.set(r.metric.session_id, Number(r.value[1]));
    for (const r of prs) {
      const id = r.metric.session_id;
      if (!m.has(id)) m.set(id, new Set());
      m.get(id).add(Number(r.metric.pr));
    }
    promCache = { at: Date.now(), cost: c, merged: m };
  } catch { promCache.at = Date.now() - COST_MS / 2; /* telemetry down: keep what we had, try again soon */ }
  return promCache;
}

// ---------- PR states from GitHub, for PRs a session opened and didn't merge itself ----------

const prStates = new Map(); // 'owner/repo#n' -> { state: 'OPEN'|'MERGED'|'CLOSED', at }
let prQueue = [], prRunning = 0;
function checkPrs(keys) {
  for (const k of keys) {
    const c = prStates.get(k);
    if ((c && Date.now() - c.at < (c.state === 'OPEN' ? 300_000 : 86_400_000)) || prQueue.includes(k)) continue;
    prQueue.push(k);
  }
  while (prRunning < 4 && prQueue.length) {
    const k = prQueue.shift(), [repo, n] = k.split('#');
    prRunning++;
    run('gh', ['pr', 'view', n, '-R', repo, '--json', 'state', '-q', '.state']).then((out) => {
      const state = out.trim();
      if (state) prStates.set(k, { state, at: Date.now() });
      else prStates.set(k, { state: (prStates.get(k) || {}).state || '', at: Date.now() });
    }).finally(() => { prRunning--; checkPrs([]); });
  }
}

// ---------- reading the agent's last words ----------

function plain(md) {
  return md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|__|`/g, '').replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '').replace(/\n{2,}/g, '\n').trim();
}

const HEADS = [
  ['works', /^(what works( now)?|works now|what('|’)s live|done)$/i],
  ['left', /^(what('|’)s left|what is left|left|still (open|to do)|not done( yet)?)$/i],
  ['needs', /^(what needs (ben|you)|needs (ben|you)|for you|your (call|turn)|questions?( for you)?)$/i]
];
function headOf(line) {
  const m = /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?([^*:\n]{2,40})(?:\*\*|__)?\s*:?\s*(?:\*\*|__)?\s*(?::\s*)?(.*)$/.exec(line);
  if (!m) return null;
  const bold = /^\s*(#{1,4}\s|\*\*|__)/.test(line);
  const label = m[1].trim().replace(/[.:]$/, '');
  for (const [key, re] of HEADS) if (re.test(label) && (bold || /:/.test(line))) return { key, rest: m[2].trim(), label };
  if (bold && /^\s*(\*\*|__)[^*]+[:.]?(\*\*|__)/.test(line)) return { key: 'other', rest: '', label };
  if (/:/.test(line) && /^(sources?|links?|notes?|p\.?s\.?)$/i.test(label)) return { key: 'other', rest: '', label };
  return null;
}

// The report: "What works now / What's left / Needs Ben" sections, however the agent styled them. Null without them.
export function parseReport(text) {
  if (!text) return null;
  const out = { works: [], left: [], needs: [] }, lead = [];
  let cur = null, any = false, questions = false;
  for (const line of text.split('\n')) {
    const h = headOf(line);
    if (h) {
      cur = h.key === 'other' ? null : h.key;
      if (cur) { any = true; if (/question/i.test(h.label)) questions = true; if (h.rest) out[cur].push(h.rest); }
      continue;
    }
    if (cur) out[cur].push(line); else if (!any) lead.push(line);
  }
  if (!any) return null;
  const r = { works: plain(out.works.join('\n')), left: plain(out.left.join('\n')), needs: plain(out.needs.join('\n')), lead: plain(lead.join('\n')), questions };
  if (questions) { const q = parseQuestion(out.needs.join('\n')); if (q) r.needs = q.length === 1 ? 'A question.' : `${q.length} questions.`; }
  for (const k of ['left', 'needs']) if (/^(nothing|none|no(thing)? (left|needed))\b/i.test(r[k])) r[k] = '';
  return r;
}

const YESNO = /^(should|shall|do|does|did|is|are|can|could|will|would|want|ok|okay)\b/i;
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function optsFor(q) {
  const m = /^(?:should|shall|do|can|could|will|would)\s+(?:i|we|you)\s+(.+?),?\s+or\s+(.+?)\?$/i.exec(q);
  if (m) return [cap(m[1]), cap(m[2])];
  return YESNO.test(q) ? ['Yes', 'No'] : [];
}
function pickFor(opts, rest) {
  const m = /(?:my pick|i('|’)d pick|i recommend|i('|’)d go with)\s*(?:is|:)?\s*([^.;]+)/i.exec(rest);
  if (!m || !opts.length) return 0;
  const said = m[3].toLowerCase();
  if (opts[0] === 'Yes') return /^\s*no\b/.test(said) ? 1 : 0;
  let best = 0, score = -1;
  opts.forEach((o, i) => {
    const s = o.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && said.includes(w)).length;
    if (s > score) { score = s; best = i; }
  });
  return best;
}

// The question: a numbered list in the agent's last words, either options under a question, or numbered questions.
export function parseQuestion(text) {
  if (!text || !text.includes('?')) return null;
  const lines = text.split('\n');
  const parts = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*1[.)]\s+/.test(lines[i])) continue;
    const items = [];
    let j = i;
    for (; j < lines.length; j++) {
      const m = /^\s*(\d+)[.)]\s+(.*)$/.exec(lines[j]);
      if (m) items.push(plain(m[2]));
      else if (lines[j].trim() && /^\s{2,}/.test(lines[j]) && items.length) items[items.length - 1] += ' ' + plain(lines[j]);
      else if (lines[j].trim()) break;
    }
    let k = i - 1;
    while (k >= 0 && !lines[k].trim()) k--;
    const above = k >= 0 ? plain(lines[k]) : '';
    if (items.some((x) => x.includes('?'))) {
      for (const it of items) {
        const q = it.slice(0, it.indexOf('?') + 1) || it;
        const rest = it.slice(q.length);
        const lettered = rest.split(/(?:^|\s)[a-e][.)]\s+/).slice(1).map((x) => x.trim()).filter(Boolean);
        if (lettered.length >= 2) {
          const pick = lettered.findIndex((x) => /\bmy pick\b/i.test(x));
          parts.push({ q, opts: lettered.map((x) => x.replace(/\s*my pick\.?/i, '').trim()), pick: pick < 0 ? 0 : pick });
        } else {
          const opts = optsFor(q);
          parts.push({ q, opts, pick: pickFor(opts, rest) });
        }
      }
    } else if (above.endsWith('?')) {
      let pick = items.findIndex((x) => /(my|agent('|’)s) pick|recommended|\(pick\)/i.test(x));
      parts.push({ q: above, opts: items.map((x) => x.replace(/\s*\(?(my pick|recommended)\)?\.?/i, '').trim()), pick: pick < 0 ? 0 : pick });
    }
    i = j - 1;
  }
  return parts.length ? parts : null;
}

// ---------- shaping a session ----------

const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const fmtDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtWeekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' });
const fmtDate = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });
function since(ms, now = Date.now()) {
  if (!ms) return '';
  const days = Math.round((Date.parse(fmtDay.format(now)) - Date.parse(fmtDay.format(ms))) / 86_400_000);
  if (days <= 0) return fmtTime.format(ms);
  if (days === 1) return `${fmtTime.format(ms)} yesterday`;
  if (days < 7) return fmtWeekday.format(ms);
  return fmtDate.format(ms);
}

function projectOf(cwd, hits) {
  const m = /^\/home\/ben\/projects\/([^/]+)/.exec(cwd || '');
  if (m) return m[1];
  if (cwd === PROJECTS) {
    const best = Object.entries(hits).sort((a, b) => b[1] - a[1])[0];
    if (best) return best[0];
  }
  return '';
}

function titleOf(st) {
  if (st.title && !/^bridge-cse/i.test(st.title)) return st.title;
  if (st.aiTitle) return st.aiTitle;
  const lines = (st.firstPrompt || st.queued).split('\n').map((l) => plain(l)).filter(Boolean);
  const t = lines.find((l) => /\S+\s+\S+\s+\S+/.test(l)) || lines[0] || '';
  if (!t) return 'Untitled session';
  if (t.length <= 60) return t;
  return t.slice(0, 60).replace(/\s+\S*$/, '') + '…';
}

function doingNow(p) {
  if (!p) return 'Thinking';
  const i = p.input || {};
  const file = i.file_path || i.notebook_path || i.path;
  switch (p.name) {
    case 'Bash': return i.description || 'Running a command';
    case 'Edit': case 'Write': case 'NotebookEdit': return file ? `Editing ${basename(file)}` : 'Editing a file';
    case 'Read': return file ? `Reading ${basename(file)}` : 'Reading';
    case 'Grep': case 'Glob': return 'Searching the code';
    case 'Agent': case 'Task': return i.description ? `A helper: ${i.description}` : 'Running a helper';
    case 'WebFetch': case 'WebSearch': return 'Reading the web';
    case 'Artifact': return 'Working on an artifact';
    default: return p.name ? `Using ${p.name.replace(/^mcp__[^_]+(_[^_]+)*__/, '').replace(/_/g, ' ')}` : 'Working';
  }
}

function jobOf(p) {
  const cmd = p && p.input && typeof p.input.command === 'string' ? p.input.command : '';
  if (/gh\s+pr\s+checks\b.*--watch/.test(cmd)) return 'Secret scan';
  if (/gh\s+run\s+watch\b/.test(cmd)) return 'Deploying';
  if (/eas\s+build\b/.test(cmd)) return 'EAS build';
  if (/eas\s+submit\b/.test(cmd)) return 'TestFlight';
  return '';
}

function first(s) { const m = /^[^\n]*?[.!?](\s|$)/.exec(s); return (m ? m[0] : s.split('\n')[0]).trim(); }
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

let helpersCache = new Map();
async function helpersOf(st) {
  // subagent transcripts written in the last two minutes
  const dir = join(TRANSCRIPTS, st.dir, st.id, 'subagents');
  let n = 0;
  const walk = async (d, depth) => {
    let ents = [];
    try { ents = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory() && depth < 3) await walk(p, depth + 1);
      else if (e.name.startsWith('agent-') && e.name.endsWith('.jsonl')) {
        try { if (Date.now() - (await stat(p)).mtimeMs < 120_000) n++; } catch { /* gone */ }
      }
    }
  };
  await walk(dir, 0);
  helpersCache.set(st.id, n);
  return n;
}

function foldThread(st, live) {
  const out = st.thread.map((m) => {
    if (m.who === 'tools') return { who: 'tools', n: m.n, mins: Math.max(0, Math.round((m.last - m.first) / 60_000)) };
    if (m.who === 'ben') return { who: 'ben', at: since(m.at), text: m.text };
    return { who: 'agent', text: m.text.length > TEXT_MAX ? m.text.slice(0, TEXT_MAX).replace(/\s+\S*$/, '') + '…' : m.text };
  });
  const lastTools = out[out.length - 1];
  if (live && lastTools && lastTools.who === 'tools') lastTools.live = true;
  // the agent's last words, when they are a report, become the report card
  for (let k = out.length - 1; k >= 0; k--) {
    if (out[k].who !== 'agent') continue;
    const r = st.turnEndedAt ? parseReport(st.lastText) : null;
    if (r && st.thread[k].text === st.lastText) {
      const card = { who: 'report', works: r.works, left: r.left, needs: r.needs };
      out.splice(k, 1, ...(r.lead ? [{ who: 'agent', text: r.lead }] : []), card);
    }
    break;
  }
  if (out.length <= THREAD_MAX) return out;
  const tail = out.slice(-THREAD_MAX);
  const opening = out.find((m) => m.who === 'ben');
  return opening && !tail.includes(opening) ? [opening, ...tail] : tail;
}

function build(st, liveInfo, prom, helpers, now) {
  const cwd = (liveInfo && liveInfo.cwd) || st.cwd;
  const app = projectOf(st.cwd || cwd, st.hits) || projectOf(cwd, st.hits);
  const cse = /bridge-cse[_-]([A-Za-z0-9]+)/.exec(cwd) || /bridge-cse[_-]([A-Za-z0-9]+)/.exec(st.dir);
  const bridge = (liveInfo && liveInfo.bridge) || st.bridge || (cse ? `session_${cse[1]}` : '');
  const merged = new Set([...st.merged, ...((prom.merged.get(st.id)) || [])]);
  const opened = [...st.prs.values()].sort((a, b) => a.at - b.at);
  for (const p of opened) if (p.repo && (prStates.get(`${p.repo}#${p.n}`) || {}).state === 'MERGED') merged.add(p.n);
  const open = opened.filter((p) => !merged.has(p.n) && (prStates.get(`${p.repo}#${p.n}`) || {}).state !== 'CLOSED');
  checkPrs(open.filter((p) => p.repo).map((p) => `${p.repo}#${p.n}`));
  const ended = !liveInfo || liveInfo.status !== 'busy';
  const report = st.turnEndedAt || ended ? parseReport(st.lastText) : null;
  const question = ended ? parseQuestion(st.lastText) : null;
  const pending = [...st.pending.values()].pop();
  const endedAt = st.turnEndedAt || st.lastTextAt || st.lastAt;
  const cost = prom.cost.has(st.id) ? Math.round(prom.cost.get(st.id) * 100) / 100 : st.costState != null ? Math.round(st.costState * 100) / 100 : null;
  const s = { id: st.id, app, title: titleOf(st), state: 'done', doing: '', cost, branch: st.branch || '', item: '', url: bridge ? `https://claude.ai/code/${bridge}` : null };

  if (liveInfo && liveInfo.status === 'busy') {
    const job = jobOf(pending);
    s.state = job ? 'job' : 'working';
    if (job) s.job = job;
    s.mins = Math.max(0, Math.round((now - (st.lastBenAt || liveInfo.statusAt || st.startedAt)) / 60_000));
    s.doing = job ? `${job}${open.length ? ` on PR #${open[open.length - 1].n}` : ''}, ${Math.max(0, Math.round((now - pending.at) / 60_000))} min in` : doingNow(pending);
    s.helpers = helpers;
  } else {
    s.since = since(endedAt, now);
    const needs = report && report.needs;
    const waiting = liveInfo && liveInfo.status && liveInfo.status !== 'idle';
    if (liveInfo && (question || needs || waiting)) {
      s.state = 'ben';
      s.doing = waiting && !question && !needs ? 'Waiting on you in the Claude app'
        : question ? `Asked you ${plural(question.length, 'question', 'questions')}` : first(needs);
    } else if (open.length || (report && report.left) || (st.branch && !opened.length && !merged.size && liveInfo)) {
      s.state = 'paused';
      const bits = [];
      if (open.length) bits.push(`${open.length === 1 ? 'PR' : 'PRs'} ${open.map((p) => '#' + p.n).join(', ')} still open`);
      if (report && report.left) bits.push(`What’s left: ${first(report.left)}`);
      if (!bits.length) bits.push(`Branch ${st.branch} not merged`);
      s.doing = bits.join('; ');
    } else {
      const m = [...merged].sort((a, b) => a - b);
      s.doing = m.length ? `${m.length === 1 ? 'PR' : 'PRs'} ${m.map((n) => '#' + n).join(', ')} merged, nothing left` : 'Answered, no PR, nothing left';
      if (!liveInfo && (question || (report && report.needs))) s.doing = 'Ended on a question to you';
    }
  }
  // what items.mjs joins on: not part of the Session shape the page reads
  const facts = {
    id: st.id, app, cwd, live: !!liveInfo, status: liveInfo ? liveInfo.status : 'ended', startedAt: st.startedAt, lastAt: st.lastAt,
    turnEndedAt: st.turnEndedAt || null, toolCalls: st.toolCalls, prsOpened: opened.map((p) => ({ n: p.n, url: p.url, repo: p.repo })),
    prsMerged: [...merged], report: report ? { works: report.works, left: report.left, needs: report.needs } : null,
    question: question ? { asked: since(endedAt, now), parts: question } : null, lastText: st.lastText
  };
  return { s, facts, at: Math.max(st.lastAt, liveInfo ? liveInfo.statusAt : 0), doneAt: endedAt };
}

// ---------- the cache ----------

let cache = null, building = null;
async function rebuild() {
  const [live, transcripts, prom] = await Promise.all([liveSessions(), scanTranscripts(), refreshProm()]);
  const now = Date.now();
  const rows = [];
  for (const [id, st] of transcripts) {
    const li = live.get(id);
    if (!st.firstPrompt && !st.queued && !st.lastText) continue;          // nothing said yet
    const cwd = (li && li.cwd) || st.cwd;
    if (!projectOf(st.cwd || cwd, st.hits) && !projectOf(cwd, st.hits)) continue; // not a project's session
    if (!li && st.lastAt < SINCE) continue;
    const helpers = li && li.status === 'busy' ? await helpersOf(st) : 0;
    rows.push(build(st, li, prom, helpers, now));
  }
  const order = { working: 0, job: 1, ben: 2, paused: 3, done: 4 };
  rows.sort((a, b) => order[a.s.state] - order[b.s.state] || b.at - a.at);
  const threads = {};
  for (const r of rows) threads[r.s.id] = foldThread(transcripts.get(r.s.id), r.s.state === 'working' || r.s.state === 'job');
  cache = { at: now, sessions: rows.map((r) => r.s), threads, facts: Object.fromEntries(rows.map((r) => [r.s.id, r.facts])), doneAt: new Map(rows.map((r) => [r.s.id, r.doneAt])) };
  return cache;
}
function refresh() {
  if (!building) building = rebuild().catch((err) => { console.error('sessions:', err); return cache; }).finally(() => { building = null; });
  return building;
}
async function current() {
  if (!cache) return (await refresh()) || { sessions: [], threads: {}, facts: {} };
  if (Date.now() - cache.at > REFRESH_MS) refresh();
  return cache;
}
setInterval(refresh, REFRESH_MS).unref();
refresh();

// unseen is read at request time from server/seen.mjs, so a session opened a moment ago leaves Done at once.
export async function getSessions() {
  const c = await current();
  return structuredClone(c.sessions).filter((s) => !isArchived(s.id)).map((s) => {
    if (s.state === 'done') s.unseen = !isSeen(s.id, c.doneAt?.get(s.id));
    return s;
  });
}
// server/act.mjs calls this after starting a session.
export function refreshSessions() { return refresh(); }
export async function getThreads() { return structuredClone((await current()).threads); }
// For items.mjs: per session id, what it opened and merged, its report and question, its cwd and when its turn ended.
export async function getSessionFacts() { return structuredClone((await current()).facts); }
