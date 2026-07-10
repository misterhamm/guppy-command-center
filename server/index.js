import { config as dotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Load .env from the server directory regardless of the process cwd
dotenv({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

import express from 'express';
import { buildTasks, buildProjects, buildCalendar } from './mockData.js';
import * as notion from './sources/notion.js';
import * as gcal from './sources/gcal.js';
import * as guppy from './sources/guppy.js';

const app = express();
app.use(express.json({ limit: '8mb' })); // logo uploads arrive as base64 data URLs

// Short TTL cache so the client's 2–5 min polling (and StrictMode double
// fetches) don't hammer Notion/Google. Writes invalidate the tasks cache.
const CACHE_MS = 45000;
const cache = new Map();
async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

// In-memory state for the mock source. Real sources bypass this — Notion is the
// source of truth once wired.
let tasks = buildTasks();
let projects = buildProjects();

app.get('/api/health', (_req, res) => res.json({ ok: true, sources: { notion: notion.configured(), gcal: gcal.configured(), guppy: guppy.configured() } }));

app.get('/api/tasks', async (_req, res) => {
  if (notion.configured()) {
    try { return res.json({ tasks: await cached('tasks', () => notion.getTasks()), source: 'notion' }); }
    catch (e) { console.error('[notion] getTasks failed:', e.message); return res.status(502).json({ error: String(e.message || e) }); }
  }
  res.json({ tasks, source: 'mock' });
});

app.post('/api/tasks', async (req, res) => {
  const b = req.body || {};
  if (!b.name || typeof b.name !== 'string') return res.status(400).json({ error: 'name required' });
  if (notion.configured()) {
    try { const task = await notion.createTask(b); cache.delete('tasks'); return res.json({ task, source: 'notion' }); }
    catch (e) { console.error('[notion] createTask failed:', e.message); return res.status(502).json({ error: String(e.message || e) }); }
  }
  const task = {
    id: 'n' + Date.now(),
    name: b.name.trim(),
    client: b.personal ? '' : (b.client || ''),
    project: b.personal ? '' : (b.project || ''),
    dueISO: b.dueISO || '',
    priority: (b.priority || 'SOON').toUpperCase(),
    personal: !!b.personal,
    done: false,
    sort: 99,
    status: 'Not Started',
    notes: b.notes || ''
  };
  tasks.push(task);
  res.json({ task, source: 'mock' });
});

app.patch('/api/tasks/:id', async (req, res) => {
  if (notion.configured()) {
    try { const task = await notion.updateTask(req.params.id, req.body || {}); cache.delete('tasks'); return res.json({ task, source: 'notion' }); }
    catch (e) { console.error('[notion] updateTask failed:', e.message); return res.status(502).json({ error: String(e.message || e) }); }
  }
  const t = tasks.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  const allowed = ['name', 'client', 'project', 'dueISO', 'priority', 'personal', 'done', 'status', 'notes'];
  for (const k of allowed) if (k in (req.body || {})) t[k] = req.body[k];
  if ('done' in (req.body || {}) && !('status' in (req.body || {}))) t.status = t.done ? 'Done' : (t.status === 'Done' ? 'Not Started' : t.status);
  if ('status' in (req.body || {})) t.done = t.status === 'Done';
  res.json({ task: t, source: 'mock' });
});

app.get('/api/projects', async (_req, res) => {
  if (notion.configured()) {
    try { return res.json({ projects: await cached('projects', () => notion.getProjects()), source: 'notion' }); }
    catch (e) { console.error('[notion] getProjects failed:', e.message); return res.status(502).json({ error: String(e.message || e) }); }
  }
  res.json({ projects, source: 'mock' });
});

app.patch('/api/projects/:id', async (req, res) => {
  const b = req.body || {};
  if (notion.configured()) {
    try { const project = await notion.updateProject(req.params.id, b); cache.delete('projects'); return res.json({ project, source: 'notion' }); }
    catch (e) { console.error('[notion] updateProject failed:', e.message); return res.status(502).json({ error: String(e.message || e) }); }
  }
  const p = projects.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (b.status) p.status = b.status;
  if ('statusText' in b) p.statusText = b.statusText;
  if ('concernsText' in b) p.concerns = String(b.concernsText || '').split(/\n+/).map(s => s.trim()).filter(Boolean).map(text => ({ text, tone: 'mute' }));
  res.json({ project: p, source: 'mock' });
});

app.get('/api/calendar', async (_req, res) => {
  if (gcal.configured()) {
    try { return res.json({ weeks: await cached('calendar', () => gcal.getCalendar()), source: 'gcal' }); }
    catch (e) { console.error('[gcal] getCalendar failed:', e.message); return res.status(502).json({ error: String(e.message || e) }); }
  }
  res.json({ weeks: buildCalendar(), source: 'mock' });
});

// ---- company logos ----
// Source of truth is Notion: logos live as page icons on the Companies
// database (set via the File Upload API). Notion serves file icons through
// expiring signed URLs, so the server keeps a local byte cache
// (server/uploads, gitignored) keyed by client + icon version and re-downloads
// when the icon changes. Without Notion configured, uploads just live in the
// local cache (mock mode).
import fs from 'node:fs';
import crypto from 'node:crypto';
const uploadsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads');
const manifestPath = path.join(uploadsDir, 'manifest.json');
function readManifest() {
  try { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { return {}; }
}
function writeManifest(m) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2));
}

const LOGO_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp', 'image/gif': 'gif' };
const extFor = ct => LOGO_TYPES[(ct || '').split(';')[0]] || 'png';
const slugFor = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';

function cacheLogo(clientName, version, buf, contentType) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  const hash = crypto.createHash('md5').update(String(version)).digest('hex').slice(0, 8);
  const file = `${slugFor(clientName)}-${hash}.${extFor(contentType)}`;
  fs.writeFileSync(path.join(uploadsDir, file), buf);
  const manifest = readManifest();
  const prev = manifest[clientName];
  if (prev && prev.file !== file) { try { fs.unlinkSync(path.join(uploadsDir, prev.file)); } catch (e) { /* gone */ } }
  manifest[clientName] = { file, version: String(version) };
  writeManifest(manifest);
  return `/api/logos/file/${encodeURIComponent(file)}`;
}

