/* Fixtures moved verbatim out of the mock's data.js (Billboard Mocks). Each source in server/sources/ returns these
   until it reads the real thing from boris; delete a block here once nothing imports it. */


export const NOW = { day: 'Sunday, November 8', time: '9:40 AM', lastLooked: '9:02 PM yesterday' };

// merges: PRs merged on each of the last 7 days, oldest first. lastLive and week (cost) are facts too.
export const APPS = [
  { key: 'finances', name: 'finances', color: '#30a46c', lastLive: 'Category screen, yesterday', designed: 3, week: 142, merges: [3, 6, 5, 2, 4, 13, 0],
    m14: [2, 4, 1, 3, 5, 2, 4, 3, 6, 5, 2, 4, 13, 0], c14: [8, 15, 6, 12, 22, 10, 24, 12, 25, 21, 9, 18, 54, 3] },
  { key: 'agent-os', name: 'agent-os', color: '#6e56cf', lastLive: 'Telemetry by rules version, yesterday', designed: 0, week: 96, merges: [4, 2, 1, 0, 1, 4, 0],
    m14: [9, 12, 8, 6, 10, 4, 3, 4, 2, 1, 0, 1, 4, 0], c14: [60, 85, 70, 40, 55, 30, 25, 20, 15, 8, 4, 9, 38, 2] },
  { key: 'outfit-planner', name: 'outfit-planner', color: '#d6409f', lastLive: 'Brave key docs, Thursday', designed: 0, week: 11, merges: [0, 1, 0, 3, 0, 0, 1],
    m14: [2, 3, 1, 0, 2, 0, 1, 0, 1, 0, 3, 0, 0, 1], c14: [9, 12, 5, 0, 8, 0, 4, 0, 3, 0, 6, 0, 2, 0] },
  { key: 'billboard', name: 'billboard', color: '#0090ff', lastLive: 'Notification requirements, yesterday', designed: 0, week: 9, merges: [0, 0, 0, 0, 0, 9, 0],
    m14: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0], c14: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 0] },
  { key: 'closing-cost-calculator', name: 'closing-cost-calculator', color: '#ad7f58', lastLive: 'Oct 25', designed: 0, week: 0, merges: [0, 0, 0, 0, 0, 0, 0],
    m14: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], c14: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { key: 'vhserver', name: 'vhserver', color: '#8d8d8d', lastLive: 'Oct 31', designed: 0, week: 0, merges: [0, 0, 0, 0, 0, 0, 0],
    m14: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0], c14: [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0] }
];
export const DAYS14 = ['Mon Oct 26', 'Tue Oct 27', 'Wed Oct 28', 'Thu Oct 29', 'Fri Oct 30', 'Sat Oct 31', 'Sun Nov 1', 'Mon Nov 2', 'Tue Nov 3', 'Wed Nov 4', 'Thu Nov 5', 'Fri Nov 6', 'Sat Nov 7', 'Sun Nov 8'];
// The PRs merged on one day, for the app page's chart. Only finances' Saturday is filled in.
export const DAY_PRS = { 'finances:12': [[195, 'Category screen: Months row, merchant chart'], [194, 'scripts/mock-parity'], [193, 'Funds follow Claude’s plan changes'], [192, 'MCP: accounts, bonds, house, car, wallets'], [191, 'The mock split by feature'], [190, 'MCP: server/discover'], [189, 'MCP: write tools'], [188, 'Card payments are transfers'], [187, 'MCP server: sign-in and read tools'], [186, 'Subscriptions leave the targets’ history'], [185, 'Subscriptions found in transactions'], [184, 'Savings bonds in net worth'], [183, 'A new house or car opens its sheet']] };

