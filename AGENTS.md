# Billboard
A view over Ben's work with Claude Code sessions on boris. README.md says where it stands.

- No design yet. Don't propose screens or lists from earlier drafts: the first step is going over real designs from real apps with Ben, then mocking in the "Billboard Mocks" artifact (https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9).
- It will run on boris as a service, reachable only from Ben's tailnet (Ben, 2026-11-07). Not AWS.
- The old Kanban app (React, Express, MongoDB, deployed to boris over SSH) is at the tag `kanban-v1`. Don't bring it back.
- CI's only PR check is the Gitleaks `secrets` job (`.github/workflows/secrets.yml`).
