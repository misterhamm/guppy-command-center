# Handoff: Command Center — Personal Efficiency Dashboard

A private, authenticated dashboard for Chris (BizStream BA): a fast visual command center over tasks, projects, and calendar, with the Guppy assistant (a Hermes agent) available but non-primary.

## About the design files

The `.dc.html` files in this bundle are **design references created in HTML** — high-fidelity interactive prototypes showing intended look and behavior. They are NOT production code to ship. Your task is to **recreate these designs in a real codebase** using whatever stack you judge best (see "Recommended architecture"). Open them in a browser to inspect; read their source for exact styles — every element is inline-styled, so measurements, colors, and typography are all in the markup.

Read **`design-brief.md` first** — it is the product spec (requirements, priorities, explicit "things not to do"). This README covers what the brief doesn't: what the prototypes actually contain, what's simulated, and integration contracts.

## Fidelity

**High-fidelity.** Colors, typography, spacing, copy, and interactions are final. Recreate pixel-perfectly. The two files are the same product at two form factors:

- `Command Center.dc.html` — desktop (~1440×900, sidebar nav)
- `Command Center Mobile.dc.html` — mobile (~390pt-class, bottom nav, sheet stack)

Build ONE responsive app that renders the desktop layout at wide viewports and the mobile layout at narrow ones — not two apps. The mobile design is its own composition (bottom sheets, swipe actions, chip filters), not a squeezed desktop.

## Recommended architecture

No stack was mandated; recommendation:

