// Google Gmail adapter — read-only, using personal OAuth token.
//
// Env: GOOGLE_TOKEN_PATH (path to the personal OAuth token JSON).
// Falls back to /root/.hermes/google_token.json when not set.
//
// Returns inbox emails in a compact shape the dashboard can use.

import fs from 'node:fs';

const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || '/root/.hermes/google_token.json';

export const configured = () => {
  try {
    const raw = fs.readFileSync(TOKEN_PATH, 'utf8');
    const token = JSON.parse(raw);
    return !!(token.access_token || token.token);
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

function decodeHeader(encoded) {
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function extractAddress(header) {
  if (!header) return '';
  const match = header.match(/<([^>]+)>/);
  if (match) return match[1];
  return header.trim();
}

export async function getInbox({ maxResults = 20, query = 'is:inbox' } = {}) {
  const at = await accessToken();
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('q', query);

  const listRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${at}` }
  });
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const listData = await listRes.json();
  const messages = listData.messages || [];

  const emails = [];
  for (const msg of messages) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata`,
      { headers: { Authorization: `Bearer ${at}` } }
    );
    if (!msgRes.ok) continue;
    const msgData = await msgRes.json();
    const payload = msgData.payload || {};
    const headers = payload.headers || [];
    const headerMap = {};
    for (const h of headers) headerMap[h.name] = h.value;

    const fromHeader = headerMap['From'] || '';
    const toHeader = headerMap['To'] || '';
    const subject = headerMap['Subject'] || '(no subject)';
    const date = headerMap['Date'] || '';
    const snippet = msgData.snippet || '';

    emails.push({
      id: msg.id,
      from: extractAddress(fromHeader),
      fromDisplay: fromHeader,
      to: extractAddress(toHeader),
      subject,
      date,
      snippet: snippet.slice(0, 200),
      unread: !!(msgData.labelIds || []).includes('UNREAD')
    });
  }
  return emails;
}
