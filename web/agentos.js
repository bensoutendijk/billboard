/* LEDGER: agentos (the Agent OS tab: every part of Agent OS, measured where it works)
   pending    The tab: its sections, like Settings: Rules, Skills, Evals, Permissions, Memories, each with one line and a red count where something needs a look
   pending    Each section and detail is its own full screen, pushed with a back button and its own route (Ben, 2026-11-08)
   pending    Rules: one flat list; a row shows the rule, its first line, and "Missing eval" when no eval tests it; the current version at the foot opens Versions
   pending    A rule's page: its text, its evals with and without it (or Missing eval), its history, and Change with an agent
   pending    Skills: one flat list, all in agent-os; a skill's page: loads by week, the sessions that loaded it and how they ended, its cost and failed calls while loaded, its evals, its contents, Change with an agent
   pending    Evals: grouped worse, same, better with the rules; an eval's page: its scores, its runs, the rules and skills it tests, Run it
   pending    Permissions: Allowed (by kind, each opening its list) and Denied open their lists; prompts blocked this week, each with Allow (a session in agent-os)
   pending    Memories, as Claude Code keeps them: one folder per project; a project's page is its MEMORY.md in order (title, its line, its type), which loads into every session there
   pending    A memory's page: what it says, its type and file, its line in MEMORY.md, its links (a missing one marked) and the memories that link to it
   dropped    2026-11-08 Moving a memory into a rule, a skill or AGENTS.md: Ben, not now; memories grouped by type: MEMORY.md is one ordered list
   pending    Versions: each rules version with sessions, cost a session against the one before, evals, how often Ben took the pick, and what changed
   pending    Every change is a session in agent-os that opens a PR and runs the evals (Ben, 2026-11-07); Billboard never edits a rule by hand
   mock-only  Weekly loads and the sessions that loaded a skill are examples; rules, skills, evals, permissions, memories and versions are real
   dropped    2026-11-07 The flow as a list with a rail, the pan-and-zoom canvas, Trends as tiles, and Flows: Agent OS has no flows
   dropped    2026-11-08 Seen this week on rules, manual rule editing, Schedules (not part of Agent OS), the top status line, and the words "lite" and "pins"
*/
'use strict';

function rule(id) { return AOS.rules.filter(function (r) { return r.id === id; })[0]; }
function skill(id) { return AOS.skills.filter(function (s) { return s.id === id; })[0]; }
function memory(slug) { return AOS.memories.filter(function (m) { return m[1] === slug; })[0]; }
function evalAvg(which) { var v = Object.keys(AOS.evals).map(function (k) { return AOS.evals[k][which]; }); return Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length); }
function go(arg, inner, cls) { return '<button type="button" class="row' + (cls ? ' ' + cls : '') + '" data-act="aos" data-arg="' + arg + '">' + inner + CHEV + '</button>'; }
function tile(cls, glyph) { return '<span class="aicon ' + cls + '" aria-hidden="true">' + glyph + '</span>'; }
function sec(t) { return '<h2 class="sec">' + esc(t) + '</h2>'; }
function kv(rows) { return '<ul class="list kv">' + rows.map(function (r) { return '<li><div class="row static"><span class="kk">' + esc(r[0]) + '</span><span class="kvv">' + esc(r[1]) + '</span></div></li>'; }).join('') + '</ul>'; }
function evBars(name) {
  var e = AOS.evals[name];
  return '<div class="evrow"><span class="evname">' + esc(name) + '</span><span class="evnums">' + e[0] + '% <span class="muted">· ' + e[1] + '% without</span></span>' +
    '<span class="evbar"><i style="width:' + e[0] + '%"></i></span><span class="evbar wo"><i style="width:' + e[1] + '%"></i></span></div>';
}
function head(kind, title, cls, glyph) { return '<div class="sh-item"><p class="rapp">' + tile(cls + ' sm', glyph) + esc(kind) + '</p><h2>' + esc(title) + '</h2></div>'; }
function agentAction(arg, label) { return '<div class="acts"><button type="button" class="btn-primary" data-act="aosbrief" data-arg="' + arg + '">' + esc(label || 'Change with an agent') + '</button></div>'; }
function historyHTML(rows) { return sec('History') + '<ol class="evlog">' + rows.map(function (x) { return '<li><span>' + esc(x[0]) + '</span>' + esc(x[1]) + '</li>'; }).join('') + '</ol>'; }
var TYPES = { feedback: 'Feedback', project: 'Project', reference: 'Reference', user: 'About you' };

