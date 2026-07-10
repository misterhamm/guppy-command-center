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
app.use(express.json());

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

app.get('/api/calendar', async (_req, res) => {
  if (gcal.configured()) {
    try { return res.json({ weeks: await cached('calendar', () => gcal.getCalendar()), source: 'gcal' }); }
    catch (e) { console.error('[gcal] getCalendar failed:', e.message); return res.status(502).json({ error: String(e.message || e) }); }
  }
  res.json({ weeks: buildCalendar(), source: 'mock' });
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
