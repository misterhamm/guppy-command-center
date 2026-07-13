// Mock data source — the seed content from the design handoff, re-based around
// the real clock so the dashboard always looks alive. Offsets below are relative
// to "today" and mirror the handoff's pinned TODAY_ISO of 2026-07-08.

import { todayISO as localToday, addDaysISO as addDays, dowOf } from './tz.js';

const dIso = iso => new Date(iso + 'T12:00:00');

const TASK_SEEDS = [
  { id: 't1', name: 'Send Borax sitemap revisions', client: 'Borax', project: 'Site Rebuild', dueOff: -5, priority: 'HIGH', personal: false, done: false, sort: 0, status: 'In Progress', notes: 'Dana wants the /resources section flattened; confirm before resending.' },
  { id: 't2', name: 'Follow up on Lakeshore sandbox access', client: 'Lakeshore CU', project: 'Rates API', dueOff: -2, priority: 'ASAP', personal: false, done: false, sort: 1, status: 'In Progress', notes: '' },
  { id: 't3', name: 'Prep agenda for Harbor Health sprint review', client: 'Harbor Health', project: 'Portal Phase 2', dueOff: 0, priority: 'NOW', personal: false, done: false, sort: 2, status: 'Not Started', notes: '' },
  { id: 't4', name: 'Review Meridian SSO ticket', client: 'Meridian Foods', project: 'Intranet', dueOff: 0, priority: 'SOON', personal: false, done: false, sort: 3, status: 'Not Started', notes: '' },
  { id: 't5', name: 'Timesheet + weekly check-ins', client: 'BizStream', project: '', dueOff: 0, priority: 'SOON', personal: false, done: true, sort: 4, status: 'Done', notes: '' },
  { id: 't6', name: 'Draft Drayton regression test plan', client: 'Drayton Legal', project: 'Kentico Upgrade', dueOff: 2, priority: 'HIGH', personal: false, done: false, sort: 5, status: 'Not Started', notes: '' },
  { id: 't7', name: 'Draft fallback plan for rates feed', client: 'Lakeshore CU', project: 'Rates API', dueOff: 2, priority: 'SOON', personal: false, done: false, sort: 6, status: 'Not Started', notes: '' },
  { id: 't8', name: 'Renew car registration', client: '', project: '', dueOff: 10, priority: 'SOMEDAY', personal: true, done: false, sort: 7, status: 'Not Started', notes: '' }
];

