// Items: each piece of work with its track, who has it, its question or ask, report and facts (server/CONTRACT.md).
// An item is a PR in a bensoutendijk repo under ~/projects (open, or merged in the last 14 days), joined to the
// session that opened or merged it, or a session with no PR that is working or whose agent declared something unfinished.
// Sources: gh (PRs, checks, workflow runs), what agents declared (server/declared.mjs), the records Claude Code keeps under ~/.claude,
// Prometheus's agent_os_session_pr (which session merged which PR), and the sessions module for titles and "doing".
// Billboard never reads meaning out of what an agent wrote.
// Who has it and where it is on its track are worked out from facts on every refresh, never stored.
// Everything is cached and refreshed in the background every minute, so a request never waits on gh.
import { execFile } from 'node:child_process';
import { open, readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import * as sessionsModule from './sessions.mjs';
import { isSeen, lastLooked } from '../seen.mjs';
import { clearedAsk, isArchived } from '../acted.mjs';
import { readDeclared, reportOf } from '../declared.mjs';

const BUILD = ['Build', 'PR', 'Live', 'Checked'];
const FROM_MOCK = ['In the mock', 'Build', 'PR', 'Live'];

const HOME = homedir();
const PROJECTS = process.env.BILLBOARD_PROJECTS || join(HOME, 'projects');
const CLAUDE = join(HOME, '.claude');
const OWNER = 'bensoutendijk';
const PROMETHEUS = process.env.PROMETHEUS_URL || 'http://127.0.0.2:9090';
const TZ = process.env.BILLBOARD_TZ || 'America/Chicago';
const RULES_START = Date.parse('2026-11-02T00:00:00-06:00'); // nothing from before the Nov 2 Agent OS rules
const DAY = 86400e3;
const WINDOW = 14 * DAY;
const REFRESH_MS = 60e3;
const WORKFLOWS_MS = 10 * 60e3;
const QUEUED_STUCK = 15 * 60e3; // a deploy run queued this long with no runner is stuck, not a job
const DEPLOY_GRACE = 10 * 60e3; // a merge this recent with no deploy run yet is waiting for one, not stuck

// ---------- small helpers ----------
function run(cmd, args, timeout = 30e3) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 32 << 20, env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' } }, (err, out, errOut) => {
      if (err) reject(new Error(`${cmd} ${args.slice(0, 3).join(' ')}: ${(errOut || err.message).trim().split('\n')[0]}`));
      else resolve(out);
    });
  });
}
async function ghJSON(args) { return JSON.parse(await run('gh', args)); }
const ms = (t) => (t ? new Date(t).getTime() : NaN);
const median = (xs) => { const s = xs.filter((x) => x > 0).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const ymd = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
const clock = (t) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(t);
const hourOf = (t) => Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(t));

// "3:24 PM" today, "3:24 PM yesterday", "Fri 6:50 AM" this week, "Oct 30 6:50 AM" before that.
function when(t, now = Date.now()) {
  if (!Number.isFinite(t)) return '';
  const days = Math.round((Date.parse(ymd(now)) - Date.parse(ymd(t))) / DAY);
  if (days <= 0) return clock(t);
  if (days === 1) return clock(t) + ' yesterday';
  if (days < 7) return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(t) + ' ' + clock(t);
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }).format(t) + ' ' + clock(t);
}
function dur(msLen) {
  const s = Math.max(0, Math.round(msLen / 1000));
  if (s < 90) return s + ' s';
  const m = Math.round(s / 60);
  return m < 90 ? m + ' min' : Math.round(m / 6) / 10 + ' h';
}
function ago(t, now = Date.now()) {
  const d = now - t;
  if (d < 2 * 3600e3) return dur(d) + ' ago';
  if (d < 2 * DAY) return Math.round(d / 3600e3) + ' hours ago';
  return Math.round(d / DAY) + ' days ago';
}
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

// ---------- repos under ~/projects ----------
async function listRepos() {
  const out = [];
  for (const name of await readdir(PROJECTS).catch(() => [])) {
    const cfg = await readFile(join(PROJECTS, name, '.git', 'config'), 'utf8').catch(() => '');
    const m = cfg.match(/url\s*=\s*\S*github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\s*$/m);
    if (m && m[1] === OWNER) out.push({ app: name, repo: `${OWNER}/${m[2]}` });
  }
  return out;
}

