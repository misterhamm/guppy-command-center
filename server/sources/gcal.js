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
import { JWT } from 'google-auth-library';
import { isoInTz, minutesInTz, mondayOfThisWeekISO, addDaysISO } from '../tz.js';

const tokenPath = () => process.env.GOOGLE_TOKEN_PATH || '/root/.hermes/google_token.json';
const keyPath = () => process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const AUTH_SKEW_MS = 60_000;

const tokenExpiresAt = token => {
  const value = token.expires_at || token.expiry_date;
  return value ? new Date(value).getTime() : 0;
};

const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));

const oauthState = () => {
  try {
    const token = readJson(tokenPath());
    const canRefresh = !!(
      token.refresh_token &&
      (token.client_id || process.env.GOOGLE_OAUTH_CLIENT_ID) &&
      (token.client_secret || process.env.GOOGLE_OAUTH_CLIENT_SECRET)
    );
    const at = token.access_token || token.token;
    const expiresAt = tokenExpiresAt(token);
    const accessTokenUsable = !!at && (!expiresAt || Date.now() < expiresAt - AUTH_SKEW_MS);
    return { configured: !!(canRefresh || accessTokenUsable), canRefresh, accessTokenUsable };
  } catch {
    return { configured: false, canRefresh: false, accessTokenUsable: false };
  }
};

const oauthConfigured = () => oauthState().configured;

const serviceAccountConfigured = () => {
  try {
    const path = keyPath();
    if (!path) return false;
    const key = readJson(path);
    return !!(key.client_email && key.private_key);
  } catch {
    return false;
  }
};

export const configured = () => !!(
  process.env.GOOGLE_CALENDAR_ID &&
  (oauthConfigured() || serviceAccountConfigured())
);

async function accessToken({ forceRefresh = false } = {}) {
  const path = tokenPath();
  const token = readJson(path);
  let at = token.access_token || token.token;
  const expiresAt = tokenExpiresAt(token);
  if ((forceRefresh || !at || (expiresAt && Date.now() > expiresAt - AUTH_SKEW_MS)) && token.refresh_token) {
    const refreshed = await refreshAccessToken(token);
    token.access_token = refreshed.access_token;
    token.expires_at = refreshed.expires_at;
    token.expiry_date = refreshed.expires_at;
    fs.writeFileSync(path, JSON.stringify(token, null, 2));
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
  if (!res.ok) throw await googleHttpError('Token refresh failed', res);
  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000
  };
}

async function googleHttpError(prefix, res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body.error_description || body.error?.message || body.error || '';
  } catch {
    try { detail = await res.text(); } catch { /* ignore */ }
  }
  const suffix = detail ? `: ${String(detail).slice(0, 240)}` : '';
  const err = new Error(`${prefix}: ${res.status}${suffix}`);
  err.status = res.status;
  return err;
}

let _serviceAuth = null;
function serviceAuth() {
  if (!_serviceAuth) {
    const key = readJson(keyPath());
    _serviceAuth = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });
  }
  return _serviceAuth;
}

async function calendarRequest(url) {
  if (oauthConfigured()) {
    try {
      let at = await accessToken();
      let res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${at}` }
      });
      if (res.status === 401 && oauthState().canRefresh) {
        console.error('[gcal] OAuth access token rejected; refreshing and retrying once');
        at = await accessToken({ forceRefresh: true });
        res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${at}` }
        });
      }
      if (!res.ok) throw await googleHttpError('Calendar OAuth request failed', res);
      return res.json();
    } catch (e) {
      if (!serviceAccountConfigured()) throw e;
      console.error('[gcal] OAuth failed; trying service account fallback:', e.message);
    }
  }
  if (serviceAccountConfigured()) {
    const res = await serviceAuth().request({ url: url.toString() });
    return res.data;
  }
  throw new Error('Google Calendar credentials are not configured');
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

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(process.env.GOOGLE_CALENDAR_ID) + '/events');
  url.searchParams.set('timeMin', timeMin);
  url.searchParams.set('timeMax', timeMax);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const data = await calendarRequest(url);
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
