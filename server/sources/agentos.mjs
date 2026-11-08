// Agent OS: rules, evals, skills, permissions, memories, each part's use, and the rules versions, read from boris.
// Sources: the agent-os checkout (rules, skills, eval cases, eval history, git log), ~/.claude (settings, memories,
// transcripts) and Prometheus (the labels service's per-session rows and Claude Code's cost). Everything is built in the
// background and cached; a request returns the last build at once. Shapes: server/CONTRACT.md.
import { execFile } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const AGENT_OS = process.env.AGENT_OS_DIR || '/home/ben/projects/agent-os';
const CLAUDE = process.env.CLAUDE_DIR || join(homedir(), '.claude');
const PROM = process.env.PROMETHEUS_URL || 'http://127.0.0.2:9090';
const REFRESH_MS = 5 * 60 * 1000;
const DAY = 86400000;

// ---- small helpers ----
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(ms) {
  const d = new Date(ms), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  return MONTHS[d.getMonth()] + ' ' + d.getDate();
}
function shortDate(ms) { const d = new Date(ms); return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
function pct(x) { return x == null || Number.isNaN(x) ? null : Math.round(x * 100); }
function money(x) { return '$' + x.toFixed(2); }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function noLite(s) {
  s = s.replace(/Agent OS lite/gi, 'Agent OS').replace(/\blite\b ?/gi, '').replace(/^Agent OS: /, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function plain(s) { return s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(); }
async function git(...args) {
  try { return (await run('git', ['-C', AGENT_OS, ...args], { maxBuffer: 16 << 20 })).stdout; } catch { return ''; }
}
async function readText(path) { try { return await readFile(path, 'utf8'); } catch { return null; } }
async function dirs(path) { try { return (await readdir(path, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort(); } catch { return []; } }
function judgeName(m) {
  const x = /claude-([a-z]+)-(\d+)-(\d+)/.exec(m || '');
  return x ? x[1][0].toUpperCase() + x[1].slice(1) + ' ' + x[2] + '.' + x[3] : (m || '—');
}

// Frontmatter: top-level `key: value` lines, plus `type` under `metadata:`. Enough for SKILL.md and memory files.
function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text || '');
  const out = {};
  if (!m) return { data: out, body: text || '' };
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const kv = /^(\s*)([A-Za-z_-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    let [, indent, key, val] = kv;
    if (val === '>' || val === '|' || val === '>-' || val === '|-') {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]) && lines[i + 1].length - lines[i + 1].trimStart().length > indent.length) parts.push(lines[++i].trim());
      val = parts.join(val[0] === '>' ? ' ' : '\n');
    }
    val = val.replace(/^"(.*)"$/, (_, s) => s.replace(/\\"/g, '"')).replace(/^'(.*)'$/, '$1');
    if (!indent && !(key in out)) out[key] = val;
    else if (indent && key === 'type' && !out.type) out.type = val;
  }
  return { data: out, body: text.slice(m[0].length) };
}

// ---- Prometheus ----
async function prom(query) {
  try {
    const r = await fetch(PROM + '/api/v1/query?query=' + encodeURIComponent(query), { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    return j.status === 'success' ? j.data.result : null;
  } catch { return null; }
}
async function readProm() {
  const label = (m) => `last_over_time(${m}[15m])`;
  const [info, last, cost, skillCost, skillRuns, calls, failed, prs] = await Promise.all([
    prom(label('agent_os_session_info')), prom(label('agent_os_session_last_event_time')),
    prom('sum by (session_id) (max_over_time(claude_code_cost_usage_USD_total[90d]))'),
    prom('sum by (session_id, skill_name) (max_over_time(claude_code_cost_usage_USD_total{skill_name!=""}[90d]))'),
    prom(label('agent_os_session_skill_runs')), prom(label('agent_os_session_tool_calls')),
    prom(label('agent_os_session_failed_tool_calls')), prom(label('agent_os_session_pr'))
  ]);
  if (!info) return null;
  const s = new Map();
  const get = (id) => { if (!s.has(id)) s.set(id, { id, version: '', kind: '', last: 0, cost: null, calls: 0, failed: 0, skills: {}, skillCost: {}, prs: [] }); return s.get(id); };
  for (const r of info) Object.assign(get(r.metric.session_id), { version: r.metric.agent_os_version || '', kind: r.metric.kind || '' });
  for (const r of last || []) get(r.metric.session_id).last = Number(r.value[1]) * 1000;
  for (const r of cost || []) get(r.metric.session_id).cost = Number(r.value[1]);
  for (const r of calls || []) get(r.metric.session_id).calls = Number(r.value[1]);
  for (const r of failed || []) get(r.metric.session_id).failed = Number(r.value[1]);
  for (const r of skillRuns || []) get(r.metric.session_id).skills[r.metric.skill_name] = Number(r.value[1]);
  for (const r of skillCost || []) get(r.metric.session_id).skillCost[r.metric.skill_name] = Number(r.value[1]);
  for (const r of prs || []) get(r.metric.session_id).prs.push({ repo: r.metric.repo, pr: Number(r.metric.pr) });
  return s;
}

// ---- transcripts: session titles and projects, Skill loads, and permission denials ----
const fileCache = new Map(); // path -> { key, result }
function projectOfCwd(cwd) {
  const m = /^\/home\/[^/]+\/projects(?:\/([^/]+))?/.exec(cwd || '');
  return m ? (m[1] || '~/projects') : '';
}
function deniedWhy(text) {
  let m = /auto mode classifier\. Reason: \[([^\]]+)\]/.exec(text);
  if (m) return 'Auto mode: ' + m[1];
  m = /auto mode classifier\. Reason: ([^\n]*?)(?:\.\s|$)/.exec(text);
  if (m) return 'Auto mode: ' + m[1].slice(0, 140);
  if (/built-in Claude Code safety check/.test(text)) return 'A built-in safety check';
  if (/has been denied/.test(text)) return 'A deny rule in the permissions';
  return 'Denied';
}
function clip(s, n) { s = s.trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
function toolWhat(name, input) {
  input = input || {};
  if (name === 'Bash' || name === 'PowerShell') return clip(String(input.command || '').split('\n')[0], 60) || name;
  const short = name.startsWith('mcp__') ? name.split('__').slice(2).join('__') : name;
  const arg = input.file_path || input.url || input.pattern || input.path || input.skill || input.description || '';
  return clip(short + (arg ? ' ' + String(arg) : ''), 60);
}
async function scanFile(path, st) {
  const text = await readText(path);
  const out = { sessionId: '', cwd: '', title: '', aiTitle: '', prompt: '', loads: [], denials: [] };
  if (!text) return out;
  const lines = text.split('\n'), want = new Map();
  for (const line of lines) {
    if (!line) continue;
    if (!out.sessionId) { const m = /"sessionId":"([^"]+)"/.exec(line); if (m) out.sessionId = m[1]; }
    if (!out.cwd) { const m = /"cwd":"([^"]+)"/.exec(line); if (m) out.cwd = m[1]; }
    if (line.startsWith('{"type":"custom-title"')) { try { out.title = JSON.parse(line).customTitle || out.title; } catch {} continue; }
    if (line.startsWith('{"type":"ai-title"')) { try { out.aiTitle = JSON.parse(line).aiTitle || out.aiTitle; } catch {} continue; }
    if (!out.prompt && line.includes('"type":"user"') && line.includes('"content":"')) {
      try {
        const c = JSON.parse(line).message?.content;
        if (typeof c === 'string' && !c.startsWith('<')) {
          const first = c.split('\n').map((l) => l.trim()).find((l) => l && !/^https?:\/\/\S+$/.test(l));
          if (first) out.prompt = first.length > 70 ? first.slice(0, 69).trimEnd() + '…' : first;
        }
      } catch {}
    }
    if (line.includes('"name":"Skill"') && line.includes('"type":"assistant"')) {
      try {
        const j = JSON.parse(line);
        for (const c of j.message?.content || []) if (c.type === 'tool_use' && c.name === 'Skill' && c.input?.skill) out.loads.push({ at: Date.parse(j.timestamp), skill: c.input.skill });
      } catch {}
    }
    if (line.includes('"is_error":true') && line.includes('denied')) {
      try {
        const j = JSON.parse(line);
        for (const c of j.message?.content || []) {
          if (c.type !== 'tool_result' || !c.is_error) continue;
          const t = typeof c.content === 'string' ? c.content : (c.content || []).map((x) => x.text || '').join(' ');
          if (/^(Error: )?Permission (for this (action|command) was denied|to use .* has been denied)/.test(t)) {
            const d = { at: Date.parse(j.timestamp), id: c.tool_use_id, why: deniedWhy(t), what: '' };
            out.denials.push(d); want.set(c.tool_use_id, d);
          }
        }
      } catch {}
    }
  }
  if (want.size) {
    for (const line of lines) {
      if (!line.includes('"tool_use"')) continue;
      for (const [id, d] of want) {
        if (!line.includes(id)) continue;
        try {
          for (const c of JSON.parse(line).message?.content || []) if (c.type === 'tool_use' && c.id === id) d.what = toolWhat(c.name, c.input);
        } catch {}
      }
    }
  }
  out.mtime = st.mtimeMs;
  return out;
}
async function scanTranscripts(sinceMs) {
  const base = join(CLAUDE, 'projects'), files = [];
  for (const p of await dirs(base)) {
    let names = [];
    try { names = await readdir(join(base, p), { withFileTypes: true }); } catch { continue; }
    for (const n of names) {
      if (n.isFile() && n.name.endsWith('.jsonl')) files.push(join(base, p, n.name));
      else if (n.isDirectory()) {
        try { for (const f of await readdir(join(base, p, n.name, 'subagents'))) if (f.endsWith('.jsonl')) files.push(join(base, p, n.name, 'subagents', f)); } catch {}
      }
    }
  }
  const results = [];
  for (const f of files) {
    let st; try { st = await stat(f); } catch { continue; }
    if (st.mtimeMs < sinceMs || !st.size) continue;
    const key = st.size + ':' + st.mtimeMs, hit = fileCache.get(f);
    if (hit && hit.key === key) { results.push(hit.result); continue; }
    const result = await scanFile(f, st);
    result.subagent = f.includes('/subagents/');
    fileCache.set(f, { key, result });
    results.push(result);
  }
  const sessions = new Map();
  for (const r of results) {
    if (!r.sessionId) continue;
    const s = sessions.get(r.sessionId) || { app: '', title: '', last: 0 };
    if (!r.subagent || !s.app) s.app = projectOfCwd(r.cwd) || s.app;
    if (!r.subagent) s.title = noLite(r.title || r.aiTitle || r.prompt || '') || s.title;
    s.last = Math.max(s.last, r.mtime || 0);
    sessions.set(r.sessionId, s);
  }
  return { results, sessions };
}

// ---- rules: AGENTS.md, one rule per bullet or paragraph ----
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'to', 'in', 'of', 'on', 'for', 'over', 'with', 'few', 'each', 'how', 'what', 'made', 'only']);
function ruleName(text) {
  let words = plain(text).split(/[,;:—(]|\.(?:\s|$)/)[0].replace(/["“”]/g, '').trim().split(' ');
  const cut = words.findIndex((w, i) => i >= 2 && ['and', 'or', 'in'].includes(w));
  if (cut > 0) words = words.slice(0, cut);
  if (words.length > 6) words = words.slice(0, 6);
  while (words.length > 2 && STOP.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.join(' ');
}
async function readRules() {
  const text = (await readText(join(AGENT_OS, 'lite/AGENTS.md'))) || '';
  const lines = text.split('\n'), blocks = [];
  let cur = null;
  lines.forEach((line, i) => {
    const n = i + 1;
    if (!line.trim() || line.startsWith('#')) { cur = null; return; }
    if (/^\s*[-*] /.test(line)) { cur = { start: n, end: n, text: line.replace(/^\s*[-*] /, '') }; blocks.push(cur); return; }
    if (cur) { cur.end = n; cur.text += ' ' + line.trim(); return; }
    cur = { start: n, end: n, text: line.trim() }; blocks.push(cur);
  });
  const ids = new Set();
  const rules = blocks.map((b) => {
    const name = ruleName(b.text);
    let id = slug(name) || 'rule'; while (ids.has(id)) id += '-2'; ids.add(id);
    return { id, name, step: '', text: plain(b.text), evals: [], history: [], start: b.start, end: b.end };
  });
  await Promise.all(rules.map(async (r) => {
    const log = await git('log', '-s', '--format=%h%x09%ct%x09%s', `-L${r.start},${r.end}:lite/AGENTS.md`);
    r.history = log.split('\n').filter(Boolean).map((l) => { const [h, t, s] = l.split('\t'); return [shortDate(t * 1000), noLite(s) + ' · ' + h]; });
  }));
  return rules;
}

// ---- skills: SKILL.md under lite/skills and boris/skills ----
async function readSkills() {
  const out = [];
  for (const [root, personal] of [['lite/skills', false], ['boris/skills', true]]) {
    for (const id of await dirs(join(AGENT_OS, root))) {
      const file = join(AGENT_OS, root, id, 'SKILL.md'), text = await readText(file);
      if (text == null) continue;
      const { data, body } = frontmatter(text);
      const log = await git('log', '--format=%h%x09%ct%x09%s', '--', join(root, id));
      const s = {
        id, step: '', kb: Math.round(Buffer.byteLength(text) / 102.4) / 10, runs: 0, text: noLite(plain(data.description || '')), evals: [],
        contents: body.split('\n').filter((l) => /^## /.test(l)).map((l) => plain(l.slice(3))),
        history: log.split('\n').filter(Boolean).map((l) => { const [h, t, s2] = l.split('\t'); return [shortDate(t * 1000), noLite(s2) + ' · ' + h]; })
      };
      if (personal) s.personal = true;
      out.push(s);
    }
  }
  return out;
}

// ---- evals: lite/evals/*/case.yaml, scored from evals/history.jsonl ----
const GENERIC = new Set(['core', 'regression', 'capability', 'lite', 'without', 'adding', 'uses', 'read', 'one', 'push', 'held', 'leaves', 'reaches',
  'updates', 'blocks', 'stays', 'asks', 'starts', 'isolated', 'merged', 'expected', 'needs', 'fixed', 'session', 'ben', 'project', 'guard', 'authority', 'handoff', 'integrity']);
const PLUGIN_TAGS = new Set(['core', 'lite', 'aws-serverless']);
function stem(w) { return w.toLowerCase().replace(/ies$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/e$/, ''); }
function wordsOf(text) { return text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).map(stem); }
function listField(yaml, key) {
  const m = new RegExp('^' + key + ':\\s*\\[([^\\]]*)\\]', 'm').exec(yaml);
  if (m) return m[1].split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  const b = new RegExp('^' + key + ':\\s*\\n((?:\\s+- .*\\n?)+)', 'm').exec(yaml);
  return b ? b[1].split('\n').map((l) => l.replace(/^\s+- /, '').trim()).filter(Boolean) : [];
}
async function readEvals(rules, skills, versionAt) {
  const cases = [];
  for (const name of await dirs(join(AGENT_OS, 'lite/evals'))) {
    const yaml = await readText(join(AGENT_OS, 'lite/evals', name, 'case.yaml'));
    if (yaml == null) continue;
    cases.push({ name, tags: listField(yaml, 'tags'), rules: listField(yaml, 'rules'), skills: listField(yaml, 'skills') });
  }
  const hist = ((await readText(join(AGENT_OS, 'evals/history.jsonl'))) || '').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const evals = {}, evalInfo = {};
  for (const c of cases) {
    const all = hist.filter((h) => h.case === c.name);
    const mine = all.filter((h) => h.plugin === 'lite');
    const pool = mine.length ? mine : all, last = pool[pool.length - 1];
    if (!last) { evals[c.name] = [null, null]; evalInfo[c.name] = null; continue; }
    // The baseline runs without the rules, so the latest one stands until a newer one runs.
    const base = last.scoreWithout != null ? last : [...pool].reverse().find((h) => h.scoreWithout != null);
    evals[c.name] = [pct(last.score), base ? pct(base.scoreWithout) : null];
    evalInfo[c.name] = { runs: last.runs, costUsd: last.costUsd, judgeModel: judgeName(last.judgeModel), date: shortDate(Date.parse(last.date)), baselineDate: base ? shortDate(Date.parse(base.date)) : null };
  }
  // Which rules and skills a case tests: the case's own rules:/skills: lists if it has them. Otherwise by name: a skill
  // whose name is a word of the case's name or tags, and the rules whose text uses the case's words most (ties all count).
  for (const c of cases) {
    const own = (list) => [...new Set(list.flatMap((t) => t.split('-')))].filter((w) => w.length > 2 && !GENERIC.has(w)).map(stem);
    const words = own([c.name, ...c.tags.filter((t) => !PLUGIN_TAGS.has(t))]), all = own([c.name, ...c.tags]);
    if (c.rules.length) { for (const r of rules) if (c.rules.includes(r.id) || c.rules.includes(r.name)) r.evals.push(c.name); }
    else {
      const score = rules.map((r) => wordsOf(r.text).filter((w) => words.includes(w)).length), best = Math.max(0, ...score);
      if (best) rules.forEach((r, i) => { if (score[i] === best) r.evals.push(c.name); });
    }
    for (const s of skills) if (c.skills.length ? c.skills.includes(s.id) : s.id.split('-').map(stem).some((w) => all.includes(w))) s.evals.push(c.name);
  }
  // Eval scores per rules version: the latest run per case while that version was in force.
  const byVersion = {};
  for (const h of hist) {
    if (h.plugin !== 'lite' || h.score == null) continue;
    const v = versionAt(Date.parse(h.date));
    if (!v) continue;
    (byVersion[v] = byVersion[v] || {})[h.case] = h.score;
  }
  return { evals, evalInfo, byVersion };
}

// ---- versions: commits touching lite/AGENTS.md ----
async function readVersions() {
  const parse = (out) => out.split('\n').filter(Boolean).map((l) => { const [h, t, s] = l.split('\t'); return { sha: h, at: t * 1000, subject: s }; });
  const rules = parse(await git('log', '--format=%h%x09%ct%x09%s', '--', 'lite/AGENTS.md'));
  const all = parse(await git('log', '--format=%h%x09%ct%x09%s', '--', 'lite/AGENTS.md', 'lite/CLAUDE.md', 'lite/skills'));
  const at = (ms) => rules.find((r) => r.at <= ms)?.sha || null;
  const ofCommit = {};
  for (const c of all) ofCommit[c.sha] = at(c.at);
  return { rules, all, at, ofCommit };
}

// ---- memories: ~/.claude/projects/*/memory/MEMORY.md ----
async function readMemories() {
  const base = join(CLAUDE, 'projects'), out = [];
  const folders = (await dirs(base)).filter((d) => d === '-home-ben-projects' || (/^-home-ben-projects-/.test(d) && !d.includes('--')));
  const named = folders.map((d) => [d, d === '-home-ben-projects' ? '~/projects' : d.slice('-home-ben-projects-'.length)])
    .sort((a, b) => (a[1] === '~/projects') - (b[1] === '~/projects') || a[1].localeCompare(b[1]));
  for (const [folder, project] of named) {
    const index = await readText(join(base, folder, 'memory', 'MEMORY.md'));
    if (!index) continue;
    for (const line of index.split('\n')) {
      const m = /^\s*[-*]\s*\[([^\]]+)\]\(([^)]+)\)\s*(?:[—–-]+\s*)?(.*)$/.exec(line);
      if (!m) continue;
      const file = m[2], name = basename(file).replace(/\.md$/, '');
      const text = await readText(join(base, folder, 'memory', file));
      const { data, body } = frontmatter(text || '');
      const type = ['feedback', 'project', 'reference', 'user'].includes(data.type) ? data.type : 'project';
      const links = [...new Set([...(body || '').matchAll(/\[\[([^\]|#]+)/g)].map((x) => x[1].trim()))];
      out.push([project, data.name || name, plain(m[1]), type, plain(m[3] || data.description || ''), links]);
    }
  }
  return out;
}

// ---- permissions: ~/.claude/settings.json ----
function readPermissions(settings, denials) {
  const p = settings?.permissions || {}, allow = p.allow || [], deny = p.deny || [];
  const inner = (r) => (/^[^(]+\((.*)\)$/.exec(r) || [, r])[1];
  const groups = [], lists = {};
  const add = (name, rules, show) => {
    if (!rules.length) return;
    const items = rules.map(show);
    const heads = [...new Set(items.map((x) => x.split(/[\s:(]/)[0]))];
    const sample = heads.length > 8 ? heads.slice(0, 7).join(', ') + ' and ' + (heads.length - 7) + ' more' : heads.join(', ');
    groups.push([name, rules.length, sample]); lists[name] = items;
  };
  add('Bash commands', allow.filter((r) => r.startsWith('Bash')), inner);
  add('PowerShell commands', allow.filter((r) => r.startsWith('PowerShell')), inner);
  add('MCP tools', allow.filter((r) => r.startsWith('mcp__')), (r) => r.split('__').slice(1).join(' · '));
  add('Claude Code tools', allow.filter((r) => !/^(Bash|PowerShell|mcp__)/.test(r)), (r) => r);
  const meaning = (r) => {
    if (r.startsWith('mcp__')) { const [, server, tool] = r.split('__'); return (tool || server).replace(/_/g, ' ') + ' (' + server + ')'; }
    const m = /^([A-Za-z]+)\((.*)\)$/.exec(r);
    if (!m) return r;
    const verb = { Read: 'Reading', Edit: 'Editing', Write: 'Writing', Bash: 'Running', WebFetch: 'Fetching' }[m[1]] || m[1];
    return verb + ' ' + m[2];
  };
  const week = Date.now() - 7 * DAY, seen = new Set(), blocked = [];
  for (const d of denials.filter((x) => x.at >= week).sort((a, b) => b.at - a.at)) {
    const key = d.what + '|' + d.why;
    if (!d.what || seen.has(key)) continue;
    seen.add(key);
    blocked.push([dayLabel(d.at), d.app || '', d.what, d.why]);
    if (blocked.length >= 30) break;
  }
  return { allow: allow.length, deny: deny.length, groups, lists, denied: deny.map((r) => [r, meaning(r)]), blocked };
}

// ---- assembling it ----
async function build() {
  const since = Date.now() - 35 * DAY;
  const [rules, skills, ver, memories, settingsText, scan, ps] = await Promise.all([
    readRules(), readSkills(), readVersions(), readMemories(), readText(join(CLAUDE, 'settings.json')), scanTranscripts(since), readProm()
  ]);
  const { evals, evalInfo, byVersion } = await readEvals(rules, skills, ver.at);
  let settings = null; try { settings = JSON.parse(settingsText || '{}'); } catch {}

  const denials = [];
  for (const r of scan.results) for (const d of r.denials) denials.push({ ...d, app: scan.sessions.get(r.sessionId)?.app || projectOfCwd(r.cwd) });
  const permissions = readPermissions(settings, denials);

  // Per-session rows, from Prometheus when it answers.
  const sessions = ps ? [...ps.values()] : [];
  const now = Date.now(), weekOf = (ms) => 3 - Math.floor((now - ms) / (7 * DAY)); // 0 = 3 weeks ago … 3 = this week
  const appOf = (s) => scan.sessions.get(s.id)?.app || (s.prs[0] ? s.prs[0].repo.split('/').pop() : '');
  const titleOf = (s) => scan.sessions.get(s.id)?.title || 'Session ' + s.id.slice(0, 8);
  const recent = sessions.filter((s) => s.last && now - s.last < 28 * DAY);
  const share = (list) => { const c = list.reduce((t, s) => t + s.calls, 0), f = list.reduce((t, s) => t + s.failed, 0); return c ? (100 * f / c).toFixed(1) + '%' : null; };
  const overall = share(recent);

  const partInfo = {};
  for (const s of skills) {
    const info = { loads: [0, 0, 0, 0], used: [], loaded: [], contents: s.contents };
    let users = [];
    if (ps) {
      users = recent.filter((x) => x.skills[s.id]).sort((a, b) => b.last - a.last);
      for (const u of users) { const w = weekOf(u.last); if (w >= 0 && w <= 3) info.loads[w] += u.skills[s.id]; }
    } else {
      // Prometheus is down: count the Skill tool calls in the transcripts.
      const ids = new Set();
      for (const r of scan.results) for (const l of r.loads) {
        const name = l.skill.split(':').pop();
        if (name !== s.id || now - l.at >= 28 * DAY) continue;
        info.loads[weekOf(l.at)]++; ids.add(r.sessionId);
      }
      users = [...ids].map((id) => ({ id, last: scan.sessions.get(id)?.last || 0, prs: [], none: true })).sort((a, b) => b.last - a.last);
    }
    info.used = users.slice(0, 10).map((u) => {
      const outcome = u.none ? '' : u.prs.length === 1 ? 'PR #' + u.prs[0].pr + ' merged' : u.prs.length ? u.prs.length + ' PRs merged' : 'No PR merged';
      return [dayLabel(u.last), appOf(u), titleOf(u), outcome];
    });
    if (ps && users.length) {
      const costed = users.filter((u) => u.skillCost[s.id] != null);
      if (costed.length) info.loaded.push(['Cost while loaded', money(costed.reduce((t, u) => t + u.skillCost[s.id], 0) / costed.length) + ' a session']);
      const f = share(users);
      if (f) info.loaded.push(['Failed tool calls', f + (overall ? ' (' + overall + ' overall)' : '')]);
    }
    s.runs = info.loads.reduce((a, b) => a + b, 0);
    delete s.contents;
    partInfo[s.id] = info;
  }

  // Versions, newest first.
  const versionOfLabel = (label) => { const sha = (label || '').split(' ').pop(); return ver.ofCommit[sha] || null; };
  const versions = ver.rules.map((r, i) => {
    const mine = sessions.filter((s) => versionOfLabel(s.version) === r.sha);
    const costed = mine.filter((s) => s.cost != null);
    const scores = Object.values(byVersion[r.sha] || {});
    const changes = ver.all.filter((c) => ver.ofCommit[c.sha] === r.sha).map((c) => noLite(c.subject));
    return {
      v: shortIso(r.at) + ' ' + r.sha, note: i === 0 ? 'current' : noLite(r.subject).replace(/ \(#\d+\)$/, ''), since: shortDate(r.at),
      sessions: mine.length, per: costed.length ? Math.round(100 * costed.reduce((t, s) => t + s.cost, 0) / costed.length) / 100 : null,
      evals: scores.length ? pct(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      pick: '—', failed: share(mine) || '—', changes
    };
  });

  for (const r of rules) { delete r.start; delete r.end; }
  const aos = { version: versions[0]?.v || '', rules, evals, evalInfo, skills, permissions, memories };
  return { aos, partInfo, versions, builtAt: now };
}
function shortIso(ms) { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

let state = null, pending = null;
function refresh() {
  if (!pending) pending = build().then((s) => { state = s; }).catch((e) => { console.error('agentos: build failed:', e); }).finally(() => { pending = null; });
  return pending;
}
async function current() {
  if (!state) await refresh();
  else if (Date.now() - state.builtAt > REFRESH_MS) refresh();
  if (!state) throw new Error('Agent OS data is not available yet');
  return state;
}
refresh();
setInterval(refresh, REFRESH_MS).unref();

export async function getAos() { return structuredClone((await current()).aos); }
export async function getPartInfo() { return structuredClone((await current()).partInfo); }
export async function getVersions() { return structuredClone((await current()).versions); }
