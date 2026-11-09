// What agents declare about their sessions: one append-only file per session under ~/.local/state/billboard/declared/
// (BILLBOARD_STATE overrides the folder). bin/billboard-mcp.mjs and bin/billboard-hook.mjs write it; the sources read it.
// Every line is a versioned record { v, at, kind, ...fields }. A reader skips kinds it doesn't know, so new kinds can be
// added without breaking older sessions or this code. Shapes: server/CONTRACT.md.
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

const DIR = join(process.env.BILLBOARD_STATE || join(homedir(), '.local/state/billboard'), 'declared');
const VERSION = 1;
const ID = /^[\w-]{8,100}$/;
const TERMINAL = new Set(['ask', 'waiting', 'done']);

export function appendRecord(session, kind, fields = {}) {
  if (!ID.test(session || '')) throw new Error('Not a session id');
  mkdirSync(DIR, { recursive: true });
  appendFileSync(join(DIR, session + '.jsonl'), JSON.stringify({ v: VERSION, at: new Date().toISOString(), kind, ...fields }) + '\n');
}

function parse(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try { const r = JSON.parse(line); if (r && typeof r.kind === 'string') out.push(r); } catch { /* a line being written */ }
  }
  return out;
}

// Where a session stands: the turn's closing declaration (null if the turn hasn't declared one) and its latest `working`.
export function summarize(records) {
  let terminal = null, working = null, promptAt = 0;
  const started = [];
  for (const r of records) {
    if (r.kind === 'prompt') { promptAt = Date.parse(r.at) || 0; terminal = null; }
    else if (TERMINAL.has(r.kind)) terminal = r;
    else if (r.kind === 'working') { working = r; if (r.from) started.push({ at: Date.parse(r.at), from: r.from }); }
  }
  return { terminal, working, promptAt, started };
}

// The report an item or a session's screen shows for a closing declaration.
export function reportOf(t) {
  const r = t.report || {};
  const n = t.kind === 'ask' && t.questions ? t.questions.length : 0;
  return { works: r.works || '', left: r.left || '', needs: n ? (n === 1 ? 'The question.' : `The ${n} questions.`) : t.kind === 'ask' && t.action ? t.action.text : '' };
}

export function hasClosed(session) {
  try { return !!summarize(parse(readFileSync(join(DIR, session + '.jsonl'), 'utf8'))).terminal; } catch { return false; }
}

const cache = new Map(); // path -> { key, value }
// Every session that has declared or been prompted since the tools went in, by id. A session with no file predates them.
export async function readDeclared() {
  const out = new Map();
  let names = [];
  try { names = await readdir(DIR); } catch { return out; }
  for (const n of names) {
    if (!n.endsWith('.jsonl')) continue;
    const path = join(DIR, n), id = basename(n, '.jsonl');
    try {
      const st = await stat(path), key = st.size + ':' + st.mtimeMs;
      let c = cache.get(path);
      if (!c || c.key !== key) { c = { key, value: summarize(parse(await readFile(path, 'utf8'))) }; cache.set(path, c); }
      out.set(id, c.value);
    } catch { /* gone meanwhile */ }
  }
  return out;
}
