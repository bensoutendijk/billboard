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
- `version`: string, the current rules version: the latest commit touching `lite/AGENTS.md`, `'<date> <short sha>'` (`'2026-11-07 544b891'`)
- `rules`: `{ id, name, step, text, evals: string[], history: [when, what][] }[]`: one per bullet or paragraph of `lite/AGENTS.md`, in order;
  `name` is its first words, `id` a slug of the name, `step` is `''` (no source), `evals` are eval names, `history` the commits that changed it, newest first
- `evals`: `{ [evalName]: [withTheRules: number|null, without: number|null] }` percent scores: the latest run of each `lite/evals/*` case in
  `evals/history.jsonl` (the rules' own runs); `without` is that run's baseline, else the latest baseline the case has; `null` for none
- `evalInfo`: `{ [evalName]: { runs, costUsd, judgeModel, date, baselineDate: string|null } | null }`: that latest run
- `skills`: `{ id, step, kb: number, runs: number, text, evals: string[], history: [when, what][], personal?: true }[]`: every `SKILL.md` under
  `lite/skills/` and `boris/skills/` (`personal`); `text` is its description, `runs` its loads in the last 4 weeks, `step` is `''`
- `permissions`: `{ allow: number, deny: number, groups: [name, count, sample][], lists: { [groupName]: string[] }, denied: [rule, meaning][], blocked: [when, appKey, what, why][] }`:
  from `~/.claude/settings.json`; `lists` holds each group's full rules; `blocked` is the tool calls permissions denied in the last 7 days' transcripts, newest first
- `memories`: `[project, slug, title, type: 'feedback'|'project'|'reference'|'user', line, links: string[]][]` in each project's MEMORY.md order; `title` and
  `line` are the MEMORY.md entry, `type` and `links` (`[[name]]`) come from the memory's file; a missing link is shown as missing

How a case's rules and skills are found: the case's own `rules:`/`skills:` lists in `case.yaml` if it has them; otherwise a skill whose name is
a word of the case's name or tags, and the rules whose text uses the case's words most.

**PartInfo**: `{ loads: number[4], used: [when, appKey, what, outcome][], loaded: [label, value][], contents: string[] }`;
`loads` per week, oldest first (the last 7 days last), from Prometheus's `agent_os_session_skill_runs` placed by each session's last event
(the transcripts' Skill calls if Prometheus is down); `used` the sessions that loaded it, newest first (title from the transcript; outcome
from the PRs it merged); `loaded` its cost a session from Claude Code's `skill_name` cost label and its sessions' failed tool calls;
`contents` the SKILL.md's H2 headings.

**Version**: `{ v, note, since, sessions: number, per: number|null, evals: number|null, pick: string, failed: string, changes: string[] }`:
one per commit touching `lite/AGENTS.md`, newest first. `sessions`, `per` (average cost a session) and `failed` come from Prometheus by the
labels service's `agent_os_version` (a skill or CLAUDE.md commit counts toward the rules version it ran under); `evals` is the average score
of the rules' eval runs while that version was in force; `pick` is `'—'` (no source yet); `changes` the commits under `lite/` in that version.

`server/sources/agentos.mjs` builds all of this in the background (about 2 seconds) and refreshes it every 5 minutes; a request gets the
last build. `AGENT_OS_DIR`, `CLAUDE_DIR` and `PROMETHEUS_URL` override where it reads.
