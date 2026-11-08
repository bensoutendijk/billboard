# Billboard
Ben's command centre for his work with Claude Code on boris: see everything, act on any of it. README.md says where it stands.

- The design comes from real apps first: "Billboard References" (https://claude.ai/artifact/UJ6HhRz2s9dstwM24ykd16) holds them, what to take and leave from each, and the draft spec. The mock below shows that spec's read-only version 1; it is being reworked for the calls below. Don't bring back the cleared first draft.
- Ben's calls so far (2026-11-07):
  - It covers boris sessions only, and nothing from before Agent OS lite (2026-11-02).
  - It acts, not just shows (reverses the earlier read-only, no-chat call): conversations start from what's on the board (answer a question, build it, fix it, new work on an app) and live in real Claude Code sessions on boris that also show in the Claude app. Billboard doesn't run its own chat system.
  - Agent OS is a special case with its own bespoke control plane: its components (rules, skills, evals, permissions, schedules, services, memories) seen and changed directly, placed on a flow chart of the workflow. It is not just another project.
  - No hiding: only finished work leaves on its own; anything unfinished stays in the way.
  - It brings the telemetry dashboards' value into the app; Ben won't open Grafana.
  - A session list is table stakes, not the point; Ben wants something beyond the Claude app's list.
  - Code, PRs and CI/CD live in GitHub (a deploy can run from Actions on a runner on boris). The data it joins (sessions, questions, PRs, deploys, incidents, cost) stays on boris, and the page is reachable only from Ben's tailnet. Not AWS.
- The mock, once there is one, is laid out as the `mock` skill says from its first screen: `index.html`, `data.js`, a file per feature with its `LEDGER`, `demo.js`, `shell.js`. Publish only the files you change.
- The old Kanban app (React, Express, MongoDB, deployed to boris over SSH) is at the tag `kanban-v1`. Don't bring it back.
- CI's only PR check is the Gitleaks `secrets` job (`.github/workflows/secrets.yml`).

## Mock
"Billboard Mocks": https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9
- `index.html` (styles and markup), `data.js` (example data), one file per tab or feature: `today.js` (the Today tab: overnight, what waits on Ben, what changed), `work.js` (the Work tab: order cards with their tracks), `agents.js` (the Agents tab: sessions working and idle), `apps.js` (the Apps tab and an app's page), `trends.js` (the Trends tab: what the Grafana dashboards hold), `items.js` (an item's page and its track), `health.js` (reports Billboard couldn't read), `pushes.js` (the version-1 pushes), then `demo.js` and `shell.js` (tab bar, sheets, start-up).
- No side-by-side script yet.
