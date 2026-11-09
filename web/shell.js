/* Shared: state, the tab bar (Today, Work, Projects, Agent OS), full-screen pages pushed onto each tab's own stack with routes,
   the back button and edge swipe, toasts, actions, start-up once data.js has loaded the board from the API. Loads last. */
'use strict';

var S, TAB = 'today';
var CHEV = '<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var BACK = '<svg class="bchev" viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function appOf(key) {
  return APPS.filter(function (x) { return x.key === key; })[0] ||
    { key: key, name: key || '?', color: '#8e8e93', lastLive: '', designed: null, week: 0, merges: [0, 0, 0, 0, 0, 0, 0], m14: DAYS14.map(function () { return 0; }), c14: DAYS14.map(function () { return 0; }) };
}
function appIcon(key) { var a = appOf(key); return '<span class="aicon" style="background:' + a.color + '" aria-hidden="true">' + esc(a.name.charAt(0).toUpperCase()) + '</span>'; }
function clone(x) { return JSON.parse(JSON.stringify(x)); }

// The board's working copy, rebuilt from the globals on every load. Drafts, picks and what Ben opened carry over.
// Real data can have states the mock's example data never had, so each item and session is made safe to render here.
var WHOS = ['ben', 'agent', 'job', 'live', 'stuck'], STATES = ['working', 'job', 'ben', 'paused', 'done'];
function normItem(i) {
  if (WHOS.indexOf(i.who) < 0) i.who = 'agent';
  if (!Array.isArray(i.steps) || !i.steps.length) i.steps = BUILD;
  i.step = Math.max(0, Math.min(i.steps.length - 1, +i.step || 0));
  if (!Array.isArray(i.facts)) i.facts = [];
  i.title = i.title || 'Untitled'; i.session = i.session || '';
  if (i.who === 'job' && !i.job) i.job = 'Job';
  if (i.question && !(i.question.parts && i.question.parts.length)) i.question = null;
  if (i.question) i.question.parts.forEach(function (p) { p.opts = p.opts || []; p.q = p.q || ''; });
  if (i.menu && i.menu.parts) i.menu.parts.forEach(function (p) { p.opts = p.opts || []; });
  if (i.who === 'ben' && !i.question && !i.ask) i.ask = { kind: 'do', text: i.reason || 'Only you can do this.', liveAt: '' };
  if (i.ask) { if (['try', 'do', 'mock'].indexOf(i.ask.kind) < 0) i.ask.kind = 'do'; i.ask.text = i.ask.text || 'Only you can do this.'; i.ask.liveAt = i.ask.liveAt || ''; }
  if (i.menu && !(i.menu.parts && i.menu.parts.length)) i.menu = null;
  if (i.report && !i.report.works && !i.report.left && !i.report.needs) i.report = null;
  if (i.who === 'stuck' && !i.short) i.short = i.reason || 'Stuck';
  if (SEEN[i.id]) i.unseen = false;
  return i;
}
function normSession(s) {
  if (STATES.indexOf(s.state) < 0) s.state = 'paused';
  s.cost = s.cost == null || isNaN(s.cost) ? null : +s.cost; s.doing = s.doing || ''; s.title = s.title || 'Untitled session'; s.item = s.item || '';
  if (SEEN[s.id]) s.unseen = false;
  return s;
}
function start() {
  S = { items: clone(ITEMS).map(normItem), sessions: clone(SESSIONS).map(normSession), draft: S ? S.draft : {} };
}

