# Billboard
A view over Ben's work with Claude Code sessions on boris. README.md says where it stands.

- The design comes from real apps first: "Billboard References" (https://claude.ai/artifact/UJ6HhRz2s9dstwM24ykd16) holds them, what to take and leave from each, and the draft spec. The mock below follows that spec's version 1. Don't bring back the cleared first draft.
- Ben's calls so far (2026-11-07):
  - It covers boris sessions only, and nothing from before Agent OS lite (2026-11-02).
  - It has no chat: no sending answers or notes into sessions. Every item opens its session in the Claude app. Billboard writes only its own small state (dropped, done).
  - A session list is table stakes, not the point; Ben wants something beyond the Claude app's list.
  - Code, PRs and CI/CD live in GitHub (a deploy can run from Actions on a runner on boris). The data it joins (sessions, questions, PRs, deploys, incidents, cost) stays on boris, and the page is reachable only from Ben's tailnet. Not AWS.
- The mock, once there is one, is laid out as the `mock` skill says from its first screen: `index.html`, `data.js`, a file per feature with its `LEDGER`, `demo.js`, `shell.js`. Publish only the files you change.
- The old Kanban app (React, Express, MongoDB, deployed to boris over SSH) is at the tag `kanban-v1`. Don't bring it back.
- CI's only PR check is the Gitleaks `secrets` job (`.github/workflows/secrets.yml`).

## Mock
"Billboard Mocks": https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9
- `index.html` (styles and markup), `data.js` (example data), one file per feature: `today.js` (the headline and what's new), `waiting.js` (Waiting on you), `apps.js` (app lines and an app's items), `items.js` (In flight, an item's page, recently dropped), `health.js` (reports Billboard couldn't read), `pushes.js` (the version-1 pushes), then `demo.js` and `shell.js`.
- No side-by-side script yet.
