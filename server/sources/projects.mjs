// Projects: the git repos under ~/projects, with merges and cost per day for 14 days and what last went live.
// Merges and deploys come from GitHub (gh), cost from Prometheus (Agent OS telemetry), joined to a project through the
// session's folder under ~/.claude/projects. Computed in the background every few minutes; requests read the cache.
import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const HOME = homedir();
const PROJECTS = process.env.BILLBOARD_PROJECTS || join(HOME, 'projects');
const TRANSCRIPTS = join(HOME, '.claude', 'projects');
const PROM = process.env.BILLBOARD_PROMETHEUS || 'http://127.0.0.2:9090';
const TZ = 'America/Chicago';
const REFRESH_MS = 5 * 60 * 1000;

// The mock's colours where it names the project; others get one from the palette by name.
const NAMED = { finances: '#30a46c', 'agent-os': '#6e56cf', 'outfit-planner': '#d6409f', billboard: '#0090ff', 'closing-cost-calculator': '#ad7f58', vhserver: '#8d8d8d' };
const PALETTE = ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#00a2c7', '#3e63dd', '#8e4ec6', '#e93d82', '#a18072'];
function colorOf(name) {
  if (NAMED[name]) return NAMED[name];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Dates in Chicago.
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const label = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' });
const monthDay = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
const wall = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
const dayOf = (t) => ymd.format(new Date(t));                       // 'YYYY-MM-DD' in Chicago
const utcDay = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
function offset(t) {                                                // Chicago wall clock minus UTC, in ms, at t
  const p = Object.fromEntries(wall.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
}
function midnight(s) {                                              // the instant Chicago's day s starts
  const guess = utcDay(s) - offset(utcDay(s) + 12 * 3600e3);
  return utcDay(s) - offset(guess);
}
function days14(now) {
  const today = utcDay(dayOf(now));
  return Array.from({ length: 14 }, (_, k) => new Date(today - (13 - k) * 864e5).toISOString().slice(0, 10));
}
const labelOf = (s) => label.format(new Date(utcDay(s))).replace(',', '');   // 'Sat Nov 7'
function when(s, today) {
  const ago = Math.round((utcDay(today) - utcDay(s)) / 864e5);
  if (ago === 0) return 'today';
  if (ago === 1) return 'yesterday';
  if (ago < 7) return weekday.format(new Date(utcDay(s)));
  return monthDay.format(new Date(utcDay(s)));
}

// The repo folders under ~/projects and their GitHub names.
async function repos() {
  const out = [];
  for (const e of await readdir(PROJECTS, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const dir = join(PROJECTS, e.name);
    try { await stat(join(dir, '.git')); } catch { continue; }
    let slug = null;
    try {
      const url = (await run('git', ['-C', dir, 'remote', 'get-url', 'origin'])).stdout.trim();
      const m = url.match(/github\.com[:/]([^/]+\/[^/]+?)(\.git)?$/);
      if (m) slug = m[1];
    } catch {}
    out.push({ key: e.name, dir, slug });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

async function gh(args, cwd) {
  const { stdout } = await run('gh', args, { cwd, maxBuffer: 16 << 20, timeout: 60e3 });
  return JSON.parse(stdout);
}

// Merged PRs, and which merge commits a deploy passed on.
async function github(r) {
  if (!r.slug) return { prs: [], deployed: null };
  const [prs, runs] = await Promise.all([
    gh(['pr', 'list', '-R', r.slug, '--state', 'merged', '--json', 'number,title,mergedAt,mergeCommit', '--limit', '200'], r.dir),
    gh(['run', 'list', '-R', r.slug, '--event', 'push', '--limit', '200', '--json', 'headSha,conclusion,workflowName'], r.dir).catch(() => [])
  ]);
  const deploys = runs.filter((x) => /deploy|release/i.test(x.workflowName));
  const deployed = deploys.length ? new Set(deploys.filter((x) => x.conclusion === 'success').map((x) => x.headSha)) : null;
  prs.sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
  return { prs, deployed };
}

// Which project each session belongs to: the folder its transcript is in (a worktree counts as its repo).
async function sessionProjects(keys) {
  const map = new Map();
  let folders = [];
  try { folders = await readdir(TRANSCRIPTS); } catch { return map; }
  const prefix = PROJECTS.replace(/[/.]/g, '-') + '-';
  const byLength = [...keys].sort((a, b) => b.length - a.length);
  await Promise.all(folders.map(async (f) => {
    if (!f.startsWith(prefix)) return;
    const rest = f.slice(prefix.length);
    const key = byLength.find((k) => rest === k.replace(/[/.]/g, '-') || rest.startsWith(k.replace(/[/.]/g, '-') + '--'));
    if (!key) return;
    for (const n of await readdir(join(TRANSCRIPTS, f)).catch(() => [])) if (n.endsWith('.jsonl')) map.set(n.slice(0, -6), key);
  }));
  return map;
}

async function prom(query, time) {
  const u = new URL('/api/v1/query', PROM);
  u.searchParams.set('query', query);
  if (time) u.searchParams.set('time', String(time / 1000));
  const res = await fetch(u, { signal: AbortSignal.timeout(10e3) });
  const body = await res.json();
  if (body.status !== 'success') throw new Error('Prometheus: ' + (body.error || res.status));
  return body.data.result;
}

// Dollars per project per day: each session's running total at each Chicago midnight, differenced, then given to its
// project. A session started outside a project folder is split over the repos of the PRs it merged, if any.
async function costs(days, keys, now) {
  const empty = () => Object.fromEntries(keys.map((k) => [k, new Array(14).fill(0)]));
  const out = empty();
  const edges = days.map(midnight).concat([Math.min(now, midnight(new Date(utcDay(days[13]) + 864e5).toISOString().slice(0, 10)))]);
  const totals = await Promise.all(edges.map((t) =>
    prom('sum by (session_id) (last_over_time(claude_code_cost_usage_USD_total[45d]))', t)
      .then((rows) => new Map(rows.map((r) => [r.metric.session_id, +r.value[1]])))));
  const [where, prRows] = await Promise.all([
    sessionProjects(keys),
    prom('max by (session_id, repo, pr) (last_over_time(agent_os_session_pr[10m]))').catch(() => [])
  ]);
  const shares = new Map();                                         // session -> { key: share }
  for (const r of prRows) {
    const key = (r.metric.repo || '').split('/').pop();
    if (!keys.includes(key)) continue;
    const s = shares.get(r.metric.session_id) || {};
    s[key] = (s[key] || 0) + +r.value[1];
    shares.set(r.metric.session_id, s);
  }
  const sessions = new Set(totals.flatMap((m) => [...m.keys()]));
  for (const id of sessions) {
    let split = where.has(id) ? { [where.get(id)]: 1 } : shares.get(id);
    if (!split) continue;
    const sum = Object.values(split).reduce((a, b) => a + b, 0);
    for (let k = 0; k < 14; k++) {
      const d = Math.max(0, (totals[k + 1].get(id) || 0) - (totals[k].get(id) || 0));
      if (!d) continue;
      for (const [key, w] of Object.entries(split)) out[key][k] += d * w / sum;
    }
  }
  return out;
}

async function compute() {
  const now = Date.now();
  const days = days14(now), today = days[13];
  const list = await repos();
  const keys = list.map((r) => r.key);
  const [gits, cost] = await Promise.all([
    Promise.all(list.map((r) => github(r).catch((err) => { console.error('projects: gh', r.key, err.message); return { prs: [], deployed: null }; }))),
    costs(days, keys, now).catch((err) => { console.error('projects: cost', err.message); return null; })
  ]);
  const dayPrs = {};
  const apps = list.map((r, i) => {
    const { prs, deployed } = gits[i];
    const m14 = new Array(14).fill(0);
    for (const p of prs) {
      const k = days.indexOf(dayOf(Date.parse(p.mergedAt)));
      if (k < 0) continue;
      m14[k]++;
      (dayPrs[r.key + ':' + k] ||= []).push([p.number, p.title]);
    }
    const live = (deployed && prs.find((p) => p.mergeCommit && deployed.has(p.mergeCommit.oid))) || prs[0];
    const c14 = cost ? cost[r.key].map((d) => Math.round(d)) : new Array(14).fill(0);
    return {
      key: r.key, name: r.key, color: colorOf(r.key),
      lastLive: live ? live.title + ', ' + when(dayOf(Date.parse(live.mergedAt)), today) : 'Nothing merged yet',
      designed: null,                                               // rows designed but not built live in the mock artifact, which the server can't read
      week: c14.slice(7).reduce((a, b) => a + b, 0),
      merges: m14.slice(7), m14, c14,
      last: prs[0] ? prs[0].mergedAt : ''
    };
  });
  // Busiest first: this week's merges and cost, then the most recent merge.
  apps.sort((a, b) => (b.week + 10 * b.merges.reduce((x, y) => x + y, 0)) - (a.week + 10 * a.merges.reduce((x, y) => x + y, 0)) || b.last.localeCompare(a.last));
  for (const a of apps) delete a.last;
  return { apps, days14: days.map(labelOf), dayPrs, at: now };
}

let cache = null, pending = null;
function refresh() {
  pending ||= compute().then((c) => { cache = c; return c; }).catch((err) => { console.error('projects:', err); if (!cache) throw err; return cache; }).finally(() => { pending = null; });
  return pending;
}
async function board() {
  if (!cache) return refresh();
  if (dayOf(cache.at) !== dayOf(Date.now())) return refresh();      // a new day moves every index
  return cache;
}
refresh().catch(() => {});
setInterval(() => refresh().catch(() => {}), REFRESH_MS).unref();

export async function getApps() { return structuredClone((await board()).apps); }
export async function getDays14() { return [...(await board()).days14]; }
export async function getDayPrs() { return structuredClone((await board()).dayPrs); }
