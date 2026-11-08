# Billboard API contract

`server/index.mjs` serves `web/` as static files and this JSON API. Node 24, ESM, standard library only, no build step.
Port 4710 (`PORT` overrides), bound to all interfaces; the tailnet is the only way in, so there is no sign-in.

Every route is `GET`, answers `application/json` and `cache-control: no-cache`. An unknown `/api/` path answers 404
`{ "error": "No such route" }`, another method 405, and a source that throws 500 `{ "error": "<message>" }`.

The front end (`web/data.js`) fetches the three board routes once at start-up and puts each field into the global the
mock's `data.js` declared (named in brackets below), so the feature files read exactly what the mock read. The shape
reference is the mock "Billboard Mocks" (`data.js`); `server/fixtures.mjs` holds its data verbatim.

## Sources
One module per data kind, so each can be replaced on its own. Each export is `async` and returns a fresh copy.

| Module | Exports | Feeds |
|---|---|---|
| `server/sources/items.mjs` | `getItems()`, `getTracks()`, `getNow()` | `/api/today-work` items, build, fromMock, now |
| `server/sources/sessions.mjs` | `getSessions()`, `getThreads()`, `getSessionFacts()` | `/api/today-work` sessions, threads; `getSessionFacts()` is for `items.mjs` to join on (below) |
| `server/sources/projects.mjs` | `getApps()`, `getDays14()`, `getDayPrs()` | `/api/projects` |
| `server/sources/agentos.mjs` | `getAos()`, `getPartInfo()`, `getVersions()` | `/api/agentos` |

A source that reads boris replaces its fixture import; nothing else changes as long as the shapes below hold.

## GET /api/health
`{ ok: true, started: "<ISO time the server started>" }`

## GET /api/today-work
What the Today and Work tabs, an item's page and a session's screen read.
```
{
  now:      Now,                 // [NOW]
  build:    string[],            // [BUILD]     the track ['Build', 'PR', 'Live', 'Checked']
  fromMock: string[],            // [FROM_MOCK] the track for mock asks ['In the mock', 'Build', 'PR', 'Live']
  items:    Item[],              // [ITEMS]
  sessions: Session[],           // [SESSIONS]
  threads:  { [itemOrSessionId]: Message[] }   // [THREADS]
}
```

**Now**: `{ day: "Sunday, November 8", time: "9:40 AM", lastLooked: "9:02 PM yesterday" }`

**Item**: one piece of work.
| Field | Type | Meaning |
|---|---|---|
| `id` | string | stable id, used in routes (`#item-<id>`, `#session-<id>`) |
| `app` | string | project key, matches `Project.key` |
| `title` | string | |
| `who` | `'ben' \| 'agent' \| 'job' \| 'live' \| 'stuck'` | who has it now: a question or ask waits on Ben, an agent is working, an automated job holds it, it is live, or it is stuck |
| `job` | string? | with `who: 'job'`: the job's name (`Secret scan`, `Deploying`, `EAS build`, `TestFlight`) |
| `steps` | string[] | its track: equal to `build` or `fromMock` |
| `step` | number | index into `steps` where it is |
| `session` | string | its session's title |
| `sessionEnded` | boolean? | the session has ended (a question stays) |
| `pr` | number? | its PR number |
| `question` | `{ asked: string, parts: Part[] }`? | with `who: 'ben'`: the agent's open question |
| `ask` | `{ kind: 'try' \| 'do' \| 'mock', text: string, liveAt: string }`? | with `who: 'ben'`: something only Ben can do; `liveAt` is `''` for mock asks |
| `menu` | `{ asked: string, parts: Part[] }`? | a "What next?" offer after shipping; never counts as waiting |
| `reason` | string? | why it is where it is, in words (not for `who: 'ben'`) |
| `short` | string? | with `who: 'stuck'`: the reason in a few words, for a project card |
| `overnight` | boolean? | it happened overnight |
| `unseen` | boolean? | with `who: 'live'`: Ben hasn't opened it yet (it shows under Done) |
| `checked` | boolean? | Ben marked a live item as working |
| `report` | `{ works: string, left: string, needs: string }`? | the agent's last report; empty strings for nothing |
| `facts` | `[time: string, text: string, link: string][]` | what happened, oldest first; `link` is a label or `''` |

**Part**: `{ q: string, opts: string[], pick: number }`; `pick` is the agent's pick, an index into `opts`.

