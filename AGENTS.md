# Billboard
Ben's command centre for his work with Claude Code on boris: see everything, act on any of it. README.md says where it stands.

- The design comes from real apps first: "Billboard References" (https://claude.ai/artifact/UJ6HhRz2s9dstwM24ykd16) holds them, what to take and leave from each, and the draft spec. The mock below has moved past that spec's read-only version 1 to the calls below; the spec will be rewritten from the mock. Don't bring back the cleared first draft.
- Ben's calls so far (2026-11-07):
  - iPhone only: design every screen for the phone, with native patterns; no desktop layouts.
  - It covers boris sessions only, and nothing from before the Nov 2 Agent OS rules (2026-11-02). Never call Agent OS "lite" in the app or the mock.
  - It acts, not just shows (reverses the earlier read-only, no-chat call): conversations start from what's on the board (answer a question, build it, fix it, new work on an app) and live in real Claude Code sessions on boris that also show in the Claude app. Billboard doesn't run its own chat system.
  - Agent OS is a special case with its own bespoke control plane: its parts (rules, skills, evals, permissions, memories) as Settings-style sections, each part measured where it works. It is not just another project. Every change is a session in agent-os that opens a PR and runs the evals; Billboard never edits a rule by hand. No flows, schedules or services: Agent OS has none.
  - No hiding: only finished work leaves on its own; anything unfinished stays in the way.
  - It brings the telemetry dashboards' value into the app; Ben won't open Grafana.
  - A session list is table stakes, not the point; Ben wants something beyond the Claude app's list.
  - Code, PRs and CI/CD live in GitHub (a deploy can run from Actions on a runner on boris). The data it joins (sessions, questions, PRs, deploys, incidents, cost) stays on boris, and the page is reachable only from Ben's tailnet. Not AWS.
- Ben's calls on 2026-11-08:
  - Four tabs: Today, Work, Projects, Agent OS. The Agents tab is gone: every session's work is an item on Work, and an item's page leads to its session.
  - Every drill-down is a full screen pushed onto its tab's own stack, with a back button, an edge swipe back and its own route; no sheets or modals. Tapping the open tab pops to its root.
  - No top lines, banners or hero cards on the tabs. Today is the waiting cards, then Done: finished work Ben hasn't opened yet.
  - Memories show exactly as Claude Code keeps them: one folder per project, its MEMORY.md in order, each memory typed and linked by name. No moving or converting memories for now.
  - Nothing made up in the mock: every entity must exist on boris, or the build is on the hook for it. Example numbers are fine.
  - Finished work is never on Work: it goes to Done on Today. Everything unfinished is on Work, including what waits on Ben (a You filter) and chats still open with no PR (Paused, until the session ends or Ben archives it).
- The mock, once there is one, is laid out as the `mock` skill says from its first screen: `index.html`, `data.js`, a file per feature with its `LEDGER`, `demo.js`, `shell.js`. Publish only the files you change.
- Billboard never reads meaning out of what an agent wrote or ran (Ben, 2026-11-08). Agents declare where their session stands through the `billboard` tools; Billboard shows those, facts from GitHub and what Claude Code recorded (the conversation as written, titles, times, branches, `pr-link`, cost). Sessions in `~/projects` itself aren't shown. Facts beat declarations.
- Stack: a Node 24 HTTP server (ESM, standard library only, no dependencies, no build step, no framework) that serves the page and a JSON API; the page is plain scripts ported from the mock. No tests (Agent OS rules).
- Layout:
  - `server/index.mjs`: the server, port 4710 on all interfaces; routes under `/api/`. `server/CONTRACT.md` documents every route and object shape; keep it current.
  - `server/sources/`: one module per data kind (`items.mjs`, `sessions.mjs`, `projects.mjs`, `agentos.mjs`), each async; they return `server/fixtures.mjs` (the mock's `data.js`, verbatim) until they read boris.
  - `web/`: the page. `index.html` (the mock's styles and markup), `data.js` (loads the API into the globals the mock's `data.js` declared), the feature files as in the mock, and `shell.js` (the mock's, without the Demo panel). `demo.js` and `pushes.js` aren't ported.
  - `bin/billboard-mcp.mjs`, `bin/billboard-hook.mjs`, `server/declared.mjs`: the tools agents use to declare where their session stands, and the store behind them (`server/CONTRACT.md`, Declarations).
  - `deploy/billboard.service`: the systemd user unit. `docs/DEPLOY.md`: how it deploys and how the runner is registered.
- Run it locally: `PORT=4799 node server/index.mjs` from your worktree (4710 is the live service), then open http://localhost:4799.
- Check a change: run it and drive the tabs and pages it touches with Playwright at 390x844 (no console errors, `scrollWidth` stays 390). Playwright isn't installed in this repo; a throwaway script with `NODE_PATH=/home/ben/.npm/_npx/e41f203b7505f1fb/node_modules` finds a copy on boris. Don't commit the script.
- Deploy: merging to master deploys. `.github/workflows/deploy.yml` runs on a self-hosted runner on boris, pulls `--ff-only` in the main checkout and restarts the unit. Served at http://boris.tail040b57.ts.net:4710 (tailnet only; the guard lets 4710 through and the runner is registered, `docs/DEPLOY.md`). Logs: `journalctl --user -u billboard`.
- The old Kanban app (React, Express, MongoDB, deployed to boris over SSH) is at the tag `kanban-v1`. Don't bring it back.
- CI's only PR check is the Gitleaks `secrets` job (`.github/workflows/secrets.yml`).

## Mock
"Billboard Mocks": https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9
- `index.html` (styles and markup), `data.js` (example data), one file per tab or feature: `today.js` (the Today tab: what waits on Ben, answering on the cards, Done), `work.js` (the Work tab: order cards with their tracks), `projects.js` (the Projects tab, a project's page, New work), `items.js` (an item's page, its track and its session), `session.js` (acting from the board and a session's screen), `agentos.js` (the Agent OS tab: Rules, Skills, Evals, Permissions and Memories, each part on its own page, changes through an agent-os session), `pushes.js` (the pushes), then `demo.js` and `shell.js` (tab bar, pushed pages and routes, start-up).
- No side-by-side script yet.
