#!/usr/bin/env node
// The tools an agent uses to tell Billboard where its session stands: an MCP server over stdio, one copy per session,
// started by that session's Claude Code. Standard library only. It writes records through server/declared.mjs.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { appendRecord } from '../server/declared.mjs';

// The session this server belongs to: Claude Code's own record for its process, read per call because /clear changes it.
function sessionId() {
  try {
    const id = JSON.parse(readFileSync(join(homedir(), '.claude', 'sessions', `${process.ppid}.json`), 'utf8')).sessionId;
    if (id) return id;
  } catch { /* fall through */ }
  return process.env.CLAUDE_CODE_SESSION_ID || '';
}

const REPORT = {
  type: 'object', additionalProperties: false,
  properties: {
    works: { type: 'string', description: 'What works now, in one plain sentence. Name the PR if there is one.' },
    left: { type: 'string', description: 'What is left undone, in one plain sentence. Leave it out if nothing is.' }
  }
};
const MAIN = 'Main session only: never call this from a helper agent.';
const CLOSE = 'Call exactly one of ask, waiting or done as the last thing in every turn, and still say the same thing in your reply to Ben.';
const TOOLS = [
  {
    name: 'working',
    description: `Tell Billboard what this session is working on. Call it when you start a piece of work, and again only if that changes. ${MAIN}`,
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['doing'],
      properties: {
        doing: { type: 'string', description: 'What you are doing, in a few plain words Ben would use, e.g. "Porting the pressed state on the Savings header".' },
        from: { type: 'string', description: 'Where this work comes from, if it has a source, e.g. "Finances Mocks · home, 1 row" or "PR #27\'s failed deploy".' }
      }
    }
  },
  {
    name: 'ask',
    description: `End the turn waiting on Ben: either questions only he can answer, or one thing only he can do. Pass questions or action, never both. ${CLOSE} ${MAIN}`,
    inputSchema: {
      type: 'object', additionalProperties: false,
      properties: {
        questions: {
          type: 'array', minItems: 1, maxItems: 4, description: 'The questions, each as it should read on a card.',
          items: {
            type: 'object', additionalProperties: false, required: ['q', 'options'],
            properties: {
              q: { type: 'string', description: 'The question, in one sentence.' },
              options: { type: 'array', maxItems: 6, items: { type: 'string' }, description: 'Short answers Ben can tap. Empty if he has to reply in his own words.' },
              pick: { type: 'integer', minimum: 0, description: 'Index of the option you recommend. Leave it out if you have no recommendation.' }
            }
          }
        },
        action: {
          type: 'object', additionalProperties: false, required: ['kind', 'text'],
          description: 'One thing only Ben can do.',
          properties: {
            kind: { type: 'string', enum: ['try', 'do', 'mock'], description: 'try: try a change that went live. do: something else only he can do. mock: try it in the mock, then say build it.' },
            text: { type: 'string', description: 'What he should do, in one or two plain sentences.' }
          }
        },
        report: REPORT
      }
    }
  },
  {
    name: 'waiting',
    description: `End the turn waiting on something that is not Ben, such as a deploy or a background job. ${CLOSE} ${MAIN}`,
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['on'],
      properties: { on: { type: 'string', description: 'What you are waiting on, in a few words, e.g. "TestFlight processing build 37".' }, report: REPORT }
    }
  },
  {
    name: 'done',
    description: `End the turn with nothing more for this session to do. If something is unfinished, say so in report.left: Billboard shows that as stuck. ${CLOSE} ${MAIN}`,
    inputSchema: {
      type: 'object', additionalProperties: false, required: ['report'],
      properties: {
        report: { ...REPORT, required: ['works'] },
        offers: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' }, description: 'Optional follow-ups you could do next. These never wait on Ben.' },
        pick: { type: 'integer', minimum: 0, description: 'Index of the offer you recommend, if you have one.' }
      }
    }
  }
];

