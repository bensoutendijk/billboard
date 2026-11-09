# Billboard API contract

`server/index.mjs` serves `web/` as static files and this JSON API. Node 24, ESM, standard library only, no build step.
Port 4710 (`PORT` overrides), bound to all interfaces; the tailnet is the only way in, so there is no sign-in.

Every route is `GET` except `POST /api/seen` and the `POST /api/act/*` routes, and answers `application/json` and `cache-control: no-cache`. An unknown `/api/` path answers 404
`{ "error": "No such route" }`, another method 405, and a source that throws 500 `{ "error": "<message>" }`.

The front end (`web/data.js`) fetches the three board routes at start-up and every 30 s (below) and puts each field into the global the
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
| `who` | `'ben' \| 'agent' \| 'job' \| 'live' \| 'stuck'` | who has it now: a question or ask waits on Ben, an agent is working, an automated job holds it, it is live, it is stuck, or its session is still open with no PR and nothing clearly asked |
| `job` | string? | with `who: 'job'`: the job's name (`Secret scan`, `Deploying`, `EAS build`, `TestFlight`) |
| `steps` | string[] | its track: equal to `build` or `fromMock` |
| `step` | number | index into `steps` where it is |
| `session` | string | its session's title |
| `sessionEnded` | boolean? | no process is running for its session (a question stays) |
| `pr` | number? | its PR number |
| `question` | `{ asked: string, parts: Part[] }`? | with `who: 'ben'`: the agent's open question |
| `ask` | `{ kind: 'try' \| 'do' \| 'mock', text: string, liveAt: string }`? | with `who: 'ben'`: something only Ben can do; `liveAt` is `''` for mock asks |
| `menu` | `{ asked: string, parts: Part[] }`? | the follow-ups a `done` offered, for a day after it; never counts as waiting |
| `reason` | string? | why it is where it is, in words (not for `who: 'ben'`) |
| `short` | string? | with `who: 'stuck'`: the reason in a few words, for a project card |
| `stuckBy` | `'silent' \| 'declared'`? | with `who: 'stuck'`, when no fact holds it: its turn ended with no status, or its agent said it left something or stopped waiting. Ben can archive these; Fix it shows unless `silent` |
| `overnight` | boolean? | it happened overnight |
| `unseen` | boolean? | with `who: 'live'`: Ben hasn't opened it yet (it shows under Done) |
| `checked` | boolean? | Ben marked its ask as working or done (`POST /api/act/clear`) |
| `report` | `{ works: string, left: string, needs: string }`? | the agent's last report; empty strings for nothing |
| `facts` | `[time: string, text: string, link: string][]` | what happened, oldest first; `link` is a label or `''` |
| `sessionId` | string | the Claude Code session id behind it, or `''`; `/api/today-work` fills `Session.item` from it |