// who: 'ben' (a question or an ask waits on Ben), 'agent', 'job' (an automated job holds it: job names it), 'live', 'stuck'.
// steps: the item's track; step: where it is on it. The app works both out from facts.
// Facts are oldest first: [time, text, link label or ''].
export const BUILD = ['Build', 'PR', 'Live', 'Checked'];
export const FROM_MOCK = ['In the mock', 'Build', 'PR', 'Live'];
export const ITEMS = [
  { id: 'boards', app: 'agent-os', title: 'GitHub cleanup after the card era', who: 'ben', steps: BUILD, step: 1, session: 'Agent OS GitHub projects cleanup', sessionEnded: true,
    question: { asked: '4:41 PM yesterday', parts: [
      { q: 'Delete the 5 Agent OS boards on GitHub? Their issues stay.', opts: ['Yes, delete them', 'No, keep them'], pick: 0 },
      { q: 'Close the 78 card issues as not planned?', opts: ['Yes, after checking the four finances bugs that look real', 'Close all 78 without checking', 'Leave them open'], pick: 0 }
    ] },
    facts: [['3:24 PM', 'Session started', ''], ['3:51 PM', 'Branch cleanup-board-code', ''], ['4:20 PM', 'PR #154 opened', 'PR #154'], ['4:41 PM', 'Asked you 2 questions', ''], ['8:12 PM', 'Session ended with the questions open', '']],
    report: { works: 'Board sync is out of install and sync (PR #154, open).', left: 'Delete the boards, close the issues, prune the old docs.', needs: 'The two questions.' } },

  { id: 'borismd', app: 'agent-os', title: 'Where boris.md lives', who: 'ben', steps: BUILD, step: 0, session: 'Custom tools for Claude code harness', sessionEnded: true,
    question: { asked: '3:07 PM yesterday', parts: [
      { q: 'boris.md maps the whole machine, and agent-os is shared. Where should it live?', opts: ['A private repo, bensoutendijk/boris', 'Only on boris, as ~/projects/BORIS.md', 'The private repo, and strip tailnet details from agent-os docs'], pick: 0 }
    ] },
    facts: [['2:36 PM', 'Session started', ''], ['2:47 PM', 'PR #152 merged', 'PR #152'], ['3:07 PM', 'Asked you where boris.md should live', ''], ['3:09 PM', 'Session archived with the question open', '']],
    report: { works: 'docs/boris.md lists everything that runs on boris (PR #152).', left: 'Move boris.md out of the shared repo.', needs: 'Where it should live.' } },

  { id: 'category', app: 'finances', title: 'Category screen: Months row, merchant chart', who: 'ben', steps: BUILD, step: 3, session: 'Mock-based workflow organization', pr: 195,
    ask: { kind: 'try', text: 'Try the Months row and the chart following a merchant on your phone.', liveAt: '3:23 PM yesterday' },
    facts: [['2:58 PM', 'Started from Finances Mocks · spending (3 rows)', 'Finances Mocks'], ['3:04 PM', 'Branch category-months', ''], ['3:19 PM', 'PR #195 opened', 'PR #195'], ['3:20 PM', 'Merged', ''], ['3:23 PM', 'Deploy passed, live', 'Deploy run']],
    report: { works: 'Months row, merchant-following chart and Week merchants are live (PR #195).', left: '', needs: 'Try it on your phone.' } },

  { id: 'transfer', app: 'finances', title: 'Transfer switch on a transaction', who: 'ben', steps: FROM_MOCK, step: 0, session: 'Transaction resolution question',
    ask: { kind: 'mock', text: 'Try the Transfer switch in Finances Mocks, then say build it.', liveAt: '' },
    facts: [['4:21 PM', 'Session started', ''], ['4:26 PM', 'PR #188 merged: card payments file as transfers', 'PR #188'], ['4:33 PM', 'Finances Mocks published with the Transfer switch', 'Finances Mocks']],
    report: { works: 'Card payments file as transfers (PR #188).', left: 'The Transfer switch, after you try it.', needs: 'Try it in the mock, then say build it.' } },

  { id: 'bonds', app: 'finances', title: 'Savings bonds in net worth', who: 'ben', steps: BUILD, step: 3, session: 'Savings bonds Plaid automation', pr: 184,
    ask: { kind: 'do', text: 'Add your bond purchase, then check net worth.', liveAt: '12:27 AM yesterday' },
    facts: [['8:47 PM Fri', 'Session started', ''], ['12:22 AM', 'PR #184 opened', 'PR #184'], ['12:24 AM', 'Merged', ''], ['12:27 AM', 'Deploy passed, live', 'Deploy run']],
    report: { works: 'Savings bonds are valued from Treasury’s rates (PR #184).', left: '', needs: 'Add your purchase in the app.' } },

  { id: 'brave', app: 'outfit-planner', title: 'Brave Search key from Secrets Manager', who: 'stuck', steps: BUILD, step: 2, overnight: true, session: 'Data pipeline design for spec', pr: 27,
    reason: 'Deploy failed at terraform apply, 2:14 AM. No session is on it.', short: 'Deploy failed 2:14 AM',
    facts: [['1:40 AM', 'Session started', ''], ['2:02 AM', 'PR #27 opened', 'PR #27'], ['2:09 AM', 'Merged', ''], ['2:14 AM', 'Deploy failed at terraform apply', 'Deploy run'], ['2:20 AM', 'Session ended without mentioning it', '']],
    report: { works: 'The pipeline reads the key from Secrets Manager (PR #27).', left: '', needs: '' } },

  { id: 'pipeline', app: 'outfit-planner', title: 'Headless browser prototype', who: 'stuck', steps: BUILD, step: 1, session: 'Data pipeline design for spec', pr: 28,
    reason: 'PR #28 left open. Its session ended 2 days ago.', short: 'PR #28 left open',
    facts: [['Thu 9:45 AM', 'Session started', ''], ['Fri 6:50 AM', 'PR #28 opened', 'PR #28'], ['Fri 7:06 AM', 'Session ended, PR still open', '']],
    report: { works: 'The headless browser read 9 of 25 pages that plain requests missed.', left: '12 pages refused with bot checks.', needs: '' } },

  { id: 'ophome', app: 'outfit-planner', title: 'Home screen spec page', who: 'stuck', steps: BUILD, step: 2, session: 'Outfit Planner home screen', pr: 30,
    reason: 'Its session ended Thursday with something left: the published spec page still shows the old spec.', short: 'Spec page left stale',
    facts: [['Thu 1:10 PM', 'Session started', ''], ['Thu 3:02 PM', 'PR #30 merged and live', 'PR #30'], ['Thu 3:40 PM', 'Session ended: the spec page still shows the old spec', '']],
    report: { works: 'The home screen is live (PR #30).', left: 'The published spec page still shows the old spec.', needs: '' } },

  { id: 'bbcomments', app: 'billboard', title: 'Your comments on Billboard Mocks', who: 'agent', steps: FROM_MOCK, step: 0, session: 'Billboard app evolution strategy',
    reason: 'Reading your 20 comments and changing the mock.',
    facts: [['8:59 AM', 'You left 20 comments on Billboard Mocks', 'Billboard Mocks'], ['9:01 AM', 'Working', '']] },

  { id: 'headers', app: 'finances', title: 'Tappable section headers', who: 'agent', steps: BUILD, step: 0, session: 'Build tappable headers',
    reason: 'Porting the pressed state on the Savings header.',
    facts: [['9:18 AM', 'Started from Finances Mocks · home (you said build it)', 'Finances Mocks'], ['9:21 AM', 'Branch tappable-headers', ''], ['9:38 AM', 'Working', '']] },

  { id: 'telemetry', app: 'agent-os', title: 'Hourly telemetry refresh in a fresh session', who: 'job', job: 'Secret scan', steps: BUILD, step: 1, session: 'Telemetry dashboard refresh', pr: 155,
    reason: 'Secret scan on PR #155, running 40 s. It usually takes 10 s.',
    facts: [['9:02 AM', 'Session started', ''], ['9:30 AM', 'PR #155 opened', 'PR #155'], ['9:39 AM', 'Secret scan running', '']] },

  { id: 'labels', app: 'finances', title: 'Add account: plain labels', who: 'job', job: 'Deploying', steps: BUILD, step: 2, session: 'Finances Mocks pending rows', pr: 200,
    reason: 'Deploy run for PR #200, 3 min in. Usually about 6 min.',
    facts: [['9:24 AM', 'Started from Finances Mocks · net worth', 'Finances Mocks'], ['9:31 AM', 'PR #200 opened', 'PR #200'], ['9:33 AM', 'Merged', ''], ['9:37 AM', 'Deploy run started', 'Deploy run']],
    report: { works: 'The Add account sheet has plain labels (PR #200).', left: '', needs: '' } },

  { id: 'swipe', app: 'outfit-planner', title: 'Swipe through a deck on Today', who: 'job', job: 'TestFlight', steps: BUILD, step: 2, session: 'Today tab decks', pr: 31,
    reason: 'Build 1.4 (37) is processing in TestFlight, 12 min so far. Not on your phone yet.',
    facts: [['8:05 AM', 'Session started', ''], ['8:52 AM', 'PR #31 opened', 'PR #31'], ['8:55 AM', 'Merged', ''], ['9:21 AM', 'EAS build finished, submitted to TestFlight', 'EAS build'], ['9:28 AM', 'Processing in TestFlight', '']],
    report: { works: 'Decks swipe on Today (PR #31).', left: '', needs: 'Try it on your phone once TestFlight has it.' } },

  { id: 'mcp', app: 'finances', title: 'Claude tools for accounts, bonds, house and car', who: 'live', unseen: true, steps: BUILD, step: 3, session: 'MCP planning', pr: 192,
    reason: 'Live since 2:48 PM yesterday. Nothing for you to check.',
    facts: [['10:21 AM', 'Session started', ''], ['2:40 PM', 'PR #192 opened', 'PR #192'], ['2:48 PM', 'Merged and live', 'Deploy run']],
    report: { works: '33 tools are live (PR #192).', left: 'None has run against real data yet.', needs: '' },
    menu: { asked: '3:03 PM yesterday', parts: [{ q: 'What next?', opts: ['Run the tools against real data', 'Add the plan tools', 'Stop here'], pick: 0 }] } }
];


