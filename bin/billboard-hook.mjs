#!/usr/bin/env node
// Claude Code hooks for Billboard. UserPromptSubmit records that a new turn began, which clears the turn's declaration.
// Stop sends the agent back once if its turn is ending with no ask, waiting or done. Only sessions in a project under
// ~/projects count. A hook must never break a session, so any failure here exits quietly.
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { appendRecord, hasClosed } from '../server/declared.mjs';

const REASON = 'Before ending this turn, tell Billboard where it ended: call exactly one of the billboard tools ask, waiting or done (mcp__billboard__ask, mcp__billboard__waiting, mcp__billboard__done). If the tools are not available, end your turn.';

function inProject(cwd) {
  const root = resolve(process.env.BILLBOARD_PROJECTS || join(homedir(), 'projects')) + sep;
  return typeof cwd === 'string' && resolve(cwd).startsWith(root);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    const e = JSON.parse(raw);
    if (!e.session_id || !inProject(e.cwd)) return;
    if (e.hook_event_name === 'UserPromptSubmit') appendRecord(e.session_id, 'prompt');
    else if (e.hook_event_name === 'Stop' && !e.stop_hook_active && !hasClosed(e.session_id)) {
      process.stdout.write(JSON.stringify({ decision: 'block', reason: REASON }));
    }
  } catch { /* never break a session */ }
});
