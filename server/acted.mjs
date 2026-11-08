// What Ben did from Billboard that Billboard must remember: asks he cleared (It works / Done) and done sessions he archived.
// A small JSON file beside seen.json under ~/.local/state/billboard/ (BILLBOARD_STATE overrides the folder).
// server/act.mjs writes it; items.mjs and sessions.mjs read it at request time (server/CONTRACT.md).
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = process.env.BILLBOARD_STATE || join(homedir(), '.local/state/billboard');
const FILE = join(DIR, 'acted.json');

let state;
function load() {
  if (state) return state;
  try { state = JSON.parse(readFileSync(FILE, 'utf8')); } catch { state = {}; }
  if (!state.cleared || typeof state.cleared !== 'object') state.cleared = {};
  if (!state.archived || typeof state.archived !== 'object') state.archived = {};
  return state;
}
function save() {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE + '.tmp', JSON.stringify(state, null, 1));
  renameSync(FILE + '.tmp', FILE);
}
function checkId(id) { if (typeof id !== 'string' || !id || id.length > 200) throw new Error('id must be a short string'); }

// Cleared asks are keyed by item id and hold the ask's text, so a new ask from the same session still shows.
export function clearAsk(id, text, label) {
  checkId(id);
  const s = load(), at = new Date().toISOString();
  s.cleared[id] = { at, text: String(text || '').slice(0, 600), label: label === 'Done' ? 'Done' : 'Works' };
  save();
  return { id, cleared: at };
}
export function unclearAsk(id) {
  checkId(id);
  const s = load(); delete s.cleared[id]; save();
  return { id, cleared: null };
}
// The record for an item whose ask is this text, or null.
export function clearedAsk(id, text) {
  const c = load().cleared[id];
  return c && (!c.text || !text || c.text === String(text).slice(0, 600)) ? c : null;
}

export function archive(id) {
  checkId(id);
  const s = load(), at = new Date().toISOString();
  s.archived[id] = at; save();
  return { id, archived: at };
}
export function unarchive(id) {
  checkId(id);
  const s = load(); delete s.archived[id]; save();
  return { id, archived: null };
}
export function isArchived(id) { return !!load().archived[id]; }