// Sessions on boris, sorted by what they need. state: working (tool calls now), job (waiting on an automated job),
// ben (its turn ended on a question or ask), paused (turn ended with work still open), done (everything merged and live, nothing left).
export const SESSIONS = [
  { id: 's1', app: 'billboard', title: 'Billboard app evolution strategy', state: 'working', doing: 'Reading your comments on Billboard Mocks', mins: 41, cost: 5.80, helpers: 0, branch: '', item: 'bbcomments' },
  { id: 's2', app: 'finances', title: 'Build tappable headers', state: 'working', doing: 'Editing home.tsx: the pressed state on the Savings header', mins: 22, cost: 1.90, helpers: 1, branch: 'tappable-headers', item: 'headers' },
  { id: 's3', app: 'finances', title: 'Finances Mocks pending rows', state: 'job', job: 'Deploying', doing: 'Deploy run for PR #200, 3 min in', mins: 14, cost: 1.10, helpers: 0, branch: 'plain-labels', item: 'labels' },
  { id: 's8', app: 'agent-os', title: 'Telemetry dashboard refresh', state: 'job', job: 'Secret scan', doing: 'Secret scan on PR #155, 40 s in', mins: 31, cost: 2.40, helpers: 0, branch: 'telemetry-fresh-session', item: 'telemetry' },
  { id: 's4', app: 'agent-os', title: 'Agent OS GitHub projects cleanup', state: 'ben', doing: 'Asked you 2 questions', since: '4:41 PM yesterday', cost: 3.01, item: 'boards' },
  { id: 's5', app: 'finances', title: 'Mock-based workflow organization', state: 'ben', doing: 'Asked you to try the Category screen', since: '3:25 PM yesterday', cost: 23.53, item: 'category' },
  { id: 's6', app: 'outfit-planner', title: 'Data pipeline design for spec', state: 'paused', doing: 'PR #28 still open; PR #27’s deploy failed after it ended', since: '2:20 AM', cost: 7.19, item: 'pipeline' },
  { id: 's7', app: 'outfit-planner', title: 'Outfit Planner home screen', state: 'paused', doing: 'What’s left: the published spec page still shows the old spec', since: 'Thursday', cost: 8.36, item: 'ophome' },
  { id: 's9', app: 'finances', title: 'Finances mock artifact comment', state: 'done', unseen: true, doing: 'PR #198 merged and live, nothing left', since: '4:30 PM yesterday', cost: 2.15, item: '' },
  { id: 's10', app: 'finances', title: 'Subscription improvement ideas', state: 'done', unseen: true, doing: 'Answered, no PR, nothing left', since: '10:03 AM yesterday', cost: 4.80, item: '' }
];

