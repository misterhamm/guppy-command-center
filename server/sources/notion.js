// Notion adapter — tasks ("Master To Do") + projects ("Project Check-ins").
//
// Env: NOTION_TOKEN, NOTION_TASKS_DB_ID, NOTION_PROJECTS_DB_ID.
//
// Property mapping is discovered from the database schema at runtime (by type +
// name pattern), so minor naming differences in Notion don't break the sync.
// The mapping is logged once at startup for debugging. Select/status option
// names are matched case-insensitively and written back using Notion's exact
// option name.

import { Client } from '@notionhq/client';

let _client = null;
const client = () => _client || (_client = new Client({ auth: process.env.NOTION_TOKEN }));
const tasksDb = () => process.env.NOTION_TASKS_DB_ID;
const projectsDb = () => process.env.NOTION_PROJECTS_DB_ID;

export const configured = () => !!(process.env.NOTION_TOKEN && tasksDb() && projectsDb());

// ---------- schema discovery ----------

const schemaCache = new Map();
async function schema(dbId) {
  if (!schemaCache.has(dbId)) {
    const db = await client().databases.retrieve({ database_id: dbId });
    schemaCache.set(dbId, db.properties);
  }
  return schemaCache.get(dbId);
}

function findProp(props, types, patterns, { fallbackFirstOfType = false } = {}) {
  const entries = Object.entries(props);
  for (const pat of patterns) {
    const hit = entries.find(([name, p]) => types.includes(p.type) && pat.test(name));
    if (hit) return { name: hit[0], ...hit[1] };
  }
  if (fallbackFirstOfType) {
    const hit = entries.find(([, p]) => types.includes(p.type));
    if (hit) return { name: hit[0], ...hit[1] };
  }
  return null;
}

let _taskMap = null;
async function taskMap() {
  if (_taskMap) return _taskMap;
  const P = await schema(tasksDb());
  _taskMap = {
    title: findProp(P, ['title'], [/./], { fallbackFirstOfType: true }),
    status: findProp(P, ['status', 'select'], [/^status$/i, /status/i]),
    due: findProp(P, ['date'], [/^due/i, /due/i, /date/i]),
    priority: findProp(P, ['select', 'status'], [/priorit/i]),
    category: findProp(P, ['select', 'checkbox'], [/categor/i, /personal/i, /type/i]),
    client: findProp(P, ['relation'], [/client/i, /compan/i]),
    projects: findProp(P, ['relation'], [/project/i]),
    notes: findProp(P, ['rich_text'], [/note/i, /detail/i, /description/i])
  };
  console.log('[notion] task property map:', Object.fromEntries(Object.entries(_taskMap).map(([k, v]) => [k, v ? v.name : '(none)'])));
  return _taskMap;
}

let _projMap = null;
async function projMap() {
  if (_projMap) return _projMap;
  const P = await schema(projectsDb());
  _projMap = {
    title: findProp(P, ['title'], [/./], { fallbackFirstOfType: true }),
    client: findProp(P, ['relation', 'select', 'rich_text'], [/client/i, /compan/i]),
    status: findProp(P, ['status', 'select'], [/^status$/i, /status/i]),
    concerns: findProp(P, ['rich_text'], [/concern/i, /next action/i, /risk/i]),
    cadence: findProp(P, ['select', 'rich_text'], [/cadence/i, /frequency/i]),
    last: findProp(P, ['date'], [/last/i]),
    next: findProp(P, ['date'], [/next/i]),
    statusText: findProp(P, ['rich_text'], [/status text/i, /current status/i, /summary/i, /update/i, /^status\b/i]),
    logo: findProp(P, ['files'], [/logo/i, /image/i])
  };
  console.log('[notion] project property map:', Object.fromEntries(Object.entries(_projMap).map(([k, v]) => [k, v ? v.name : '(none)'])));
  return _projMap;
}

// ---------- value helpers ----------

const plain = rt => (rt || []).map(x => x.plain_text).join('');

function readProp(page, prop) {
  if (!prop) return undefined;
  const v = page.properties[prop.name];
  if (!v) return undefined;
  switch (v.type) {
    case 'title': return plain(v.title);
    case 'rich_text': return plain(v.rich_text);
    case 'select': return v.select ? v.select.name : '';
    case 'status': return v.status ? v.status.name : '';
    case 'date': return v.date && v.date.start ? v.date.start.slice(0, 10) : '';
    case 'relation': return v.relation.map(r => r.id);
    case 'checkbox': return v.checkbox;
    case 'files': return v.files.map(f => ({ name: f.name, kind: f.type, url: f.type === 'file' ? f.file.url : (f.external ? f.external.url : '') })).filter(f => f.url);
    default: return undefined;
  }
}

