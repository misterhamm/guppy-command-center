# Personal Efficiency Dashboard — Design AI Brief

Updated: 2026-06-24

## Purpose

Design a private, mobile-friendly personal efficiency dashboard for Chris. The dashboard should be a fast visual command center for tasks, projects, and calendar context without requiring Chris to use chat/LLM tokens for basic task management.

The dashboard is not the source of truth. It is a focused UI layer over existing systems:

- Tasks: Notion Master To Do
- Projects: Notion Project Check-ins, currently acting as the projects list
- Calendar: Google Calendar work calendar
- Assistant layer: Guppy/Hermes, visible but not primary

Preferred future URL direction:

- `dashboard.misterhamm.com`

The design should assume the dashboard is private/authenticated and used throughout the workday on both desktop and mobile.

## User context

Chris is a BizStream BA who needs to bridge clients, developers, internal work, meetings, and follow-ups. He wants a practical command center that helps him keep track of what matters without turning every small action into a chat interaction.

This dashboard should help him:

- Quickly see what needs attention today
- Add tasks during/after meetings
- Manage tasks visually
- See all active/non-complete projects at a glance
- Check project status without digging through Notion
- Reduce duplicated mental tracking
- Use Guppy only when reasoning/natural language is actually useful

Tone/style preference:

- Warm but clear
- Natural, not corporate
- Productivity-first
- No mascot-heavy UI
- No cute labels for important controls
- Guppy can have some personality, but the core UI must stay instantly readable

## Core product principles

1. Visual/actionable first, chat second.
2. Direct UI controls for basic CRUD/actions.
3. Guppy bubble visible but non-primary.
4. Mobile should feel first-class, not like a stripped-down desktop page.
5. Clarity beats warmth when showing statuses, due dates, buttons, and navigation.
6. Show the whole project landscape, not only fires.
7. Avoid over-modeling or adding too many fields to the visible UI.

## MVP sections / navigation

Main sections:

1. Today / Main dashboard
2. To-do
3. Projects / Project Radar
4. Calendar

Also available globally:

- Quick Add
- Guppy bubble

Navigation expectations:

- Desktop: sidebar navigation
- Mobile: bottom navigation
- Today should be the default landing page
- Guppy bubble should float/be available across sections, but not be a main navigation tab

Avoid designing the MVP as one huge endless scroll. It should be navigable and scannable.

## Today / main dashboard

Today is the primary landing surface and should feel like the command center.

It should be an action page and quick reference, not a generated briefing page or wall of text.

Recommended main dashboard order:

1. Quick Add
2. Immediate/high-priority tasks
3. Due today tasks
4. Overdue tasks
5. Compact calendar strip / current-next event
6. Full Project Radar card grid for all non-complete projects

Important correction: the main dashboard should include a full Project Radar grid of all non-complete projects. Do not reduce this to only problem projects or a tiny project summary. Chris wants to quickly glance across the full project landscape from the main dashboard.

Today should include:

- High-priority/immediate tasks
- Tasks due today
- Overdue tasks
- Relevant work calendar items
- Quick Add
- Full project grid for all non-complete projects
- Placeholder/tentative calendar events visually distinguished

High-priority/immediate task logic should be deterministic and explainable:

- Include Priority values `ASAP`, `High`, and `Now`
- Include tasks due today
- Include overdue tasks

Do not design around Guppy-computed focus ranking for MVP.

Today should support direct actions:

- Add task
- Mark task done
- Snooze/change due date
- Open task edit drawer/modal
- Open project detail/expanded card
- Open calendar item/link when useful

## Quick Add

Quick Add should be optimized for work task capture.

Default behavior:

- Category defaults to `Work` because roughly 98% of tracked tasks are work tasks
- Status defaults to `Not Started`
- Priority defaults to `Soon`, but Priority should be visible/editable in task creation
- Due date blank unless selected/inferred
- Client required for Work tasks
- Projects optional but strongly prompted
- Notes optional/expandable
- Link not required for MVP

Minimum quick-add form for default Work tasks:

- Task name
- Client
- Due date
- Priority, defaulted to `Soon`
- Projects optional/strongly prompted
- Status hidden/defaulted to `Not Started`
- Notes expandable/secondary

Quick Add should include an easy Work/Personal toggle.