// Links out are real links: GitHub for PRs and runs, the Claude app for a session, the mock artifact for designs.
var GH = 'https://github.com/bensoutendijk/';
function ghUrl(app, path) { return GH + encodeURIComponent(app) + (path || ''); }
function mockOf(app) { var m = appOf(app).mock; return m && m.url ? m : { name: 'the mock', url: 'https://claude.ai/code/artifacts' }; }
function outLink(href, cls, html) { return '<a class="' + cls + '" href="' + esc(href) + '" target="_blank" rel="noopener">' + html + '</a>'; }
function factUrl(app, label) {
  var m = /^PR #(\d+)/.exec(label);
  if (m) return ghUrl(app, '/pull/' + m[1]);
  if (/deploy run|eas build|gitleaks|testflight/i.test(label)) return ghUrl(app, '/actions');
  if (/ Mocks$/.test(label)) return mockOf(app).url;
  return null;
}
// Sending into a running session isn't built: claude -p --cloud delivers it as another session's message, not Ben's.
function notSending() { toast('Sending into a session isn’t wired up yet. Reply in the Claude app.'); }
// A button that acts shows it's busy until the server answers.
function busy(el, on, label) {
  if (!el) return;
  if (on) { el.dataset.label = el.innerHTML; el.disabled = true; if (label) el.textContent = label; }
  else { el.disabled = false; if (el.dataset.label) el.innerHTML = el.dataset.label; }
}

var TABS = [['today', 'Today'], ['work', 'Work'], ['projects', 'Projects'], ['agentos', 'Agent OS']];
var ICONS = {
  today: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  work: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4.5" cy="12" r="2.5" fill="currentColor"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><circle cx="19.5" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 12h2.5M14.5 12H17" stroke="currentColor" stroke-width="1.8"/></svg>',
  projects: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2.2" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2.2" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="2.2" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="2.2" fill="currentColor"/></svg>',
  agentos: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
};
function tabName(t) { return TABS.filter(function (x) { return x[0] === t; })[0][1]; }
function tabbarHTML() {
  var w = waiting().length;
  return TABS.map(function (t) {
    return '<button type="button" class="tab' + (TAB === t[0] ? ' on' : '') + '" data-act="tab" data-arg="' + t[0] + '" aria-current="' + (TAB === t[0] ? 'page' : 'false') + '">' +
      '<span class="ticon">' + ICONS[t[0]] + (t[0] === 'today' && w ? '<span class="badge">' + w + '</span>' : '') + '</span><span>' + t[1] + '</span></button>';
  }).join('');
}
var FEEDS = { today: ['today-work'], work: ['today-work'], projects: ['projects'], agentos: ['agentos'] };
function render() {
  var oc = $('cards'), sl = oc ? oc.scrollLeft : 0;
  $('main').innerHTML = staleLine(FEEDS[TAB]) + (TAB === 'today' ? todayHTML() : TAB === 'work' ? workHTML() : TAB === 'projects' ? projectsHTML() : agentosHTML());
  $('tabbar').innerHTML = tabbarHTML();
  if (TAB === 'today') { wireCards(); if ($('cards')) $('cards').scrollLeft = sl; }
}

