// Sessions on boris and their conversations, read from Claude Code's own records and what agents declared (server/declared.mjs).
// Billboard shows what Claude Code recorded and never reads meaning out of an agent's words or commands. Shapes: server/CONTRACT.md.
// Live sessions: `claude agents --json` and ~/.claude/sessions/<pid>.json. Conversations: the transcripts in
// ~/.claude/projects/<escaped cwd>/<sessionId>.jsonl, read once and then only their new bytes. Cost: Prometheus
// (agent-os telemetry), falling back to the transcript's own cost record. Everything is cached and refreshed on an
// interval, so a request never waits on a transcript.
import { execFile } from 'node:child_process';
import { open, readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { isSeen } from '../seen.mjs';
import { isArchived } from '../acted.mjs';
import { readDeclared, reportOf } from '../declared.mjs';

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
    thread: [], branch: '', turnEndedAt: 0, lastBenAt: 0, costState: null
  };
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
}
function pushTools(st, at) {
  const last = st.thread[st.thread.length - 1];
  if (last && last.who === 'tools') { last.n++; last.last = at; }
  else st.thread.push({ who: 'tools', n: 1, first: at, last: at });
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
    case 'queue-operation': if (!st.queued && r.operation === 'enqueue' && typeof r.content === 'string') st.queued = r.content.trim(); return;
    case 'user': case 'assistant': break;
    default: return;
  }
  if (r.isSidechain) return;
  if (!st.cwd && r.cwd) st.cwd = r.cwd;
  if (r.gitBranch && !st.branch && !/^(main|master|HEAD)$/.test(r.gitBranch) && !/bridge-cse/.test(r.gitBranch)) st.branch = r.gitBranch;
  const content = r.message && r.message.content;

  if (r.type === 'user') {
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
    } else if (b.type === 'tool_use') {
      pushTools(st, at);
    }
  }
  if (r.message && r.message.stop_reason === 'end_turn') st.turnEndedAt = at;
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

// ---------- cost from Prometheus ----------

