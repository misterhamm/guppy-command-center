# Guppy Command Center

A private, authenticated personal efficiency dashboard for Chris (BizStream BA): a fast visual command center over tasks, projects, and calendar, with the Guppy assistant (a Hermes agent) available but non-primary.

Built from the design handoff in [`design_handoff_command_center/`](design_handoff_command_center/README.md) — see `design-brief.md` there for the product spec.

## Structure

- **`web/`** — React + Vite SPA. One responsive app: desktop layout (sidebar nav) at ≥900px, the mobile composition (bottom nav, sheet stack, swipe actions) below. Ships as static files. PWA manifest included for home-screen install.
- **`server/`** — small Node/Express API that the SPA talks to:
  - `GET /api/tasks` · `POST /api/tasks` · `PATCH /api/tasks/:id`
  - `GET /api/projects` (read-only)
  - `GET /api/calendar` (this week + next week, Mon–Fri)
  - `POST /api/guppy/chat`
  - `GET /api/health`
- **`design_handoff_command_center/`** — the design reference (prototypes, screenshots, seed data). Not production code.

## Running locally

```bash
# terminal 1 — API (port 8787)
cd server && npm install && npm start

# terminal 2 — web app (port 5173, proxies /api to 8787)
cd web && npm install && npm run dev
```

Open http://localhost:5173.

## Data sources — current state

**This code is not on the Hermes/Guppy server yet**, so all three integrations run against a built-in mock source (`server/mockData.js`) that re-bases the handoff's seed data around the real clock. The adapters are stubbed with the integration contracts documented in each file:

| Source | Adapter | Wire-up |
| --- | --- | --- |
| Notion (tasks + projects) | `server/sources/notion.js` | Set `NOTION_TOKEN` + DB ids; normalize "Master To Do" and "Project Check-ins" into the shapes in `mockData.js`. Notion schema changes needed first: add `Client` + `Projects` relations to Master To Do; ensure `BizStream` exists as a client. |
| Google Calendar (work cal, read-only) | `server/sources/gcal.js` | Set `GOOGLE_CALENDAR_ID` + server-side credentials. Extract conferencing links for join chips; `Placeholder:` titles get the placeholder treatment. |
| Guppy / Hermes chat | `server/sources/guppy.js` | Set `GUPPY_API_URL` (+ `GUPPY_API_KEY`). Inspect the Hermes server's conversation endpoint and proxy to it, flagging messages as coming from the dashboard. Until then the route returns deterministic canned replies flagged `source: 'mock'`. |

Each route automatically switches from mock to the real adapter once its env vars are set — no client changes needed.

## Product rules ported from the handoff

`web/src/lib/` holds the agreed derived logic, parameterized by the real clock:

- `dates.js` — `dueMeta` (due labels + lateness), day/time formatting
- `logic.js` — cadence staleness (`isStale`, `nextLate`), radar severity ordering (`defaultRadarOrder`), **custom-order reconciliation** (`reconcileRadarOrder` slots newly synced projects into the user's saved order by severity — never appends blindly or resets), `parseQuickAdd` (deterministic NL capture, no LLM)
- `themes.js` — light/dark palettes (kept in sync with the CSS variables in `styles.css`)

Client-side persisted state: `cc-theme`, `cc-radar-order`, `cc-sweep-done` (localStorage).

## Still open (deferred until deploy)

- **Auth** — private/HTTPS assumed. Open question from the brief: reuse the existing Hermes dashboard auth/session if practical, else Basic Auth for MVP. Nothing is enforced locally.
- **Deploy target** — `dashboard.misterhamm.com` on the Hermes/Guppy server; DNS/Caddy config not assumed.
- **Guppy transport** — unknown until we can inspect the Hermes server (see above). Chat only for MVP.