- **Frontend:** React + Vite SPA (the prototypes are already component/state shaped; port cleanly). Ship as static files.
- **Backend:** a small Node service (or routes added to the existing Hermes/Guppy server, since that's where this will be hosted) that:
  - proxies **Notion** (tasks + projects) and **Google Calendar** server-side — credentials never reach the browser
  - normalizes them into the shapes in `data.js` (see Data contracts)
  - exposes: `GET /api/tasks`, `PATCH /api/tasks/:id`, `POST /api/tasks`, `GET /api/projects`, `GET /api/calendar`
- **Auth:** private/HTTPS assumed. Open question in the brief — reuse the existing Hermes dashboard auth/session if practical, else Basic Auth for MVP. No public unauthenticated data.
- **Sync:** poll every 2–5 minutes + manual "Refresh now". Optimistic UI on task edits, write back to Notion, show save/sync/failure state with retry/revert. No websockets for MVP.
- **PWA:** add a manifest + icons so mobile home-screen install works. Target URL direction: `dashboard.misterhamm.com`.

## What the prototypes contain

### Screens (both form factors)

1. **Today** (default landing) — Quick Add; Needs attention (ASAP/High/Now + due today + overdue, deterministic); calendar strip with current/next event + join links; overdue sweep suggestion; full Project Radar grid (ALL non-complete projects — never reduce to problem projects only).
2. **To-do** — filterable list (All Active / Today / Overdue / Work / Personal; completed hidden behind a toggle). Desktop: dense rows + keyboard nav. Mobile: cards with swipe actions.
3. **Projects (Radar)** — card grid of all non-complete projects: name, client, status chip, Next Concern list with tone dots, cadence/staleness line. Drag-reorderable (dashboard-only order; mobile has an explicit reorder mode). Read-only otherwise. Expandable detail (desktop: centered popover; mobile: sheet) with status text, cadence, last/next check-in, related tasks.
4. **Calendar** — This week / Next week toggle, day-grouped agenda; join chips (Meet/Zoom/Teams); placeholder/tentative events visually distinct (dashed treatment + tag); past events dimmed; event detail popover/sheet with agenda + attendees; "Open in Google Calendar" link.

### Overlays & global UI

- **Quick Add** — Work/Personal toggle; task name with deterministic natural-language parsing (client / due date / priority words are detected and chipped — see `parseQuickAdd` in `data.js`; no LLM); client required for Work; project strongly prompted; priority defaults to Soon; expandable notes.
- **Task edit** — desktop: right-side drawer (340px); mobile: bottom sheet. Fields: name, status, due, priority, category, client, project, notes. Save = optimistic write + sync indicator; simulated save-failure path shows error state with retry/revert.
- **Snooze** — quick due-date shift (Today/Tomorrow/Next Mon/Next week) from row actions.
- **Guppy** — floating avatar bubble (desktop bottom-right; mobile header avatar opening a sheet). Chat panel with suggestion chips. Non-primary by design.
- **Toasts** — bottom-center pill, optional action (e.g. Undo), auto-dismiss 2.4s / 5s with action.
- **Connection failure banner** — sticky top bar with Retry when a source is unreachable.
- **Theme** — light/dark toggle, follows `prefers-color-scheme` by default, persisted.
- **Keyboard shortcuts (desktop):** `/` focus Quick Add, `↑/↓` select task, `⏎` open, `D` done, `S` snooze, `Esc` close.

### Simulated vs. real

Everything is driven by seed data in `data.js`. In the real build:

- `TODAY_ISO` / `NOW_MIN` pins → derive from the real clock.
- `SEED_TASKS` / `SEED_PROJECTS` / `CAL` → live Notion + Google Calendar data.
- Guppy chat replies are canned → wire to the real agent (below).
- Save-failure simulation → real error handling.

**Port the derived logic in `data.js` as shared utilities** — it encodes agreed product rules: `dueMeta` (due labels + lateness), `staleDays`/`isStale`/`nextLate` (cadence staleness), `defaultRadarOrder` (severity ordering: At Risk → Waiting → stale → Active → On Hold; slot NEW projects into a user's custom order by severity — never append blindly or reset their order), priority ranks, and `parseQuickAdd`.

## Integration contracts

### Notion (source of truth)

- **Tasks:** "Master To Do" DB. Fields used: name, status (Not Started / In Progress / Done / Cancelled), due date, priority (ASAP / High / Now / Soon / Someday), category (Work/Personal), Client relation, Projects relation (one project per task), notes. Schema changes likely needed: add `Client` + `Projects` relations; ensure `BizStream` exists as a client. Completed/Cancelled hidden by default.
- **Projects:** "Project Check-ins" DB. Fields: name, client, status (Active / Waiting / At Risk / On Hold / Complete — mirror Notion values exactly), Next Concern(s), check-in cadence, last checked, next check-in, status text. **Read-only** from the dashboard for MVP. Radar card order is dashboard-only state — do not add ordering to Notion.

### Google Calendar

- Work calendar only, read-only. Prototype shows this-week/next-week; brief specifies a 3-day range as MVP minimum — implement the prototype's week views if the API cost is trivial, otherwise 3 days.
- Events titled `Placeholder: …` get the placeholder treatment. Extract conferencing links for join chips.

### Guppy / Hermes agent

The chat UI (bubble, message list, suggestion chips, input) is final design; the transport is **unknown** — the owner doesn't have the API details. **Inspect the Hermes/Guppy server this will be hosted on and wire the chat to its existing conversation endpoint** (REST or websocket, whatever it exposes). Requirements:

- Guppy should have context (or be told) that messages come from the dashboard, so "what do I have on Borax?" works.
- Chat only for MVP; deeper integration (Guppy acting on dashboard state) may come later — keep the transport behind a thin client-side interface.
- If no usable endpoint exists, ship the bubble opening the existing Guppy chat UI in a new tab as a fallback, and flag it.

## Design tokens

Full palettes (light + dark) live in three places that must stay in sync when porting: the `:root` / `[data-theme="dark"]` CSS variables at the top of each `.dc.html`, and `THEMES` in `data.js` (used for computed chip/status colors). Key values (light / dark):

- Paper `#F7F5F1` / `#12100C` · Card `#fff` / `#302B23` · Panel `#F1EDE4` / `#2A2620` · Mobile canvas `#E9E5DC` / `#0B0A08`
- Ink `#201D1A` / `#EDE7DA` · Muted `#6E6759` / `#A69D8B`
- Green (primary action) `#1E7A52` / `#3FB37D` · Red `#C2452D` / `#E0654B` · Amber `#B98A2A` / `#D0A544`
- Personal-task lavender `#EEEAF5`+`#6A5D93` / `#2B2836`+`#A99BC9`
- Priority chips: ASAP = solid red/white (hottest); High = red tint; Now = cream; Soon/Someday = neutral panel tints. Status chips/rails per `THEMES.STATUS`.

**Type:** Figtree (Google Fonts), weights 400–800. Body 13–13.5px, section headers 22px/800, kickers 10–11px/800 with letter-spacing. **Radii:** 7–10px controls/cards, 14px popovers, 20px top corners on mobile sheets, pill 99px. Focus ring: 2px green outline. Persisted client-side state: `cc-theme`, `cc-radar-order` (localStorage is fine for MVP; a server-side settings blob is a fine upgrade).

## Files

- `design-brief.md` — **the product spec. Read first.**
- `Command Center.dc.html` — desktop prototype (hifi reference)
- `Command Center Mobile.dc.html` — mobile prototype (hifi reference)
- `data.js` — seed data, palettes, and derived-logic utilities to port
- `support.js` — prototype runtime only; ignore for implementation
- `guppy.jpg` — Guppy avatar asset (used in sidebar, bubble, chat header)
- `screenshots/` — reference captures of the running prototypes. Desktop: `01` Today, `02` To-do, `03` Projects, `04` Calendar, `05` Guppy chat open, `06` Today (dark theme). Mobile: `01` Today, `02` To-do, `03` Projects, `04` Calendar, `05` Guppy sheet. Use these to verify your implementation visually, but treat the HTML source as the ground truth for exact values.