let promCache = { at: 0, cost: new Map() };
async function promQuery(q) {
  const res = await fetch(`${PROM}/api/v1/query?query=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(3000) });
  const j = await res.json();
  return j.status === 'success' ? j.data.result : [];
}
async function refreshProm() {
  if (Date.now() - promCache.at < COST_MS) return promCache;
  try {
    const cost = await promQuery('sum by (session_id) (last_over_time(claude_code_cost_usage_USD_total[45d]))');
    const c = new Map();
    for (const r of cost) c.set(r.metric.session_id, Number(r.value[1]));
    promCache = { at: Date.now(), cost: c };
  } catch { promCache.at = Date.now() - COST_MS / 2; /* telemetry down: keep what we had, try again soon */ }
  return promCache;
}

// ---------- shaping a session ----------

function plain(md) {
  return md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|__|`/g, '').replace(/^#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '').replace(/\n{2,}/g, '\n').trim();
}

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

function projectOf(cwd) {
  const m = /^\/home\/ben\/projects\/([^/]+)/.exec(cwd || '');
  return m ? m[1] : '';
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

function foldThread(st, live, decl) {
  const out = st.thread.map((m) => {
    if (m.who === 'tools') return { who: 'tools', n: m.n, mins: Math.max(0, Math.round((m.last - m.first) / 60_000)) };
    if (m.who === 'ben') return { who: 'ben', at: since(m.at), text: m.text };
    return { who: 'agent', text: m.text.length > TEXT_MAX ? m.text.slice(0, TEXT_MAX).replace(/\s+\S*$/, '') + '…' : m.text };
  });
  const lastTools = out[out.length - 1];
  if (live && lastTools && lastTools.who === 'tools') lastTools.live = true;
  // the report the agent declared at the end of its turn, as a card
  if (decl && decl.terminal && decl.terminal.report) out.push({ who: 'report', ...reportOf(decl.terminal) });
  if (out.length <= THREAD_MAX) return out;
  const tail = out.slice(-THREAD_MAX);
  const opening = out.find((m) => m.who === 'ben');
  return opening && !tail.includes(opening) ? [opening, ...tail] : tail;
}

function build(st, liveInfo, prom, helpers, decl, now) {
  const cwd = (liveInfo && liveInfo.cwd) || st.cwd;
  const app = projectOf(st.cwd || cwd) || projectOf(cwd);
  const cse = /bridge-cse[_-]([A-Za-z0-9]+)/.exec(cwd) || /bridge-cse[_-]([A-Za-z0-9]+)/.exec(st.dir);
  const bridge = (liveInfo && liveInfo.bridge) || st.bridge || (cse ? `session_${cse[1]}` : '');
  const status = liveInfo ? liveInfo.status : '', busy = status === 'busy';
  const t = decl ? decl.terminal : null;
  const endedAt = (t && Date.parse(t.at)) || st.turnEndedAt || st.lastAt;
  const cost = prom.cost.has(st.id) ? Math.round(prom.cost.get(st.id) * 100) / 100 : st.costState != null ? Math.round(st.costState * 100) / 100 : null;
  const s = { id: st.id, app, title: titleOf(st), state: 'done', doing: '', cost, branch: st.branch || '', item: '', url: bridge ? `https://claude.ai/code/${bridge}` : null };

  if (busy) {
    s.state = 'working';
    s.mins = Math.max(0, Math.round((now - (st.lastBenAt || liveInfo.statusAt || st.startedAt)) / 60_000));
    s.doing = (decl && decl.working && decl.working.doing) || 'Working';
    s.helpers = helpers;
  } else {
    s.since = since(endedAt, now);
    if (status && status !== 'idle') { s.state = 'ben'; s.doing = 'Waiting on you in the Claude app'; }
    else if (t && t.kind === 'ask') { s.state = 'ben'; s.doing = t.questions ? `Asked you ${plural(t.questions.length, 'question', 'questions')}` : t.action.text; }
    else if (t && t.kind === 'waiting') {
      if (liveInfo) { s.state = 'job'; s.job = t.on; s.doing = `Waiting on ${t.on}`; }
      else { s.state = 'paused'; s.doing = `Waiting on ${t.on}, but it isn’t running`; }
    }
    else if (t && t.kind === 'done') {
      const r = t.report || {};
      if (r.left) { s.state = 'paused'; s.doing = `What’s left: ${r.left}`; } else s.doing = r.works || '';
    } else if (decl) { s.state = 'paused'; s.doing = 'Turn ended without a status'; }
  }
  return { s, at: Math.max(st.lastAt, liveInfo ? liveInfo.statusAt : 0), doneAt: endedAt };
}

// ---------- the cache ----------

let cache = null, building = null;
async function rebuild() {
  const [live, transcripts, prom, declared] = await Promise.all([liveSessions(), scanTranscripts(), refreshProm(), readDeclared()]);
  const now = Date.now();
  const rows = [];
  for (const [id, st] of transcripts) {
    const li = live.get(id);
    if (!st.firstPrompt && !st.queued && !st.thread.length) continue;     // nothing said yet
    const cwd = (li && li.cwd) || st.cwd;
    if (!projectOf(st.cwd || cwd) && !projectOf(cwd)) continue;           // not a project's session
    if (!li && st.lastAt < SINCE) continue;
    const helpers = li && li.status === 'busy' ? await helpersOf(st) : 0;
    rows.push(build(st, li, prom, helpers, declared.get(id), now));
  }
  const order = { working: 0, job: 1, ben: 2, paused: 3, done: 4 };
  rows.sort((a, b) => order[a.s.state] - order[b.s.state] || b.at - a.at);
  const threads = {};
  for (const r of rows) threads[r.s.id] = foldThread(transcripts.get(r.s.id), r.s.state === 'working', declared.get(r.s.id));
  cache = { at: now, sessions: rows.map((r) => r.s), threads, declared: new Set(declared.keys()), doneAt: new Map(rows.map((r) => [r.s.id, r.doneAt])) };
  return cache;
}
function refresh() {
  if (!building) building = rebuild().catch((err) => { console.error('sessions:', err); return cache; }).finally(() => { building = null; });
  return building;
}
async function current() {
  if (!cache) return (await refresh()) || { sessions: [], threads: {}, declared: new Set() };
  if (Date.now() - cache.at > REFRESH_MS) refresh();
  return cache;
}
setInterval(refresh, REFRESH_MS).unref();
refresh();

// unseen is read at request time from server/seen.mjs, so a session opened a moment ago leaves Done at once.
// A session from before the tools declared nothing, so it never lands in Done.
export async function getSessions() {
  const c = await current();
  return structuredClone(c.sessions).filter((s) => !isArchived(s.id)).map((s) => {
    if (s.state === 'done') s.unseen = !!c.declared?.has(s.id) && !isSeen(s.id, c.doneAt?.get(s.id));
    return s;
  });
}
// server/act.mjs calls this after starting a session.
export function refreshSessions() { return refresh(); }
export async function getThreads() { return structuredClone((await current()).threads); }
