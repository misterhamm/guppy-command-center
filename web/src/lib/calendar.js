import { calDayLabel, minLabel } from './dates.js';
import { eventKind, eventView } from './enrich.js';

// Find today's events (empty array when today isn't in the served range).
export function todayEvents(calendar, todayISO) {
  for (const wk of ['this', 'next']) {
    const day = (calendar[wk] || []).find(d => d.iso === todayISO);
    if (day) return day.events;
  }
  return [];
}

export function currentAndNext(events, nowMin) {
  const current = events.find(ev => ev.startMin <= nowMin && (ev.endMin || ev.startMin + 30) > nowMin);
  const next = events.find(ev => ev.startMin > nowMin);
  return { current, next };
}

// View models for a week of day groups.
export function dayViews(days, todayISO, nowMin, P) {
  return (days || []).map(day => {
    const isToday = day.iso === todayISO;
    const { next } = isToday ? currentAndNext(day.events, nowMin) : { next: null };
    return {
      iso: day.iso,
      label: calDayLabel(day.iso),
      labelColor: isToday ? P.green : 'var(--ink)',
      isToday,
      empty: day.events.length === 0,
      events: day.events.map(ev => {
        const kind = eventKind(ev, day.iso, todayISO, nowMin, next && next.id === ev.id);
        return { ...ev, dayLabel: calDayLabel(day.iso), ...eventView(ev, kind, P) };
      })
    };
  });
}

export function findEvent(calendar, id) {
  for (const wk of ['this', 'next']) {
    for (const d of calendar[wk] || []) {
      const e = d.events.find(x => x.id === id);
      if (e) return { ...e, dayISO: d.iso, dayLabel: calDayLabel(d.iso) };
    }
  }
  return null;
}

// "Now bar" content for the sidebar / mobile now-line.
export function nowBar(events, nowMin) {
  const { current, next } = currentAndNext(events, nowMin);
  let kicker = 'NOW', title = 'No meetings right now';
  let sub = next ? 'Next at ' + minLabel(next.startMin) : 'Clear for the rest of the day';
  if (current) {
    title = current.title;
    sub = 'Until ' + minLabel(current.endMin || current.startMin + 30) + (current.location ? ' · ' + current.location : '');
  } else if (next) {
    kicker = 'UP NEXT'; title = next.title;
    sub = 'in ' + (next.startMin - nowMin) + ' min' + (next.location ? ' · ' + next.location : '');
  }
  return { kicker, title, sub, current, next };
}