If Category is `Work`:

- Show Client
- Require Client
- Show Projects
- Strongly prompt Projects, but do not require it for every one-off/admin item

If Category is `Personal`:

- Hide or de-emphasize Client and Projects by default
- Show the useful personal-task fields only

The dashboard does not need to show every task field for every category just for consistency. Clarity beats uniformity.

Internal/admin work should use `Client = BizStream`.

## To-do section

Purpose: a filterable, editable task list backed by Notion Master To Do.

MVP filters/views:

- All Active
- Today
- Overdue
- Work
- Personal

Completed and Cancelled tasks should be hidden by default unless explicitly toggled later.

Layout:

- Desktop: compact rows for dense scanning
- Mobile: cards for thumb-friendly usage

Editable fields in task drawer/modal:

- Task name
- Status
- Due date
- Priority
- Category
- Client
- Projects
- Notes

Interaction model:

- Tap/click task
- Open drawer or modal
- Edit fields
- Save writes back to Notion
- Cancel discards changes

Quick actions where practical:

- Mark done
- Snooze/change due date
- Add task

Default task sorting:

1. Overdue
2. Due today
3. Upcoming due dates ascending
4. Priority as tie-breaker
5. Stable fallback such as created/updated order

Priority tie-breaker order:

1. ASAP
2. High
3. Now
4. Soon
5. Someday
6. Blank/no priority

Manual task reordering is not MVP.

## Project Radar

Project Radar is central to the dashboard.

Purpose:

- Show all active/non-complete projects at all times
- Provide a portfolio/status overview
- Support quick-glance project awareness
- Visually highlight risk/waiting/stale states without hiding normal projects

This is not just an “attention needed” widget. It should show the full non-complete project landscape.

Default included project statuses:

- Active
- Waiting
- At Risk
- On Hold

Excluded by default:

- Complete

Status values should mirror Notion exactly:

- Active
- Waiting
- At Risk
- On Hold
- Complete

Layout requirements:

- Cards, not a table
- Grid of all non-complete projects
- Do not group by client for MVP
- Cards should be reorderable
- Visual indicators for risk/waiting/stale/attention states
- Normal/non-risk projects still visible

Card ordering:

- Dashboard-only manual order for MVP
- Drag/reorder cards into preferred order
- Store order in dashboard settings/cache
- Do not change Notion schema for ordering in MVP

Immediately visible card fields:

- Name
- Client
- Status
- Next Concern

Use the label `Next Concern` for the main next-action/next-risk field.

Expandable card details may include:

- Full notes
- Current status
- Description
- Context
- Check-in cadence
- Last checked
- Next check-in date
- Related tasks

Project Radar is read-only for MVP except for dashboard-only card reordering. Do not design inline editing of project status/notes as MVP behavior.

Visual indicators should call out:

- At Risk
- Waiting
- Overdue/past next concern date
- Stale based on cadence
- Related overdue tasks
- Related tasks due today
- Missing/unclear status

Related task behavior:

- Explicit project-task linking is required for MVP
- Tasks/action items should be tied to specific projects where possible, not just clients
- Project-related tasks should use the explicit task ↔ project association
- One project per task as a workflow rule
- If the same action applies to multiple projects, create separate tasks
- Client-only matching can be a cleanup fallback/helper, but is not the intended behavior

The current Project Check-ins database is acceptable as the project list for now, even though it may later be better as a flat Projects database.

## Calendar

MVP calendar source:

- Work calendar only

Range:

- 3 days

Layout:

1. Today/main dashboard: compact calendar reference strip
   - Enough to orient Chris to current/next events
   - Should not dominate the action page

2. Calendar section/tab: full 3-day agenda
   - More complete list of work calendar events
   - Better for reviewing upcoming days

Collapsed event display should show:

- Event title
- Time
- Calendar day/date
- Room/location
- Conferencing link indicator or direct link when available
- Placeholder/tentative badge if applicable

Attendees should not be visible in collapsed view; that is extra clutter. They can live in expanded details if needed.

Calendar behavior:

- Read-only for MVP
- Do not edit Google Calendar events from dashboard
- Allow opening event details
- Allow opening conferencing link
- Maybe allow opening in Google Calendar externally

Calendar MVP flag:

- Placeholder only

