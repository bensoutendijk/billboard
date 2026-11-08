# Billboard

A view over Ben's work with Claude Code sessions on boris, for optimizing that workflow.

The design is the "Billboard Mocks" artifact (https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9).

**Live on boris: http://boris.tail040b57.ts.net:4710** (tailnet only). Add it to the iPhone Home Screen from Safari's Share menu.

The app shell is built: the four tabs and every pushed page, ported from the mock, reading the mock's example data from the
server's API. The sources in `server/sources/` don't read boris yet; each is replaced on its own (`server/CONTRACT.md`).

## Notification requirements (draft, from Flighty's alerts)
1. Warn early, from upstream signals: a failing deploy, red CI or a stuck session before Ben would notice it himself.
2. Every alert says why.
3. Push only real changes; routine progress sits somewhere glanceable instead.
4. Don't repeat what the Claude app or the incidents service already push.
5. Tapping an alert opens the session or PR it's about, with the reason at the top.

The original Billboard, a Kanban board app (React, Express, MongoDB), is kept at the tag `kanban-v1`.
