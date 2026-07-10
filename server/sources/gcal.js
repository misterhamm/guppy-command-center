// Google Calendar adapter — NOT WIRED YET (no credentials until this is deployed
// on the Hermes/Guppy server). When wiring:
//
//   - Work calendar only, read-only. Server-side OAuth/service credentials —
//     never sent to the browser.
//   - Serve this week + next week (Mon–Fri) in the shape mockData.buildCalendar
//     returns: { this: [{ iso, events: [...] }], next: [...] }.
//   - Event shape: { id, title, startMin, endMin, location, join, attendees,
//     agenda, client, project, tag? }. Extract conferencing links (Meet/Zoom/
//     Teams) into `join` + `joinUrl`. Events titled "Placeholder: …" get
//     tag: 'PLACEHOLDER'.
//
// Set GOOGLE_CALENDAR_ID + credentials via env.

export const configured = () => !!process.env.GOOGLE_CALENDAR_ID;

export async function getCalendar() {
  throw new Error('Google Calendar source not configured');
}
