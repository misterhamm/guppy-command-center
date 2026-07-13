// Calendar → project/client linking. Events carry no client data from Google,
// but titles are full of matchable tokens ("TaxAudit QA Plan", "(BDO261-9)").
// Matching knowledge lives in Notion: project names, Work Projects "Aliases"
// (Jira codes etc.), client names, and Companies "Aliases".
//
// Most specific wins: project alias > project name > client name/alias.
// Ties break to the longest token. A client-only match infers the project
// when that client has exactly one non-complete project (same rule Quick Add
// uses). Nothing is written back to Google — this is a computed hint.

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function buildEventMatcher(projects, clientAliases) {
  const active = (projects || []).filter(p => p.status !== 'Complete');
  const projectsByClient = {};
  for (const p of active) {
    if (p.client) (projectsByClient[p.client] = projectsByClient[p.client] || []).push(p);
  }
  const clientNames = new Set(active.map(p => p.client).filter(Boolean));

  const rules = [];
  const add = (token, rank, clientName, projectName) => {
    const t = String(token || '').trim();
    if (t.length < 3) return;
    try { rules.push({ re: new RegExp(`\\b${esc(t)}\\b`, 'i'), len: t.length, rank, client: clientName, project: projectName }); }
    catch (e) { /* skip unbuildable token */ }
  };

  for (const p of active) {
    for (const a of p.aliases || []) add(a, 0, p.client, p.name);
    add(p.name, 1, p.client, p.name);
  }
  for (const c of clientNames) {
    add(c, 2, c, null);
    // first word of a multi-word client ("Teradyne" → Teradyne Robotics)
    const first = c.split(/\s+/)[0];
    if (first.length >= 4 && first.toLowerCase() !== c.toLowerCase()) add(first, 3, c, null);
  }
  for (const [alias, clientName] of Object.entries(clientAliases || {})) {
    if (clientNames.has(clientName)) add(alias, 2, clientName, null);
  }

  return ev => {
    if (ev.client || ev.project) return ev; // mock/manual data wins
    const title = ev.title || '';
    let best = null;
    for (const r of rules) {
      if (!r.re.test(title)) continue;
      if (!best || r.rank < best.rank || (r.rank === best.rank && r.len > best.len)) best = r;
    }
    if (!best) return ev;
    let project = best.project || '';
    if (!project) {
      const list = projectsByClient[best.client] || [];
      if (list.length === 1) project = list[0].name;
    }
    return { ...ev, client: best.client, project };
  };
}
