/* LEDGER: projects (the Projects tab: one card per project, and a project's own page)
   pending    A grid of project cards ordered by their worst fact: stuck, then waiting on Ben, then working, then quiet
   pending    Each card: the worst fact in words, a 7-day strip of merges, open items and cost this week
   pending    A project's page: its worst fact, then this week against last (merges and cost), then the detail charts, then last live and rows designed but not built (opening the mock), then its items as Work cards
   pending    Detail charts: merges per day for 14 days (this week in the project's colour, last week grey) and, below on the same days, cost per day
   pending    Tapping a day selects it: its date, merges, cost and the PRs merged that day
   mock-only  Only finances' Saturday has its PR list; other days say so
   pending    No title and no top line: the tab opens on the grid
   pending    New work on a project's page starts a session from a short brief
   pending    A project's page is a full screen with its own route
   dropped    2026-11-08 The "Other" card, the week's total on the top line, and reports Billboard couldn't read
   dropped    2026-11-08 The name Apps: Ben, Projects
*/
'use strict';

var RANK = { stuck: 0, ben: 1, agent: 2, job: 3, none: 4 };
function appWorst(key) {
  var its = S.items.filter(function (i) { return i.app === key; });
  var stuck = its.filter(function (i) { return i.who === 'stuck'; });
  if (stuck.length) return { rank: 'stuck', text: stuck[0].short + (stuck.length > 1 ? ', +' + (stuck.length - 1) + ' more' : ''), cls: 'red' };
  var ben = its.filter(function (i) { return i.who === 'ben'; });
  if (ben.length) {
    var q = ben.filter(function (i) { return i.question; }).length, a = ben.length - q, bits = [];
    if (q) bits.push(plural(q, 'question', 'questions')); if (a) bits.push(plural(a, 'thing to try', 'things to try'));
    return { rank: 'ben', text: bits.join(' and ') + ' for you', cls: 'orange' };
  }
  if (its.some(function (i) { return i.who === 'agent'; })) return { rank: 'agent', text: 'An agent is working', cls: 'indigo' };
  var job = its.filter(function (i) { return i.who === 'job'; })[0];
  if (job) return { rank: 'job', text: job.job + ' running', cls: 'teal' };
  return { rank: 'none', text: 'Quiet', cls: 'muted' };
}
function openCount(key) { return S.items.filter(function (i) { return i.app === key && i.who !== 'live'; }).length; }
function strip(a) {
  var max = Math.max.apply(null, a.merges.concat([1]));
  return '<span class="strip" aria-label="' + a.merges.reduce(function (s, n) { return s + n; }, 0) + ' merges in 7 days">' + a.merges.map(function (n) {
    return '<i style="height:' + (n ? Math.max(12, Math.round(n / max * 100)) : 6) + '%"' + (n ? '' : ' class="z"') + '></i>';
  }).join('') + '</span>';
}

function projectsHTML() {
  var rows = APPS.map(function (a) { return { a: a, w: appWorst(a.key) }; }).sort(function (x, y) { return RANK[x.w.rank] - RANK[y.w.rank]; });
  return '<div class="grid">' + rows.map(function (r) {
    var n = openCount(r.a.key);
    return '<button type="button" class="acard' + (r.w.rank === 'none' ? ' quiet' : '') + '" data-act="project" data-arg="' + r.a.key + '" style="--app:' + r.a.color + '">' +
      '<span class="ahead">' + appIcon(r.a.key) + '<span class="aname">' + esc(r.a.name) + '</span></span>' +
      '<span class="aworst ' + r.w.cls + '">' + esc(r.w.text) + '</span>' + strip(r.a) +
      '<span class="astats">' + (n ? n + ' open · ' : '') + (r.a.week ? '$' + r.a.week + ' this week' : 'No cost this week') + '</span></button>';
  }).join('') + '</div>';
}

