// Guppy / Hermes agent transport — NOT WIRED YET. The chat UI is final but the
// agent's conversation endpoint is unknown until this code is deployed on (or
// can reach) the Hermes server. When wiring:
//
//   1. Inspect the Hermes/Guppy server for its existing conversation endpoint
//      (REST or websocket) and proxy to it here.
//   2. Tell Guppy the message comes from the dashboard (system preamble or
//      metadata) so "what do I have on Borax?" has context.
//   3. Keep this behind the same thin interface — chat only for MVP.
//
// Until then the route falls back to a deterministic canned reply (mirrors the
// prototype) and flags source: 'mock' so the UI can badge it.

export const configured = () => !!process.env.GUPPY_API_URL;

export async function chat(messages) {
  if (!configured()) throw new Error('Guppy transport not configured');
  const res = await fetch(process.env.GUPPY_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(process.env.GUPPY_API_KEY ? { authorization: `Bearer ${process.env.GUPPY_API_KEY}` } : {}) },
    body: JSON.stringify({ source: 'dashboard', messages })
  });
  if (!res.ok) throw new Error('Guppy endpoint error ' + res.status);
  const data = await res.json();
  return { reply: data.reply ?? data.text ?? String(data), source: 'guppy' };
}