// ---------- GitHub, per repo ----------
const workflowCache = new Map(); // repo -> { at, list }
async function workflows(repo) {
  const c = workflowCache.get(repo);
  if (c && Date.now() - c.at < WORKFLOWS_MS) return c.list;
  const list = await ghJSON(['workflow', 'list', '-R', repo, '--json', 'name,path,state']).catch(() => (c ? c.list : []));
  workflowCache.set(repo, { at: Date.now(), list });
  return list;
}
const runJobsCache = new Map(); // run id -> { updatedAt, jobs }
async function runJobs(r) {
  const c = runJobsCache.get(r.databaseId);
  if (c && c.updatedAt === r.updatedAt) return c.jobs;
  const jobs = (await ghJSON(['run', 'view', String(r.databaseId), '-R', r.repo, '--json', 'jobs']).catch(() => ({ jobs: [] }))).jobs || [];
  runJobsCache.set(r.databaseId, { updatedAt: r.updatedAt, jobs });
  return jobs;
}
async function readRepo({ app, repo }, now) {
  const since = new Date(Math.max(RULES_START, now - WINDOW - DAY)).toISOString().slice(0, 10);
  const [prs, runs, wfs] = await Promise.all([
    ghJSON(['pr', 'list', '-R', repo, '--state', 'all', '--limit', '200', '--search', `updated:>=${since}`, '--json',
      'number,title,state,url,headRefName,baseRefName,createdAt,mergedAt,closedAt,mergeCommit,statusCheckRollup']),
    ghJSON(['run', 'list', '-R', repo, '--limit', '300', '--created', `>=${since}`, '--json',
      'databaseId,workflowName,event,status,conclusion,headBranch,headSha,createdAt,startedAt,updatedAt,url']),
    workflows(repo)
  ]);
  for (const r of runs) r.repo = repo;
  const deployNames = new Set(wfs.filter((w) => w.state === 'active' && /deploy/i.test(w.name)).map((w) => w.name));
  return { app, repo, prs, runs, deployNames, windowStart: Date.parse(since) };
}

// ---------- Prometheus: which session merged which PR ----------
async function mergedBy() {
  const map = new Map(); // "owner/repo#n" -> [session ids]
  try {
    const res = await fetch(`${PROMETHEUS}/api/v1/query?query=${encodeURIComponent('agent_os_session_pr')}`, { signal: AbortSignal.timeout(5e3) });
    const body = await res.json();
    for (const { metric } of body.data?.result || []) {
      const k = `${metric.repo}#${metric.pr}`;
      if (!map.has(k)) map.set(k, []);
      if (!map.get(k).includes(metric.session_id)) map.get(k).push(metric.session_id);
    }
  } catch (err) {
    console.error('items: prometheus', err.message);
  }
  return map;
}

// ---------- Claude Code: live sessions ----------
async function liveSessions() {
  const dir = join(CLAUDE, 'sessions'), live = new Map(); // session id -> 'busy' | 'idle' | ...
  for (const f of await readdir(dir).catch(() => [])) {
    if (!/^\d+\.json$/.test(f)) continue; // only the pid files, never the .key files
    try {
      const d = JSON.parse(await readFile(join(dir, f), 'utf8'));
      process.kill(d.pid, 0);
      if (d.sessionId) live.set(d.sessionId, d.status || 'idle');
    } catch { /* gone */ }
  }
  return live;
}

