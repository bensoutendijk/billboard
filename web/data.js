/* The board, loaded from the API into the globals the feature files read (the mock's data.js declared them inline).
   server/CONTRACT.md documents every route and shape. */
'use strict';

var NOW, BUILD, FROM_MOCK, ITEMS, SESSIONS, THREADS, APPS, DAYS14, DAY_PRS, AOS, PART_INFO, VERSIONS;

function getJSON(path) {
  return fetch(path, { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error(path + ' answered ' + r.status);
    return r.json();
  });
}
function loadBoard() {
  return Promise.all([getJSON('api/today-work'), getJSON('api/projects'), getJSON('api/agentos')]).then(function (r) {
    var tw = r[0], pj = r[1], ao = r[2];
    NOW = tw.now; BUILD = tw.build; FROM_MOCK = tw.fromMock; ITEMS = tw.items; SESSIONS = tw.sessions; THREADS = tw.threads;
    APPS = pj.apps; DAYS14 = pj.days14; DAY_PRS = pj.dayPrs;
    AOS = ao.aos; PART_INFO = ao.partInfo; VERSIONS = ao.versions;
  });
}
