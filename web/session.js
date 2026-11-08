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

var PICKS = {};
function pickOpt(arg) {
  var p = arg.split(':'), a = PICKS[p[0]] = PICKS[p[0]] || [];
  a[+p[1]] = a[+p[1]] === +p[2] ? undefined : +p[2];
  refresh();
}
function picksDone(i) { var a = PICKS[i.id] || []; return i.question.parts.every(function (p, k) { return a[k] !== undefined; }); }
function answerOpts(i, compact) {
  var a = PICKS[i.id] || [];
  return i.question.parts.map(function (p, qi) {
    return (qi || !compact ? '<p class="qtext">' + esc(p.q) + '</p>' : '') + '<div class="aopts">' + p.opts.map(function (o, oi) {
      return '<button type="button" class="aopt' + (a[qi] === oi ? ' on' : '') + '" data-act="pick" data-arg="' + i.id + ':' + qi + ':' + oi + '"><span class="qn">' + (oi + 1) + '</span><span>' + esc(o) +
        (p.pick === oi ? '<span class="qpick">Agent’s pick</span>' : '') + '</span></button>';
    }).join('') + '</div>';
  }).join('');
}

function threadOf(key) {
  if (THREADS[key]) return THREADS[key];
  var i = findItem(key), s = S.sessions.filter(function (x) { return x.id === key; })[0];
  var t = [];
  if (i) {
    t.push({ who: 'tools', n: i.facts.length * 6, mins: i.facts.length * 4 });
    if (i.report) t.push({ who: 'report', works: i.report.works, left: i.report.left, needs: i.report.needs });
    else t.push({ who: 'agent', text: i.reason || '' });
  } else if (s) t.push({ who: 'tools', n: 12, mins: s.mins || 10 }, { who: 'agent', text: s.doing });
  THREADS[key] = t;
  return t;
}
function bubble(m) {
  if (m.who === 'ben') return '<div class="msg me">' + (m.from ? '<span class="mfrom">From ' + esc(m.from) + '</span>' : '') + '<p>' + esc(m.text).replace(/\n/g, '<br>') + '</p></div>';
  if (m.who === 'tools') return '<div class="msg tools">' + (m.live ? '<span class="pulse" aria-hidden="true"></span>Working · ' : '') + m.n + ' tool calls · ' + m.mins + ' min</div>';
  if (m.who === 'report') return '<div class="msg rep"><dl class="report">' + (m.works ? '<dt>Works now</dt><dd>' + esc(m.works) + '</dd>' : '') +
    (m.left ? '<dt>What’s left</dt><dd>' + esc(m.left) + '</dd>' : '') + (m.needs ? '<dt>Needs you</dt><dd>' + esc(m.needs) + '</dd>' : '') + '</dl></div>';
  if (m.who === 'typing') return '<div class="msg tools"><span class="pulse" aria-hidden="true"></span>The agent is working</div>';
  return '<div class="msg agent"><p>' + esc(m.text) + '</p></div>';
}
function sessionBody(key) {
  var i = findItem(key), s = sessionOf(key);
  var app = i ? i.app : s.app, title = i ? i.session : s.title;
  var q = i && i.who === 'ben' && i.question ? '<div class="qcard">' + answerOpts(i, false) + '<button type="button" class="btn-primary" data-act="sendanswer" data-arg="' + i.id + '"' + (picksDone(i) ? '' : ' disabled') + '>Send</button></div>' : '';
  return '<div class="sh-item"><p class="rapp">' + appIcon(app) + esc(app) + '</p><h2>' + esc(title) + '</h2>' +
    '<button type="button" class="prlink" data-act="out" data-arg="the session">Open in the Claude app ↗</button></div>' +
    '<div class="thread">' + threadOf(key).map(bubble).join('') + '</div>' + q +
    '<div class="composer"><label class="sr" for="reply-' + key + '">Reply</label><textarea id="reply-' + key + '" rows="2" placeholder="Reply to the agent">' + esc(S.draft[key] || '') + '</textarea>' +
    '<button type="button" class="btn-send" data-act="reply" data-arg="' + key + '" aria-label="Send">↑</button></div>' +
    (s && s.state === 'done' && !i ? '<div class="acts"><button type="button" class="btn-plain" data-act="archive" data-arg="' + s.id + '">Archive</button></div>' : '');
}
function openSession(key) {
  var i = findItem(key), s = sessionOf(key); if (s) s.unseen = false;
  postSeen(s ? s.id : key);
  openSheet(sessionBody(key), i ? i.session : s ? s.title : 'Session', 'session-' + key); stack[stack.length - 1].redo = function () { return sessionBody(key); };
}