// The tab.
function agentosHTML() {
  var worse = Object.keys(AOS.evals).filter(function (k) { return AOS.evals[k][0] < AOS.evals[k][1]; }).length;
  var missing = AOS.rules.filter(function (r) { return !r.evals.length; }).length;
  var projects = AOS.memories.map(function (m) { return m[0]; }).filter(function (p, k, a) { return a.indexOf(p) === k; }).length;
  var broken = AOS.memories.reduce(function (t, m) { return t + m[5].filter(function (l) { return !memory(l); }).length; }, 0);
  var loads = Object.keys(PART_INFO).reduce(function (t, k) { return t + PART_INFO[k].loads.reduce(function (a, b) { return a + b; }, 0); }, 0);
  var rows = [
    ['rules', 'Rules', AOS.rules.length + ' · ' + missing + ' missing an eval', 'g-ins', 'R', 0],
    ['skills', 'Skills', AOS.skills.length + ' · ' + plural(loads, 'load', 'loads') + ' in 30 days', 'g-cap', 'S', 0],
    ['evals', 'Evals', Object.keys(AOS.evals).length + ' · ' + evalAvg(0) + '% with the rules, ' + evalAvg(1) + '% without', 'g-mea', 'E', worse],
    ['perms', 'Permissions', AOS.permissions.allow + ' allowed · ' + AOS.permissions.deny + ' denied', 'g-cap', 'P', AOS.permissions.blocked.length],
    ['memories', 'Memories', AOS.memories.length + ' in ' + projects + ' projects · ' + plural(broken, 'missing link', 'missing links'), 'g-ins', 'M', 0]
  ];
  return '<ul class="list sections">' + rows.map(function (r) {
    return '<li>' + go(r[0], tile(r[3], r[4]) + '<span class="rbody"><span class="rtitle">' + esc(r[1]) + '</span><span class="rquiet">' + esc(r[2]) + '</span></span>' + (r[5] ? '<span class="badge2">' + r[5] + '</span>' : '<span></span>')) + '</li>';
  }).join('') + '</ul>';
}

// Pages: each one a full screen with its own route.
var TITLES = { rules: 'Rules', skills: 'Skills', evals: 'Evals', perms: 'Permissions', memories: 'Memories', versions: 'Versions', allowed: 'Allowed', denied: 'Denied' };
function aosLabel(arg) {
  var p = arg.split(':'), k = p[0], id = p.slice(1).join(':');
  if (TITLES[k]) return TITLES[k];
  if (k === 'rule') return rule(id).name;
  if (k === 'memory') return memory(id)[2];
  if (k === 'version') return 'Version';
  return id;
}
function aosPage(arg) {
  var p = arg.split(':'), k = p[0], id = p.slice(1).join(':');
  if (k === 'rule') return rulePage(id);
  if (k === 'skill') return skillPage(id);
  if (k === 'eval') return evalPage(id);
  if (k === 'version') return versionPage(+id);
  if (k === 'mproject') return memoryProjectPage(id);
  if (k === 'memory') return memoryPage(id);
  if (k === 'group') return groupPage(id);
  return listPage(k);
}
function aosRoute(arg) { return 'aos-' + arg.replace(/[^a-z0-9]+/gi, '-'); }
function aosOpen(arg) { openSheet(aosPage(arg), aosLabel(arg), aosRoute(arg)); stack[stack.length - 1].redo = function () { return aosPage(arg); }; }
function aosArgOf(route) {
  var args = Object.keys(TITLES).concat(AOS.rules.map(function (r) { return 'rule:' + r.id; }), AOS.skills.map(function (x) { return 'skill:' + x.id; }), Object.keys(AOS.evals).map(function (k) { return 'eval:' + k; }),
    VERSIONS.map(function (v, i) { return 'version:' + i; }), AOS.memories.map(function (m) { return 'memory:' + m[1]; }), AOS.memories.map(function (m) { return 'mproject:' + m[0]; }), AOS.permissions.groups.map(function (g) { return 'group:' + g[0]; }));
  return args.filter(function (a) { return aosRoute(a) === route; })[0];
}

