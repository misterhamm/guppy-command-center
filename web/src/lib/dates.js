// Date utilities ported from the handoff data.js — all functions take todayISO
// explicitly (the prototype pinned TODAY_ISO; the real build derives it from the
// clock via the store).

const MS = 86400000;

export function dIso(iso) { return new Date(iso + 'T12:00:00'); }
export function daysBetween(a, b) { return Math.round((dIso(b) - dIso(a)) / MS); }
export function addDays(iso, n) { const d = dIso(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
export function fmtShort(iso) { return dIso(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
export function fmtDow(iso) { return dIso(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }

export function localTodayISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
export function nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

// Display metadata for a due date, all derived — no hand-set lateness.
export function dueMeta(iso, todayISO) {
  if (!iso) return { label: '—', late: 0, isToday: false, has: false };
  const diff = daysBetween(todayISO, iso); // >0 future, <0 past
  const late = diff < 0 ? -diff : 0;
  if (late > 0) return { label: fmtShort(iso) + ' · ' + late + 'd', late, isToday: false, has: true };
  if (diff === 0) return { label: 'Today', late: 0, isToday: true, has: true };
  if (diff <= 6) return { label: fmtDow(iso), late: 0, isToday: false, has: true };
  return { label: fmtShort(iso), late: 0, isToday: false, has: true };
}

// Saturday of the current week (weeks run Sunday–Saturday)
export function endOfWeekISO(todayISO) {
  return addDays(todayISO, 6 - dIso(todayISO).getDay());
}

export function nextMonday(todayISO) {
  const dow = dIso(todayISO).getDay();
  let diff = (1 - dow + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(todayISO, diff);
}

// 'WED JUL 8'-style day heading used by the calendar
export function calDayLabel(iso) {
  return dIso(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase().replace(/,/g, '');
}

export function minLabel(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  const h12 = ((h + 11) % 12) + 1;
  return h12 + (mm ? ':' + String(mm).padStart(2, '0') : ':00');
}

// '9:00 – 9:15' event time range
export function timeRange(startMin, endMin) {
  return minLabel(startMin) + ' – ' + minLabel(endMin || startMin + 30);
}