app.get('/api/logos', async (_req, res) => {
  const manifest = readManifest();
  const map = {};
  if (notion.configured()) {
    try {
      const icons = await cached('logos', () => notion.getCompanyLogos());
      for (const icon of icons) {
        if (icon.kind === 'external') { map[icon.client] = icon.url; continue; }
        const hit = manifest[icon.client];
        if (hit && hit.version === String(icon.version) && fs.existsSync(path.join(uploadsDir, hit.file))) {
          map[icon.client] = `/api/logos/file/${encodeURIComponent(hit.file)}`;
          continue;
        }
        try {
          const dl = await fetch(icon.url);
          if (!dl.ok) continue;
          const buf = Buffer.from(await dl.arrayBuffer());
          map[icon.client] = cacheLogo(icon.client, icon.version, buf, dl.headers.get('content-type'));
        } catch (e) { console.error('[logos] cache download failed for', icon.client, e.message); }
      }
      return res.json({ logos: map, source: 'notion' });
    } catch (e) {
      console.error('[notion] getCompanyLogos failed:', e.message);
      // fall through to whatever is cached locally
    }
  }
  for (const [clientName, entry] of Object.entries(manifest)) {
    if (fs.existsSync(path.join(uploadsDir, entry.file))) map[clientName] = `/api/logos/file/${encodeURIComponent(entry.file)}`;
  }
  res.json({ logos: map, source: 'cache' });
});

app.get('/api/logos/file/:name', (req, res) => {
  const name = path.basename(req.params.name); // no traversal
  const file = path.join(uploadsDir, name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

app.post('/api/logos', async (req, res) => {
  const { client: clientName, dataUrl } = req.body || {};
  if (!clientName || !dataUrl) return res.status(400).json({ error: 'client and dataUrl required' });
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match || !LOGO_TYPES[match[1]]) return res.status(400).json({ error: 'unsupported image type' });
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'image too large (4MB max)' });
  if (notion.configured()) {
    try {
      await notion.uploadCompanyLogo(clientName, buf, match[1], `${slugFor(clientName)}-logo.${LOGO_TYPES[match[1]]}`);
      cache.delete('logos');
    } catch (e) {
      console.error('[notion] uploadCompanyLogo failed:', e.message);
      return res.status(502).json({ error: String(e.message || e) });
    }
  }
  // cache the bytes we already have so the UI updates instantly
  const url = cacheLogo(clientName, Date.now(), buf, match[1]);
  res.json({ client: clientName, url: `${url}?v=${Date.now()}` });
});

// Deterministic canned replies (mirrors the prototype) until the Hermes/Guppy
// endpoint is reachable — see sources/guppy.js.
function cannedReply(text) {
  const open = tasks.filter(t => !t.done);
  const today = new Date();
  const todayIso = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const od = open.filter(t => t.dueISO && t.dueISO < todayIso).length;
  const td = open.filter(t => t.dueISO === todayIso).length;
  const lower = (text || '').toLowerCase();
  if (lower.includes('borax')) return 'Site Rebuild is Active — sitemap revisions are overdue to Dana, and the content model needs sign-off. You have a Borax content workshop on the calendar this week.';
  if (lower.includes('week') || lower.includes('summar')) return `This week: ${od} overdue, ${td} due today, ${open.length} open tasks across ${projects.length} projects. Rates API is your only At Risk project — the vendor sandbox escalation is the big one.`;
  if (lower.includes('note')) return 'Paste your meeting notes here and I’ll draft tasks with clients and due dates for you to confirm — nothing is saved until you approve each one.';
  return `You’ve got ${od} overdue and ${td} due today. Biggest risk on the radar: Rates API (vendor sandbox down 8 days). Want the full rundown of any project?`;
}

app.post('/api/guppy/chat', async (req, res) => {
  const messages = (req.body && req.body.messages) || [];
  const last = messages.length ? messages[messages.length - 1].text : '';
  if (guppy.configured()) {
    try { return res.json(await guppy.chat(messages)); }
    catch (e) { return res.status(502).json({ error: String(e.message || e) }); }
  }
  res.json({ reply: cannedReply(last), source: 'mock' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Command Center API listening on http://localhost:${port} (sources: notion=${notion.configured()}, gcal=${gcal.configured()}, guppy=${guppy.configured()})`));