// ---------- Claude Code: transcripts, read incrementally ----------
// Per file: how far we've read and what we've learned. Only the main chain counts (no subagents, no sidechains).
const files = new Map();
function freshSession(id) {
  return { id, cwd: '', firstTs: NaN, lastTs: NaN, title: '', branches: new Map(), prLinks: new Map() };
}
function eat(s, r) {
  const t = ms(r.timestamp);
  if (r.type === 'custom-title' && r.customTitle) s.title = r.customTitle;
  if (r.type === 'pr-link' && r.prRepository && r.prNumber) {
    const k = `${r.prRepository}#${r.prNumber}`;
    if (!s.prLinks.has(k) || t < s.prLinks.get(k)) s.prLinks.set(k, t);
  }
  if ((r.type !== 'user' && r.type !== 'assistant') || r.isSidechain) return;
  if (!s.cwd && r.cwd) s.cwd = r.cwd;
  if (Number.isFinite(t)) {
    if (!(t >= s.firstTs)) s.firstTs = t;
    if (!(t <= s.lastTs)) s.lastTs = t;
  }
  if (r.gitBranch && !s.branches.has(r.gitBranch)) s.branches.set(r.gitBranch, t);
}
async function readNew(path, entry, onLine) {
  const st = await stat(path).catch(() => null);
  if (!st) return false;
  if (st.size < entry.offset) { entry.offset = 0; entry.rest = ''; entry.reset?.(); }
  if (st.size === entry.offset) return true;
  const fh = await open(path, 'r');
  try {
    const len = st.size - entry.offset, buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, entry.offset);
    entry.offset = st.size;
    const lines = (entry.rest + buf.toString('utf8')).split('\n');
    entry.rest = lines.pop();
    for (const l of lines) if (l) onLine(l);
  } finally { await fh.close(); }
  return true;
}
async function readTranscripts(now) {
  const root = join(CLAUDE, 'projects'), cutoff = Math.max(RULES_START, now - WINDOW - DAY), seen = new Set();
  for (const dir of await readdir(root).catch(() => [])) {
    for (const f of await readdir(join(root, dir)).catch(() => [])) {
      if (!f.endsWith('.jsonl')) continue;
      const path = join(root, dir, f), st = await stat(path).catch(() => null);
      if (!st || st.mtimeMs < cutoff || !st.size) continue;
      seen.add(path);
      let e = files.get(path);
      if (!e) {
        e = { offset: 0, rest: '', s: freshSession(basename(f, '.jsonl')), subs: new Map() };
        e.reset = () => { e.s = freshSession(e.s.id); };
        files.set(path, e);
      }
      await readNew(path, e, (l) => { try { eat(e.s, JSON.parse(l)); } catch { /* a torn line */ } });
      // PRs opened by the session's helpers are the session's too.
      const subDir = join(root, dir, e.s.id, 'subagents');
      for (const sf of await readdir(subDir).catch(() => [])) {
        if (!sf.endsWith('.jsonl')) continue;
        const sp = join(subDir, sf);
        if (!e.subs.has(sp)) e.subs.set(sp, { offset: 0, rest: '' });
        await readNew(sp, e.subs.get(sp), (l) => {
          if (!l.includes('"pr-link"')) return;
          try { const r = JSON.parse(l); if (r.type === 'pr-link') eat(e.s, { ...r, isSidechain: false }); } catch { /* torn */ }
        });
      }
    }
  }
  for (const k of files.keys()) if (!seen.has(k)) files.delete(k);
  const out = new Map();
  for (const { s } of files.values()) if (Number.isFinite(s.lastTs)) out.set(s.id, s);
  return out;
}

// The app a session works in: the project folder its cwd is under, or '' for ~/projects itself.
function appOfCwd(cwd) {
  const p = PROJECTS.replace(/\/$/, '') + '/';
  return cwd && cwd.startsWith(p) ? cwd.slice(p.length).split('/')[0] : '';
}