How `items.mjs` works it out from facts and from what agents declared (Declarations, below): an item is a PR in a `bensoutendijk` repo under `~/projects`
(id `<app>-<pr>`; open, or merged in the last 14 days; none from before 2026-11-02), joined to the session that opened
it (the transcript's `pr-link` records) or merged it (Prometheus `agent_os_session_pr`); or a session with no PR that is
working now, whose agent declared something unfinished, or whose turn ended with no status (id = the session id). A mock ask is always its own item on `fromMock`.
A session's declaration belongs to its latest PR. A session with no declarations file predates the tools: it is never `ben` or stuck for want of a status.
- `step`: 0 no PR, 1 PR open, 2 merged and not yet live, 3 live (merged and its deploy passed, or the repo has no deploy workflow).
- `who`, first match (facts first, so a declaration can't clear them): `stuck` a deploy failed and no session is working; `stuck` the deploy run has been queued over 15 minutes
  (no runner picked it up) and no session is working; `job` a check on the open PR or the deploy is running
  or queued; `agent` its session is working; `ben` the agent's `ask` holds a question, or an action once the change is live (mock actions at once);
  `job` the agent's `waiting`, while its session runs (`stuck` once it doesn't); `stuck` the turn ended with no status (`Its turn ended without a status.`); `stuck` the agent's `done` left something; `live`;
  `stuck` the PR is open and its session isn't running, or it merged with no deploy run though the repo has a deploy workflow; otherwise `agent` (its session is idle with the PR open).
- `job` names: `Secret scan`, `Deploying`, `EAS build`, `TestFlight` (from the running deploy job's step), or the check's own
  workflow name, or what a `waiting` named. The usual time is the median of that workflow's recent successful runs.
- A question's parts, an ask, the report and the follow-ups are the agent's `ask` and `done` records, unchanged. Billboard never reads them out of its words.

An item whose ask (not a mock ask) Ben cleared with It works or Done, while its ask text is still the one he cleared, is
`who: 'live'` at the track's last step with `checked: true`, its `ask` dropped, a fact "You marked it working/done", and never `unseen`.

**Part**: `{ q: string, opts: string[], pick: number | null }`; `pick` is an index into `opts`, `null` when the agent named none.

**Session**: a Claude Code session on boris.
| Field | Type | Meaning |
|---|---|---|
| `id` | string | |
| `app` | string | project key |
| `title` | string | |
| `state` | `'working' \| 'job' \| 'ben' \| 'paused' \| 'done'` | tool calls now; its agent declared `waiting`; it declared `ask`, or Claude Code is waiting on Ben; it said `done` with something left, or its turn ended with no status; it said `done` with nothing left, or predates the tools |
| `job` | string? | with `state: 'job'` |
| `doing` | string | what it is doing or where it stopped, in words |
| `mins` | number? | minutes running (working and job) |
| `since` | string? | when its turn ended (other states) |
| `cost` | number \| null | dollars; `null` when no cost is on record |
| `helpers` | number? | subagents running |
| `branch` | string? | |
| `item` | string | the item it works on, or `''` |
| `unseen` | boolean? | with `state: 'done'`: Ben hasn't opened it since its turn ended (`isSeen` in `server/seen.mjs`); Done lists it only when it has no item |
| `url` | string \| null | the session in the Claude app (`https://claude.ai/code/session_…`), `null` when it has no app session |

A session Ben archived from Billboard (`POST /api/act/archive`) is left out of `sessions`. Its stuck item with no PR is left out of `items`; an item with a PR drops `stuckBy` and goes on to whatever its facts say.

Where sessions come from (`server/sources/sessions.mjs`): `claude agents --json` and `~/.claude/sessions/<pid>.json` for
live sessions, the main-session transcripts in `~/.claude/projects/-home-ben-projects*/<sessionId>.jsonl` changed since
2026-11-02 (read incrementally, refreshed every 10 s), and what agents declared. Transcripts give only what Claude Code recorded: the conversation shown as written,
titles, times, git branch and `pr-link` records; never meaning read from an agent's words or commands. A session's `app` is the `~/projects/<name>` under its cwd; a session in `~/projects` itself has no project and isn't shown.
`doing` is the agent's latest `working` while it runs. `cost` comes from Prometheus (`claude_code_cost_usage_USD_total` by `session_id`), else the transcript's last cost record.

**Message** (in `threads`, keyed by item id or session id; ids with no thread get one built in the browser):
- `{ who: 'ben', at?: string, text: string, from?: string }`: Ben's message; `from` names where it was started (a mock row)
- `{ who: 'agent', text: string }`: the agent's words
- `{ who: 'tools', n: number, mins: number, live?: boolean }`: tool calls folded into one line
- Real threads hold the latest 40 messages (plus Ben's opening message), each agent message cut at 1500 characters.
- `{ who: 'report', works: string, left: string, needs: string }`: the report the agent declared at the end of its turn, as a card

## POST /api/seen
Body `{ id: string }`: an item's or a session's id. The page posts it when it opens that item's page or session's screen.
Answers `{ id, seen: "<ISO time>" }`, or 400 `{ error }`. `server/seen.mjs` keeps it in `~/.local/state/billboard/seen.json`
(`BILLBOARD_STATE` overrides the folder); its `isSeen(id, doneAt)` is how a source sets `unseen`. Anything finished before
that file was first made counts as seen. `Now.lastLooked` is the last time Ben opened something before this visit, or `''`.

## POST /api/act/start
Starts a Claude Code session on boris the way the incidents service does (agent-os `bin/incidents.mjs`):
`claude --bg --remote-control <name> -n <name> --permission-mode auto "<prompt>"`, run in the project's folder under `~/projects`
(`BILLBOARD_PROJECTS` overrides; agent-os is `AGENT_OS_DIR`). It shows in the Claude app and on Work within about 15 s (the sources
refresh 3, 10 and 25 s after a start; the page loads again 1.5, 6, 15 and 30 s after any action). Takes about 4 s, and up to about 10 s more
if the session's app link is slow to appear.
Body `{ kind, arg, brief }`:
- `fix`: `arg` an item id; folder the item's app; name `Fix: <title>`; prompt the brief, then the PR's URL, the deploy run, why it's stuck,
  what happened (its facts) and its last session.
- `new`: `arg` a project key; name the brief's first words; prompt the brief, then the repo, its mock (`Project.mock`) and its open items.
- `aos`: `arg` the session's name (`Rule: <name>`, `Skill: <id>`, `Eval for <rule>`, `Remove PowerShell rules`); folder
  agent-os; prompt the brief and that every change is a PR that runs the evals.
- `eval`: `arg` a `lite/evals/` case name, or `*` for all; no brief. Folder agent-os; the prompt runs
  `node bin/agent-os.mjs eval lite --allow-tools Bash Read Write Edit Glob Grep [--case <name>]` from its own worktree, commits
  `evals/history.jsonl` in a PR and reports the scores. Billboard never runs an eval itself.

Answers `{ ok: true, app, name, job, sessionId, url }` (`sessionId` `''` and `url` `null` when they aren't written to the job's state file in time),
or 400 `{ error }` (empty brief, no such item, project or case, or `claude` didn't start one; its words are in the error).

## POST /api/act/clear
Body `{ id, text, label: 'Works' | 'Done' }` (the item id and its ask's text): records that Ben cleared the ask; `{ id, undo: true }` removes the
record (Undo). Answers `{ id, cleared: "<ISO time>" | null }`.

## POST /api/act/archive
Body `{ id }` (a session id): records it as archived, so it leaves Billboard; `{ id, undo: true }` brings it back. It is not archived in the Claude
app. Answers `{ id, archived: "<ISO time>" | null }`.

Both records live in `server/acted.mjs`'s `~/.local/state/billboard/acted.json` (`BILLBOARD_STATE` overrides the folder).

Sending into a running session (Send, Reply, Build it, Something's off) is not built: `claude -p "<text>" --cloud <session id>` delivers the
text, but the session receives it as a message from another Claude session (`origin: peer`, "Another Claude session sent a message"), not as
Ben's. Those buttons say so.

## Declarations
Agents tell Billboard where their session stands through typed tools; Billboard never works it out from what they wrote. `bin/billboard-mcp.mjs` is the MCP
server (`billboard`, stdio, one copy per session, standard library only) and `bin/billboard-hook.mjs` the Claude Code hook (`UserPromptSubmit` and `Stop`, for
sessions in a project under `~/projects`). Agent OS registers both for every session on boris. Both write through `server/declared.mjs` to one append-only file per session:
`~/.local/state/billboard/declared/<sessionId>.jsonl` (`BILLBOARD_STATE` overrides the folder). A session with no file predates the tools.

Each line is `{ v: 1, at: "<ISO time>", kind, ...fields }`. A reader skips a kind it doesn't know, so new kinds and fields can be added.
| `kind` | Fields | Written by |
|---|---|---|
| `prompt` | | the hook: a new turn began, which clears the last turn's declaration |
| `working` | `doing`, `from?` | an agent starting a piece of work, or changing what it works on |
| `ask` | `questions` `[{ q, options: string[], pick? }]` or `action` `{ kind: 'try'\|'do'\|'mock', text }`, `report?` | an agent ending its turn waiting on Ben |
| `waiting` | `on`, `report?` | an agent ending its turn waiting on something that isn't Ben |
| `done` | `report`, `offers?`, `pick?` | an agent ending its turn with nothing more to do; `report.left` says what it left unfinished |

`report` is `{ works?, left? }`. `pick` is an index, present only when the agent named one. The `Stop` hook sends an agent back once if its turn is ending with no `ask`,
`waiting` or `done`.

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
- `version`: string, the current rules version: the latest commit touching `lite/AGENTS.md`, `'<date> <short sha>'` (`'2026-11-07 544b891'`)
- `rules`: `{ id, name, step, text, evals: string[], history: [when, what][] }[]`: one per bullet or paragraph of `lite/AGENTS.md`, in order;
  `name` is its first words, `id` a slug of the name, `step` is `''` (no source), `evals` are eval names, `history` the commits that changed it, newest first
- `evals`: `{ [evalName]: [withTheRules: number|null, without: number|null] }` percent scores: the latest run of each `lite/evals/*` case in
  `evals/history.jsonl` (the rules' own runs); `without` is that run's baseline, else the latest baseline the case has; `null` for none
- `evalInfo`: `{ [evalName]: { runs, costUsd, judgeModel, date, baselineDate: string|null } | null }`: that latest run
- `skills`: `{ id, step, kb: number, runs: number, text, evals: string[], history: [when, what][], personal?: true }[]`: every `SKILL.md` under
  `lite/skills/` and `boris/skills/` (`personal`); `text` is its description, `runs` its loads in the last 4 weeks, `step` is `''`
- `permissions`: `{ allow: number, deny: number, groups: [name, count, sample][], lists: { [groupName]: string[] }, denied: [rule, meaning][] }`:
  from `~/.claude/settings.json`; `lists` holds each group's full rules
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

## What the page does with it
`web/data.js` loads the three routes on their own at start-up and again every 30 s (and when the page comes back into view),
keeping the open page and its scroll. A route that fails keeps what it loaded before (the tab says so in a quiet line); one
that never loaded reads as empty. The page tolerates missing optional fields and empty lists everywhere.

Acting: Start a session posts `/api/act/start`. Fix it and New work go back to where Ben was; an Agent OS brief tries to open the session in the Claude
app (iOS may refuse) and its page becomes Session started, with a link to the session (`https://claude.ai/code` when `url` is `null`). Run it and Run all
post it with `kind: 'eval'` and stay. It works / Done post `/api/act/clear` and show Undo; Archive posts `/api/act/archive` and shows Undo.
A button shows it's busy until the server answers, and a failure is a toast with the server's words.

Opening an item's page or a session's screen posts `POST /api/seen` with `{ "id": "<item or session id>" }` (best effort) and
forgets it locally at once, so it leaves Done even before the next load.

Links out are real links: an item's `pr` and a day's PRs go to `github.com/bensoutendijk/<app>/pull/<n>`; a fact's link label
`PR #<n>` goes to that PR, `Deploy run`, `EAS build`, `gitleaks` or `TestFlight` to the repo's Actions, and `<Name> Mocks` to the
project's mock; other labels show as plain words. Optional fields a source may add, which the page reads when present:
- `Session.url` (above): Open in the Claude app shows only when it is set
- `Project.mock`: `{ name: 'Finances Mocks', url }` (otherwise the links open the artifacts gallery)
- a fact's fourth element: its URL, overriding the label's
- `rules[].history`, `skills[].history`: `[when, text][]`, newest first; History is left out without them.
