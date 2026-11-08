// Acting from the board: start a Claude Code session on boris, clear an ask, archive a done session (server/CONTRACT.md).
// A session starts as the incidents service starts one (agent-os bin/incidents.mjs): `claude --bg --remote-control <name>
// -n <name> --permission-mode auto "<brief>"` from the project's folder under ~/projects, so it also shows in the Claude app.
// Billboard acts with Ben's full authority; the tailnet is the only guard.
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getItems, refreshItems } from './sources/items.mjs';
import { refreshSessions } from './sources/sessions.mjs';
import { getApps } from './sources/projects.mjs';
import { archive, clearAsk, unarchive, unclearAsk } from './acted.mjs';

const HOME = homedir();
const PROJECTS = process.env.BILLBOARD_PROJECTS || join(HOME, 'projects');
const AGENT_OS = process.env.AGENT_OS_DIR || join(PROJECTS, 'agent-os');
const JOBS = join(HOME, '.claude', 'jobs');
const OWNER = 'bensoutendijk';

function claudeBin() {
  const local = join(HOME, '.local', 'bin', 'claude');
  return existsSync(local) ? local : 'claude';
}
function run(args, cwd) {
  return new Promise((resolve) => {
    execFile(claudeBin(), args, { cwd, encoding: 'utf8', timeout: 60e3, maxBuffer: 1e6 }, (err, stdout, stderr) =>
      resolve({ ok: !err, out: `${stdout || ''}${stderr || ''}`, err }));
  });
}
const short = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
function oneLine(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

function projectDir(app) {
  if (typeof app !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(app)) throw new Error('No such project');
  const dir = app === 'agent-os' ? AGENT_OS : join(PROJECTS, app);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`No folder for ${app} under ~/projects`);
  return dir;
}
function evalCases() {
  try { return readdirSync(join(AGENT_OS, 'lite', 'evals')).filter((n) => n !== 'results' && statSync(join(AGENT_OS, 'lite', 'evals', n)).isDirectory()); }
  catch { return []; }
}

// The Claude Code session id behind a background job, once its state file is written (best effort, a few seconds).
async function sessionIdOf(job) {
  for (let k = 0; k < 10; k++) {
    try {
      const dir = readdirSync(JOBS).find((d) => d.startsWith(job));
      if (dir) {
        const st = JSON.parse(readFileSync(join(JOBS, dir, 'state.json'), 'utf8'));
        if (st.sessionId) return { sessionId: st.sessionId, url: st.bridgeSessionId ? `https://claude.ai/code/${st.bridgeSessionId.replace(/^cse_/, 'session_')}` : null };
      }
    } catch { /* not written yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return { sessionId: '', url: null };
}

// After a start, the sources look again sooner than their own timers, so the new session is on Work within seconds.
function refreshSoon() {
  for (const ms of [3e3, 10e3, 25e3]) setTimeout(() => { refreshSessions(); refreshItems(); }, ms).unref();
}

// What the agent is told, beyond Ben's own words.
export async function briefFor(kind, arg, brief) {
  const words = String(brief || '').trim();
  if (kind === 'eval') {
    const all = arg === '*';
    if (!all && !evalCases().includes(arg)) throw new Error(`No eval case ${arg} in agent-os`);
    const cmd = 'node bin/agent-os.mjs eval lite --allow-tools Bash Read Write Edit Glob Grep' + (all ? '' : ` --case ${arg}`);
    return {
      app: 'agent-os', name: all ? 'Run all evals' : `Run eval ${arg}`,
      prompt: (all ? 'Run every Agent OS eval case' : `Run the Agent OS eval case ${arg}`) + ', with the rules and without them, and report the scores.\n\n' +
        `From your own worktree of agent-os: \`${cmd}\`. It appends to evals/history.jsonl; commit that in a PR and merge it as AGENTS.md says. ` +
        'Report each case\'s score with and without the rules against its last run, and anything that got worse. Ben started this from Billboard\'s Evals page.'
    };
  }
  if (!words) throw new Error('The brief is empty');
  if (kind === 'fix') {
    const i = (await getItems()).find((x) => x.id === arg);
    if (!i) throw new Error('That item isn’t on the board any more');
    const repo = `${OWNER}/${i.app}`, lines = [];
    if (i.pr) lines.push(`PR: https://github.com/${repo}/pull/${i.pr}`);
    const run = (i.facts || []).filter((f) => /deploy run/i.test(f[2] || '')).pop();
    if (run) lines.push(`Deploy run: ${run[3] || `https://github.com/${repo}/actions`}`);
    if (i.reason) lines.push(`Why Billboard says it's stuck: ${i.reason}`);
    if (i.facts && i.facts.length) lines.push('What happened:\n' + i.facts.map((f) => `- ${f[0]}: ${f[1]}`).join('\n'));
    if (i.session) lines.push(`Its last session: ${i.session}`);
    return { app: i.app, name: short('Fix: ' + oneLine(i.title), 60), prompt: `${words}\n\n${lines.join('\n')}` };
  }
  if (kind === 'new') {
    projectDir(arg);
    const app = (await getApps()).find((a) => a.key === arg);
    const open = (await getItems()).filter((i) => i.app === arg && i.who !== 'live').map((i) => `- ${i.title}`);
    const lines = [`Repo: ${OWNER}/${arg}, checked out at ~/projects/${arg}.`];
    if (app && app.mock && app.mock.name) lines.push(`Its mock: "${app.mock.name}"${app.mock.url ? ` (${app.mock.url})` : ''}.`);
    if (open.length) lines.push('Its open items on Billboard:\n' + open.slice(0, 12).join('\n'));
    return { app: arg, name: short(oneLine(words), 60), prompt: `${words}\n\n${lines.join('\n')}` };
  }
  if (kind === 'aos') {
    return { app: 'agent-os', name: short(oneLine(arg || 'Agent OS change'), 60),
      prompt: `${words}\n\nBen started this from Billboard's Agent OS tab. Every change is a PR in agent-os that runs the evals, as AGENTS.md says; Billboard never edits rules or permissions itself.` };
  }
  throw new Error('Unknown kind of session');
}

export async function startSession(body) {
  const { kind, arg, brief } = body || {};
  const b = await briefFor(kind, arg, brief);
  const cwd = projectDir(b.app);
  const r = await run(['--bg', '--remote-control', b.name, '-n', b.name, '--permission-mode', 'auto', b.prompt], cwd);
  const job = (r.out.match(/backgrounded · (\S+) ·/) || [])[1];
  if (!job) throw new Error(`Couldn't start a session in ${b.app}: ${oneLine(r.out || (r.err && r.err.message) || 'no output').slice(0, 240)}`);
  refreshSoon();
  return { ok: true, app: b.app, name: b.name, job, ...(await sessionIdOf(job)) };
}

export const ROUTES = {
  '/api/act/start': startSession,
  '/api/act/clear': async (b) => (b && b.undo ? unclearAsk(b.id) : clearAsk(b && b.id, b && b.text, b && b.label)),
  '/api/act/archive': async (b) => (b && b.undo ? unarchive(b.id) : archive(b && b.id))
};