// ---------- what the session's agent declared ----------
// stuckBy says what can clear a stuck item: 'silent' and 'declared' Ben can archive; a stuck fact only a fix can clear.
const NO_STATUS = { stuckBy: 'silent', reason: 'Its turn ended without a status.', short: 'Turn ended with no status' };
const LEFT = (left) => ({ stuckBy: 'declared', reason: `Its session said it was done, with this left: ${left}`, short: 'Finished with something left' });
const STOPPED = (on) => ({ stuckBy: 'declared', reason: `Waiting on ${on}, but its session isn't running.`, short: 'Session stopped waiting' });
const clip = (t, max) => (t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t);
// A session's closing declaration, as an item reads it; null if it hasn't made one this turn or is working.
function closingOf(d, busy) {
  const t = d?.terminal;
  if (!t || busy) return null;
  return {
    kind: t.kind, at: ms(t.at), on: t.on || '', left: t.report?.left || '', report: reportOf(t),
    question: t.kind === 'ask' && t.questions ? t.questions.map((q) => ({ q: q.q, opts: q.options || [], pick: q.pick ?? null })) : null,
    ask: t.kind === 'ask' && t.action ? t.action : null,
    offers: t.kind === 'done' && t.offers ? { opts: t.offers, pick: t.pick ?? null } : null
  };
}
function declaredFacts(facts, d, c, silent, lastTs) {
  for (const x of d?.started || []) facts.push([x.at, `Started from ${x.from}`, '']);
  if (c?.question) facts.push([c.at, c.question.length === 1 ? 'Asked you a question' : `Asked you ${c.question.length} questions`, '']);
  else if (c?.ask) facts.push([c.at, c.ask.kind === 'mock' ? 'Asked you to try it in the mock' : 'Asked you: ' + clip(c.ask.text, 80), '']);
  else if (c?.kind === 'waiting') facts.push([c.at, `Waiting on ${clip(c.on, 80)}`, '']);
  else if (c?.kind === 'done') facts.push([c.at, c.left ? 'Its session said it was done, with something left' : 'Its session said it was done', '']);
  else if (silent) facts.push([lastTs, 'Turn ended without a status', '']);
}
const menuOf = (c, now) => (c?.offers && now - c.at < DAY ? { asked: when(c.at, now), parts: [{ q: 'What next?', opts: c.offers.opts, pick: c.offers.pick }] } : null);

// ---------- deploys and checks ----------
function deployState(pr, repo, now) {
  if (!repo.deployNames.size) return { state: 'none-needed' };
  const merged = ms(pr.mergedAt);
  const cands = repo.runs.filter((r) => repo.deployNames.has(r.workflowName) && r.event === 'push' && r.headBranch === pr.baseRefName && ms(r.createdAt) >= merged - 10e3)
    .sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
  const sha = pr.mergeCommit?.oid;
  const exact = cands.find((r) => r.headSha === sha);
  const order = exact ? [exact, ...cands.filter((r) => r !== exact && ms(r.createdAt) >= ms(exact.createdAt))] : cands;
  const firstDeploy = Math.min(...repo.runs.filter((r) => repo.deployNames.has(r.workflowName)).map((r) => ms(r.createdAt)));
  if (!exact && merged < firstDeploy && repo.windowStart < firstDeploy - DAY) return { state: 'none-needed' }; // merged before the deploy workflow existed
  const ok = order.find((r) => r.status === 'completed' && r.conclusion === 'success');
  if (ok) return { state: 'passed', run: ok, at: ms(ok.updatedAt) };
  const going = order.find((r) => r.status !== 'completed');
  if (going) return { state: 'running', run: going, at: ms(going.startedAt || going.createdAt) };
  const bad = order.find((r) => r.status === 'completed' && ['failure', 'timed_out', 'startup_failure'].includes(r.conclusion));
  if (bad) return { state: 'failed', run: bad, at: ms(bad.updatedAt) };
  if (now - merged < DEPLOY_GRACE) return { state: 'pending', at: merged };
  return { state: 'missing' };
}
function usualTime(repo, workflowName) {
  return median(repo.runs.filter((r) => r.workflowName === workflowName && r.status === 'completed' && r.conclusion === 'success')
    .slice(0, 20).map((r) => ms(r.updatedAt) - ms(r.startedAt || r.createdAt)));
}
function runningCheck(pr, repo) {
  const c = (pr.statusCheckRollup || []).find((x) => (x.status && x.status !== 'COMPLETED') || x.state === 'PENDING');
  if (!c) return null;
  const wf = c.workflowName || c.name || c.context || 'Checks';
  const name = /secret|gitleaks/i.test(wf + ' ' + (c.name || '')) ? 'Secret scan' : wf;
  return { name, startedAt: ms(c.startedAt) || NaN, usual: usualTime(repo, c.workflowName || wf) };
}
const failedCheck = (pr) => (pr.statusCheckRollup || []).find((x) => x.status === 'COMPLETED' && ['FAILURE', 'TIMED_OUT', 'STARTUP_FAILURE'].includes(x.conclusion));
async function deployJob(run) {
  const jobs = await runJobs(run);
  const j = jobs.find((x) => x.status === 'in_progress') || jobs.find((x) => x.status !== 'completed');
  const step = j?.steps?.find((x) => x.status === 'in_progress');
  const hay = `${j?.name || ''} ${step?.name || ''}`;
  if (/testflight|apple/i.test(hay)) return 'TestFlight';
  if (/\beas\b|mobile|ios|iphone/i.test(hay)) return 'EAS build';
  return 'Deploying';
}
async function failedAt(run) {
  const jobs = await runJobs(run);
  const j = jobs.find((x) => x.conclusion === 'failure') || jobs.find((x) => x.conclusion && x.conclusion !== 'success' && x.conclusion !== 'skipped');
  if (!j) return '';
  const step = (j.steps || []).find((x) => x.conclusion === 'failure');
  return step ? `${j.name}: ${step.name}` : j.name;
}