const PROJECT_SEEDS = [
  { id: 'p1', name: 'Rates API', client: 'Lakeshore CU', status: 'At Risk', concerns: [{ text: 'Vendor sandbox down 8 days — escalate today', tone: 'red' }, { text: 'Rates feed fallback plan not started', tone: 'amber' }, { text: 'Client wants revised timeline at Fri check-in', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastOff: -7, nextOff: 0, statusText: 'Integration blocked 8 days on vendor sandbox. Dev team parked on stubs; timeline slips if not unblocked this week.' },
  { id: 'p2', name: 'Intranet', client: 'Meridian Foods', status: 'Waiting', concerns: [{ text: 'SSO cert with client IT since Jun 30', tone: 'amber' }, { text: 'Search indexing bug — repro steps needed', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastOff: -2, nextOff: 5, statusText: 'Blocked on client IT for the SSO certificate; search work continues in parallel.' },
  { id: 'p3', name: 'Site Rebuild', client: 'Borax', status: 'Active', concerns: [{ text: 'Sitemap revisions overdue to Dana', tone: 'red' }, { text: 'Content model sign-off needed', tone: 'amber' }, { text: 'Photography budget unconfirmed', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastOff: -2, nextOff: 5, statusText: 'Content workshop today at 11:00. Build phase starts once the content model is signed off.' },
  { id: 'p4', name: 'Portal Phase 2', client: 'Harbor Health', status: 'Active', concerns: [{ text: 'Sprint review Friday — demo checklist', tone: 'amber' }], cadence: 'Bi-weekly', cadenceDays: 14, lastOff: -6, nextOff: 8, statusText: 'Sprint on track. Demo checklist is the only open prep item.' },
  { id: 'p5', name: 'Kentico Upgrade', client: 'Drayton Legal', status: 'Active', concerns: [{ text: 'Regression pass before the upgrade window', tone: 'amber' }, { text: 'License renewal quote pending', tone: 'mute' }], cadence: 'Weekly', cadenceDays: 7, lastOff: -12, nextOff: -5, statusText: 'Upgrade applied on staging. Needs a full regression pass before the upgrade window.' },
  { id: 'p6', name: 'Ecomm Audit', client: 'Cedar & Main', status: 'Waiting', concerns: [{ text: 'Client reviewing findings deck', tone: 'mute' }], cadence: 'Monthly', cadenceDays: 30, lastOff: -7, nextOff: 24, statusText: 'Findings delivered; awaiting client feedback before scoping fixes.' },
  { id: 'p7', name: 'QA Process Docs', client: 'BizStream', status: 'On Hold', concerns: [{ text: 'Resume after Q3 planning', tone: 'mute' }], cadence: 'Monthly', cadenceDays: 30, lastOff: -23, nextOff: 24, statusText: 'Parked until Q3 planning wraps.' },
  { id: 'p8', name: 'Onboarding Guide', client: 'BizStream', status: 'Active', concerns: [{ text: 'Draft outline for new BA hires', tone: 'mute' }], cadence: 'Monthly', cadenceDays: 30, lastOff: -7, nextOff: 24, statusText: 'Early drafting. No blockers.' }
];

// Events keyed by weekday index within the week (0 = Monday … 4 = Friday).
const THIS_WEEK_EVENTS = {
  0: [
    { id: 'e1', startMin: 540, endMin: 555, title: 'Standup', location: 'Teams', join: '', attendees: ['Dev team', 'You'], agenda: 'Daily sync.', client: 'BizStream', project: '' },
    { id: 'e2', startMin: 840, endMin: 870, title: 'Meridian check-in', location: 'Huddle 1', join: '', attendees: ['Priya N. (client IT)', 'You'], agenda: 'Chased the SSO certificate — client IT promised an update by Thursday.', client: 'Meridian Foods', project: 'Intranet' }
  ],
  1: [
    { id: 'e3', startMin: 540, endMin: 555, title: 'Standup', location: 'Teams', join: '', attendees: ['Dev team', 'You'], agenda: 'Daily sync.', client: 'BizStream', project: '' },
    { id: 'e4', startMin: 780, endMin: 840, title: 'Cedar & Main findings walkthrough', location: 'Zoom', join: '', attendees: ['Marcus T.', 'Elena R.', 'You'], agenda: 'Walked the client through the audit findings deck; they are reviewing before we scope fixes.', client: 'Cedar & Main', project: 'Ecomm Audit' }
  ],
  2: [
    { id: 'e5', startMin: 540, endMin: 555, title: 'Standup', location: 'Teams', join: '', attendees: ['Dev team', 'You'], agenda: 'Daily sync — flagged the Lakeshore sandbox blocker again.', client: 'BizStream', project: '' },
    { id: 'e6', startMin: 660, endMin: 720, title: 'Borax content workshop', location: 'Huddle 2', join: 'Meet', attendees: ['Dana W.', 'Sam K.', 'You'], agenda: 'Work through the content model for the new sitemap. Goal: sign-off so the build phase can start.', client: 'Borax', project: 'Site Rebuild' },
    { id: 'e7', startMin: 810, endMin: 840, title: 'Placeholder: Lakeshore escalation', tag: 'PLACEHOLDER', location: 'No room yet', join: '', attendees: ['Vendor AE (TBD)', 'You'], agenda: 'Hold for the vendor sandbox escalation — waiting on their AE to confirm. Sandbox has been down 8 days.', client: 'Lakeshore CU', project: 'Rates API' },
    { id: 'e8', startMin: 900, endMin: 945, title: 'Harbor backlog grooming', location: 'Zoom', join: 'Zoom', attendees: ['Harbor product team', 'You'], agenda: 'Groom the Portal Phase 2 backlog ahead of Friday’s sprint review.', client: 'Harbor Health', project: 'Portal Phase 2' }
  ],
  3: [
    { id: 'e9', startMin: 600, endMin: 660, title: 'Lakeshore vendor escalation call', location: 'Teams', join: 'Teams', attendees: ['Vendor AE', 'Lakeshore IT', 'You'], agenda: 'Get a firm restore date for the sandbox and agree on a fallback if it slips again.', client: 'Lakeshore CU', project: 'Rates API' },
    { id: 'e10', startMin: 840, endMin: 870, title: 'Meridian check-in', location: 'Huddle 1', join: '', attendees: ['Priya N. (client IT)', 'You'], agenda: 'SSO certificate status and repro steps for the search indexing bug.', client: 'Meridian Foods', project: 'Intranet' }
  ],
  4: [
    { id: 'e11', startMin: 570, endMin: 630, title: 'Drayton upgrade planning', location: 'Huddle 2', join: 'Meet', attendees: ['Drayton stakeholders', 'QA team', 'You'], agenda: 'Plan the regression pass ahead of the upgrade window.', client: 'Drayton Legal', project: 'Kentico Upgrade' },
    { id: 'e18', startMin: 630, endMin: 720, title: 'Focus: draft Drayton test plan', location: '', join: '', attendees: ['You'], agenda: 'Blocked time to draft the regression test plan before the kickoff.', client: 'Drayton Legal', project: 'Kentico Upgrade' },
    { id: 'e12', startMin: 780, endMin: 840, title: 'Harbor Health sprint review', location: 'Zoom', join: 'Zoom', attendees: ['Harbor product team', 'Dev team', 'You'], agenda: 'Demo sprint work and walk through the demo checklist.', client: 'Harbor Health', project: 'Portal Phase 2' }
  ]
};

const NEXT_WEEK_EVENTS = {
  0: [
    { id: 'e13', startMin: 600, endMin: 630, title: 'Borax weekly check-in', location: 'Google Meet', join: 'Meet', attendees: ['Dana W.', 'You'], agenda: 'First check-in after content model sign-off; confirm build phase kickoff.', client: 'Borax', project: 'Site Rebuild' },
    { id: 'e14', startMin: 840, endMin: 900, title: 'Lakeshore timeline review', location: 'Teams', join: 'Teams', attendees: ['Lakeshore leadership', 'You'], agenda: 'Present the revised timeline requested at the Friday check-in.', client: 'Lakeshore CU', project: 'Rates API' }
  ],
  1: [
    { id: 'e15', startMin: 660, endMin: 720, title: 'Drayton regression kickoff', location: 'Huddle 2', join: '', attendees: ['QA team', 'You'], agenda: 'Kick off the regression pass from the approved test plan.', client: 'Drayton Legal', project: 'Kentico Upgrade' }
  ],
  2: [
    { id: 'e16', startMin: 480, endMin: 720, title: 'Placeholder: Kentico upgrade window', tag: 'HOLD', location: 'Remote', join: '', attendees: ['Dev team', 'You'], agenda: 'Production upgrade window — goes ahead only if the regression pass is clean.', client: 'Drayton Legal', project: 'Kentico Upgrade' }
  ],
  3: [
    { id: 'e17', startMin: 780, endMin: 810, title: 'Harbor Health check-in', location: 'Zoom', join: 'Zoom', attendees: ['Harbor product team', 'You'], agenda: 'Bi-weekly cadence check-in.', client: 'Harbor Health', project: 'Portal Phase 2' }
  ],
  4: []
};

export function buildTasks() {
  const today = localToday();
  return TASK_SEEDS.map(({ dueOff, ...t }) => ({ ...t, dueISO: addDays(today, dueOff) }));
}

export function buildProjects() {
  const today = localToday();
  return PROJECT_SEEDS.map(({ lastOff, nextOff, ...p }) => ({
    ...p,
    lastISO: addDays(today, lastOff),
    nextISO: addDays(today, nextOff)
  }));
}

export function buildCalendar() {
  const today = localToday();
  const dow = dowOf(today); // 0 Sun … 6 Sat
  const monday = addDays(today, dow === 0 ? -6 : 1 - dow);
  const week = (startIso, eventsByDay, keyPrefix) =>
    [0, 1, 2, 3, 4].map(i => {
      const iso = addDays(startIso, i);
      return { iso, events: (eventsByDay[i] || []).map(e => ({ ...e, id: keyPrefix + e.id })) };
    });
  return {
    this: week(monday, THIS_WEEK_EVENTS, ''),
    next: week(addDays(monday, 7), NEXT_WEEK_EVENTS, 'n-')
  };
}