function agentReplies(key, text) {
  var t = threadOf(key);
  t.push({ who: 'typing' });
  refresh();
  setTimeout(function () { t.pop(); t.push({ who: 'agent', text: text }); t.push({ who: 'tools', n: 3, mins: 1, live: true }); refresh(); }, 1800);
}
function moveToAgent(i, reason) { i.who = 'agent'; i.reason = reason; i.sessionEnded = false; i.isNew = true; }

function sendAnswer(id) {
  var i = findItem(id), a = PICKS[id];
  var text = i.question.parts.map(function (p, k) { return (i.question.parts.length > 1 ? (k + 1) + '. ' : '') + p.opts[a[k]]; }).join('\n');
  threadOf(id).push({ who: 'ben', text: text });
  delete PICKS[id];
  moveToAgent(i, 'Working on your answer.');
  agentReplies(id, 'Thanks. Going ahead: ' + i.question.parts[0].opts[a[0]].toLowerCase() + '.');
  toast('Sent to ' + i.session);
}
function reply(key) {
  var ta = $('reply-' + key), text = ta ? ta.value.trim() : '';
  if (!text) { if (ta) ta.focus(); return; }
  delete S.draft[key];
  threadOf(key).push({ who: 'ben', text: text });
  var i = findItem(key); if (i && i.who !== 'live') moveToAgent(i, 'Working on your reply.');
  agentReplies(key, 'On it.');
}
function buildIt(id) {
  var i = findItem(id);
  threadOf(id).push({ who: 'ben', text: 'build it', from: 'Finances Mocks' });
  i.steps = BUILD; i.step = 0; moveToAgent(i, 'Building from the mock.'); delete i.ask;
  refresh(); toast('Sent “build it” to ' + i.session);
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
    brief = i.app + ': PR #' + i.pr + ' — ' + i.reason + ' Fix forward with a new PR.';
    chips = ['PR #' + i.pr, 'Deploy run log', 'Last session: ' + i.session];
  } else {
    var a = appOf(arg); app = arg; brief = '';
    chips = ['Repo bensoutendijk/' + a.key, a.designed ? 'Finances Mocks · ' + a.designed + ' rows not built' : 'No mock rows waiting', openCount(arg) + ' open items'];
  }
  openSheet('<div class="sh-item"><p class="rapp">' + appIcon(app) + esc(app) + '</p><h2>' + (kind === 'fix' ? 'Fix it' : 'New work') + '</h2></div>' +
    '<div class="chips">' + chips.map(function (c) { return '<span class="cchip">' + esc(c) + '</span>'; }).join('') + '</div>' +
    '<div class="composer tall"><label class="sr" for="brief">Brief</label><textarea id="brief" rows="5" placeholder="What should the agent do?">' + esc(brief) + '</textarea></div>' +
    '<button type="button" class="btn-primary" data-act="startwork" data-arg="' + kind + '|' + arg + '">Start a session</button>', kind === 'fix' ? 'Fix it' : 'New work', 'brief');
}
function startWork(arg) {
  var p = arg.split('|'), ta = $('brief'), text = ta ? ta.value.trim() : '';
  if (!text) { if (ta) ta.focus(); return; }
  var app = p[0] === 'fix' ? findItem(p[1]).app : p[1], id = 'new' + (S.items.length + 1);
  if (p[0] === 'fix') { var i = findItem(p[1]); moveToAgent(i, 'A new session is fixing it forward.'); i.step = 0; }
  else S.items.unshift({ id: id, app: app, title: text.length > 48 ? text.slice(0, 46) + '…' : text, who: 'agent', isNew: true, steps: BUILD, step: 0, session: 'New session', reason: 'Starting on your brief.', facts: [['Now', 'Session started from Billboard', '']] });
  S.sessions.unshift({ id: 'ns' + S.sessions.length, app: app, title: p[0] === 'fix' ? 'Fix: ' + findItem(p[1]).title : 'New session', state: 'working', doing: 'Reading the brief', mins: 0, cost: 0, helpers: 0, branch: '', item: p[0] === 'fix' ? p[1] : id });
  if (p[0] !== 'fix') THREADS[id] = [{ who: 'ben', text: text }, { who: 'tools', n: 1, mins: 0, live: true }];
  popPage(); toast('Session started in ' + app);
}
function archive(id) {
  var s = S.sessions.filter(function (x) { return x.id === id; })[0], k = S.sessions.indexOf(s);
  S.sessions.splice(k, 1); popPage();
  toast('Archived', function () { S.sessions.splice(k, 0, s); render(); });
}