// ---------- building the items ----------
function sessionTitle(s, named) {
  return named?.title || s?.title || '';
}

async function build() {
  const now = Date.now();
  const repos = await listRepos();
  const [repoData, merges, live, transcripts, named, declared] = await Promise.all([
    Promise.all(repos.map((r) => readRepo(r, now).catch((err) => { console.error('items:', r.repo, err.message); return null; }))),
    mergedBy(),
    liveSessions(),
    readTranscripts(now),
    sessionsModule.getSessions().catch(() => []),
    readDeclared()
  ]);
  const namedById = new Map((Array.isArray(named) ? named : []).map((s) => [s.id, s]));

  // The session behind each PR: the one that opened it, else the one that merged it.
  const openedBy = new Map();
  for (const s of transcripts.values()) for (const [k, t] of s.prLinks) {
    const prev = openedBy.get(k);
    if (!prev || t < prev.t) openedBy.set(k, { id: s.id, t });
  }

  const items = [];
  const latestOf = new Map(); // session id -> its latest PR item, which carries the session's question or ask
  for (const repo of repoData.filter(Boolean)) {
    for (const pr of repo.prs) {
      const created = ms(pr.createdAt), merged = ms(pr.mergedAt);
      if (created < RULES_START) continue;
      if (pr.state === 'CLOSED' && !pr.mergedAt) continue;
      if (pr.mergedAt && now - merged > WINDOW) continue;
      const key = `${repo.repo}#${pr.number}`;
      const sid = openedBy.get(key)?.id || (merges.get(key) || []).find((id) => transcripts.has(id)) || (merges.get(key) || [])[0] || '';
      const item = { id: `${repo.app}-${pr.number}`, app: repo.app, pr: pr.number, title: pr.title, sessionId: sid, _pr: pr, _repo: repo, _t: Math.max(created, merged || 0) };
      items.push(item);
      if (sid) {
        const prev = latestOf.get(sid);
        if (!prev || item._t > prev._t || (!pr.mergedAt && prev._pr.mergedAt)) latestOf.set(sid, item);
      }
    }
  }

  const out = [];
  for (const it of items) out.push(await prItem(it, { transcripts, live, namedById, declared, latestOf, now }));

  // Sessions with no PR of their own: working now, or their agent declared something unfinished, or their turn ended without a word. Mock asks are their own item.
  for (const s of transcripts.values()) {
    const app = appOfCwd(s.cwd);
    if (!app || s.lastTs < RULES_START || now - s.lastTs > WINDOW) continue;
    const status = live.get(s.id), busy = status === 'busy', blocked = !!status && !busy && status !== 'idle';
    const d = declared.get(s.id), c = closingOf(d, busy), silent = !!d && !d.terminal && !busy && !blocked;
    if (latestOf.has(s.id) && c?.ask?.kind !== 'mock') continue;
    if (!busy && !blocked && !silent && !(c && (c.question || c.ask || c.kind === 'waiting' || c.left))) continue;
    out.push(sessionItem(s, app, { busy, blocked, alive: !!status, d, c, silent, namedById, now }));
  }

  out.sort((a, b) => b._t - a._t);
  return out.map(({ _t, ...i }) => i);
}