// Pages: every drill-down is a full screen pushed onto its tab's own stack, like a native navigation stack.
// Each has a back button named for the screen under it, an edge swipe back, and a route. Tapping the open tab pops to its root.
var STACKS = { today: [], work: [], projects: [], agentos: [] }, stack = STACKS.today, INSTANT = false;
function layers() { return $('pages').querySelectorAll('.page:not(.leaving)'); }
function layer(k) { return k ? layers()[k - 1] : $('main'); }
function topPage() { return stack.length ? layer(stack.length) : null; }
function pageEl(k) {
  var e = stack[k], prev = k ? stack[k - 1].label : tabName(TAB), el = document.createElement('section');
  el.className = 'page';
  el.setAttribute('aria-label', e.label);
  el.innerHTML = '<header class="navbar"><button type="button" class="nb-back" data-act="back" aria-label="Back to ' + esc(prev) + '">' + BACK + '<span>' + esc(prev.length > 14 ? 'Back' : prev) + '</span></button>' +
    '<span class="nb-title">' + esc(e.label) + '</span><span></span></header><div class="pg-body">' + e.html + '</div>';
  el.addEventListener('scroll', function () { el.classList.toggle('scrolled', el.scrollTop > 36); }, { passive: true });
  return el;
}
function openSheet(html, label, route) {
  stack.push({ html: html, label: label, route: route || label.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
  var el = pageEl(stack.length - 1), under = layer(stack.length - 1);
  if (INSTANT) el.classList.add('in');
  $('pages').appendChild(el);
  void el.offsetWidth;
  el.classList.add('in'); under.classList.add('under');
  document.body.classList.add('locked');
  syncRoute();
}
function popPage() {
  if (!stack.length) return;
  var el = topPage(); stack.pop();
  var under = layer(stack.length), e = stack[stack.length - 1];
  if (e && e.redo) { e.html = e.redo(); under.querySelector('.pg-body').innerHTML = e.html; }
  el.classList.add('leaving'); el.classList.remove('in'); under.classList.remove('under');
  setTimeout(function () { el.remove(); }, 420);
  if (!stack.length) document.body.classList.remove('locked');
  render(); syncRoute();
}
function popToRoot() {
  if (!stack.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  var ps = layers(), top = ps[ps.length - 1];
  for (var k = 0; k < ps.length - 1; k++) ps[k].remove();
  stack.length = 0;
  top.classList.add('leaving'); top.classList.remove('in'); $('main').classList.remove('under');
  setTimeout(function () { top.remove(); }, 420);
  document.body.classList.remove('locked');
  render(); syncRoute();
}
function switchTab(t) {
  TAB = t; stack = STACKS[t];
  var m = $('main'); m.style.transition = 'none';
  $('pages').innerHTML = '';
  stack.forEach(function (e, k) {
    if (e.redo) e.html = e.redo();
    var el = pageEl(k); el.classList.add('in'); if (k < stack.length - 1) el.classList.add('under');
    $('pages').appendChild(el);
  });
  m.classList.toggle('under', stack.length > 0);
  document.body.classList.toggle('locked', stack.length > 0);
  render(); window.scrollTo(0, 0); syncRoute();
  void m.offsetWidth; m.style.transition = '';
}
function refresh() {
  var e = stack[stack.length - 1], el = topPage();
  if (e && e.redo && el) { var y = el.scrollTop; e.html = e.redo(); el.querySelector('.pg-body').innerHTML = e.html; el.scrollTop = y; }
  render();
}

// Routes: the top screen's route is in the address, so a reload or a shared link lands on the same screen.
function syncRoute() { var r = stack.length ? stack[stack.length - 1].route : TAB; try { history.replaceState(null, '', '#' + r); } catch (err) { /* sandboxed */ } }
function restoreRoute() {
  var h = (location.hash || '').slice(1), m;
  if (!h) return;
  INSTANT = true;
  if (STACKS[h]) switchTab(h);
  else if ((m = /^item-(.+)$/.exec(h)) && findItem(m[1])) { switchTab(findItem(m[1]).who === 'ben' ? 'today' : 'work'); itemSheet(m[1]); }
  else if ((m = /^session-(.+)$/.exec(h)) && (findItem(m[1]) || sessionOf(m[1]))) { switchTab(findItem(m[1]) ? 'work' : 'today'); openSession(m[1]); }
  else if ((m = /^project-(.+)$/.exec(h)) && APPS.some(function (a) { return a.key === m[1]; })) { switchTab('projects'); projectPage(m[1]); }
  else if (h === 'waiting') listSheet();
  else if (h.indexOf('aos-') === 0) { var arg = aosArgOf(h); if (arg) { switchTab('agentos'); aosOpen(arg); } }
  INSTANT = false;
  syncRoute();
}

// The edge swipe: drag from the left edge to go back, the screen under following the finger.
var drag = null;
document.addEventListener('touchstart', function (e) {
  if (!stack.length || e.touches[0].clientX > 24) return;
  drag = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), dx: 0, on: false };
}, { passive: true });
document.addEventListener('touchmove', function (e) {
  if (!drag) return;
  var dx = e.touches[0].clientX - drag.x, dy = e.touches[0].clientY - drag.y, top = topPage(), under = layer(stack.length - 1);
  if (!drag.on) { if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } if (dx < 6) return; drag.on = true; top.classList.add('drag'); under.classList.add('drag'); }
  drag.dx = Math.max(0, dx);
  top.style.transform = 'translateX(' + drag.dx + 'px)';
  under.style.transform = 'translateX(' + (-0.3 * under.offsetWidth * (1 - drag.dx / window.innerWidth)) + 'px)';
}, { passive: true });
document.addEventListener('touchend', function () {
  if (!drag || !drag.on) { drag = null; return; }
  var top = topPage(), under = layer(stack.length - 1), v = drag.dx / Math.max(1, Date.now() - drag.t), go = drag.dx > window.innerWidth * 0.35 || v > 0.5;
  top.classList.remove('drag'); under.classList.remove('drag'); top.style.transform = ''; under.style.transform = '';
  drag = null;
  if (go) popPage();
});

