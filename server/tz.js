// The dashboard's timezone — all "what day is it / what time is this event"
// math on the server happens here, NOT in the host machine's zone, so times
// stay correct when deployed on a UTC VPS. Override with DASHBOARD_TZ.

export const TZ = process.env.DASHBOARD_TZ || 'America/Detroit';

function parts(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  return Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
}

// Calendar date (YYYY-MM-DD) of an instant, in the dashboard TZ
export function isoInTz(date) {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

// Minutes since local midnight of an instant, in the dashboard TZ
export function minutesInTz(date) {
  const p = parts(date);
  return Number(p.hour) * 60 + Number(p.minute);
}

export function todayISO() { return isoInTz(new Date()); }

// Date-only helpers — a calendar date's weekday is TZ-independent
const dNoon = iso => new Date(iso + 'T12:00:00');
export function addDaysISO(iso, n) { const d = dNoon(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
export function dowOf(iso) { return dNoon(iso).getDay(); } // 0 Sun … 6 Sat

export function mondayOfThisWeekISO() {
  const today = todayISO();
  const dow = dowOf(today);
  return addDaysISO(today, dow === 0 ? -6 : 1 - dow);
}
