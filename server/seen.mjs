// What Ben has opened: a small JSON file under ~/.local/state/billboard/ (BILLBOARD_STATE overrides the folder).
// The page posts an item's or a session's id to POST /api/seen when it opens one (server/CONTRACT.md).
// Anything that finished before the file was first made counts as seen, so the first start doesn't flood Done.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = process.env.BILLBOARD_STATE || join(homedir(), '.local/state/billboard');
const FILE = join(DIR, 'seen.json');
const KEEP_OPENS = 50;

let state;
function load() {
  if (state) return state;
  try {
    state = JSON.parse(readFileSync(FILE, 'utf8'));
    if (!state.seen || typeof state.seen !== 'object') state.seen = {};
    if (!Array.isArray(state.opens)) state.opens = [];
  } catch {
    state = { since: new Date().toISOString(), seen: {}, opens: [] };
    save();
  }
  return state;
}
function save() {
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(FILE + '.tmp', JSON.stringify(state, null, 1));
    renameSync(FILE + '.tmp', FILE);
  } catch (err) {
    console.error('seen: could not save', FILE, err.message);
  }
}

// doneAt: when the thing finished (ms or ISO); anything done before the state file began counts as seen.
export function isSeen(id, doneAt) {
  const s = load();
  if (s.seen[id]) return true;
  if (doneAt != null && new Date(doneAt).getTime() < new Date(s.since).getTime()) return true;
  return false;
}

export function markSeen(id) {
  if (typeof id !== 'string' || !id || id.length > 200) throw new Error('id must be a short string');
  const s = load(), now = new Date().toISOString();
  s.seen[id] = now;
  s.opens = s.opens.concat(now).slice(-KEEP_OPENS);
  save();
  return { id, seen: now };
}

// The last time Ben opened something before this visit (a gap of 30 minutes starts a new visit), or null.
export function lastLooked(now = Date.now()) {
  const opens = load().opens.map((t) => new Date(t).getTime()).filter((t) => t <= now).sort((a, b) => a - b);
  let visitStart = now;
  for (let k = opens.length - 1; k >= 0; k--) {
    if (visitStart - opens[k] > 30 * 60e3) return new Date(opens[k]).toISOString();
    visitStart = opens[k];
  }
  return null;
}