async function prItem(it, ctx) {
  const { transcripts, live, namedById, declared, latestOf, now } = ctx;
  const pr = it._pr, repo = it._repo, s = transcripts.get(it.sessionId), status = live.get(it.sessionId);
  const alive = !!status, busy = status === 'busy', blocked = alive && !busy && status !== 'idle';
  const created = ms(pr.createdAt), merged = ms(pr.mergedAt);
  // A session's declaration belongs to its latest PR.
  const d = latestOf.get(it.sessionId) === it ? declared.get(it.sessionId) : null;
  const c = closingOf(d, busy), silent = !!d && !d.terminal && !busy && !blocked;
  const question = c?.question || null;
  const ask = c?.ask && c.ask.kind !== 'mock' ? c.ask : null;
  const archived = isArchived(it.sessionId); // Ben archived it: what only a declaration held no longer holds the PR
  const dep = pr.mergedAt ? deployState(pr, repo, now) : null;
  const check = !pr.mergedAt && pr.state === 'OPEN' ? runningCheck(pr, repo) : null;
  const badCheck = !pr.mergedAt ? failedCheck(pr) : null;
  const liveDone = dep && (dep.state === 'passed' || dep.state === 'none-needed');
  const liveAt = liveDone ? (dep.state === 'passed' ? dep.at : merged) : NaN;
  const prLabel = `PR #${pr.number}`;

  // Facts, oldest first.
  const facts = [];
  if (s && Number.isFinite(s.firstTs) && s.firstTs <= created) facts.push([s.firstTs, 'Session started', '']);
  const bt = s?.branches.get(pr.headRefName);
  if (Number.isFinite(bt)) facts.push([bt, `Branch ${pr.headRefName}`, '']);
  facts.push([created, `${prLabel} opened`, prLabel]);
  if (check) facts.push([check.startedAt || now, `${check.name} running`, '']);
  if (badCheck) facts.push([ms(badCheck.completedAt) || created, `${badCheck.workflowName || badCheck.name} failed`, '']);
  if (pr.mergedAt) facts.push([merged, 'Merged', '']);
  let failText = '';
  if (dep?.state === 'passed') facts.push([dep.at, 'Deploy passed, live', 'Deploy run']);
  if (dep?.state === 'running') facts.push(dep.run.status === 'in_progress' ? [dep.at, 'Deploy run started', 'Deploy run'] : [ms(dep.run.createdAt), 'Deploy run queued', 'Deploy run']);
  if (dep?.state === 'failed') { failText = await failedAt(dep.run); facts.push([dep.at, 'Deploy failed' + (failText ? ` at ${failText}` : ''), 'Deploy run']); }
  declaredFacts(facts, d, c, silent, s?.lastTs);
  if (s && !alive && Number.isFinite(s.lastTs)) {
    const end = question ? 'Session ended with the question open' : !pr.mergedAt ? 'Session ended, PR still open' : 'Session ended';
    facts.push([Math.max(s.lastTs, c?.at || 0), end, '']);
  }

  const item = {
    id: it.id, app: it.app, title: pr.title, who: 'agent', steps: BUILD,
    step: !pr.mergedAt ? 1 : liveDone ? 3 : 2,
    session: sessionTitle(s, namedById.get(it.sessionId)) || (it.sessionId ? 'A session on boris' : 'No session on boris'),
    sessionId: it.sessionId, sessionEnded: !alive, pr: pr.number,
    menu: null, checked: false
  };
  const doing = namedById.get(it.sessionId)?.doing;
  const set = (who, extra) => Object.assign(item, { who }, extra);

  if (dep?.state === 'failed' && !busy) {
    set('stuck', { reason: `Deploy failed${failText ? ` at ${failText}` : ''}, ${when(dep.at, now)}. No session is on it.`, short: `Deploy failed ${clock(dep.at)}` });
  } else if (check) {
    const ran = Number.isFinite(check.startedAt) ? now - check.startedAt : null;
    set('job', { job: check.name, reason: `${check.name} on ${prLabel}` + (ran != null ? `, running ${dur(ran)}.` : ', queued.') + (check.usual ? ` It usually takes ${dur(check.usual)}.` : '') });
  } else if (dep?.state === 'running' && dep.run.status !== 'in_progress' && now - ms(dep.run.createdAt) > QUEUED_STUCK && !busy) {
    // A deploy run that no runner has picked up for this long won't start on its own (on boris: no runner registered).
    set('stuck', { reason: `Deploy run for ${prLabel} has been queued ${dur(now - ms(dep.run.createdAt))}; no runner has picked it up.`, short: 'Deploy not picked up' });
  } else if (dep && (dep.state === 'running' || dep.state === 'pending')) {
    const job = dep.run ? await deployJob(dep.run) : 'Deploying';
    const usual = dep.run ? usualTime(repo, dep.run.workflowName) : null;
    set('job', { job, reason: dep.state === 'pending' ? `Merged ${ago(merged, now)}; waiting for the deploy run to start.`
      : dep.run.status !== 'in_progress' ? `Deploy run for ${prLabel} queued for ${dur(now - ms(dep.run.createdAt))}.` + (usual ? ` It usually takes ${dur(usual)} once it starts.` : '')
      : `Deploy run for ${prLabel}, ${dur(now - dep.at)} in.` + (usual ? ` Usually about ${dur(usual)}.` : '') });
  } else if (!liveDone && busy) {
    set('agent', { reason: doing || 'Its session is working.' });
  } else if (question) {
    set('ben', { question: { asked: when(c.at, now), parts: question } });
  } else if (ask && liveDone) {
    set('ben', { ask: { kind: ask.kind, text: ask.text, liveAt: when(liveAt, now) } });
  } else if (c?.kind === 'waiting' && alive) {
    set('job', { job: clip(c.on, 24), reason: `Waiting on ${c.on}.` });
  } else if (c?.kind === 'waiting' && !archived) {
    set('stuck', STOPPED(c.on));
  } else if (silent && !archived) {
    set('stuck', NO_STATUS);
  } else if (c?.left && !archived) {
    set('stuck', LEFT(c.left));
  } else if (liveDone) {
    set('live', { reason: `Live since ${when(liveAt, now)}. Nothing for you to check.`, unseen: !isSeen(it.id, liveAt) });
  } else if (!pr.mergedAt && !alive) {
    set('stuck', s ? { reason: `${prLabel} left open. Its session ended ${ago(s.lastTs, now)}.`, short: `${prLabel} left open` }
      : { reason: `${prLabel} is open and no session on boris is on it.`, short: `${prLabel} left open` });
  } else if (dep?.state === 'missing') {
    set('stuck', { reason: `Merged ${when(merged, now)} with no deploy run.`, short: 'No deploy run' });
  } else if (!pr.mergedAt) {
    set('agent', { reason: badCheck ? `${badCheck.workflowName || badCheck.name} failed on ${prLabel}. Its session is idle.` : `Its session's turn ended with ${prLabel} open.` });
  } else {
    set('agent', { reason: `Deploy failed; its session is on it.` });
  }
  if (c) item.report = c.report;
  item.menu = menuOf(c, now);
  return finish(item, facts, now);
}