function optionName(prop, value) {
  const opts = (prop.select && prop.select.options) || (prop.status && prop.status.options) || [];
  const hit = opts.find(o => o.name.toLowerCase() === String(value).toLowerCase());
  return hit ? hit.name : String(value);
}

// Resolve a related page's title (client names, project names). Cached, plus a
// reverse title→id cache used when writing relations back.
const titleById = new Map();
const idByTitle = new Map();
async function pageTitle(id) {
  if (titleById.has(id)) return titleById.get(id);
  try {
    const page = await client().pages.retrieve({ page_id: id });
    const t = Object.values(page.properties).find(p => p.type === 'title');
    const name = t ? plain(t.title) : '';
    titleById.set(id, name);
    if (name) idByTitle.set(name.toLowerCase(), id);
    return name;
  } catch (e) {
    return '';
  }
}

async function pageIdForTitle(name) {
  if (!name) return null;
  const cached = idByTitle.get(name.toLowerCase());
  if (cached) return cached;
  const res = await client().search({ query: name, filter: { property: 'object', value: 'page' }, page_size: 5 });
  for (const page of res.results) {
    const t = Object.values(page.properties || {}).find(p => p.type === 'title');
    const title = t ? plain(t.title) : '';
    if (title.toLowerCase() === name.toLowerCase()) {
      titleById.set(page.id, title);
      idByTitle.set(title.toLowerCase(), page.id);
      return page.id;
    }
  }
  return null;
}