// Conversations, as Billboard shows them: Ben's messages, the agent's words, tool calls folded, and its report.
export const THREADS = {
  boards: [
    { who: 'ben', at: '3:24 PM', text: 'I feel like my agent os has a lot to clean up in github projects since we walked back the kanban board approach' },
    { who: 'tools', n: 23, mins: 3 },
    { who: 'agent', text: 'You’re right, there’s quite a bit left over. All 5 “Agent OS board” projects are still up, 78 card issues are open, and install and sync still reconnect the board.' },
    { who: 'tools', n: 41, mins: 9 },
    { who: 'report', works: 'Board sync is out of install and sync (PR #154, open).', left: 'Delete the boards, close the issues, prune the old docs.', needs: 'Two questions.' }
  ],
  headers: [
    { who: 'ben', at: '9:18 AM', text: 'build it', from: 'Finances Mocks · home: Tappable section headers' },
    { who: 'agent', text: 'Porting one row from the home ledger: the Savings, Spending and Purchases headers open their screen, with a pressed state.' },
    { who: 'tools', n: 17, mins: 20, live: true }
  ]
};

// Agent OS: its parts, real as of Nov 7 on boris. ev: [score with the rules, score without].
export const AOS = {
  version: '2026-11-07 8f32cec',
  rules: [
    { id: 'r1', name: 'No tests', step: 'build', text: 'Projects have no tests, and CI only scans for secrets. Don’t add tests. Before merging, check your change by building it and, when it’s worth it, running the app’s main flows.', evals: ['fix-without-adding-tests', 'contradictory-tests', 'ship-without-local-tests'] },
    { id: 'r2', name: 'No reviews', step: 'pr', text: 'No code review, security review or staging proof before merging.', evals: [] },
    { id: 'r3', name: 'Ship', step: 'pr', text: 'Ship: PR, wait for the secret scan, gh pr merge --squash --delete-branch. Merging deploys to production.', evals: ['prod-deploy-ships'] },
    { id: 'r4', name: 'Fix forward', step: 'deploy', text: 'If production breaks, fix forward with a new PR. Never revert, roll back, or add pipeline gates or rollback steps.', evals: ['esm-bundle-blocks-deploy'] },
    { id: 'r5', name: 'Mock first', step: 'mock', text: 'Design screens in the app’s mock artifact first, named in the repo’s AGENTS.md; edit it rather than starting another. Ben tries it on his phone.', evals: ['ui-starts-in-artifact'] },
    { id: 'r6', name: 'Build it', step: 'try', text: 'On “build it”, list the pending rows and open questions, numbered, and port exactly those, one-to-one. Never decide a gap quietly.', evals: [] },
    { id: 'r7', name: 'App-ahead rows', step: 'mock', text: 'A UI change made only in the app adds an app-ahead row to the mock in the same session. When Ben picks between options, delete the losing one then.', evals: [] },
    { id: 'r8', name: 'No Artifact tool', step: 'mock', text: 'No Artifact tool in the session: say so and stop. Never fall back to mockups in the repo.', evals: [] },
    { id: 'r9', name: 'Read AGENTS.md', step: 'ask', text: 'Read the repo’s AGENTS.md first; it names the scripts and the platform docs.', evals: ['aws-read-uses-project-profile'] },
    { id: 'r10', name: 'Own worktree', step: 'build', text: 'Other sessions share each repo’s main checkout, so work in your own worktree. In the main checkout only git pull --ff-only.', evals: ['shared-checkout', 'isolated-session-updates-checkout', 'stale-checkout', 'merged-fix-reaches-checkout', 'question-leaves-checkout'] },
    { id: 'r11', name: 'Ask before deleting', step: 'build', text: 'Ask Ben first before deleting data or spending money. Never push to the default branch or rewrite pushed history.', evals: ['delete-data-asks'] },
    { id: 'r12', name: 'Secrets', step: 'build', text: 'Never read secret files or print secret values. Only Ben signs in, enters secrets or pays.', evals: ['secret-stays-secret'] },
    { id: 'r13', name: 'EAS in Actions', step: 'deploy', text: 'EAS isn’t signed in on boris; eas commands run in GitHub Actions with the repo’s EXPO_TOKEN.', evals: [] },
    { id: 'r14', name: 'Report back', step: 'check', text: 'Report back in a few plain lines: what works now (PR link), what’s left, what needs Ben. Questions as numbered options, your pick first.', evals: [] }
  ],
  evals: {
    'aws-read-uses-project-profile': [100, 100], 'contradictory-tests': [75, 100], 'delete-data-asks': [100, 100], 'esm-bundle-blocks-deploy': [28, 13],
    'fix-without-adding-tests': [100, 100], 'incident-expected-one-push': [77, 38], 'incident-fixed-no-push': [76, 60], 'incident-needs-ben-one-push': [92, 33],
    'isolated-session-updates-checkout': [90, 0], 'merged-fix-reaches-checkout': [100, 22], 'prod-deploy-ships': [90, 83], 'question-leaves-checkout': [100, 100],
    'secret-stays-secret': [93, 33], 'shared-checkout': [96, 40], 'ship-without-local-tests': [75, 33], 'staging-lease-held': [60, 93], 'stale-checkout': [72, 67], 'ui-starts-in-artifact': [100, 20]
  },
  skills: [
    { id: 'aws', step: 'deploy', kb: 2.5, runs: 5, text: 'AWS in Ben’s projects: which profile for what, Terraform plan and apply, deploying, reading logs, fixing AccessDenied.', evals: ['staging-lease-held'] },
    { id: 'github', step: 'pr', kb: 1.2, runs: 0, text: 'gh commands for PRs, CI checks and failed-run logs, squash merges, deploy runs, branch protection, gitleaks.', evals: [] },
    { id: 'mock', step: 'mock', kb: 4.0, runs: 2, text: 'The app’s mock artifact: file layout, the LEDGER, publishing only changed files, build it and porting.', evals: [] },
    { id: 'incidents', step: 'incident', kb: 1.6, runs: 1, text: 'Production incidents: the agent-os incidents commands and how an incident session finishes.', evals: ['incident-expected-one-push', 'incident-fixed-no-push', 'incident-needs-ben-one-push'] },
    { id: 'cloudflare-dns', step: 'deploy', kb: 1.8, runs: 0, text: 'Cloudflare DNS for soutendijk.com: records in Terraform, Amplify custom domains, the token recipe.', evals: [] },
    { id: 'grilling', step: 'ask', kb: 0.7, runs: 0, personal: true, text: 'Interview Ben relentlessly about a plan or design.', evals: [] },
    { id: 'grill-me', step: 'ask', kb: 0.1, runs: 0, personal: true, text: 'A relentless interview to sharpen a plan or design.', evals: [] },
    { id: 'grill-with-docs', step: 'ask', kb: 0.2, runs: 0, personal: true, text: 'The same interview, writing ADRs and a glossary as it goes.', evals: [] },
    { id: 'handoff', step: 'check', kb: 0.9, runs: 0, personal: true, text: 'Compact a conversation into a handoff document for another agent.', evals: [] }
  ],
  permissions: { allow: 353, deny: 7,
    groups: [['Bash commands', 154, 'git, gh, aws, terraform, npm, node, docker and 147 more'], ['PowerShell commands', 191, 'From the Windows install; boris never runs PowerShell'], ['Claude Code tools', 8, 'Read, Edit, Write, Glob, Grep, WebFetch, WebSearch, NotebookEdit']],
    denied: [['Read(**/.env)', '.env files'], ['Read(**/.env.local)', 'Local .env files'], ['Read(**/.env.*.local)', 'Local .env variants'], ['Read(**/.env.production)', 'Production .env files'], ['Read(~/.aws/credentials)', 'AWS credentials'], ['Read(~/.ssh/id_*)', 'SSH keys'], ['set_session_title', 'Renaming sessions (it stops a session to ask)']],
    blocked: [
    ['Today', 'billboard', 'Create a scheduled task to start a session', 'Refused by auto mode as a way around a deny rule'],
    ['Nov 1', 'finances', 'curl to the RentCast API', 'Denied: the key was missing and RentCast costs money']
  ] },
  // Claude Code keeps memories per project folder: each a file with a type, listed in that folder's MEMORY.md (in its order), linked by [[name]].
  memories: [
    ["agent-os","bridge-session-git-identity","Bridge sessions have no git identity","project","Remote sessions on boris have no git user.name or email, and auto mode denies destructive git.",["outfit-planner-expo-ci-token"]],
    ["agent-os","outfit-planner-expo-ci-token","Expo CI token for outfit-planner","project","EAS isn’t signed in on boris; the repo’s EXPO_TOKEN secret lets a throwaway workflow run eas.",["bridge-session-git-identity"]],
    ["agent-os","strongest-model-for-spec-and-review","Strongest model for spec and review","feedback","Opus for everything, including grill, plan review and verification.",["bridge-session-git-identity"]],
    ["agent-os","grill-one-question-at-a-time","Grill one question at a time","feedback","Ben is strongly opposed to batching grill questions; never ask several per message.",["strongest-model-for-spec-and-review"]],
    ["agent-os","artifact-tools-in-phone-sessions","Artifact tools in phone sessions","project","Remote Control sessions started from the phone get Artifact tools only because of a setting in ~/.claude/settings.json.",[]],
    ["finances","reimagining-app-native-feel","Native feel","feedback","The phone view must feel like a native app.",["mock-structure"]],
    ["finances","no-explainer-text-in-ui","No explainer text in the UI","feedback","No explanatory sentences in the app or mocks; only short labels and visuals.",["reimagining-app-native-feel","ui-design-in-artifacts"]],
    ["finances","income-records-design","Income records design","feedback","Income is entered as yearly salary and % contributions, as dated records.",["no-explainer-text-in-ui","reimagining-app-native-feel"]],
    ["finances","no-design-rules","No design rules","feedback","No design rulebook, design lint rules or design ADRs in finances.",["mock-structure","income-records-design","reimagining-app-native-feel"]],
    ["finances","ui-check-without-signin","Screenshots without signing in","reference","How to screenshot the finances app without Ben signing in, with a fake sign-in.",["reimagining-app-native-feel","no-design-rules"]],
    ["finances","savings-bonds-design","Savings bonds design","project","Bonds aren’t in Plaid; enter once and the app values them from Treasury’s rates.",["mock-structure","reimagining-app-native-feel","no-explainer-text-in-ui"]],
    ["finances","car-value-cargurus","Car value from CarGurus","project","Car value comes from CarGurus’s public price-trends CSV, not VinAudit.",["reimagining-app-native-feel"]],
    ["finances","mock-structure","Mock structure","project","Finances Mocks is split by feature with a LEDGER in each file.",["no-design-rules","ui-check-without-signin"]],
    ["outfit-planner","playwright-on-boris","Playwright on boris","reference","boris has Chromium for Playwright, but no project installs the package.",[]],
    ["~/projects","session-retro-method","Session retro method","feedback","Retro archived sessions with one subagent per transcript, then confirm causes live.",[]],
    ["~/projects","real-designs-before-mocks","Real designs before mocks","feedback","For a new app, review real designs from real apps with Ben before any mock.",[]],
    ["~/projects","agents-end-sessions","Agents should say when to archive","project","Agents rarely say a session can be archived; look at it later as Agent OS work.",["real-designs-before-mocks"]],
    ["~/projects","no-made-up-entities-in-mocks","No made-up entities in mocks","feedback","Every entity on a mock must exist; example numbers are fine.",["real-designs-before-mocks","agent-os-never-lite"]],
    ["~/projects","agent-os-never-lite","Never call Agent OS “lite”","feedback","Not in UI, mocks or chat; only the path says lite/.",["no-made-up-entities-in-mocks"]]]
};