function rulePage(id) {
  var r = rule(id);
  var evals = sec('Evals') + (r.evals.length ? '<div class="chartcard">' + r.evals.map(evBars).join('') + '</div>'
    : '<div class="askcard"><p>Missing eval</p><button type="button" class="btn-link" data-act="aosbrief" data-arg="neweval:' + id + '">Write one with an agent</button></div>');
  return head('Rule', r.name, 'g-ins', 'R') + '<div class="ptext">' + esc(r.text) + '</div>' + evals +
    historyHTML([['Nov 7', 'PR #150 · version 8f32cec'], ['Nov 2', 'Added in the Nov 2 cut (#142)']]) + agentAction('rule:' + id);
}
function skillPage(id) {
  var s = skill(id), info = PART_INFO[id] || { loads: [0, 0, 0, 0], used: [], loaded: [], contents: [] };
  var mx = Math.max.apply(null, info.loads.concat([1]));
  var use = sec('Use') + '<div class="chartcard"><div class="wkbars">' + info.loads.map(function (n, i) {
    return '<span class="wk"><span class="wkn">' + n + '</span><span class="wkb" style="height:' + (n ? Math.max(8, n / mx * 100) : 3) + '%"></span><span class="wkl">' + ['3 wk ago', '2 wk ago', 'last wk', 'this wk'][i] + '</span></span>';
  }).join('') + '</div><p class="fine">Loads by week</p></div>' +
    (info.used.length ? '<ul class="list">' + info.used.map(function (u) { return '<li><div class="row static">' + appIcon(u[1]) + '<span class="rbody"><span class="rtitle">' + esc(u[2]) + '</span><span class="rquiet">' + esc(u[0]) + ' · ' + esc(u[3]) + '</span></span></div></li>'; }).join('') + '</ul>' : '<p class="fine pad2">No session has loaded it in 30 days.</p>');
  return head('Skill · ' + s.kb + ' KB', s.id, 'g-cap', 'S') + '<div class="ptext">' + esc(s.text) + '</div>' + use +
    (info.loaded.length ? sec('While it’s loaded') + kv(info.loaded) : '') +
    sec('Evals') + (s.evals.length ? '<div class="chartcard">' + s.evals.map(evBars).join('') + '</div>' : '<div class="askcard"><p>Missing eval</p></div>') +
    (info.contents.length ? sec('Contents') + '<ul class="list">' + info.contents.map(function (c) { return '<li><div class="row static noicon"><span class="rbody"><span class="rtitle">' + esc(c) + '</span></span></div></li>'; }).join('') + '</ul>' : '') +
    historyHTML([['Nov 7', 'PR #151 · moved under version control'], ['Nov 2', 'Cut down (#142)']]) + agentAction('skill:' + id);
}
function evalPage(k) {
  var tests = AOS.rules.filter(function (r) { return r.evals.indexOf(k) >= 0; }).map(function (r) { return 'rule:' + r.id; })
    .concat(AOS.skills.filter(function (s) { return s.evals.indexOf(k) >= 0; }).map(function (s) { return 'skill:' + s.id; }));
  return head('Eval', k, 'g-mea', 'E') + '<div class="chartcard">' + evBars(k) + '</div>' +
    sec('Runs') + kv([['Runs', '3 with · 3 without'], ['Last run', 'Nov 2'], ['Judge', 'Sonnet 5.5'], ['Cost a run', 'about $0.50']]) +
    sec('Tests') + '<ul class="list">' + tests.map(function (a) { var r = a.indexOf('rule:') === 0 ? rule(a.slice(5)) : null; return '<li>' + go(a, tile(r ? 'g-ins' : 'g-cap', r ? 'R' : 'S') + '<span class="rbody"><span class="rtitle">' + esc(r ? r.name : a.slice(6)) + '</span></span>') + '</li>'; }).join('') + '</ul>' +
    '<div class="acts"><button type="button" class="btn-plain" data-act="out" data-arg="a run of this eval (about $0.50)">Run it · about $0.50</button></div>';
}
function versionPage(i) {
  var v = VERSIONS[i], prev = VERSIONS[i + 1];
  var rows = [['Sessions', String(v.sessions)], ['Cost a session', '$' + v.per.toFixed(2) + (prev ? '  (' + (v.per < prev.per ? '▼' : '▲') + ' from $' + prev.per.toFixed(2) + ')' : '')],
    ['Evals', v.evals === null ? 'none then' : v.evals + '% with the rules'], ['Took the agent’s pick', v.pick], ['Failed tool calls', v.failed]];
  return head('Version · since ' + v.since + ' · ' + v.note, v.v, 'g-his', 'V') + kv(rows) +
    sec('What changed') + '<ul class="list">' + v.changes.map(function (c) { return '<li><div class="row static noicon"><span class="rbody"><span class="rtitle">' + esc(c) + '</span></span></div></li>'; }).join('') + '</ul>';
}
function memFolder(proj) { return '~/.claude/projects/-home-ben-projects' + (proj === '~/projects' ? '' : '-' + proj) + '/memory/'; }
function memRow(m) {
  return '<li>' + go('memory:' + m[1], '<span class="rbody"><span class="rtitle">' + esc(m[2]) + '</span><span class="rline clamp">' + esc(m[4]) + '</span><span class="rquiet">' + esc(TYPES[m[3]]) + '</span></span>', 'noicon') + '</li>';
}
function memoryProjectPage(proj) {
  var ms = AOS.memories.filter(function (m) { return m[0] === proj; });
  return '<div class="sh-item"><p class="rapp">' + appIcon(proj) + 'Memories</p><h2>' + esc(proj) + '</h2><p class="fine mono">' + esc(memFolder(proj)) + '</p></div>' +
    kv([['MEMORY.md', 'loads into every session']]) +
    sec('MEMORY.md · ' + ms.length) + '<ul class="list">' + ms.map(memRow).join('') + '</ul>';
}
function memoryPage(slug) {
  var m = memory(slug), line = AOS.memories.filter(function (x) { return x[0] === m[0]; }).indexOf(m) + 1;
  var links = m[5].length ? sec('Links') + '<ul class="list">' + m[5].map(function (l) {
    var t = memory(l);
    return '<li>' + (t ? go('memory:' + l, '<span class="rbody"><span class="rtitle">' + esc(t[2]) + '</span><span class="rquiet">' + esc(t[0]) + '</span></span>', 'noicon')
      : '<div class="row static noicon"><span class="rbody"><span class="rtitle">' + esc(l) + '</span><span class="rquiet missing">Missing</span></span></div>') + '</li>';
  }).join('') + '</ul>' : '';
  var from = AOS.memories.filter(function (x) { return x[5].indexOf(slug) >= 0; });
  return '<div class="sh-item"><p class="rapp">' + appIcon(m[0]) + esc(m[0]) + '</p><h2>' + esc(m[2]) + '</h2></div>' +
    '<div class="ptext">' + esc(m[4]) + '</div>' +
    kv([['Type', TYPES[m[3]]], ['File', m[1] + '.md'], ['MEMORY.md', 'line ' + line + ' of ' + AOS.memories.filter(function (x) { return x[0] === m[0]; }).length]]) + links +
    (from.length ? sec('Linked from') + '<ul class="list">' + from.map(function (x) { return '<li>' + go('memory:' + x[1], '<span class="rbody"><span class="rtitle">' + esc(x[2]) + '</span><span class="rquiet">' + esc(x[0]) + '</span></span>', 'noicon') + '</li>'; }).join('') + '</ul>' : '');
}
function groupPage(name) {
  var g = AOS.permissions.groups.filter(function (x) { return x[0] === name; })[0];
  var sample = { 'Bash commands': ['git *', 'gh *', 'aws *', 'terraform *', 'npm *', 'pnpm *', 'node *', 'docker *', 'curl *', 'jq *', 'cat *', 'ls *'], 'PowerShell commands': ['Get-ChildItem *', 'Get-Content *', 'Set-Location *', 'git *', 'gh *', 'npm *'], 'Claude Code tools': ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'NotebookEdit'] }[name] || [];
  return '<h2 class="sh-title">' + esc(name) + '</h2><p class="fine pad">' + g[1] + ' allowed · ' + esc(g[2]) + '</p><ul class="list">' + sample.map(function (c) {
    return '<li><div class="row static noicon"><span class="rbody"><span class="rtitle mono">' + esc(c) + '</span></span></div></li>';
  }).join('') + (g[1] > sample.length ? '<li><div class="row static noicon"><span class="rbody"><span class="rquiet">and ' + (g[1] - sample.length) + ' more</span></span></div></li>' : '') + '</ul>' +
    (name === 'PowerShell commands' ? agentAction('removeps', 'Remove them with an agent') : '');
}
function listPage(kind) {
  var html = '';
  if (kind === 'rules') html = '<ul class="list">' + AOS.rules.map(function (r) {
    return '<li>' + go('rule:' + r.id, '<span class="rbody"><span class="rtitle">' + esc(r.name) + (r.evals.length ? '' : ' <span class="pin warn">Missing eval</span>') + '</span><span class="rline clamp">' + esc(r.text) + '</span></span>', 'noicon') + '</li>';
  }).join('') + '</ul><button type="button" class="footlink" data-act="aos" data-arg="versions">Version ' + esc(VERSIONS[0].v) + ' ›</button>';
  if (kind === 'skills') html = '<ul class="list">' + AOS.skills.map(function (s) {
    var info = PART_INFO[s.id] || { loads: [0] }, n = info.loads.reduce(function (a, b) { return a + b; }, 0);
    return '<li>' + go('skill:' + s.id, '<span class="rbody"><span class="rtitle">' + esc(s.id) + '</span><span class="rline clamp">' + esc(s.text) + '</span><span class="rquiet">' + (n ? plural(n, 'load', 'loads') + ' in 30 days' : 'Not loaded in 30 days') + ' · ' + s.kb + ' KB</span></span>', 'noicon') + '</li>';
  }).join('') + '</ul>';
  if (kind === 'evals') {
    var ks = Object.keys(AOS.evals), grp = [['Worse with the rules', function (e) { return e[0] < e[1]; }], ['Same either way', function (e) { return e[0] === e[1]; }], ['Better with the rules', function (e) { return e[0] > e[1]; }]];
    html = grp.map(function (g) { var list = ks.filter(function (k) { return g[1](AOS.evals[k]); }); return list.length ? sec(g[0] + ' · ' + list.length) + '<div class="chartcard">' + list.map(function (k) { return '<button type="button" class="evbtn" data-act="aos" data-arg="eval:' + k + '">' + evBars(k) + '</button>'; }).join('') + '</div>' : ''; }).join('') +
      '<div class="acts"><button type="button" class="btn-plain" data-act="out" data-arg="a run of all 18 evals (about $9)">Run all 18 · about $9</button></div>';
  }
  if (kind === 'perms') html = '<ul class="list"><li>' + go('allowed', '<span class="rbody"><span class="rtitle">Allowed</span></span><span class="kvv">' + AOS.permissions.allow + '</span>', 'noicon three') + '</li>' +
    '<li>' + go('denied', '<span class="rbody"><span class="rtitle">Denied</span></span><span class="kvv">' + AOS.permissions.deny + '</span>', 'noicon three') + '</li></ul>' +
    sec('Blocked this week') + '<ul class="list">' + AOS.permissions.blocked.map(function (b) { return '<li><div class="row static">' + appIcon(b[1]) + '<span class="rbody"><span class="rtitle">' + esc(b[2]) + '</span><span class="rline">' + esc(b[3]) + '</span><span class="rquiet">' + esc(b[0]) + '</span></span><button type="button" class="btn-link" data-act="aosbrief" data-arg="allow:' + esc(b[2]) + '">Allow</button></div></li>'; }).join('') + '</ul>';
  if (kind === 'allowed') html = '<ul class="list">' + AOS.permissions.groups.map(function (g) {
    return '<li>' + go('group:' + g[0], '<span class="rbody"><span class="rtitle">' + esc(g[0]) + '</span><span class="rquiet">' + esc(g[2]) + '</span></span><span class="kvv">' + g[1] + '</span>', 'noicon three') + '</li>';
  }).join('') + '</ul>';
  if (kind === 'denied') html = '<ul class="list">' + AOS.permissions.denied.map(function (d) {
    return '<li><div class="row static noicon"><span class="rbody"><span class="rtitle">' + esc(d[1]) + '</span><span class="rquiet mono">' + esc(d[0]) + '</span></span></div></li>';
  }).join('') + '</ul>';
  if (kind === 'memories') {
    var projects = []; AOS.memories.forEach(function (m) { if (projects.indexOf(m[0]) < 0) projects.push(m[0]); });
    var broken = AOS.memories.filter(function (m) { return m[5].some(function (l) { return !memory(l); }); }).length;
    html = '<ul class="list">' + projects.map(function (p) {
      var ms = AOS.memories.filter(function (m) { return m[0] === p; }), types = {};
      ms.forEach(function (m) { types[m[3]] = (types[m[3]] || 0) + 1; });
      return '<li>' + go('mproject:' + p, appIcon(p) + '<span class="rbody"><span class="rtitle">' + esc(p) + '</span><span class="rquiet">' + Object.keys(types).map(function (t) { return types[t] + ' ' + TYPES[t].toLowerCase(); }).join(' · ') + '</span></span><span class="kvv">' + ms.length + '</span>', 'three') + '</li>';
    }).join('') + '</ul>' + (broken ? '<p class="fine pad2">' + plural(broken, 'memory links', 'memories link') + ' to a memory that doesn’t exist.</p>' : '');
  }
  if (kind === 'versions') html = '<ul class="list">' + VERSIONS.map(function (v, i) { return '<li>' + go('version:' + i, '<span class="rbody"><span class="rtitle mono">' + esc(v.v) + '</span><span class="rline">' + esc(v.note) + '</span><span class="rquiet">' + v.sessions + ' sessions · $' + v.per.toFixed(2) + ' a session</span></span>', 'noicon') + '</li>'; }).join('') + '</ul>';
  return '<h2 class="sh-title">' + esc(TITLES[kind] || kind) + '</h2>' + html;
}