Events starting with `Placeholder:` should be visually distinct.

Deferred calendar flags:

- Prep needed
- Missing link/location
- Conflicts
- Intentional duplicates
- Travel/location notes

## Guppy bubble

Guppy should be visible but non-primary.

It should be useful for:

- Natural-language requests
- Ambiguous captures
- Project/client questions
- Cleanup requests
- Summaries
- “What do I have on Borax?”
- Turning meeting notes into tasks
- More complex updates that need reasoning

Do not make the dashboard primarily a chat UI. The main value is visual management and direct manipulation.

## Visual style

Direction:

- Clean productivity app foundation
- Light command-center status visibility
- Warm/personal microcopy and visual softness

Warmth is appropriate in:

- Empty states
- Small confirmations
- Guppy bubble
- Helper text
- Soft corners/colors

Warmth should not interfere with:

- Navigation
- Buttons
- Due dates
- Task names
- Statuses
- Quick actions
- Project cards

Use clear labels like:

- Add task
- Due today
- Overdue
- Projects
- Calendar
- Next Concern
- Waiting
- At Risk

Avoid:

- Mascot-heavy UI
- Jokes everywhere
- Cute labels for important actions
- Vague wording
- Anything that slows parsing

## Mobile expectations

Mobile should feel like a real command center.

Important mobile priorities:

- Today first
- Quick Add
- Task quick actions
- Project grid still visible/scannable
- Calendar reference without overwhelming the page

Mobile quick actions:

- Mark task done
- Snooze/change due date
- Add note
- Add task
- Open related Notion item maybe later
- Open calendar event/link
- Copy text summary maybe later

PWA/home-screen bookmark is acceptable for MVP.

## Data refresh / sync

Use:

- Auto-refresh every few minutes
- Manual refresh button

Suggested polling cadence:

- Every 2–5 minutes, tunable after use

After task edits:

- Update UI immediately/optimistically where safe
- Write changes back to Notion
- Show save/sync/failure state
- Handle failures clearly with retry/revert

Near-real-time websocket sync is not required for MVP.

## Access / security assumptions

Assume:

- Private authenticated dashboard
- HTTPS
- No public unauthenticated task/calendar/project data
- Notion and Google credentials handled server-side only

Do not assume DNS/Caddy/Hermes config has already been changed.

Open implementation/auth question:

- Reuse existing Hermes dashboard auth/session, Basic Auth, or separate login

Design can simply represent authenticated/private app behavior.

## Notion schema implications for design awareness

These are implementation notes, but they affect field availability.

Likely needed schema changes:

1. Add `Client` relation to Master To Do / Tasks
2. Add `Projects` relation to Master To Do / Tasks
3. Ensure `BizStream` exists as a Client/Company record

`Client` relation:

- Task-side property named `Client`
- Likely relates to Companies / Clients database
- Required for Work tasks
- Hidden/de-emphasized for Personal tasks

`Projects` relation:

- Task-side property named `Projects`
- Relates to current Project Check-ins database
- One project per task as workflow rule
- Strongly prompted for Work/client tasks
- Not required for every one-off/admin task

Dashboard-only, not Notion schema:

- Project Radar manual card order
- Calendar read-only behavior
- Placeholder calendar flag behavior
- Guppy bubble visibility
- Visual density/style decisions

## Design deliverables requested

Please produce UX/UI design recommendations for:

1. Desktop layout
2. Mobile layout
3. Today/main dashboard composition
4. Quick Add component
5. Task list and task edit drawer/modal
6. Project Radar card grid
7. Project card collapsed and expanded states
8. Calendar compact strip and full 3-day agenda
9. Guppy bubble placement/state
10. Visual style system: colors, spacing, density, card treatments, badges

Please include enough detail that an implementation agent can build from it later.

## Things not to do

- Do not make chat the primary UI.
- Do not hide normal projects from the main dashboard.
- Do not show only problem projects by default.
- Do not design Project Radar as a table for MVP.
- Do not group project cards by client for MVP.
- Do not make calendar editable for MVP.
- Do not require Projects for every one-off/admin task.
- Do not show Client/Projects prominently for Personal task creation.
- Do not use vague/cute labels for important actions.
- Do not assume public access is acceptable.
- Do not overbuild real-time sync or websocket behavior for MVP.