function sessionItem(s, app, { busy, blocked, alive, d, c, silent, namedById, now }) {
  const named = namedById.get(s.id);
  const question = c?.question || null, ask = c?.ask || null, mock = ask?.kind === 'mock';
  const facts = [[s.firstTs, 'Session started', '']];
  for (const [b, t] of s.branches) if (!/^(master|main|HEAD)$|^worktree-/.test(b) && Number.isFinite(t)) facts.push([t, `Branch ${b}`, '']);
  declaredFacts(facts, d, c, silent, s.lastTs);
  if (busy) facts.push([s.lastTs, 'Working', '']);
  if (!alive) facts.push([Math.max(s.lastTs, c?.at || 0), question ? 'Session ended with the question open' : 'Session ended', '']);
  const title = sessionTitle(s, named) || 'A session on boris';
  const item = {
    id: s.id, app, title, who: 'stuck', steps: mock ? FROM_MOCK : BUILD, step: 0,
    session: title, sessionId: s.id, sessionEnded: !alive, menu: menuOf(c, now), checked: false
  };
  if (busy) Object.assign(item, { who: 'agent', reason: named?.doing || 'Its session is working.' });
  else if (blocked) Object.assign(item, { who: 'agent', reason: 'Waiting on you in the Claude app.' });
  else if (question) Object.assign(item, { who: 'ben', question: { asked: when(c.at, now), parts: question } });
  else if (ask) Object.assign(item, { who: 'ben', ask: { kind: ask.kind, text: ask.text, liveAt: '' } });
  else if (c?.kind === 'waiting') Object.assign(item, alive ? { who: 'job', job: clip(c.on, 24), reason: `Waiting on ${c.on}.` } : STOPPED(c.on));
  else if (c?.left) Object.assign(item, LEFT(c.left));
  else Object.assign(item, NO_STATUS);
  if (c) item.report = c.report;
  return finish(item, facts, now);
}