// Changes go through an agent-os session with a brief, never by hand.
function aosBrief(arg) {
  var p = arg.split(':'), k = p[0], brief = '', title = 'Change with an agent';
  if (k === 'rule') { var r = rule(p[1]); brief = 'Rule “' + r.name + '”: ' + r.text + '\n\nWhat I want changed: '; }
  if (k === 'skill') brief = 'Skill “' + p[1] + '”.\n\nWhat I want changed: ';
  if (k === 'neweval') { var r2 = rule(p[1]); title = 'Write an eval'; brief = 'Write an eval case for the rule “' + r2.name + '”: one that fails without it.'; }
  if (k === 'allow') { title = 'Allow a command'; brief = 'Allow this in the permissions: ' + p.slice(1).join(':'); }
  if (k === 'removeps') { title = 'Remove PowerShell rules'; brief = 'Remove the 191 PowerShell allow rules; boris never runs PowerShell.'; }
  openSheet('<div class="sh-item"><p class="rapp">' + appIcon('agent-os') + 'agent-os</p><h2>' + esc(title) + '</h2></div>' +
    '<div class="composer tall"><label class="sr" for="brief">Brief</label><textarea id="brief" rows="6">' + esc(brief) + '</textarea></div>' +
    '<button type="button" class="btn-primary" data-act="aosstart" data-arg="' + esc(title) + '">Start a session</button>', title, 'brief');
}
function aosStart(title) {
  var ta = $('brief'), text = ta ? ta.value.trim() : '';
  if (!text) { if (ta) ta.focus(); return; }
  var id = 'aos' + S.items.length;
  S.items.unshift({ id: id, app: 'agent-os', title: title, who: 'agent', isNew: true, steps: BUILD, step: 0, session: title, reason: 'Starting on your brief.', facts: [['Now', 'Session started from Billboard', '']] });
  THREADS[id] = [{ who: 'ben', text: text }, { who: 'tools', n: 1, mins: 0, live: true }];
  S.sessions.unshift({ id: 'ns' + S.sessions.length, app: 'agent-os', title: title, state: 'working', doing: 'Reading the brief', mins: 0, cost: 0, helpers: 0, branch: '', item: id });
  popPage(); toast('Session started in agent-os');
}
