/* LEDGER: items (an item's page and its track)
   pending    An item's page: app, title, who has it now and why, the track large, then the question or ask, the agent's last report, and what happened with times
   pending    Questions: tap an option, then Send; the agent's pick is a plain label
   pending    Actions by state: a question gets Send and Reply; a try gets It works and Something's off; a mock ask gets Build it; stuck gets Fix it
   pending    Its session as a row: what the agent is doing this minute, its time, cost, helpers and branch (or that it ended), opening the session's screen (Ben, 2026-11-08: a way to the agent from Work)
   pending    An item's page is a full screen pushed from Today, Work or a project, with its own route
   pending    The PR and the Claude app as small links beside the title (Ben: rarely used)
   pending    The badge says who has it now: You, Agent, Live, Stuck, or the automated job that holds it (Secret scan, Deploying, EAS build, TestFlight)
   pending    A job's line says how long it has run against how long it usually takes
   dropped    2026-11-07 "Who's on it" badges (Agent on it, Waiting on GitHub, No one on it): Ben prefers the short ones
   dropped    2026-11-07 A plain "GitHub" badge: it named a website, not what was happening
   dropped    2026-11-07 Hide from Billboard: Ben wants leftovers to stay in the way
   pending    A "What next?" menu after shipping shows on the item but never counts as waiting on Ben
   mock-only  Links out show a toast instead of leaving
   dropped    2026-11-08 The Agents tab: Work and the item's session row cover it
*/
'use strict';

var WHO = { ben: ['You', 'orange'], agent: ['Agent', 'indigo'], job: ['', 'teal'], live: ['Live', 'green'], stuck: ['Stuck', 'red'] };
function findItem(id) { return S.items.filter(function (i) { return i.id === id; })[0]; }
function whoChip(i) { var w = WHO[i.who]; return '<span class="who ' + w[1] + '">' + (i.who === 'agent' || i.who === 'job' ? '<span class="pulse" aria-hidden="true"></span>' : '') + (i.who === 'job' ? i.job : w[0]) + '</span>'; }

// The track: steps before the current one are done; the current one takes the colour of who has it.
function trackHTML(i, big) {
  var cur = WHO[i.who][1];
  return '<span class="track' + (big ? ' big' : '') + '">' + i.steps.map(function (s, k) {
    var st = k < i.step ? 'done' : k > i.step ? 'todo' : i.who === 'stuck' ? 'fail' : i.who === 'live' ? (i.checked ? 'done' : 'skip') : 'now ' + cur;
    if (i.who === 'live' && k < i.step) st = 'done';
    return '<span class="tstep ' + st + '"><span class="tdot" aria-hidden="true">' + (st === 'fail' ? '!' : st === 'done' ? '✓' : '') + '</span><span class="tlabel">' +
      esc(st === 'skip' ? 'Nothing to check' : s) + '</span></span>';
  }).join('') + '</span>';
}

function optsHTML(p, compact) {
  return '<ol class="qopts' + (compact ? ' compact' : '') + '">' + p.opts.map(function (o, k) {
    return '<li class="' + (p.pick === k ? 'picked' : '') + '"><span class="qn">' + (k + 1) + '</span><span>' + esc(o) + (p.pick === k ? '<span class="qpick">Agent’s pick</span>' : '') + '</span></li>';
  }).join('') + '</ol>';
}
function questionBlock(q, isMenu) {
  return '<div class="qcard' + (isMenu ? ' menu' : '') + '"><p class="qhead">' + (isMenu ? 'After shipping, the agent offered' : 'Asked ' + esc(q.asked)) + '</p>' + q.parts.map(function (p) {
    return '<p class="qtext">' + esc(p.q) + '</p>' + optsHTML(p, false);
  }).join('') + (isMenu ? '<p class="qnote">This isn’t waiting on you. It leaves within a day.</p>' : '') + '</div>';
}

