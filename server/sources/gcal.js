// Google Calendar adapter — read-only, using personal OAuth token.
//
// Env: GOOGLE_CALENDAR_ID (calendar ID, usually your email) and
// GOOGLE_TOKEN_PATH (path to personal OAuth token JSON).
// Falls back to /root/.hermes/google_token.json.
//
// Serves this week + next week (Mon–Fri) in the same shape as
// mockData.buildCalendar. All-day events are skipped. Events titled
// "Placeholder: …" get tag PLACEHOLDER. Conferencing links are extracted.

import fs from 'node:fs';
import { isoInTz, minutesInTz, mondayOfThisWeekISO, addDaysISO } from '../tz.js';

const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || '/root/.hermes/google_token.json';

export const configured = () => {
  try {
    const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
    const token = JSON.parse(raw);
    return !!(process.env.GOOGLE_CALENDAR_ID && (token.access_token || token.token));
  } catch {
    return false;
  }
};

async function accessToken() {
  const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
  const token = JSON.parse(raw);
  let at = token.access_token || token.token;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (expiresAt && Date.now() > expiresAt && token.refresh_token) {
    const refreshed = await refreshAccessToken(token);
    token.access_token = refreshed.access_token;
    token.expires_at = refreshed.expires_at;
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
    return refreshed.access_token;
  }
  return at;
}

async function refreshAccessToken(token) {
  const params = new URLSearchParams({
    client_id: token.client_id || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: token.client_secret || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000
  };
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
  const start = new Date(ev.start.dateTime);
  const end = new Date(ev.end.dateTime);
  const title = ev.summary || '(no title)';
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
  const timeMin = new Date(mondayISO + 'T00:00:00-12:00').toISOString();
  const timeMax = new Date(addDaysISO(mondayISO, 12) + 'T00:00:00+12:00').toISOString();

  const at = await accessToken();
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(process.env.GOOGLE_CALENDAR_ID) + '/events');
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${at}` }
  });
  if (!res.ok) throw new Error(`Calendar request failed: ${res.status}`);
  const data = await res.json();
  const items = (data.items || [])
    .filter(ev => ev.status !== 'cancelled' && ev.start && ev.start.dateTime);

  const byDay = {};
  for (const ev of items) {
    const iso = isoInTz(new Date(ev.start.dateTime));
    (byDay[iso] = byDay[iso] || []).push(normalizeEvent(ev));
  }

  const week = offset => [0, 1, 2, 3, 4].map(i => {
    const iso = addDaysISO(mondayISO, offset * 7 + i);
    return { iso, events: (byDay[iso] || []).sort((a, b) => a.startMin - b.startMin) };
  });

  return { this: week(0), next: week(1) };
}