async function queryAll(database_id) {
  const results = [];
  let cursor;
  do {
    const res = await client().databases.query({ database_id, start_cursor: cursor, page_size: 100 });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

// ---------- tasks ----------

const PRIORITY_LABELS = { ASAP: 'ASAP', HIGH: 'High', NOW: 'Now', SOON: 'Soon', SOMEDAY: 'Someday' };

async function normalizeTask(page, m, sort) {
  const status = readProp(page, m.status) || 'Not Started';
  const clientIds = readProp(page, m.client) || [];
  const projectIds = readProp(page, m.projects) || [];
  const category = readProp(page, m.category);
  const personal = m.category && m.category.type === 'checkbox' ? !!category : String(category || 'Work').toLowerCase() === 'personal';
  return {
    id: page.id,
    name: readProp(page, m.title) || '(untitled)',
    client: clientIds.length ? await pageTitle(clientIds[0]) : '',
    project: projectIds.length ? await pageTitle(projectIds[0]) : '',
    dueISO: readProp(page, m.due) || '',
    priority: String(readProp(page, m.priority) || 'Soon').toUpperCase(),
    personal,
    done: ['done', 'cancelled', 'canceled', 'complete', 'completed'].includes(status.toLowerCase()),
    sort,
    status,
    notes: readProp(page, m.notes) || ''
  };
}

export async function getTasks() {
  const m = await taskMap();
  const pages = await queryAll(tasksDb());
  pages.sort((a, b) => new Date(a.created_time) - new Date(b.created_time));
  const tasks = [];
  for (let i = 0; i < pages.length; i++) tasks.push(await normalizeTask(pages[i], m, i));
  return tasks;
}

async function buildTaskProperties(patch, m) {
  const properties = {};
  if ('name' in patch && m.title) properties[m.title.name] = { title: [{ text: { content: patch.name || '(untitled)' } }] };
  let status = patch.status;
  if (!status && 'done' in patch) status = patch.done ? 'Done' : 'Not Started';
  if (status && m.status) {
    const name = optionName(m.status, status);
    properties[m.status.name] = m.status.type === 'status' ? { status: { name } } : { select: { name } };
  }
  if ('dueISO' in patch && m.due) properties[m.due.name] = { date: patch.dueISO ? { start: patch.dueISO } : null };
  if ('priority' in patch && m.priority && patch.priority) {
    const label = PRIORITY_LABELS[String(patch.priority).toUpperCase()] || patch.priority;
    const name = optionName(m.priority, label);
    properties[m.priority.name] = m.priority.type === 'status' ? { status: { name } } : { select: { name } };
  }
  if ('personal' in patch && m.category) {
    properties[m.category.name] = m.category.type === 'checkbox'
      ? { checkbox: !!patch.personal }
      : { select: { name: optionName(m.category, patch.personal ? 'Personal' : 'Work') } };
  }
  if ('client' in patch && m.client) {
    const id = patch.client ? await pageIdForTitle(patch.client) : null;
    if (id || !patch.client) properties[m.client.name] = { relation: id ? [{ id }] : [] };
    else console.warn(`[notion] client "${patch.client}" not found — leaving relation unchanged`);
  }
  if ('project' in patch && m.projects) {
    const id = patch.project ? await pageIdForTitle(patch.project) : null;
    if (id || !patch.project) properties[m.projects.name] = { relation: id ? [{ id }] : [] };
    else console.warn(`[notion] project "${patch.project}" not found — leaving relation unchanged`);
  }
  if ('notes' in patch && m.notes) properties[m.notes.name] = { rich_text: patch.notes ? [{ text: { content: patch.notes } }] : [] };
  return properties;
}

export async function createTask(body) {
  const m = await taskMap();
  const properties = await buildTaskProperties({ status: 'Not Started', ...body }, m);
  const page = await client().pages.create({ parent: { database_id: tasksDb() }, properties });
  return normalizeTask(page, m, 999);
}

export async function updateTask(id, patch) {
  const m = await taskMap();
  const properties = await buildTaskProperties(patch, m);
  const page = await client().pages.update({ page_id: id, properties });
  return normalizeTask(page, m, 999);
}

// ---------- projects ----------

const CADENCE_DAYS = [
  [/daily/i, 1], [/bi-?weekly|fortnight/i, 14], [/weekly/i, 7], [/monthly/i, 30], [/quarterly/i, 90]
];
function cadenceDays(cadence) {
  for (const [re, days] of CADENCE_DAYS) if (re.test(cadence || '')) return days;
  return 7;
}

// Concern tones aren't modeled in Notion; lead with the status severity so the
// radar dots stay meaningful.
function concernTone(status, index) {
  if (index > 0) return 'mute';
  return status === 'At Risk' ? 'red' : status === 'Waiting' ? 'amber' : 'mute';
}

async function normalizeProject(page, m) {
  const name = readProp(page, m.title) || '(untitled)';
  titleById.set(page.id, name);
  idByTitle.set(name.toLowerCase(), page.id);
  let clientVal = readProp(page, m.client);
  if (Array.isArray(clientVal)) clientVal = clientVal.length ? await pageTitle(clientVal[0]) : '';
  const statusRaw = readProp(page, m.status) || 'Active';
  // Mirror Notion status values exactly; normalize case for the known set
  const known = ['Active', 'Waiting', 'At Risk', 'Standby', 'On Hold', 'Complete'];
  const status = known.find(k => k.toLowerCase() === statusRaw.toLowerCase()) || statusRaw;
  const cadence = readProp(page, m.cadence) || 'Weekly';
  const concernsText = readProp(page, m.concerns) || '';
  const concerns = concernsText.split(/\n+/).map(s => s.trim()).filter(Boolean)
    .map((text, i) => ({ text, tone: concernTone(status, i) }));
  const days = cadenceDays(cadence);
  const lastISO = readProp(page, m.last) || page.last_edited_time.slice(0, 10);
  // Missing next check-in falls back to last + cadence so staleness math stays valid
  const fallbackNext = new Date(lastISO + 'T12:00:00');
  fallbackNext.setDate(fallbackNext.getDate() + days);
  // Internal logo metadata (signed URL — never sent to the browser; the logos
  // route caches the bytes). Version keys off the stable file path, not the
  // rotating signature.
  const logoFiles = readProp(page, m.logo) || [];
  const logo = logoFiles.length
    ? { kind: logoFiles[0].kind, url: logoFiles[0].url, version: logoFiles[0].url.split('?')[0] }
    : null;
  return {
    id: page.id,
    name,
    client: clientVal || '',
    status,
    concerns,
    cadence,
    cadenceDays: days,
    lastISO,
    nextISO: readProp(page, m.next) || fallbackNext.toISOString().slice(0, 10),
    statusText: readProp(page, m.statusText) || '',
    logo
  };
}

export async function getProjects() {
  const m = await projMap();
  const pages = await queryAll(projectsDb());
  const projects = [];
  for (const page of pages) projects.push(await normalizeProject(page, m));
  return projects;
}

// ---------- company logos (stored in Notion as Companies page icons) ----------

let _companiesDb = null;
async function companiesDb() {
  if (process.env.NOTION_COMPANIES_DB_ID) return process.env.NOTION_COMPANIES_DB_ID;
  if (_companiesDb) return _companiesDb;
  const res = await client().search({ query: 'Companies', filter: { property: 'object', value: 'database' } });
  const hit = res.results.find(d => ((d.title || []).map(t => t.plain_text).join('')).toLowerCase() === 'companies');
  if (!hit) throw new Error('Companies database not found — share it with the integration or set NOTION_COMPANIES_DB_ID');
  _companiesDb = hit.id;
  return _companiesDb;
}

const NOTION_API = 'https://api.notion.com/v1';
const nHeaders = () => ({ Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': '2022-06-28' });

async function companyPageByName(name) {
  const pages = await queryAll(await companiesDb());
  return pages.find(pg => {
    const t = Object.values(pg.properties).find(p => p.type === 'title');
    return t && plain(t.title).toLowerCase() === String(name).toLowerCase();
  }) || null;
}

async function notionFileUpload(buffer, contentType, filename) {
  const create = await fetch(`${NOTION_API}/file_uploads`, {
    method: 'POST',
    headers: { ...nHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ filename, content_type: contentType })
  }).then(r => r.json());
  if (!create.id) throw new Error('Notion file upload failed: ' + (create.message || 'no upload id'));
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: contentType }), filename);
  const send = await fetch(`${NOTION_API}/file_uploads/${create.id}/send`, { method: 'POST', headers: nHeaders(), body: form }).then(r => r.json());
  if (send.status !== 'uploaded') throw new Error('Notion file upload failed: ' + (send.message || send.status));
  return create.id;
}

