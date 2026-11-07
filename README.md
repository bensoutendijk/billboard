# Billboard

A view over Ben's work with Claude Code sessions on boris, for optimizing that workflow.

Nothing is designed or built yet. The design starts by going over real designs from real apps, then moves to the "Billboard Mocks" artifact (https://claude.ai/artifact/UbyQP4gmaWyhihaCU8i1S9).

## Notification requirements (draft, from Flighty's alerts)
1. Warn early, from upstream signals: a failing deploy, red CI or a stuck session before Ben would notice it himself.
2. Every alert says why.
3. Push only real changes; routine progress sits somewhere glanceable instead.
4. Don't repeat what the Claude app or the incidents service already push.
5. Tapping an alert opens the session or PR it's about, with the reason at the top.

The original Billboard, a Kanban board app (React, Express, MongoDB), is kept at the tag `kanban-v1`.
