// Task grouping/sorting rules shared by the desktop and mobile layouts.

import { dueMeta, endOfWeekISO } from './dates.js';
import { URGENT_PRIORITIES } from './logic.js';

export const taskLate = (t, todayISO) => dueMeta(t.dueISO, todayISO).late;
export const taskDueToday = (t, todayISO) => !!t.dueISO && t.dueISO === todayISO;
export const taskDueThisWeek = (t, todayISO) => !!t.dueISO && t.dueISO > todayISO && t.dueISO <= endOfWeekISO(todayISO);
const vis = t => !t.done || t.justDone;

// Overview: overdue-first triage (confirmed deviation from the brief order),
// then the rest of the week so a clear day doesn't read as a clear week.
export function todayGroups(tasks, todayISO) {
  const overdue = tasks.filter(t => vis(t) && taskLate(t, todayISO) > 0);
  const dueToday = tasks.filter(t => vis(t) && taskLate(t, todayISO) === 0 && taskDueToday(t, todayISO));
  const thisWeek = tasks
    .filter(t => vis(t) && taskLate(t, todayISO) === 0 && taskDueThisWeek(t, todayISO))
    .sort((a, b) => a.dueISO.localeCompare(b.dueISO));
  const high = tasks.filter(t => vis(t) && taskLate(t, todayISO) === 0 && !taskDueToday(t, todayISO) && !taskDueThisWeek(t, todayISO) && URGENT_PRIORITIES.includes(t.priority));
  return [
    { key: 'od', label: 'Overdue', red: true, raw: overdue },
    { key: 'td', label: 'Due today', red: false, raw: dueToday },
    { key: 'wk', label: 'Later this week', red: false, raw: thisWeek },
    { key: 'hi', label: 'High priority', red: false, raw: high }
  ].filter(g => g.raw.length).map(g => ({ ...g, count: g.raw.filter(t => !t.done).length }));
}

export function taskCounts(tasks, todayISO) {
  const open = tasks.filter(t => !t.done);
  const odCount = open.filter(t => taskLate(t, todayISO) > 0).length;
  const tdCount = open.filter(t => taskDueToday(t, todayISO)).length;
  const attention = tasks.filter(t => vis(t) && (taskLate(t, todayISO) > 0 || taskDueToday(t, todayISO) || URGENT_PRIORITIES.includes(t.priority))).length;
  return { open, odCount, tdCount, attention };
}

// To-do list: filter chips → grouped overdue/today/upcoming, sorted by bucket,
// then priority rank, then stable seed order.
export function todoGroups(tasks, filter, showCompleted, todayISO, P) {
  const prRank = t => (P.PR[t.priority] || P.PR.SOON).rank;
  const bucket = t => (taskLate(t, todayISO) > 0 ? 0 : taskDueToday(t, todayISO) ? 1 : 2);
  let filtered = tasks.filter(t => !t.done);
  if (filter === 'today') filtered = filtered.filter(t => taskDueToday(t, todayISO));
  if (filter === 'overdue') filtered = filtered.filter(t => taskLate(t, todayISO) > 0);
  if (filter === 'work') filtered = filtered.filter(t => !t.personal);
  if (filter === 'personal') filtered = filtered.filter(t => t.personal);
  // Upcoming sorts by due date (undated last); overdue/today by priority
  const dueKey = t => t.dueISO || '9999-12-31';
  filtered = filtered.slice().sort((a, b) => {
    const ba = bucket(a), bb = bucket(b);
    if (ba !== bb) return ba - bb;
    if (ba === 2) { const d = dueKey(a).localeCompare(dueKey(b)); if (d) return d; }
    return prRank(a) - prRank(b) || (a.sort ?? 0) - (b.sort ?? 0);
  });
  const defs = [
    { b: 0, label: 'OVERDUE', red: true },
    { b: 1, label: 'DUE TODAY', red: false },
    { b: 2, label: 'UPCOMING', red: false }
  ];
  const groups = defs
    .map(g => ({ ...g, raw: filtered.filter(t => bucket(t) === g.b) }))
    .filter(g => g.raw.length)
    .map(g => ({ ...g, count: g.raw.length }));
  const completed = tasks.filter(t => t.done);
  if (showCompleted && completed.length) {
    groups.push({ b: 3, label: 'COMPLETED', red: false, raw: completed, count: completed.length });
  }
  return { groups, completed };
}

export const TODO_EMPTY_LINES = {
  personal: 'No personal tasks — nice.',
  overdue: 'Nothing overdue. Clean slate.',
  today: 'Nothing due today.',
  work: 'No open work tasks.',
  all: 'Nothing open. Enjoy it.'
};