const LIMIT = { short: 160, long: 500 };
function text(v, name, max, required) {
  if (v === undefined || v === null || v === '') { if (required) throw new Error(`${name} is required`); return undefined; }
  if (typeof v !== 'string' || !v.trim()) throw new Error(`${name} must be text`);
  if (v.length > max) throw new Error(`${name} is ${v.length} characters; keep it under ${max}`);
  return v.trim();
}
function index(v, list, name) {
  if (v === undefined || v === null) return undefined;
  if (!Number.isInteger(v) || v < 0 || v >= list.length) throw new Error(`${name} must be an index into its list, 0 to ${list.length - 1}`);
  return v;
}
function report(r, needWorks) {
  if (r === undefined || r === null) { if (needWorks) throw new Error('report is required'); return { }; }
  if (typeof r !== 'object') throw new Error('report must be an object');
  return { works: text(r.works, 'report.works', LIMIT.long, needWorks), left: text(r.left, 'report.left', LIMIT.long) };
}
function strings(list, name, max) {
  if (!Array.isArray(list)) throw new Error(`${name} must be a list`);
  return list.map((o, k) => text(o, `${name}[${k}]`, max, true));
}

const CHECK = {
  working: (a) => ({ doing: text(a.doing, 'doing', LIMIT.short, true), from: text(a.from, 'from', LIMIT.short) }),
  ask: (a) => {
    if (!!a.questions === !!a.action) throw new Error('Pass questions or action, exactly one');
    if (a.action) {
      if (!['try', 'do', 'mock'].includes(a.action.kind)) throw new Error('action.kind must be try, do or mock');
      return { action: { kind: a.action.kind, text: text(a.action.text, 'action.text', LIMIT.long, true) }, report: report(a.report) };
    }
    if (!Array.isArray(a.questions) || !a.questions.length || a.questions.length > 4) throw new Error('questions must list 1 to 4 questions');
    return {
      report: report(a.report),
      questions: a.questions.map((q, k) => {
        const options = strings(q.options ?? [], `questions[${k}].options`, LIMIT.short);
        return { q: text(q.q, `questions[${k}].q`, LIMIT.long, true), options, pick: index(q.pick, options, `questions[${k}].pick`) };
      })
    };
  },
  waiting: (a) => ({ on: text(a.on, 'on', LIMIT.short, true), report: report(a.report) }),
  done: (a) => {
    const offers = a.offers === undefined ? undefined : strings(a.offers, 'offers', LIMIT.short);
    return { report: report(a.report, true), offers, pick: offers ? index(a.pick, offers, 'pick') : undefined };
  }
};

function call(name, args) {
  if (!CHECK[name]) throw new Error(`No tool called ${name}`);
  const fields = CHECK[name](args || {});
  const session = sessionId();
  if (!session) throw new Error('Could not tell which session this is');
  appendRecord(session, name, fields);
  return name === 'working' ? 'Recorded on Billboard.' : 'Recorded on Billboard. You can end your turn.';
}

function handle(m) {
  switch (m.method) {
    case 'initialize': return { protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'billboard', version: '1.0.0' } };
    case 'ping': return {};
    case 'tools/list': return { tools: TOOLS };
    case 'tools/call':
      try { return { content: [{ type: 'text', text: call(m.params?.name, m.params?.arguments) }] }; }
      catch (err) { return { isError: true, content: [{ type: 'text', text: err.message }] }; }
    default: throw Object.assign(new Error(`Method not found: ${m.method}`), { code: -32601 });
  }
}

const send = (o) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...o }) + '\n');
createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let m;
  try { m = JSON.parse(line); } catch { send({ id: null, error: { code: -32700, message: 'Parse error' } }); return; }
  if (m.id === undefined || m.id === null) return; // a notification
  try { send({ id: m.id, result: handle(m) }); }
  catch (err) { send({ id: m.id, error: { code: err.code || -32603, message: err.message } }); }
});