var APP_DAY = {};
function bars(vals, cls, key, sel, fmt, solidFrom) {
  var max = Math.max.apply(null, vals.concat([1]));
  return '<div class="bars ' + cls + '">' + vals.map(function (v, k) {
    var h = v ? Math.max(4, Math.round(v / max * 100)) : 0;
    var label = (k === sel || (v === max && v > 0)) ? '<span class="bv">' + fmt(v) + '</span>' : '';
    return '<button type="button" class="bcol' + (k === sel ? ' sel' : '') + (k < solidFrom ? ' prev' : '') + '" data-act="appday" data-arg="' + key + ':' + k + '" aria-label="' + DAYS14[k] + ': ' + fmt(v) + '">' +
      label + '<span class="bar" style="height:' + h + '%"></span></button>';
  }).join('') + '</div>';
}
function dayAxis() {
  return '<div class="baxis" aria-hidden="true">' + DAYS14.map(function (d, k) { return '<span' + (k === 13 ? ' class="today"' : '') + '>' + d.charAt(0) + '</span>'; }).join('') + '</div>';
}
function appDetail(key) {
  var a = appOf(key), w = appWorst(key), wk = a.m14.slice(7), sel = APP_DAY[key] !== undefined ? APP_DAY[key] : 7 + wk.lastIndexOf(Math.max.apply(null, wk));
  var sum = function (arr, f, t) { return arr.slice(f, t).reduce(function (x, y) { return x + y; }, 0); };
  var its = S.items.filter(function (i) { return i.app === key; });
  var prs = DAY_PRS[key + ':' + sel];
  var dayLine = '<div class="bday"><p class="bdhead"><b>' + DAYS14[sel] + '</b> · ' + plural(a.m14[sel], 'merge', 'merges') + ' · $' + a.c14[sel] + '</p>' +
    (a.m14[sel] ? (prs ? '<ol class="bprs">' + prs.map(function (p) { return '<li><button type="button" class="flink" data-act="out" data-arg="PR #' + p[0] + '">#' + p[0] + '</button> ' + esc(p[1]) + '</li>'; }).join('') + '</ol>'
      : '<p class="fine">The PRs that day would list here.</p>') : '') + '</div>';
  return '<div class="sh-app">' + appIcon(key) + '<div><h2>' + esc(a.name) + '</h2><p class="aworst ' + w.cls + '">' + esc(w.text) + '</p></div></div>' +
    '<button type="button" class="btn-primary" data-act="newwork" data-arg="' + key + '">New work in ' + esc(a.name) + '</button>' +
    '<div class="chartcard" style="--app:' + a.color + '">' +
    '<div class="kpis"><div><span class="kn">' + sum(a.m14, 7, 14) + '</span><span class="kl">merges this week</span><span class="kp">' + sum(a.m14, 0, 7) + ' last week</span></div>' +
    '<div><span class="kn">$' + sum(a.c14, 7, 14) + '</span><span class="kl">cost this week</span><span class="kp">$' + sum(a.c14, 0, 7) + ' last week</span></div></div>' +
    '<p class="ctitle">Merges per day</p>' + bars(a.m14, 'tall', key, sel, function (v) { return String(v); }, 7) +
    '<p class="ctitle">Cost per day</p>' + bars(a.c14, 'short', key, sel, function (v) { return '$' + v; }, 7) + dayAxis() +
    '<p class="legend"><span class="lg cur"></span>This week<span class="lg prev"></span>Last week</p>' + dayLine + '</div>' +
    '<dl class="report"><dt>Last live</dt><dd>' + esc(a.lastLive) + '</dd>' +
    '<dt>Designed</dt><dd>' + (a.designed ? '<button type="button" class="flink" data-act="out" data-arg="the mock">' + a.designed + ' rows not built yet</button>' : 'Nothing waiting in the mock') + '</dd></dl>' +
    (its.length ? '<div class="ocards">' + its.map(orderCard).join('') + '</div>' : '<p class="empty">Nothing open.</p>');
}
function projectPage(key) { openSheet(appDetail(key), appOf(key).name, 'project-' + key); stack[stack.length - 1].redo = function () { return appDetail(key); }; }
function appDay(arg) { var p = arg.split(':'); APP_DAY[p[0]] = +p[1]; refresh(); }
