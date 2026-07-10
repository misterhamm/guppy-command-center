// Derived product rules ported from the handoff data.js.

import { daysBetween, dueMeta, addDays, dIso } from './dates.js';

export function staleDays(p, todayISO) { return daysBetween(p.lastISO, todayISO); }
export function isStale(p, todayISO) { return staleDays(p, todayISO) > p.cadenceDays; }
export function nextLate(p, todayISO) { return daysBetween(p.nextISO, todayISO) > 0; }
export function nextDueNow(p, todayISO) { return p.nextISO === todayISO; }

// Severity rank: At Risk → Waiting → stale/next-check-in-late → Active → Standby → On Hold
export function severityRank(p, todayISO) {
  return p.status === 'At Risk' ? 0
    : p.status === 'Waiting' ? 1
    : p.status === 'Standby' ? 4
    : p.status === 'On Hold' ? 5
    : (isStale(p, todayISO) || nextLate(p, todayISO)) ? 2 : 3;
}

// Chip order for the Projects status filter row
export const PROJECT_STATUSES = ['At Risk', 'Waiting', 'Active', 'Standby', 'On Hold'];

export function defaultRadarOrder(projects, todayISO) {
  return projects.slice().sort((a, b) => severityRank(a, todayISO) - severityRank(b, todayISO)).map(p => p.id);
}

// Reconcile a saved custom order with the current project list: drop projects
// that no longer sync in, and slot NEW projects by severity rank relative to the
// custom list — never append blindly or reset the user's order.
export function reconcileRadarOrder(savedOrder, projects, todayISO) {
  const ids = new Set(projects.map(p => p.id));
  if (!Array.isArray(savedOrder)) return defaultRadarOrder(projects, todayISO);
  const byId = {}; projects.forEach(p => { byId[p.id] = p; });
  const order = savedOrder.filter(id => ids.has(id));
  const missing = projects.filter(p => !order.includes(p.id));
  for (const p of missing) {
    const rank = severityRank(p, todayISO);
    let at = order.length;
    for (let i = 0; i < order.length; i++) {
      if (severityRank(byId[order[i]], todayISO) > rank) { at = i; break; }
    }
    order.splice(at, 0, p.id);
  }
  return order;
}

export const PRIORITIES = ['ASAP', 'High', 'Now', 'Soon', 'Someday'];
export const STATUSES = ['Not Started', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
export const URGENT_PRIORITIES = ['ASAP', 'HIGH', 'NOW'];

export function titleCase(x) { return x ? x.charAt(0) + x.slice(1).toLowerCase() : x; }

// Client → projects map derived from the non-complete project list (plus any
// clients referenced only by tasks).
export function clientsMap(projects, tasks) {
  const map = {};
  for (const p of projects) {
    if (!p.client) continue;
    (map[p.client] = map[p.client] || []).push(p.name);
  }
  for (const t of tasks || []) {
    if (t.client && !map[t.client]) map[t.client] = [];
  }
  return map;
}

// ---- Deterministic natural-language capture (plain parser, no LLM) ----
const DOW = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const PRIO_WORDS = { asap: 'ASAP', high: 'High', now: 'Now', soon: 'Soon', someday: 'Someday' };

export function parseQuickAdd(text, clients, todayISO) {
  const out = { client: '', project: '', dueISO: '', priority: '', detected: [] };
  if (!text) return { ...out, cleanName: '' };
  const kept = [];
  const words = text.split(/\s+/);
  const clientKeys = Object.keys(clients || {});
  const tomorrow = addDays(todayISO, 1);
  for (const w of words) {
    const lw = w.toLowerCase().replace(/[.,!]+$/, '');
    if (!out.priority && PRIO_WORDS[lw]) { out.priority = PRIO_WORDS[lw]; out.detected.push(PRIO_WORDS[lw].toUpperCase()); continue; }
    if (!out.dueISO && (lw === 'today' || lw === 'tomorrow' || lw === 'tmrw' || DOW[lw] !== undefined)) {
      if (lw === 'today') out.dueISO = todayISO;
      else if (lw === 'tomorrow' || lw === 'tmrw') out.dueISO = tomorrow;
      else {
        const target = DOW[lw]; const todayDow = dIso(todayISO).getDay();
        let diff = (target - todayDow + 7) % 7; if (diff === 0) diff = 7;
        out.dueISO = addDays(todayISO, diff);
      }
      out.detected.push(dueMeta(out.dueISO, todayISO).label);
      continue;
    }
    if (!out.client) {
      const hit = clientKeys.find(c => c.toLowerCase().split(/\s+/)[0] === lw && lw.length >= 4);
      if (hit) {
        out.client = hit; out.detected.push(hit);
        if ((clients[hit] || []).length === 1) out.project = clients[hit][0];
        continue;
      }
    }
    kept.push(w);
  }
  out.cleanName = kept.join(' ').trim();
  return out;
}

export const JOIN_URLS = { Meet: 'https://meet.google.com', Zoom: 'https://zoom.us/join', Teams: 'https://teams.microsoft.com' };
export const GCAL_URL = 'https://calendar.google.com';
export const NOTION_URL = 'https://www.notion.so';
