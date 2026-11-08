# Billboard API contract

`server/index.mjs` serves `web/` as static files and this JSON API. Node 24, ESM, standard library only, no build step.
Port 4710 (`PORT` overrides), bound to all interfaces; the tailnet is the only way in, so there is no sign-in.

Every route is `GET` except `POST /api/seen`, and answers `application/json` and `cache-control: no-cache`. An unknown `/api/` path answers 404
`{ "error": "No such route" }`, another method 405, and a source that throws 500 `{ "error": "<message>" }`.

The front end (`web/data.js`) fetches the three board routes once at start-up and puts each field into the global the
mock's `data.js` declared (named in brackets below), so the feature files read exactly what the mock read. The shape
reference is the mock "Billboard Mocks" (`data.js`); `server/fixtures.mjs` holds its data verbatim.

## Sources
One module per data kind, so each can be replaced on its own. Each export is `async` and returns a fresh copy.

| Module | Exports | Feeds |
|---|---|---|
| `server/sources/items.mjs` | `getItems()`, `getTracks()`, `getNow()` | `/api/today-work` items, build, fromMock, now |
| `server/sources/sessions.mjs` | `getSessions()`, `getThreads()` | `/api/today-work` sessions, threads |
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
| `menu` | `{ asked: string, parts: Part[] }`? | a "What next?" offer after shipping; never counts as waiting. Needs Ben's input to tell from a question, so `null` for now |
| `reason` | string? | why it is where it is, in words (not for `who: 'ben'`) |
| `short` | string? | with `who: 'stuck'`: the reason in a few words, for a project card |
| `overnight` | boolean? | it happened overnight |
| `unseen` | boolean? | with `who: 'live'`: Ben hasn't opened it yet (it shows under Done) |
| `checked` | boolean? | Ben marked a live item as working. Nothing records that yet, so `false` for now |
| `report` | `{ works: string, left: string, needs: string }`? | the agent's last report; empty strings for nothing |
| `facts` | `[time: string, text: string, link: string][]` | what happened, oldest first; `link` is a label or `''` |
| `sessionId` | string | the Claude Code session id behind it, or `''`; `/api/today-work` fills `Session.item` from it |

How `items.mjs` works it out (nothing is stored): an item is a PR in a `bensoutendijk` repo under `~/projects`
(id `<app>-<pr>`; open, or merged in the last 14 days; none from before 2026-11-02), joined to the session that opened
it (the transcript's `pr-link` records) or merged it (Prometheus `agent_os_session_pr`); or a session with no PR that is
working now or ended its turn on a question or ask (id = the session id). A mock ask is always its own item on `fromMock`.
- `step`: 0 no PR, 1 PR open, 2 merged and not yet live, 3 live (merged and its deploy passed, or the repo has no deploy workflow).
- `who`, first match: `stuck` a deploy failed and no session is working; `job` a check on the open PR or the deploy is running
  or queued; `agent` its session is working; `ben` the session's last turn ended on a question, or on an ask once the change is
  live (mock asks at once); `live`; `stuck` the PR is open and its session ended, or it merged with no deploy run though the repo
  has a deploy workflow; otherwise `agent` (its session is idle with the PR open).
- `job` names: `Secret scan`, `Deploying`, `EAS build`, `TestFlight` (from the running deploy job's step), or the check's own
  workflow name. The usual time is the median of that workflow's recent successful runs.
- A question's parts come from the numbered options in the agent's last message, the agent's pick marked "my pick" (else the
  first). A yes-or-no question gets `['Yes', 'No']`; an open one (which, what, this or that) gets `opts: []`: Ben replies in words.

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
| `cost` | number | dollars |
| `helpers` | number? | subagents running |
| `branch` | string? | |
| `item` | string | the item it works on, or `''` |
| `unseen` | boolean? | with `state: 'done'`: Ben hasn't opened it yet |

**Message** (in `threads`, keyed by item id or session id; ids with no thread get one built in the browser):
- `{ who: 'ben', at?: string, text: string, from?: string }`: Ben's message; `from` names where it was started (a mock row)
- `{ who: 'agent', text: string }`: the agent's words
- `{ who: 'tools', n: number, mins: number, live?: boolean }`: tool calls folded into one line
- `{ who: 'report', works: string, left: string, needs: string }`: its report as a card

## POST /api/seen
Body `{ id: string }`: an item's or a session's id. The page posts it when it opens that item's page or session's screen.
Answers `{ id, seen: "<ISO time>" }`, or 400 `{ error }`. `server/seen.mjs` keeps it in `~/.local/state/billboard/seen.json`
(`BILLBOARD_STATE` overrides the folder); its `isSeen(id, doneAt)` is how a source sets `unseen`. Anything finished before
that file was first made counts as seen. `Now.lastLooked` is the last time Ben opened something before this visit, or `''`.

## GET /api/projects
```
{
  apps:   Project[],             // [APPS]
  days14: string[],              // [DAYS14]  14 day labels, oldest first, e.g. 'Sat Nov 7'; the last is today
  dayPrs: { "<appKey>:<dayIndex>": [prNumber: number, title: string][] }   // [DAY_PRS] PRs merged that day
}
```
**Project**: `{ key, name, color: '#rrggbb', lastLive: string, designed: number, week: number, merges: number[7], m14: number[14], c14: number[14] }`:
`designed` is mock rows not built yet, `week` the cost this week in dollars, `merges` PRs merged on each of the last 7 days,
`m14` and `c14` merges and dollars per day on `days14`.

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
