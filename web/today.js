/* LEDGER: today (the Today tab: what waits on Ben, and what finished that he hasn't seen)
   pending    Waiting on you: a section heading with the count and See all, which opens every question and ask grouped
   pending    Waiting cards: one swipeable card per question or ask, questions first; tap an option and Send, or It works / Something's off / Build it, right on the card
   pending    A question asked while work is open stays after its session ends, marked "session ended"; only the main session counts
   pending    Ready for you: asks only Ben can do, shown once the change is live (mock asks show at once); Works or Done clears them, with Undo
   pending    Done: finished items and sessions Ben hasn't opened yet; opening one marks it seen and it leaves the list (Ben, 2026-11-08)
   pending    The Today tab's badge counts what waits on Ben
   pending    No title and no top line: the tab opens on the waiting cards
   pending    Each card's band says what its time is (asked, live)
   dropped    2026-11-07 One scrolling page of sections: Ben found it boring and missing a bottom bar
   dropped    2026-11-07 Large tab titles with only the date: Ben, too big and saying nothing
   dropped    2026-11-08 The top line (boris's state and today's cost), the overnight banner, the Waiting on you hero, and Since you last looked
*/
'use strict';

function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
function waiting() { return S.items.filter(function (i) { return i.who === 'ben'; }); }
function waitingQs() { return waiting().filter(function (i) { return i.question; }); }
function waitingAsks() { return waiting().filter(function (i) { return !i.question; }); }

function waitCard(i) {
  var a = appOf(i.app), body;
  if (i.question) {
    body = '<p class="wkind">Question' + (i.sessionEnded ? ' · session ended' : '') + '</p><p class="wq">' + esc(i.question.parts[0].q) + '</p>' + answerOpts(i, true) +
      '<div class="wacts"><button type="button" class="btn-primary sm" data-act="sendanswer" data-arg="' + i.id + '"' + (picksDone(i) ? '' : ' disabled') + '>Send</button>' +
      '<button type="button" class="btn-link" data-act="session" data-arg="' + i.id + '">Reply</button></div>';
  } else {
    var main = i.ask.kind === 'mock' ? '<button type="button" class="btn-primary sm" data-act="buildit" data-arg="' + i.id + '">Build it</button>' + outLink(mockOf(i.app).url, 'btn-link', 'Open the mock')
      : '<button type="button" class="btn-primary sm" data-act="clear" data-arg="' + i.id + '|' + (i.ask.kind === 'do' ? 'Done' : 'Works') + '">' + (i.ask.kind === 'do' ? 'Done' : 'It works') + '</button><button type="button" class="btn-link" data-act="off" data-arg="' + i.id + '">Something’s off</button>';
    body = '<p class="wkind">' + ({ try: 'Try it', do: 'For you to do', mock: 'In the mock' })[i.ask.kind] + '</p>' +
      '<p class="wq">' + esc(i.ask.text) + '</p><p class="wtitle">' + esc(i.title) + '</p><div class="wacts">' + main + '</div>';
  }
  return '<div class="wcard" style="--app:' + a.color + '">' +
    '<button type="button" class="wband" data-act="item" data-arg="' + i.id + '"><span class="wapp">' + appIcon(i.app) + esc(i.app) + '</span><span class="wage">' + esc(i.question ? 'asked ' + i.question.asked : i.ask.liveAt ? 'live ' + i.ask.liveAt : i.ask.kind === 'mock' ? 'in the mock' : 'for you') + ' ›</span></button>' +
    '<div class="wbody">' + body + '</div></div>';
}

function cardsHTML() {
  var w = waitingQs().concat(waitingAsks());
  if (!w.length) return '';
  return '<div class="cards" id="cards">' + w.map(waitCard).join('') + '</div>' +
    '<div class="dots" aria-hidden="true">' + w.map(function (x, k) { return '<i' + (k === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</div>';
}

// Done: finished work Ben hasn't opened yet. Opening it marks it seen.
function unseenDone() {
  var its = S.items.filter(function (i) { return i.who === 'live' && i.unseen; }).map(function (i) {
    return { act: 'item', arg: i.id, app: i.app, title: i.title, line: (i.report && i.report.works) || i.reason || '', when: i.reason || '' };
  });
  var ss = S.sessions.filter(function (s) { return s.state === 'done' && s.unseen && !s.item; }).map(function (s) {
    return { act: 'session', arg: s.id, app: s.app, title: s.title, line: s.doing, when: s.since ? 'Ended ' + s.since : 'Ended' };
  });
  return its.concat(ss);
}
function doneHTML() {
  var d = unseenDone();
  if (!d.length) return '';
  return '<h2 class="sec">Done <span class="n">' + d.length + '</span></h2><ul class="list">' + d.map(function (x) {
    return '<li><button type="button" class="row" data-act="' + x.act + '" data-arg="' + x.arg + '">' + appIcon(x.app) + '<span class="rbody"><span class="rapp">' + esc(x.app) + '</span>' +
      '<span class="rtitle">' + esc(x.title) + '</span><span class="rline">' + esc(x.line) + '</span>' + (x.act === 'session' ? '<span class="rquiet">' + esc(x.when) + '</span>' : '') + '</span>' + CHEV + '</button></li>';
  }).join('') + '</ul>';
}

function todayHTML() {
  var n = waiting().length;
  return '<div class="sechead"><h2 class="sec">Waiting on you <span class="n">' + n + '</span></h2>' + (n ? '<button type="button" class="seeall" data-act="waiting">See all</button>' : '') + '</div>' +
    (n ? cardsHTML() : '<p class="empty">Nothing waits on you.</p>') + doneHTML();
}

// See all: every question and ask, grouped.
function waitRow(i) {
  var line = i.question ? i.question.parts[0].q : i.ask.text;
  return '<li><button type="button" class="row" data-act="item" data-arg="' + i.id + '">' + appIcon(i.app) + '<span class="rbody"><span class="rapp">' + esc(i.app) + (i.sessionEnded ? ' · session ended' : '') + '</span>' +
    '<span class="rtitle">' + esc(i.title) + '</span><span class="rline">' + esc(line) + '</span></span>' + CHEV + '</button></li>';
}
function waitingPage() {
  var q = waitingQs(), a = waitingAsks();
  return '<h2 class="sh-title">Waiting on you</h2>' + (q.length ? '<h2 class="sec">Questions <span class="n">' + q.length + '</span></h2><ul class="list">' + q.map(waitRow).join('') + '</ul>' : '') +
    (a.length ? '<h2 class="sec">Things to try <span class="n">' + a.length + '</span></h2><ul class="list">' + a.map(waitRow).join('') + '</ul>' : '') +
    (q.length || a.length ? '' : '<p class="empty">Nothing waits on you.</p>');
}
function listSheet() { openSheet(waitingPage(), 'Waiting on you', 'waiting'); stack[stack.length - 1].redo = waitingPage; }

function wireCards() {
  var c = $('cards'); if (!c) return;
  c.addEventListener('scroll', function () {
    var k = Math.round(c.scrollLeft / (c.firstElementChild.offsetWidth + 12));
    var dots = c.nextElementSibling.children;
    for (var d = 0; d < dots.length; d++) dots[d].className = d === k ? 'on' : '';
  }, { passive: true });
}
