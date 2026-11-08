/* LEDGER: work (the Work tab: every open item as an order card with its track)
   pending    One card per item not waiting on Ben: app, title, who has it now, the track, the latest fact
   pending    The track: Build, PR, Live, Checked (or In the mock first, for mock asks), worked out from facts, never set
   pending    Stuck first (a failed deploy nobody is on, a PR left open after its session ended, a merge with no deploy run), then agents working, then jobs running, then live
   pending    Only finished items leave on their own (live, nothing for Ben); anything unfinished stays in the way until a fact settles it (Ben, 2026-11-07)
   pending    No title: the top is a row of filters with counts (All, Stuck, Agent, Jobs, Live)
   pending    Every session's work is an item here, so Work covers what the Agents tab showed; an item's page leads to its session (Ben, 2026-11-08)
   dropped    2026-11-07 Recently hidden: hiding is gone
*/
'use strict';

var WORK_FILTER = 'all';
function workHTML() {
  var order = { stuck: 0, agent: 1, job: 2, live: 3 };
  var all = S.items.filter(function (i) { return i.who !== 'ben'; }).sort(function (a, b) { return order[a.who] - order[b.who]; });
  var its = WORK_FILTER === 'all' ? all : all.filter(function (i) { return i.who === WORK_FILTER; });
  var f = [['all', 'All', all.length]].concat([['stuck', 'Stuck'], ['agent', 'Agent'], ['job', 'Jobs'], ['live', 'Live']].map(function (x) {
    return [x[0], x[1], all.filter(function (i) { return i.who === x[0]; }).length];
  }));
  var chips = '<div class="filters" role="tablist">' + f.map(function (x) {
    return '<button type="button" class="fchip f-' + x[0] + (WORK_FILTER === x[0] ? ' on' : '') + '" data-act="wfilter" data-arg="' + x[0] + '"' + (x[2] || x[0] === 'all' ? '' : ' disabled') + '>' + x[1] + ' <b>' + x[2] + '</b></button>';
  }).join('') + '</div>';
  return chips + '<div class="ocards">' + (its.length ? its.map(orderCard).join('') : '<p class="empty">Nothing here.</p>') + '</div>';
}

function orderCard(i) {
  return '<button type="button" class="ocard' + (i.who === 'stuck' ? ' is-stuck' : '') + '" data-act="item" data-arg="' + i.id + '" style="--app:' + appOf(i.app).color + '">' +
    '<span class="ohead"><span class="wapp">' + appIcon(i.app) + esc(i.app) + '</span>' + whoChip(i) + '</span>' +
    '<span class="otitle">' + esc(i.title) + '</span>' + trackHTML(i, false) +
    '<span class="oreason">' + esc(i.reason || '') + '</span></button>';
}
