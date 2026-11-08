/* The board, loaded from the API into the globals the feature files read (the mock's data.js declared them inline).
   server/CONTRACT.md documents every route and shape. Each route loads on its own: one that fails keeps what it had
   (or reads as empty on the first load) and its tabs say so in a quiet line. loadBoard() runs at start-up and every 30 s. */
'use strict';

var NOW = { day: '', time: '', lastLooked: '' }, BUILD = ['Build', 'PR', 'Live', 'Checked'], FROM_MOCK = ['In the mock', 'Build', 'PR', 'Live'];
var ITEMS = [], SESSIONS = [], THREADS = {}, APPS = [], DAYS14 = [], DAY_PRS = {};
var AOS = { version: '', rules: [], evals: {}, skills: [], permissions: { allow: 0, deny: 0, groups: [], denied: [], blocked: [] }, memories: [] }, PART_INFO = {}, VERSIONS = [];
// Which routes have loaded at least once, and which failed on the latest try.
var LOADED = {}, FAILED = {};

function getJSON(path) {
  return fetch(path, { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error(path + ' answered ' + r.status);
    return r.json();
  });
}
var ROUTES = {
  'today-work': function (tw) {
    NOW = tw.now || NOW; BUILD = tw.build || BUILD; FROM_MOCK = tw.fromMock || FROM_MOCK;
    ITEMS = tw.items || []; SESSIONS = tw.sessions || []; THREADS = tw.threads || {};
  },
  projects: function (pj) { APPS = pj.apps || []; DAYS14 = pj.days14 || []; DAY_PRS = pj.dayPrs || {}; },
  agentos: function (ao) {
    var a = ao.aos || {}, p = a.permissions || {};
    AOS = { version: a.version || '', rules: a.rules || [], evals: a.evals || {}, skills: a.skills || [], memories: a.memories || [],
      permissions: { allow: p.allow || 0, deny: p.deny || 0, groups: p.groups || [], denied: p.denied || [], blocked: p.blocked || [] } };
    Object.keys(p).forEach(function (k) { if (!(k in AOS.permissions)) AOS.permissions[k] = p[k]; });
    Object.keys(a).forEach(function (k) { if (!(k in AOS)) AOS[k] = a[k]; });
    PART_INFO = ao.partInfo || {}; VERSIONS = ao.versions || [];
  }
};
// Resolves once every route has answered or failed; rejects only when none has ever loaded.
function loadBoard() {
  var names = Object.keys(ROUTES);
  return Promise.all(names.map(function (n) {
    return getJSON('api/' + n).then(function (d) { ROUTES[n](d); LOADED[n] = true; delete FAILED[n]; }, function (err) { FAILED[n] = err.message || String(err); });
  })).then(function () {
    if (!names.some(function (n) { return LOADED[n]; })) throw new Error('Couldn’t reach Billboard on boris.');
  });
}
// The quiet line a tab shows when a route it reads failed.
function staleLine(names) {
  var bad = names.filter(function (n) { return FAILED[n]; });
  if (!bad.length) return '';
  return '<p class="fine stale">' + (bad.some(function (n) { return LOADED[n]; }) ? 'Couldn’t refresh. Showing what loaded earlier.' : 'Couldn’t load this yet. Trying again.') + '</p>';
}
// Opening an item or a session marks it seen on boris (POST /api/seen). The board also forgets it locally at once.
var SEEN = {};
function markSeen(id) {
  if (!id || SEEN[id]) return;
  SEEN[id] = true;
  try {
    fetch('api/seen', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: id }) }).catch(function () { /* offline */ });
  } catch (err) { /* no fetch */ }
}
