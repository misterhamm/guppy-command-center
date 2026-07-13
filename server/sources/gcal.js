// Google Calendar adapter — work calendar, read-only, via a service account.
//
// Env: GOOGLE_CALENDAR_ID (the calendar's ID, usually your email address) and
// GOOGLE_SERVICE_ACCOUNT_KEY (path to the downloaded JSON key file;
// GOOGLE_APPLICATION_CREDENTIALS also accepted). The calendar must be shared
// with the service account's email with "See all event details".
//
// Serves this week + next week (Mon–Fri) in the same shape as
// mockData.buildCalendar. All-day events are skipped (the agenda is a timed
// meeting view). Events titled "Placeholder: …" get tag PLACEHOLDER.
// Conferencing links are extracted into join/joinUrl for the join chips.

import fs from 'node:fs';
import { JWT } from 'google-auth-library';
import { isoInTz, minutesInTz, mondayOfThisWeekISO, addDaysISO } from '../tz.js';

const keyPath = () => process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
export const configured = () => !!(process.env.GOOGLE_CALENDAR_ID && keyPath());

let _auth = null;
function auth() {
  if (!_auth) {
    const key = JSON.parse(fs.readFileSync(keyPath(), 'utf8'));
    _auth = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });
  }
  return _auth;
}

const URL_RE = /https?:\/\/[^\s<>"']+/;
const firstUrl = s => { const m = URL_RE.exec(s || ''); return m ? m[0] : ''; };

function detectJoin(ev) {
  const video = (ev.conferenceData && ev.conferenceData.entryPoints || []).find(p => p.entryPointType === 'video');
  const candidates = [ev.hangoutLink, video && video.uri, firstUrl(ev.location), firstUrl(ev.description)].filter(Boolean);
  for (const url of candidates) {
    if (url.includes('meet.google')) return { join: 'Meet', joinUrl: url };
    if (url.includes('zoom.us')) return { join: 'Zoom', joinUrl: url };
    if (url.includes('teams.microsoft') || url.includes('teams.live')) return { join: 'Teams', joinUrl: url };
  }
  return { join: '', joinUrl: '' };
}

const stripHtml = s => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

function normalizeEvent(ev) {
  // startMin/endMin are minutes since midnight in the DASHBOARD timezone —
  // never the host machine's (a UTC VPS would shift every event otherwise).
  const start = new Date(ev.start.dateTime);
  const end = new Date(ev.end.dateTime);
  const title = ev.summary || '(no title)';
  // Both "Placeholder: x" and "[Placeholder] x" styles get the treatment
  const tag = /^\s*\[?placeholder\b/i.test(title) ? 'PLACEHOLDER' : undefined;
  const attendees = (ev.attendees || [])
    .filter(a => !a.resource)
    .map(a => a.displayName || a.email)
    .filter(Boolean);
  const agenda = stripHtml(ev.description).slice(0, 800);
  return {
    id: ev.id,
    title,
    ...(tag ? { tag } : {}),
    startMin: minutesInTz(start),
    endMin: minutesInTz(end),
    location: ev.location || '',
    ...detectJoin(ev),
    attendees: attendees.length ? attendees : ['You'],
    agenda,
    client: '',
    project: ''
  };
}

export async function getCalendar() {
  const mondayISO = mondayOfThisWeekISO();
  // Query bounds anchored to dashboard-TZ midnight (offset generous by design)
  const timeMin = new Date(mondayISO + 'T00:00:00-12:00').toISOString();
  const timeMax = new Date(addDaysISO(mondayISO, 12) + 'T00:00:00+12:00').toISOString();
  const res = await auth().request({
    url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID)}/events`,
    params: { timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' }
  });
  const items = (res.data.items || [])
    .filter(ev => ev.status !== 'cancelled' && ev.start && ev.start.dateTime); // skip all-day + cancelled

  const byDay = {};
  for (const ev of items) {
    const iso = isoInTz(new Date(ev.start.dateTime)); // bucket by dashboard-TZ day
    (byDay[iso] = byDay[iso] || []).push(normalizeEvent(ev));
  }

  const week = offset => [0, 1, 2, 3, 4].map(i => {
    const iso = addDaysISO(mondayISO, offset * 7 + i);
    return { iso, events: (byDay[iso] || []).sort((a, b) => a.startMin - b.startMin) };
  });

  return { this: week(0), next: week(1) };
}
