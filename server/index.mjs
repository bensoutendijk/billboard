// Billboard: serves web/ and a JSON API under /api/. Node standard library only. Routes and shapes: server/CONTRACT.md.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getItems, getTracks, getNow } from './sources/items.mjs';
import { getSessions, getThreads } from './sources/sessions.mjs';
import { getApps, getDays14, getDayPrs } from './sources/projects.mjs';
import { getAos, getPartInfo, getVersions } from './sources/agentos.mjs';

const PORT = Number(process.env.PORT || 4710);
const HOST = process.env.HOST || '0.0.0.0';
const WEB = fileURLToPath(new URL('../web/', import.meta.url));
const STARTED = new Date().toISOString();

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const API = {
  '/api/health': async () => ({ ok: true, started: STARTED }),
  '/api/today-work': async () => {
    const [now, tracks, items, sessions, threads] = await Promise.all([getNow(), getTracks(), getItems(), getSessions(), getThreads()]);
    return { now, build: tracks.build, fromMock: tracks.fromMock, items, sessions, threads };
  },
  '/api/projects': async () => {
    const [apps, days14, dayPrs] = await Promise.all([getApps(), getDays14(), getDayPrs()]);
    return { apps, days14, dayPrs };
  },
  '/api/agentos': async () => {
    const [aos, partInfo, versions] = await Promise.all([getAos(), getPartInfo(), getVersions()]);
    return { aos, partInfo, versions };
  }
};

function send(res, code, type, body, extra = {}) {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-cache', ...extra });
  res.end(body);
}

async function serveStatic(path, res) {
  const rel = normalize(decodeURIComponent(path === '/' ? '/index.html' : path)).replace(/^([/\\])+/, '');
  const file = join(WEB, rel);
  if (!file.startsWith(WEB) || rel.split(sep).some((p) => p.startsWith('.'))) return send(res, 404, 'text/plain', 'Not found');
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    send(res, 200, TYPES[extname(file)] || 'application/octet-stream', await readFile(file));
  } catch {
    send(res, 404, 'text/plain', 'Not found');
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname.startsWith('/api/')) {
      const route = API[pathname];
      if (!route) return send(res, 404, 'application/json', JSON.stringify({ error: 'No such route' }));
      if (req.method !== 'GET') return send(res, 405, 'application/json', JSON.stringify({ error: 'GET only' }), { allow: 'GET' });
      return send(res, 200, 'application/json', JSON.stringify(await route()));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'GET only', { allow: 'GET' });
    await serveStatic(pathname, res);
  } catch (err) {
    console.error(req.method, pathname, err);
    send(res, 500, 'application/json', JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, HOST, () => console.log(`Billboard on http://${HOST}:${PORT}`));