function itemBody(id) {
  var i = findItem(id); if (!i) return '<p class="empty">Gone.</p>';
  var why = i.who === 'ben' ? (i.question ? 'Waiting on your answer.' : 'Only you can do this.') : i.reason || '';
  var head = '<div class="sh-item" style="--app:' + appOf(i.app).color + '"><p class="rapp">' + appIcon(i.app) + esc(i.app) + '</p><h2>' + esc(i.title) + '</h2>' +
    (i.pr ? outLink(ghUrl(i.app, '/pull/' + i.pr), 'prlink', 'PR #' + i.pr + ' ↗') : '') +
    '<p class="sh-who">' + whoChip(i) + '<span>' + esc(why) + '</span></p></div>' + '<div class="trackcard">' + trackHTML(i, true) + '</div>';
  var ask = i.ask && i.who === 'ben' ? '<div class="askcard"><p>' + esc(i.ask.text) + '</p>' + (i.ask.liveAt ? '<p class="fine">Live since ' + esc(i.ask.liveAt) + '</p>' : '') + '</div>' : '';
  var q = i.question && i.who === 'ben' ? '<div class="qcard"><p class="qhead">Asked ' + esc(i.question.asked) + '</p>' + answerOpts(i, false) + '</div>' : '';
  var menu = i.menu ? questionBlock(i.menu, true) : '';
  var rep = i.report ? '<div class="block"><p class="bhead">The agent’s last report</p><dl class="report">' +
    (i.report.works ? '<dt>Works now</dt><dd>' + esc(i.report.works) + '</dd>' : '') +
    (i.report.left ? '<dt>What’s left</dt><dd>' + esc(i.report.left) + '</dd>' : '') +
    (i.report.needs ? '<dt>Needs you</dt><dd>' + esc(i.report.needs) + '</dd>' : '') + '</dl></div>' : '';
  // A fact's link is a label (contract); the PR, the run or the mock it names becomes a real link, anything else plain words.
  var facts = '<div class="block"><p class="bhead">What happened</p>' + (i.facts.length ? '<ol class="facts">' + i.facts.map(function (f, k) {
    var url = f[2] ? f[3] || factUrl(i.app, f[2]) : null;
    return '<li class="' + (k === i.facts.length - 1 ? 'last' : '') + '"><span class="ft">' + esc(f[0] || '') + '</span><span class="fx">' + esc(f[1] || '') +
      (f[2] ? ' ' + (url ? outLink(url, 'flink', esc(f[2])) : '<span class="fquiet">' + esc(f[2]) + '</span>') : '') + '</span></li>';
  }).join('') + '</ol>' : '<p class="fine">Nothing recorded yet.</p>') + '</div>';
  var acts = '<div class="acts">';
  if (i.who === 'ben' && i.question) acts += '<button type="button" class="btn-primary" data-act="sendanswer" data-arg="' + i.id + '"' + (picksDone(i) ? '' : ' disabled') + '>Send</button><button type="button" class="btn-plain" data-act="session" data-arg="' + i.id + '">Reply in your words</button>';
  else if (i.who === 'ben' && i.ask.kind === 'mock') acts += '<button type="button" class="btn-primary" data-act="buildit" data-arg="' + i.id + '">Build it</button>' + outLink(mockOf(i.app).url, 'btn-plain', 'Open ' + esc(mockOf(i.app).name)) + '';
  else if (i.who === 'ben') acts += '<button type="button" class="btn-primary" data-act="clear" data-arg="' + i.id + '|' + (i.ask.kind === 'do' ? 'Done' : 'Works') + '">' + (i.ask.kind === 'do' ? 'Done' : 'It works') + '</button><button type="button" class="btn-plain" data-act="off" data-arg="' + i.id + '">Something’s off</button>';
  else if (i.who === 'stuck') {
    if (i.pr && i.stuckBy !== 'silent') acts += '<button type="button" class="btn-primary" data-act="fix" data-arg="' + i.id + '">Fix it</button>';
    if (i.stuckBy && sessionOf(i.id)) acts += '<button type="button" class="btn-plain" data-act="archive" data-arg="' + sessionOf(i.id).id + '">Archive</button>';
  }
  acts += '</div>';
  return head + ask + q + (acts === '<div class="acts"></div>' ? '' : acts) + sessionRow(i) + menu + rep + facts;
}
function sessionOf(key) { return S.sessions.filter(function (s) { return s.id === key || (key && s.item === key); })[0]; }
function sessionRow(i) {
  var s = sessionOf(i.id), on = s && (s.state === 'working' || s.state === 'job');
  if (!s && !i.session) return '';
  var cost = s && s.cost != null ? '$' + s.cost.toFixed(2) : 'Cost not on record';
  var meta = s ? (on ? (s.mins != null ? [s.mins + ' min'] : []).concat([cost], s.helpers ? [plural(s.helpers, 'helper', 'helpers')] : [], s.branch ? [s.branch] : [])
    : (i.sessionEnded ? ['Not running'] : []).concat([s.since ? 'Turn ended ' + s.since : 'Turn ended', cost])) : ['Not running'];
  return '<h2 class="sec">Session</h2><ul class="list"><li><button type="button" class="row noicon" data-act="session" data-arg="' + i.id + '"><span class="rbody">' +
    '<span class="rtitle">' + (on ? '<span class="pulse live" aria-hidden="true"></span>' : '') + esc(s ? s.title : i.session) + '</span>' +
    (s ? '<span class="rline">' + esc(s.doing) + '</span>' : '') + '<span class="rquiet">' + meta.map(esc).join(' · ') + '</span></span>' + CHEV + '</button></li></ul>';
}
function itemSheet(id) {
  var i = findItem(id); if (i) i.unseen = false;
  markSeen(id);
  openSheet(itemBody(id), i ? i.title : 'Item', 'item-' + id); stack[stack.length - 1].redo = function () { return itemBody(id); };
}