function finish(item, facts, now) {
  const sorted = facts.filter((x) => Number.isFinite(x[0])).sort((a, b) => a[0] - b[0]);
  const last = sorted.length ? sorted[sorted.length - 1][0] : now;
  // Overnight: the latest fact is from midnight to 6 AM today.
  if (ymd(last) === ymd(now) && hourOf(last) < 6 && item.who !== 'agent') item.overnight = true;
  item.facts = sorted.map(([t, text, link]) => [when(t, now), text, link]);
  item._t = last;
  return item;
}

// ---------- cache ----------
let cache = null, inflight = null, timer = null;
function refresh() {
  if (!inflight) {
    const t0 = Date.now();
    inflight = build().then((items) => {
      cache = { items, at: Date.now() };
      if (process.env.BILLBOARD_DEBUG) console.log(`items: ${items.length} in ${Date.now() - t0} ms`);
    }).catch((err) => console.error('items: refresh failed', err)).finally(() => { inflight = null; });
  }
  return inflight;
}
async function current() {
  if (!timer) { timer = setInterval(refresh, REFRESH_MS); timer.unref(); }
  if (!cache) await refresh();
  if (cache && Date.now() - cache.at > REFRESH_MS) refresh();
  return cache ? cache.items : [];
}

// isSeen is read at request time, so an item opened a moment ago leaves Done at once.
// An ask Ben cleared with It works or Done (server/acted.mjs) leaves for good: the item is live and checked.
export async function getItems() {
  const now = Date.now();
  return structuredClone(await current()).filter((i) => !(i.who === 'stuck' && !i.pr && isArchived(i.sessionId))).map((i) => {
    const c = i.who === 'ben' && i.ask && i.ask.kind !== 'mock' ? clearedAsk(i.id, i.ask.text) : null;
    if (c) {
      const at = ms(c.at);
      i.who = 'live'; i.step = i.steps.length - 1; i.checked = true; i.unseen = false;
      i.reason = `You marked it ${c.label === 'Done' ? 'done' : 'working'} ${when(at, now)}.`;
      i.facts.push([when(at, now), c.label === 'Done' ? 'You marked it done' : 'You marked it working', '']);
      delete i.ask;
      if (i.report && i.report.needs) i.report.needs = '';
    }
    if (i.who === 'live' && i.unseen) i.unseen = !isSeen(i.id);
    return i;
  });
}
// server/act.mjs calls this after starting a session, so its item shows sooner than the minute's refresh.
export function refreshItems() { return refresh(); }
export async function getTracks() { return { build: [...BUILD], fromMock: [...FROM_MOCK] }; }
export async function getNow() {
  const now = Date.now(), ll = lastLooked(now);
  return {
    day: new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' }).format(now),
    time: clock(now),
    lastLooked: ll ? when(ms(ll), now) : ''
  };
}
// Start reading as soon as the server loads, so the first page open doesn't wait.
refresh();
