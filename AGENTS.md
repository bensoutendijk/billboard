# Billboard
A view over Ben's work with Claude Code sessions on boris. README.md says where it stands.

- No design yet. Don't propose screens or lists from earlier drafts: the first step is going over real designs from real apps with Ben, then mocking in the "Billboard Mocks" artifact (https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9).
- Ben's calls so far (2026-11-07):
  - It covers boris sessions only, and nothing from before Agent OS lite (2026-11-02).
  - It has no chat: no sending answers or notes into sessions. Every item opens its session in the Claude app. Billboard writes only its own small state (dropped, done).
  - A session list is table stakes, not the point; Ben wants something beyond the Claude app's list.
  - Code, PRs and CI/CD live in GitHub (a deploy can run from Actions on a runner on boris). The data it joins (sessions, questions, PRs, deploys, incidents, cost) stays on boris, and the page is reachable only from Ben's tailnet. Not AWS.
- The old Kanban app (React, Express, MongoDB, deployed to boris over SSH) is at the tag `kanban-v1`. Don't bring it back.
- CI's only PR check is the Gitleaks `secrets` job (`.github/workflows/secrets.yml`).
