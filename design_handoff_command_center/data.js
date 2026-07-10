// Command Center — shared seed data, palettes, and helpers (E1 consolidation)
// TODAY/NOW are prototype pins; the real build derives these from the clock (E2).
export const TODAY_ISO = '2026-07-08';
export const NOW_MIN = 630; // 10:30 AM

const MS = 86400000;
export function dIso(iso) { return new Date(iso + 'T12:00:00'); }
export function daysBetween(a, b) { return Math.round((dIso(b) - dIso(a)) / MS); }
export function addDays(iso, n) { const d = dIso(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
export function fmtShort(iso) { return dIso(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
export function fmtDow(iso) { return dIso(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }

// Display metadata for a due date, all derived (B5/E2: no hand-set lateness)
export function dueMeta(iso) {
  if (!iso) return { label: '—', late: 0, isToday: false, has: false };
  const diff = daysBetween(TODAY_ISO, iso); // >0 future, <0 past
  const late = diff < 0 ? -diff : 0;
  if (late > 0) return { label: fmtShort(iso) + ' · ' + late + 'd', late, isToday: false, has: true };
  if (diff === 0) return { label: 'Today', late: 0, isToday: true, has: true };
  if (diff <= 6) return { label: fmtDow(iso), late: 0, isToday: false, has: true };
  return { label: fmtShort(iso), late: 0, isToday: false, has: true };
}

export const NEXT_MON = '2026-07-13';
export const TOMORROW = addDays(TODAY_ISO, 1);
export const NEXT_WEEK = addDays(TODAY_ISO, 7);

export const CLIENTS = {
  'BizStream': ['QA Process Docs', 'Onboarding Guide'],
  'Borax': ['Site Rebuild'],
  'Lakeshore CU': ['Rates API'],
  'Meridian Foods': ['Intranet'],
  'Harbor Health': ['Portal Phase 2'],
  'Drayton Legal': ['Kentico Upgrade'],
  'Cedar & Main': ['Ecomm Audit']
};

export const SEED_TASKS = [
  { id: 't1', name: 'Send Borax sitemap revisions', client: 'Borax', project: 'Site Rebuild', dueISO: '2026-07-03', priority: 'HIGH', personal: false, done: false, justDone: false, sort: 0, status: 'In Progress', notes: 'Dana wants the /resources section flattened; confirm before resending.' },
  { id: 't2', name: 'Follow up on Lakeshore sandbox access', client: 'Lakeshore CU', project: 'Rates API', dueISO: '2026-07-06', priority: 'ASAP', personal: false, done: false, justDone: false, sort: 1, status: 'In Progress', notes: '' },
  { id: 't3', name: 'Prep agenda for Harbor Health sprint review', client: 'Harbor Health', project: 'Portal Phase 2', dueISO: '2026-07-08', priority: 'NOW', personal: false, done: false, justDone: false, sort: 2, status: 'Not Started', notes: '' },
  { id: 't4', name: 'Review Meridian SSO ticket', client: 'Meridian Foods', project: 'Intranet', dueISO: '2026-07-08', priority: 'SOON', personal: false, done: false, justDone: false, sort: 3, status: 'Not Started', notes: '' },
  { id: 't5', name: 'Timesheet + weekly check-ins', client: 'BizStream', project: '', dueISO: '2026-07-08', priority: 'SOON', personal: false, done: true, justDone: true, sort: 4, status: 'Done', notes: '' },
  { id: 't6', name: 'Draft Drayton regression test plan', client: 'Drayton Legal', project: 'Kentico Upgrade', dueISO: '2026-07-10', priority: 'HIGH', personal: false, done: false, justDone: false, sort: 5, status: 'Not Started', notes: '' },
  { id: 't7', name: 'Draft fallback plan for rates feed', client: 'Lakeshore CU', project: 'Rates API', dueISO: '2026-07-10', priority: 'SOON', personal: false, done: false, justDone: false, sort: 6, status: 'Not Started', notes: '' },
  { id: 't8', name: 'Renew car registration', client: '', project: '', dueISO: '2026-07-18', priority: 'SOMEDAY', personal: true, done: false, justDone: false, sort: 7, status: 'Not Started', notes: '' }
];

// cadenceDays + lastISO/nextISO drive computed staleness (B5)
export const SEED_PROJECTS = [
  { id: 'p1', name: 'Rates API', client: 'Lakeshore CU', status: 'At Risk', concerns: [{ text: 'Vendor sandbox down 8 days — escalate today', tone: 'red' }, { text: 'Rates feed fallback plan not started', tone: 'amber' }, { text: 'Client wants revised timeline at Fri check-in', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastISO: '2026-07-01', nextISO: '2026-07-08', statusText: 'Integration blocked 8 days on vendor sandbox. Dev team parked on stubs; timeline slips if not unblocked this week.' },
  { id: 'p2', name: 'Intranet', client: 'Meridian Foods', status: 'Waiting', concerns: [{ text: 'SSO cert with client IT since Jun 30', tone: 'amber' }, { text: 'Search indexing bug — repro steps needed', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastISO: '2026-07-06', nextISO: '2026-07-13', statusText: 'Blocked on client IT for the SSO certificate; search work continues in parallel.' },
  { id: 'p3', name: 'Site Rebuild', client: 'Borax', status: 'Active', concerns: [{ text: 'Sitemap revisions overdue to Dana', tone: 'red' }, { text: 'Content model sign-off needed by Jul 9', tone: 'amber' }, { text: 'Photography budget unconfirmed', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastISO: '2026-07-06', nextISO: '2026-07-13', statusText: 'Content workshop today at 11:00. Build phase starts once the content model is signed off.' },
  { id: 'p4', name: 'Portal Phase 2', client: 'Harbor Health', status: 'Active', concerns: [{ text: 'Sprint review Jul 10 — demo checklist', tone: 'amber' }], cadence: 'Bi-weekly', cadenceDays: 14, lastISO: '2026-07-02', nextISO: '2026-07-16', statusText: 'Sprint on track. Demo checklist is the only open prep item.' },
  { id: 'p5', name: 'Kentico Upgrade', client: 'Drayton Legal', status: 'Active', concerns: [{ text: 'Regression pass before Jul 15', tone: 'amber' }, { text: 'License renewal quote pending', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastISO: '2026-06-26', nextISO: '2026-07-03', statusText: 'Upgrade applied on staging. Needs a full regression pass before the Jul 15 window.' },
  { id: 'p6', name: 'Ecomm Audit', client: 'Cedar & Main', status: 'Waiting', concerns: [{ text: 'Client reviewing findings deck', tone: 'mute' }], cadence: 'Monthly', cadenceDays: 30, lastISO: '2026-07-01', nextISO: '2026-08-01', statusText: 'Findings delivered Jul 1; awaiting client feedback before scoping fixes.' },
  { id: 'p7', name: 'QA Process Docs', client: 'BizStream', status: 'On Hold', concerns: [{ text: 'Resume after Q3 planning', tone: 'mute' }], cadence: 'Monthly', cadenceDays: 30, lastISO: '2026-06-15', nextISO: '2026-08-01', statusText: 'Parked until Q3 planning wraps.' },
  { id: 'p8', name: 'Onboarding Guide', client: 'BizStream', status: 'Active', concerns: [{ text: 'Draft outline for new BA hires', tone: 'mute' }], cadence: 'Monthly', cadenceDays: 30, lastISO: '2026-07-01', nextISO: '2026-08-01', statusText: 'Early drafting. No blockers.' }
];

export function staleDays(p) { return daysBetween(p.lastISO, TODAY_ISO); }
export function isStale(p) { return staleDays(p) > p.cadenceDays; }
export function nextLate(p) { return daysBetween(p.nextISO, TODAY_ISO) >= 0 && p.nextISO !== TODAY_ISO ? daysBetween(p.nextISO, TODAY_ISO) > 0 : false; }
export function nextDueNow(p) { return p.nextISO === TODAY_ISO; }

// Default radar order (A1): At Risk → Waiting → stale → Active → On Hold, until the user drags their own.
// Build note: when a NEW project syncs in after the user has a custom order, slot it by this severity
// rank relative to the custom list (do not append blindly or reset the user's order).
export function defaultRadarOrder(projects) {
  const rank = p => p.status === 'At Risk' ? 0 : p.status === 'Waiting' ? 1 : p.status === 'On Hold' ? 4 : (isStale(p) || nextLate(p)) ? 2 : 3;
  return projects.slice().sort((a, b) => rank(a) - rank(b)).map(p => p.id);
}

// join-link hrefs for the conferencing chip (B4)
export const JOIN_URLS = { 'Meet': 'https://meet.google.com', 'Zoom': 'https://zoom.us/join', 'Teams': 'https://teams.microsoft.com' };
export const GCAL_URL = 'https://calendar.google.com';
export const NOTION_URL = 'https://www.notion.so';

// startMin lets the strip compute "Next:" instead of hardcoding it (E2)
export const CAL = {
  'this': [
    { label: 'MON JUL 6', iso: '2026-07-06', events: [
      { id: 'e1', time: '9:00 – 9:15', startMin: 540, title: 'Standup', past: true, location: 'Teams', join: '', attendees: ['Dev team', 'You'], agenda: 'Daily sync.', client: 'BizStream', project: '' },
      { id: 'e2', time: '2:00 – 2:30', startMin: 840, title: 'Meridian check-in', past: true, location: 'Huddle 1', join: '', attendees: ['Priya N. (client IT)', 'You'], agenda: 'Chased the SSO certificate — client IT promised an update by Thursday.', client: 'Meridian Foods', project: 'Intranet' }
    ]},
    { label: 'TUE JUL 7', iso: '2026-07-07', events: [
      { id: 'e3', time: '9:00 – 9:15', startMin: 540, title: 'Standup', past: true, location: 'Teams', join: '', attendees: ['Dev team', 'You'], agenda: 'Daily sync.', client: 'BizStream', project: '' },
      { id: 'e4', time: '1:00 – 2:00', startMin: 780, title: 'Cedar & Main findings walkthrough', past: true, location: 'Zoom', join: '', attendees: ['Marcus T.', 'Elena R.', 'You'], agenda: 'Walked the client through the audit findings deck; they are reviewing before we scope fixes.', client: 'Cedar & Main', project: 'Ecomm Audit' }
    ]},
    { label: 'WED JUL 8', iso: '2026-07-08', isToday: true, events: [
      { id: 'e5', time: '9:00 – 9:15', startMin: 540, endMin: 555, title: 'Standup', past: true, location: 'Teams', join: '', attendees: ['Dev team', 'You'], agenda: 'Daily sync — flagged the Lakeshore sandbox blocker again.', client: 'BizStream', project: '' },
      { id: 'e6', time: '11:00 – 12:00', startMin: 660, endMin: 720, title: 'Borax content workshop', kind: 'next', tag: 'UP NEXT', location: 'Huddle 2', join: 'Meet', attendees: ['Dana W.', 'Sam K.', 'You'], agenda: 'Work through the content model for the new sitemap. Goal: sign-off by Jul 9 so the build phase can start.', client: 'Borax', project: 'Site Rebuild' },
      { id: 'e7', time: '1:30 – 2:00', startMin: 810, endMin: 840, title: 'Lakeshore escalation', kind: 'placeholder', tag: 'PLACEHOLDER', location: 'No room yet', join: '', attendees: ['Vendor AE (TBD)', 'You'], agenda: 'Hold for the vendor sandbox escalation — waiting on their AE to confirm. Sandbox has been down 8 days.', client: 'Lakeshore CU', project: 'Rates API' },
      { id: 'e8', time: '3:00 – 3:45', startMin: 900, endMin: 945, title: 'Harbor backlog grooming', location: 'Zoom', join: 'Zoom', attendees: ['Harbor product team', 'You'], agenda: 'Groom the Portal Phase 2 backlog ahead of Friday\u2019s sprint review.', client: 'Harbor Health', project: 'Portal Phase 2' }
    ]},
    { label: 'THU JUL 9', iso: '2026-07-09', events: [
      { id: 'e9', time: '10:00 – 11:00', startMin: 600, title: 'Lakeshore vendor escalation call', location: 'Teams', join: 'Teams', attendees: ['Vendor AE', 'Lakeshore IT', 'You'], agenda: 'Get a firm restore date for the sandbox and agree on a fallback if it slips again.', client: 'Lakeshore CU', project: 'Rates API' },
      { id: 'e10', time: '2:00 – 2:30', startMin: 840, title: 'Meridian check-in', location: 'Huddle 1', join: '', attendees: ['Priya N. (client IT)', 'You'], agenda: 'SSO certificate status and repro steps for the search indexing bug.', client: 'Meridian Foods', project: 'Intranet' }
    ]},
    { label: 'FRI JUL 10', iso: '2026-07-10', events: [
      { id: 'e11', time: '9:30 – 10:30', startMin: 570, title: 'Drayton upgrade planning', location: 'Huddle 2', join: 'Meet', attendees: ['Drayton stakeholders', 'QA team', 'You'], agenda: 'Plan the regression pass ahead of the Jul 15 upgrade window.', client: 'Drayton Legal', project: 'Kentico Upgrade' },
      { id: 'e18', time: '10:30 – 12:00', startMin: 630, title: 'Focus: draft Drayton test plan', location: '', join: '', attendees: ['You'], agenda: 'Blocked time to draft the regression test plan before the kickoff.', client: 'Drayton Legal', project: 'Kentico Upgrade' },
      { id: 'e12', time: '1:00 – 2:00', startMin: 780, title: 'Harbor Health sprint review', location: 'Zoom', join: 'Zoom', attendees: ['Harbor product team', 'Dev team', 'You'], agenda: 'Demo sprint work and walk through the demo checklist.', client: 'Harbor Health', project: 'Portal Phase 2' }
    ]}
  ],
  'next': [
    { label: 'MON JUL 13', iso: '2026-07-13', events: [
      { id: 'e13', time: '10:00 – 10:30', startMin: 600, title: 'Borax weekly check-in', location: 'Google Meet', join: 'Meet', attendees: ['Dana W.', 'You'], agenda: 'First check-in after content model sign-off; confirm build phase kickoff.', client: 'Borax', project: 'Site Rebuild' },
      { id: 'e14', time: '2:00 – 3:00', startMin: 840, title: 'Lakeshore timeline review', location: 'Teams', join: 'Teams', attendees: ['Lakeshore leadership', 'You'], agenda: 'Present the revised timeline requested at the Friday check-in.', client: 'Lakeshore CU', project: 'Rates API' }
    ]},
    { label: 'TUE JUL 14', iso: '2026-07-14', events: [
      { id: 'e15', time: '11:00 – 12:00', startMin: 660, title: 'Drayton regression kickoff', location: 'Huddle 2', join: '', attendees: ['QA team', 'You'], agenda: 'Kick off the regression pass from the approved test plan.', client: 'Drayton Legal', project: 'Kentico Upgrade' }
    ]},
    { label: 'WED JUL 15', iso: '2026-07-15', events: [
      { id: 'e16', time: '8:00 – 12:00', startMin: 480, title: 'Kentico upgrade window', kind: 'placeholder', tag: 'HOLD', location: 'Remote', join: '', attendees: ['Dev team', 'You'], agenda: 'Production upgrade window — goes ahead only if the regression pass is clean.', client: 'Drayton Legal', project: 'Kentico Upgrade' }
    ]},
    { label: 'THU JUL 16', iso: '2026-07-16', events: [
      { id: 'e17', time: '1:00 – 1:30', startMin: 780, title: 'Harbor Health check-in', location: 'Zoom', join: 'Zoom', attendees: ['Harbor product team', 'You'], agenda: 'Bi-weekly cadence check-in.', client: 'Harbor Health', project: 'Portal Phase 2' }
    ]},
    { label: 'FRI JUL 17', iso: '2026-07-17', events: [] }
  ]
};

// ---- theme palettes (computed colors delivered through logic; static surfaces use CSS vars) ----
// D1: muted lifted for contrast (light #6E6759, dark #A69D8B). D2: Personal lavender formalized.
// B2: ASAP is now the hottest treatment; HIGH steps down to a tinted chip.
export const THEMES = {
  light: {
    ink: '#201D1A', soft: '#4a443b', muted: '#6E6759', faint: '#8a8375',
    card: '#ffffff', cardAlt: '#FBF9F5', panel: '#F1EDE4',
    line: 'rgba(32,29,26,.1)', line2: 'rgba(32,29,26,.15)',
    green: '#1E7A52', greenHover: '#14593B', greenSoft: 'rgba(30,122,82,.09)',
    red: '#C2452D', redSoft: 'rgba(194,69,45,.12)',
    amber: '#B98A2A', cream: '#F5E3BC', creamBg: '#FBF6E8', creamText: '#7a4d00',
    lavBg: '#EEEAF5', lavText: '#6A5D93',
    boxBorder: '#b8b0a2', boxBg: '#ffffff', doneName: '#a09884',
    toastAccent: '#7FD4A8',
    PR: {
      'ASAP': { bg: '#C2452D', color: '#fff', rank: 0, weight: '800' },
      'HIGH': { bg: 'rgba(194,69,45,.14)', color: '#A23A24', rank: 1, weight: '800' },
      'NOW': { bg: '#F5E3BC', color: '#7a4d00', rank: 2, weight: '800' },
      'SOON': { bg: '#EDE9E1', color: '#4a443b', rank: 3, weight: '800' },
      'SOMEDAY': { bg: '#F1EDE4', color: '#6E6759', rank: 4, weight: '800' }
    },
    STATUS: {
      'At Risk': { rail: '#C2452D', bg: '#C2452D', color: '#fff', word: 'AT RISK' },
      'Waiting': { rail: '#B98A2A', bg: '#F5E3BC', color: '#7a4d00', word: 'WAITING' },
      'Active': { rail: '#1E7A52', bg: 'rgba(30,122,82,.1)', color: '#1E7A52', word: 'ACTIVE' },
      'On Hold': { rail: '#8a8375', bg: '#EDE9E1', color: '#4a443b', word: 'ON HOLD' }
    }
  },
  dark: {
    ink: '#EDE7DA', soft: '#C4BCAC', muted: '#A69D8B', faint: '#968E7C',
    card: '#302B23', cardAlt: '#26221B', panel: '#2A2620',
    line: 'rgba(237,231,218,.16)', line2: 'rgba(237,231,218,.26)',
    green: '#3FB37D', greenHover: '#57C592', greenSoft: 'rgba(63,179,125,.18)',
    red: '#E0654B', redSoft: 'rgba(224,101,75,.2)',
    amber: '#D0A544', cream: '#3B3115', creamBg: '#332C18', creamText: '#E4BC64',
    lavBg: '#2B2836', lavText: '#A99BC9',
    boxBorder: '#847B67', boxBg: '#26221B', doneName: '#6E675A',
    toastAccent: '#1E7A52',
    PR: {
      'ASAP': { bg: '#E0654B', color: '#fff', rank: 0, weight: '800' },
      'HIGH': { bg: 'rgba(224,101,75,.2)', color: '#E0654B', rank: 1, weight: '800' },
      'NOW': { bg: '#3B3115', color: '#E4BC64', rank: 2, weight: '800' },
      'SOON': { bg: '#403A2F', color: '#C4BCAC', rank: 3, weight: '800' },
      'SOMEDAY': { bg: '#2A2620', color: '#A69D8B', rank: 4, weight: '800' }
    },
    STATUS: {
      'At Risk': { rail: '#E0654B', bg: '#E0654B', color: '#fff', word: 'AT RISK' },
      'Waiting': { rail: '#D0A544', bg: '#3B3115', color: '#E4BC64', word: 'WAITING' },
      'Active': { rail: '#3FB37D', bg: 'rgba(63,179,125,.2)', color: '#3FB37D', word: 'ACTIVE' },
      'On Hold': { rail: '#968E7C', bg: '#403A2F', color: '#C4BCAC', word: 'ON HOLD' }
    }
  }
};

export function concernDot(tone, P) { return tone === 'red' ? P.red : tone === 'amber' ? P.amber : P.faint; }

// ---- F1: deterministic natural-language capture (plain parser, no LLM) ----
const DOW = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const PRIO_WORDS = { asap: 'ASAP', high: 'High', now: 'Now', soon: 'Soon', someday: 'Someday' };
export function parseQuickAdd(text) {
  const out = { client: '', project: '', dueISO: '', priority: '', detected: [] };
  if (!text) return { ...out, cleanName: '' };
  const kept = [];
  const words = text.split(/\s+/);
  const clientKeys = Object.keys(CLIENTS);
  for (const w of words) {
    const lw = w.toLowerCase().replace(/[.,!]+$/, '');
    // priority words
    if (!out.priority && PRIO_WORDS[lw]) { out.priority = PRIO_WORDS[lw]; out.detected.push(PRIO_WORDS[lw].toUpperCase()); continue; }
    // date words
    if (!out.dueISO && (lw === 'today' || lw === 'tomorrow' || lw === 'tmrw' || DOW[lw] !== undefined)) {
      if (lw === 'today') out.dueISO = TODAY_ISO;
      else if (lw === 'tomorrow' || lw === 'tmrw') out.dueISO = TOMORROW;
      else {
        const target = DOW[lw]; const todayDow = dIso(TODAY_ISO).getDay();
        let diff = (target - todayDow + 7) % 7; if (diff === 0) diff = 7;
        out.dueISO = addDays(TODAY_ISO, diff);
      }
      out.detected.push(dueMeta(out.dueISO).label);
      continue;
    }
    // client name match (first word of client, ≥4 chars)
    if (!out.client) {
      const hit = clientKeys.find(c => c.toLowerCase().split(/\s+/)[0] === lw && lw.length >= 4);
      if (hit) {
        out.client = hit; out.detected.push(hit);
        if (CLIENTS[hit].length === 1) out.project = CLIENTS[hit][0];
        continue;
      }
    }
    kept.push(w);
  }
  out.cleanName = kept.join(' ').trim();
  return out;
}