// Upload a logo via the Notion File Upload API and set it as the company
// page's icon — visible in Notion too, and it travels with the workspace.
// (Not currently exposed in the dashboard — Chris manages client logos in
// Notion directly; the dashboard uploads per-project logos below.)
export async function uploadCompanyLogo(clientName, buffer, contentType, filename) {
  const page = await companyPageByName(clientName);
  if (!page) throw new Error(`Company "${clientName}" not found in the Companies database`);
  const uploadId = await notionFileUpload(buffer, contentType, filename);
  const attach = await fetch(`${NOTION_API}/pages/${page.id}`, {
    method: 'PATCH',
    headers: { ...nHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ icon: { type: 'file_upload', file_upload: { id: uploadId } } })
  }).then(r => r.json());
  if (attach.object === 'error') throw new Error('Setting page icon failed: ' + attach.message);
  return { pageId: page.id };
}

// Upload a per-project logo into the Work Projects "Project Logo" files
// property. Takes precedence over the company icon in the dashboard.
export async function uploadProjectLogo(projectId, buffer, contentType, filename) {
  const m = await projMap();
  if (!m.logo) throw new Error('No files property matching "logo" found on the projects database');
  const uploadId = await notionFileUpload(buffer, contentType, filename);
  const page = await client().pages.update({
    page_id: projectId,
    properties: { [m.logo.name]: { files: [{ type: 'file_upload', file_upload: { id: uploadId }, name: filename }] } }
  });
  return normalizeProject(page, m);
}

// Company page icons → { client, kind: 'file'|'external', url, version }.
// File URLs are signed and expire (~1h); the server caches the bytes locally.
export async function getCompanyLogos() {
  const pages = await queryAll(await companiesDb());
  const out = [];
  for (const pg of pages) {
    const t = Object.values(pg.properties).find(p => p.type === 'title');
    const name = t ? plain(t.title) : '';
    if (!name || !pg.icon) continue;
    if (pg.icon.type === 'external') out.push({ client: name, kind: 'external', url: pg.icon.external.url, version: pg.last_edited_time });
    else if (pg.icon.type === 'file') out.push({ client: name, kind: 'file', url: pg.icon.file.url, version: pg.last_edited_time });
  }
  return out;
}

// Dashboard project edits: status, Next Concern (newline-separated), Current
// Status. Everything else stays Notion-side.
export async function updateProject(id, patch) {
  const m = await projMap();
  const properties = {};
  if (patch.status && m.status) {
    const name = optionName(m.status, patch.status);
    properties[m.status.name] = m.status.type === 'status' ? { status: { name } } : { select: { name } };
  }
  if ('concernsText' in patch && m.concerns) {
    properties[m.concerns.name] = { rich_text: patch.concernsText ? [{ text: { content: patch.concernsText.slice(0, 2000) } }] : [] };
  }
  if ('statusText' in patch && m.statusText) {
    properties[m.statusText.name] = { rich_text: patch.statusText ? [{ text: { content: patch.statusText.slice(0, 2000) } }] : [] };
  }
  const page = await client().pages.update({ page_id: id, properties });
  return normalizeProject(page, m);
}
