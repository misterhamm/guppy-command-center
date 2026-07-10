// Notion adapter — NOT WIRED YET. This code does not live on the Hermes/Guppy
// server yet, so there are no credentials here. When we deploy alongside Guppy:
//
//   Tasks    → "Master To Do" DB. Fields: name, status (Not Started / In Progress /
//              Done / Cancelled), due date, priority (ASAP / High / Now / Soon /
//              Someday), category (Work/Personal), Client relation, Projects
//              relation (one project per task), notes.
//              Schema changes likely needed in Notion first: add Client + Projects
//              relations; ensure BizStream exists as a client.
//   Projects → "Project Check-ins" DB. Fields: name, client, status (Active /
//              Waiting / At Risk / On Hold / Complete — mirror Notion values
//              exactly), Next Concern(s), check-in cadence, last checked, next
//              check-in, status text. READ-ONLY from the dashboard for MVP.
//
// Normalize into the shapes served by /api/tasks and /api/projects (see
// mockData.js for the canonical shapes). Set NOTION_TOKEN (+ DB ids) via env.

export const configured = () => !!process.env.NOTION_TOKEN;

export async function getTasks() {
  throw new Error('Notion source not configured');
}

export async function createTask(task) {
  throw new Error('Notion source not configured');
}

export async function updateTask(id, patch) {
  throw new Error('Notion source not configured');
}

export async function getProjects() {
  throw new Error('Notion source not configured');
}