**Session**: a Claude Code session on boris.
| Field | Type | Meaning |
|---|---|---|
| `id` | string | |
| `app` | string | project key |
| `title` | string | |
| `state` | `'working' \| 'job' \| 'ben' \| 'paused' \| 'done'` | tool calls now; waiting on an automated job; its turn ended on a question or ask; its turn ended with work still open; everything merged and live |
| `job` | string? | with `state: 'job'` |
| `doing` | string | what it is doing or where it stopped, in words |
| `mins` | number? | minutes running (working and job) |
| `since` | string? | when its turn ended (other states) |
| `cost` | number \| null | dollars; `null` when no cost is on record |
| `helpers` | number? | subagents running |
| `branch` | string? | |
| `item` | string | the item it works on, or `''` |
| `unseen` | boolean? | with `state: 'done'`: Ben hasn't opened it yet (not known yet for real sessions, so left out) |
| `url` | string \| null | the session in the Claude app (`https://claude.ai/code/session_…`), `null` when it has no app session |

Where sessions come from (`server/sources/sessions.mjs`): `claude agents --json` and `~/.claude/sessions/<pid>.json` for
live sessions, and the main-session transcripts in `~/.claude/projects/-home-ben-projects*/<sessionId>.jsonl` changed since
2026-11-02 (read incrementally, refreshed every 10 s). A session's `app` is the `~/projects/<name>` under its cwd (for a
session in `~/projects` itself, the project its commands touched most). `state`: `working` while its process is busy (`job`
when the running command is `gh pr checks --watch`, `gh run watch`, `eas build` or `eas submit`); a live session whose turn
ended on a numbered question or a "Needs Ben" section is `ben`; one with a PR still open on GitHub, a "What's left", or a
branch with no PR is `paused`; the rest, and every ended session, `done`. `cost` comes from Prometheus
(`claude_code_cost_usage_USD_total` by `session_id`), else the transcript's last cost record. Merged PRs come from the
transcript's `gh pr merge` calls, the labels service's `agent_os_session_pr`, and `gh pr view` for PRs it opened.

**SessionFacts** (`getSessionFacts()`, keyed by session id; not sent to the page): `{ id, app, cwd, live, status, startedAt,
lastAt, turnEndedAt, toolCalls, prsOpened: {n, url, repo}[], prsMerged: number[], report: {works, left, needs} | null,
question: {asked, parts: Part[]} | null, lastText }`. Times are epoch ms.

**Message** (in `threads`, keyed by item id or session id; ids with no thread get one built in the browser):
- `{ who: 'ben', at?: string, text: string, from?: string }`: Ben's message; `from` names where it was started (a mock row)
- `{ who: 'agent', text: string }`: the agent's words
- `{ who: 'tools', n: number, mins: number, live?: boolean }`: tool calls folded into one line
- Real threads hold the latest 40 messages (plus Ben's opening message), each agent message cut at 1500 characters.
- `{ who: 'report', works: string, left: string, needs: string }`: its report as a card

## GET /api/projects
```
{
  apps:   Project[],             // [APPS]
  days14: string[],              // [DAYS14]  14 day labels, oldest first, e.g. 'Sat Nov 7'; the last is today
  dayPrs: { "<appKey>:<dayIndex>": [prNumber: number, title: string][] }   // [DAY_PRS] PRs merged that day
}
```
**Project**: `{ key, name, color: '#rrggbb', lastLive: string, designed: number|null, week: number, merges: number[7], m14: number[14], c14: number[14] }`:
`designed` is mock rows not built yet (`null`: unknown, since the server can't read the mock artifact), `week` the cost of the last 7 days in whole dollars, `merges` PRs merged on each of the last 7 days,
`m14` and `c14` merges and whole dollars per day on `days14` (Chicago days). Merges come from `gh pr list`, cost from
Prometheus (`claude_code_cost_usage_USD_total`) joined to a project by the folder of the session's transcript, or by the
repos of the PRs it merged; `lastLive` is the latest merge whose deploy run passed (or the latest merge), with its day.
`server/sources/projects.mjs` recomputes all of it every 5 minutes.

## GET /api/agentos
```
{
  aos:      Aos,                 // [AOS]
  partInfo: { [skillId]: PartInfo },   // [PART_INFO]
  versions: Version[]            // [VERSIONS] newest first
}
```
**Aos**:
- `version`: string, the current rules version (`'2026-11-07 8f32cec'`)
- `rules`: `{ id, name, step, text, evals: string[] }[]`; `evals` are eval names
- `evals`: `{ [evalName]: [withTheRules: number, without: number] }` percent scores
- `skills`: `{ id, step, kb: number, runs: number, text, evals: string[], personal?: true }[]`
- `permissions`: `{ allow: number, deny: number, groups: [name, count, sample][], denied: [rule, meaning][], blocked: [when, appKey, what, why][] }`
- `memories`: `[project, slug, title, type: 'feedback'|'project'|'reference'|'user', line, links: string[]][]` in each project's MEMORY.md order; `links` are slugs, a missing one is shown as missing

**PartInfo**: `{ loads: number[4], used: [when, appKey, what, outcome][], loaded: [label, value][], contents: string[] }`;
`loads` per week, oldest first.

**Version**: `{ v, note, since, sessions: number, per: number, evals: number|null, pick: string, failed: string, changes: string[] }`
