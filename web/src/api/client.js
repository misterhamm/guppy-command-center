// Thin API client. The backend proxies Notion / Google Calendar / Guppy
// server-side — credentials never reach the browser.

async function req(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { msg = (await res.json()).error || msg; } catch (e) { /* keep status */ }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  getTasks: () => req('GET', '/tasks'),
  createTask: (task) => req('POST', '/tasks', task),
  patchTask: (id, patch) => req('PATCH', '/tasks/' + encodeURIComponent(id), patch),
  deleteTask: (id) => req('DELETE', '/tasks/' + encodeURIComponent(id)),
  restoreTask: (id) => req('POST', '/tasks/' + encodeURIComponent(id) + '/restore'),
  getAliases: () => req('GET', '/aliases'),
  getProjects: () => req('GET', '/projects'),
  patchProject: (id, patch) => req('PATCH', '/projects/' + encodeURIComponent(id), patch),
  getCalendar: () => req('GET', '/calendar'),
  getLogos: () => req('GET', '/logos'),
  uploadLogo: (projectId, dataUrl) => req('POST', '/logos', { projectId, dataUrl }),
  guppyChat: (messages) => req('POST', '/guppy/chat', { messages })
};
