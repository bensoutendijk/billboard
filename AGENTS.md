# Billboard
What needs Ben across his Claude Code sessions, on one page. README.md says what's on it.

- The design is the "Billboard Mocks" artifact (https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9), split into `index.html`, `shell.js`, one file per list (`needs.js`, `tryit.js`, `running.js`, `shipped.js`), `data.js` and `demo.js`. Each list file's `LEDGER` says what's still to build.
- Nothing is built yet, and where the app runs isn't decided.
- The old Kanban app (React, Express, MongoDB, deployed to boris over SSH) is at the tag `kanban-v1`. Don't bring it back.
- CI's only PR check is the Gitleaks `secrets` job (`.github/workflows/secrets.yml`).
