/* LEDGER: session (acting from the board, and a session's screen)
   pending    Tap an option on a question, then Send: the answer goes into that session and the item moves to Agent
   pending    Reply in your own words from any item or session
   pending    Build it on a mock ask; Fix it on a stuck item starts a session with the failure as its brief
   pending    Something's off on a Ready-for-you ask opens a reply with the ask quoted
   pending    New work on an app: a short brief, with the app's repo, mock and open items attached
   pending    A session's screen: your messages, the agent's words, tool calls folded into one line, its last report as a card, a reply box, and Open in the Claude app as a small link
   pending    Archive a done session from its screen
   pending    A session's screen is a full screen with its own route; a brief is one too, and Start a session goes back to where Ben was
   pending    Every conversation is a real Claude Code session on boris, so it shows in the Claude app too
   mock-only  The agent's replies are canned and arrive after a short delay
*/
'use strict';

// Agents write Markdown: keep its line breaks, drop bold and code marks, and show a link as its words.
function agentText(t) {
  return esc(String(t || '').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '$1').replace(/\*\*|__|`/g, '').replace(/^#{1,6}\s+/gm, ''))
    .replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
}

var PICKS = {};
function pickOpt(arg) {
  var p = arg.split(':'), a = PICKS[p[0]] = PICKS[p[0]] || [];
  a[+p[1]] = a[+p[1]] === +p[2] ? undefined : +p[2];
  refresh();
}
// A part asked without options (an open question) needs words, not a pick: Reply answers it.
function picksDone(i) { var a = PICKS[i.id] || []; return i.question.parts.every(function (p, k) { return !p.opts.length || a[k] !== undefined; }) && i.question.parts.some(function (p) { return p.opts.length; }); }
function answerOpts(i, compact) {
  var a = PICKS[i.id] || [];
  return i.question.parts.map(function (p, qi) {
    var head = qi || !compact ? '<p class="qtext">' + esc(p.q) + '</p>' : '';
    if (!p.opts.length) return head + '<p class="fine">No options: reply in your own words.</p>';
    return head + '<div class="aopts">' + p.opts.map(function (o, oi) {
      return '<button type="button" class="aopt' + (a[qi] === oi ? ' on' : '') + '" data-act="pick" data-arg="' + i.id + ':' + qi + ':' + oi + '"><span class="qn">' + (oi + 1) + '</span><span>' + esc(o) +
        (p.pick === oi ? '<span class="qpick">Agent’s pick</span>' : '') + '</span></button>';
    }).join('') + '</div>';
  }).join('');
}

// A key with no thread from the server gets one from what the board knows (its report, or where it stopped); no made-up tool counts.
function threadOf(key) {
  var s0 = sessionOf(key);
  if (THREADS[key]) return THREADS[key];
  if (s0 && THREADS[s0.id]) return THREADS[s0.id];
  var i = findItem(key), s = S.sessions.filter(function (x) { return x.id === key; })[0] || s0;
  var t = [];
  if (i && i.report) t.push({ who: 'report', works: i.report.works, left: i.report.left, needs: i.report.needs });
  else if (s && s.doing) t.push({ who: 'agent', text: s.doing });
  else if (i && i.reason) t.push({ who: 'agent', text: i.reason });
  return t;
}
function bubble(m) {
  if (m.who === 'ben') return '<div class="msg me">' + (m.from ? '<span class="mfrom">From ' + esc(m.from) + '</span>' : '') + '<p>' + esc(m.text).replace(/\n/g, '<br>') + '</p></div>';
  if (m.who === 'tools') return '<div class="msg tools">' + (m.live ? '<span class="pulse" aria-hidden="true"></span>Working · ' : '') + m.n + ' tool calls · ' + m.mins + ' min</div>';
  if (m.who === 'report') return '<div class="msg rep"><dl class="report">' + (m.works ? '<dt>Works now</dt><dd>' + esc(m.works) + '</dd>' : '') +
    (m.left ? '<dt>What’s left</dt><dd>' + esc(m.left) + '</dd>' : '') + (m.needs ? '<dt>Needs you</dt><dd>' + esc(m.needs) + '</dd>' : '') + '</dl></div>';
  if (m.who === 'typing') return '<div class="msg tools"><span class="pulse" aria-hidden="true"></span>The agent is working</div>';
  return '<div class="msg agent"><p>' + agentText(m.text) + '</p></div>';
}
function sessionBody(key) {
  var i = findItem(key), s = sessionOf(key);
  if (!i && !s) return '<p class="empty">This session isn’t on the board any more.</p>';
  var app = i ? i.app : s.app, title = i ? i.session || (s ? s.title : 'Its session') : s.title, t = threadOf(key);
  var q = i && i.who === 'ben' && i.question ? '<div class="qcard">' + answerOpts(i, false) + '<button type="button" class="btn-primary" data-act="sendanswer" data-arg="' + i.id + '"' + (picksDone(i) ? '' : ' disabled') + '>Send</button></div>' : '';
  return '<div class="sh-item"><p class="rapp">' + appIcon(app) + esc(app) + '</p><h2>' + esc(title) + '</h2>' +
    (s && s.url ? outLink(s.url, 'prlink', 'Open in the Claude app ↗') : '') + '</div>' +
    '<div class="thread">' + (t.length ? t.map(bubble).join('') : '<p class="fine">Billboard can’t read this conversation yet.</p>') + '</div>' + q +
    '<div class="composer"><label class="sr" for="reply-' + key + '">Reply</label><textarea id="reply-' + key + '" rows="2" placeholder="Reply to the agent">' + esc(S.draft[key] || '') + '</textarea>' +
    '<button type="button" class="btn-send" data-act="reply" data-arg="' + key + '" aria-label="Send">↑</button></div>' +
    (s && (i ? i.who === 'paused' : s.state === 'done') ? '<div class="acts"><button type="button" class="btn-plain" data-act="archive" data-arg="' + s.id + '">Archive</button></div>' : '');
}
function openSession(key) {
  var i = findItem(key), s = sessionOf(key); if (s) { s.unseen = false; markSeen(s.id); }
  openSheet(sessionBody(key), (i && i.session) || (s ? s.title : 'Session'), 'session-' + key); stack[stack.length - 1].redo = function () { return sessionBody(key); };
}

function somethingOff(id) {
  var i = findItem(id);
  S.draft[id] = 'Something’s off with “' + i.ask.text + '”: ';
  openSession(id);
  var ta = $('reply-' + id); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

// Fix it and New work both start a session from a brief.
function briefSheet(kind, arg) {
  var app, brief, chips;
  if (kind === 'fix') {
    var i = findItem(arg); app = i.app;
    brief = i.app + ': ' + (i.pr ? 'PR #' + i.pr + ' — ' : '') + (i.reason || i.title) + ' Fix forward with a new PR.';
    chips = (i.pr ? ['PR #' + i.pr] : []).concat(['Deploy run log'], i.session ? ['Last session: ' + i.session] : []);
  } else {
    var a = appOf(arg); app = arg; brief = '';
    var mk = mockOf(arg).name, mn = mk.charAt(0).toUpperCase() + mk.slice(1);
    chips = ['Repo bensoutendijk/' + a.key, a.designed ? mn + ' · ' + a.designed + ' rows not built' : a.designed === 0 ? 'No mock rows waiting' : mn, plural(openCount(arg), 'open item', 'open items')];
  }
  openSheet('<div class="sh-item"><p class="rapp">' + appIcon(app) + esc(app) + '</p><h2>' + (kind === 'fix' ? 'Fix it' : 'New work') + '</h2></div>' +
    '<div class="chips">' + chips.map(function (c) { return '<span class="cchip">' + esc(c) + '</span>'; }).join('') + '</div>' +
    '<div class="composer tall"><label class="sr" for="brief">Brief</label><textarea id="brief" rows="5" placeholder="What should the agent do?">' + esc(brief) + '</textarea></div>' +
    '<button type="button" class="btn-primary" data-act="startwork" data-arg="' + kind + '|' + arg + '">Start a session</button>', kind === 'fix' ? 'Fix it' : 'New work', 'brief');
}

// Start a session: Fix it and New work post the brief; the server starts a real Claude Code session in the project's folder.
// On success the page goes back to where Ben was, and the board loads again soon so the new session shows on Work.
function startWork(arg, el) {
  var p = arg.split('|'), kind = p[0], key = p.slice(1).join('|'), ta = $('brief'), text = ta ? ta.value.trim() : '';
  if (!text) { if (ta) ta.focus(); return; }
  busy(el, true, 'Starting…');
  postAct('start', { kind: kind, arg: key, brief: text }).then(function (r) {
    if (stack.length && stack[stack.length - 1].route === 'brief') popPage();
    toast('Session started in ' + r.app); loadSoon();
  }, function (err) { busy(el, false); toast('Couldn’t start the session: ' + err.message); });
}
// Archive a done or paused session: Billboard records it and it leaves the board. The Claude app keeps it.
function archiveSession(id, el) {
  busy(el, true);
  postAct('archive', { id: id }).then(function () {
    var k = S.sessions.findIndex(function (x) { return x.id === id; }), s = S.sessions[k];
    if (k >= 0) S.sessions.splice(k, 1);
    var ik = S.items.findIndex(function (x) { return x.sessionId === id && x.who === 'paused'; }), it = S.items[ik];
    if (ik >= 0) { S.items.splice(ik, 1); popToRoot(); }
    else if (stack.length && stack[stack.length - 1].route === 'session-' + id) popPage(); else refresh();
    toast('Archived from Billboard', function () {
      postAct('archive', { id: id, undo: true }).then(function () { if (s && k >= 0) S.sessions.splice(k, 0, s); if (it) S.items.splice(ik, 0, it); refresh(); loadSoon(); },
        function (err) { toast('Couldn’t undo: ' + err.message); });
    });
  }, function (err) { busy(el, false); toast('Couldn’t archive: ' + err.message); });
}