var toastTimer = null;
function toast(msg, undo) {
  var t = $('toast');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button type="button">Undo</button>' : '');
  t.hidden = false;
  if (undo) t.querySelector('button').onclick = function () { t.hidden = true; undo(); };
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 4000);
}

var ACT = {
  tab: function (t) { if (!BOOTED) return; if (t === TAB) popToRoot(); else switchTab(t); },
  back: function () { popPage(); },
  item: function (id) { itemSheet(id); },
  waiting: function () { listSheet(); },
  project: function (key) { projectPage(key); },
  appday: function (arg) { appDay(arg); },
  pick: function (a) { pickOpt(a); },
  sendanswer: function () { notSending(); },
  session: function (k) { openSession(k); },
  reply: function () { notSending(); },
  buildit: function () { notSending(); },
  off: function (id) { somethingOff(id); },
  fix: function (id) { briefSheet('fix', id); },
  newwork: function (k) { briefSheet('new', k); },
  startwork: function (a, el) { startWork(a, el); },
  archive: function (id, el) { archiveSession(id, el); },
  aos: function (a) { aosOpen(a); },
  aosbrief: function (a) { aosBrief(a); },
  aosstart: function (a, el) { aosStart(a, el); },
  aosopen: function (u) { openClaude(u); },
  runeval: function (a, el) { runEval(a, el); },
  wfilter: function (f) { WORK_FILTER = f; render(); },
  clear: function (a, el) { clearAsk(a, el); }
};
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (el) { if (el.disabled) return; e.preventDefault(); ACT[el.getAttribute('data-act')](el.getAttribute('data-arg'), el); }
});
document.addEventListener('input', function (e) { if (e.target.id && e.target.id.indexOf('reply-') === 0) S.draft[e.target.id.slice(6)] = e.target.value; });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) popPage(); });

// Start-up, then a fresh board every 30 s (and when the page comes back into view), keeping the open page and its scroll.
var BOOTED = false, LOADING = false;
function refreshAll() {
  var y = window.scrollY, act = document.activeElement, ps = layers();
  stack.forEach(function (e, k) {
    var el = ps[k]; if (!e.redo || !el) return;
    if (act && el.contains(act) && /^(TEXTAREA|INPUT)$/.test(act.tagName)) return;  // never under Ben's typing
    var top = el.scrollTop; e.html = e.redo(); el.querySelector('.pg-body').innerHTML = e.html; el.scrollTop = top;
  });
  Object.keys(STACKS).forEach(function (t) { if (t !== TAB) STACKS[t].forEach(function (e) { if (e.redo) e.html = e.redo(); }); });
  render();
  if (!stack.length) window.scrollTo(0, y);
}
// After an action the board loads again sooner, so a new session shows on Work within seconds.
var soonTimers = [];
function loadSoon() {
  soonTimers.forEach(clearTimeout);
  soonTimers = [1500, 6000, 15000, 30000].map(function (ms) { return setTimeout(load, ms); });
}
function load() {
  if (LOADING || drag) return;
  LOADING = true;
  loadBoard().then(function () {
    LOADING = false; start();
    if (BOOTED) return refreshAll();
    BOOTED = true; render(); restoreRoute();
  }, function (err) {
    LOADING = false;
    if (!BOOTED) $('main').innerHTML = '<p class="empty">' + esc(err.message) + ' Trying again.</p>';
  });
}
start();
$('main').innerHTML = '<p class="empty">Loading…</p>';
$('tabbar').innerHTML = tabbarHTML();
load();
setInterval(function () { if (!document.hidden) load(); }, 30000);
document.addEventListener('visibilitychange', function () { if (!document.hidden && BOOTED) load(); });