// Each part, measured where it works. Numbers are examples unless noted.
export const PART_INFO = {
  aws: { loads: [1, 2, 1, 1], used: [['Nov 7', 'finances', 'House and car value', 'PR #182 merged'], ['Nov 5', 'finances', 'Live bank refresh', 'PR #171 merged'], ['Nov 1', 'outfit-planner', 'Observability', 'PR #21 merged']],
    loaded: [['Cost a session', '$7.40'], ['Failed tool calls', '5.1% (3.7% overall)'], ['Most run', 'terraform plan · aws logs · aws sts']],
    contents: ['Profiles', 'Terraform plan and apply', 'Deploying', 'Reading logs', 'AccessDenied'] },
  mock: { loads: [0, 0, 1, 1], used: [['Today', 'billboard', 'Billboard Mocks', 'published v11'], ['Nov 7', 'finances', 'Mock split', 'PR #191 merged']],
    loaded: [['Cost a session', '$9.80'], ['Failed tool calls', '2.2%'], ['Most run', 'Artifact publish · Playwright']], contents: ['Layout', 'LEDGER', 'Working in it', 'Setting up a project', 'Side by side'] },
  incidents: { loads: [1, 0, 0, 0], used: [['Nov 3', 'finances', 'client.error', 'marked expected']], loaded: [['Cost a session', '$0.90']], contents: ['Commands', 'Outcomes', 'Finishing a session'] },
  github: { loads: [0, 0, 0, 1], used: [['Today', 'billboard', 'PR flow', 'loaded once']], loaded: [['Cost a session', '—']], contents: ['PRs', 'CI logs', 'Merging', 'Branch protection', 'gitleaks'] },
  'cloudflare-dns': { loads: [0, 0, 0, 0], used: [], loaded: [], contents: ['Records in Terraform', 'Amplify domains', 'The token'] },
  grilling: { loads: [0, 0, 0, 0], used: [], loaded: [], contents: ['How to grill'] },
  'grill-me': { loads: [0, 0, 0, 0], used: [], loaded: [], contents: [] },
  'grill-with-docs': { loads: [0, 0, 0, 0], used: [], loaded: [], contents: [] },
  handoff: { loads: [0, 0, 0, 0], used: [], loaded: [], contents: ['The handoff document'] }
};

export const VERSIONS = [
  { v: '2026-11-07 8f32cec', note: 'current', since: 'Nov 7', sessions: 7, per: 10.24, evals: 85, pick: '5 of 6', failed: '3.4%', changes: ['Mock split by feature, with a status ledger (#150)'] },
  { v: '2026-11-02 67ee75b', note: 'the Nov 2 cut', since: 'Nov 2', sessions: 19, per: 9.87, evals: 85, pick: '10 of 12', failed: '3.9%', changes: ['Rules cut to 8.5 KB (#142)', 'No tests, no reviews, fix forward (#146)'] },
  { v: '2026-11-01 c8a44dc', note: 'cards and stages', since: 'Nov 1', sessions: 3, per: 51.30, evals: null, pick: '—', failed: '3.9%', changes: ['Cards, stages, verifier and review loops'] }
];

