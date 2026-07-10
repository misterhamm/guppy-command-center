import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { THEMES } from '../lib/themes.js';
import { localTodayISO, nowMinutes, addDays, nextMonday, fmtShort, dueMeta } from '../lib/dates.js';
import { reconcileRadarOrder, clientsMap, parseQuickAdd, URGENT_PRIORITIES } from '../lib/logic.js';

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

const POLL_MS = 3 * 60 * 1000;

function initialTheme() {
  let theme = null;
  try { theme = localStorage.getItem('cc-theme'); } catch (e) { /* private mode */ }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function applyThemeDom(theme) {
  document.documentElement.dataset.theme = theme;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', theme === 'dark' ? '#12100C' : '#F7F5F1');
}

const EMPTY_QA = { category: 'Work', name: '', client: '', project: '', dueISO: '', priority: 'Soon', notes: '', noteOpen: false, error: false };

export function StoreProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState(initialTheme);
  const [view, setView] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [calendar, setCalendar] = useState({ this: [], next: [] });
  const [radarOrder, setRadarOrder] = useState([]);
  const [todayISO, setTodayISO] = useState(localTodayISO);
  const [nowMin, setNowMin] = useState(nowMinutes);
  const [syncedAt, setSyncedAt] = useState(null);
  const [outage, setOutage] = useState(null); // 'notion' | 'gcal' | null
  const [toast, setToast] = useState(null);
  const [qa, setQa] = useState(EMPTY_QA);
  const [guppyMsgs, setGuppyMsgs] = useState([]);
  const [guppyBusy, setGuppyBusy] = useState(false);

  const tasksRef = useRef(tasks); tasksRef.current = tasks;
  const toastTimer = useRef(null);
  const justDoneTimer = useRef(null);

  const P = THEMES[theme];

  // ---- theme ----
  useEffect(() => { applyThemeDom(theme); }, [theme]);
  const setTheme = useCallback(t => {
    setThemeState(t);
    try { localStorage.setItem('cc-theme', t); } catch (e) { /* ignore */ }
  }, []);

  // ---- clock ----
  useEffect(() => {
    const iv = setInterval(() => { setTodayISO(localTodayISO()); setNowMin(nowMinutes()); }, 30000);
    return () => clearInterval(iv);
  }, []);

  // ---- toasts ----
  const showToast = useCallback((msg, actionLabel, action) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, actionLabel: actionLabel || '', action: action || null });
    toastTimer.current = setTimeout(() => setToast(null), actionLabel ? 5000 : 2400);
  }, []);
  const dismissToast = useCallback(() => { clearTimeout(toastTimer.current); setToast(null); }, []);

  // ---- data fetch ----
  const refresh = useCallback(async ({ silent } = {}) => {
    let notionOk = true, gcalOk = true;
    const [tRes, pRes, cRes] = await Promise.allSettled([api.getTasks(), api.getProjects(), api.getCalendar()]);
    if (tRes.status === 'fulfilled') {
      // keep local optimistic flags (justDone, syncFailed) across polls
      setTasks(prev => tRes.value.tasks.map(nt => {
        const old = prev.find(x => x.id === nt.id);
        return old ? { ...nt, justDone: old.justDone, syncFailed: old.syncFailed } : nt;
      }));
    } else notionOk = false;
    if (pRes.status === 'fulfilled') {
      const projs = pRes.value.projects.filter(p => p.status !== 'Complete');
      setProjects(projs);
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('cc-radar-order') || 'null'); } catch (e) { /* ignore */ }
      setRadarOrder(cur => reconcileRadarOrder(saved && saved.length ? saved : (cur.length ? cur : null), projs, localTodayISO()));
    } else notionOk = false;
    if (cRes.status === 'fulfilled') setCalendar(cRes.value.weeks);
    else gcalOk = false;
    setOutage(!notionOk ? 'notion' : !gcalOk ? 'gcal' : null);
    if (notionOk && gcalOk) setSyncedAt(Date.now());
    setReady(true);
    if (!silent && notionOk && gcalOk) showToast('Refreshed ✓');
  }, [showToast]);

  useEffect(() => {
    refresh({ silent: true });
    const iv = setInterval(() => refresh({ silent: true }), POLL_MS);
    return () => clearInterval(iv);
  }, [refresh]);

  // minutes-ago ticker for the sync label
  const [, forceTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => forceTick(x => x + 1), 60000); return () => clearInterval(iv); }, []);
  const syncedAgo = syncedAt ? Math.max(0, Math.round((Date.now() - syncedAt) / 60000)) : null;

  // ---- task writes (optimistic, write back, flag failures) ----
  const patchLocal = useCallback((id, patch) => {
    setTasks(s => s.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const writeTask = useCallback(async (id, patch) => {
    patchLocal(id, { ...patch, syncFailed: false });
    try {
      await api.patchTask(id, patch);
      patchLocal(id, { syncFailed: false });
      return true;
    } catch (e) {
      patchLocal(id, { syncFailed: true });
      return false;
    }
  }, [patchLocal]);

  const toggleTask = useCallback(async (id) => {
    const t = tasksRef.current.find(x => x.id === id);
    if (!t) return;
    if (!t.done) {
      patchLocal(id, { done: true, justDone: true, status: 'Done' });
      clearTimeout(justDoneTimer.current);
      justDoneTimer.current = setTimeout(() => patchLocal(id, { justDone: false }), 3000);
      const ok = await writeTask(id, { done: true });
      if (ok) showToast('Marked done', 'Undo', () => { patchLocal(id, { done: false, justDone: false, status: t.status === 'Done' ? 'Not Started' : t.status }); writeTask(id, { done: false }); });
      else showToast("Couldn't reach Notion — kept locally", 'Retry', () => retryTask(id));
    } else {
      patchLocal(id, { done: false, justDone: false, status: 'Not Started' });
      writeTask(id, { done: false });
    }
  }, [patchLocal, writeTask, showToast]);

  const retryTask = useCallback(async (id) => {
    const t = tasksRef.current.find(x => x.id === id);
    if (!t) return;
    const ok = await writeTask(id, { done: t.done, name: t.name, dueISO: t.dueISO, priority: t.priority, status: t.status, notes: t.notes, client: t.client, project: t.project, personal: t.personal });
    showToast(ok ? 'Saved to Notion ✓' : 'Still unreachable — will keep retrying');
  }, [writeTask, showToast]);

  const snoozeTask = useCallback((id, iso, label) => {
    const t = tasksRef.current.find(x => x.id === id);
    const prev = t ? t.dueISO : '';
    writeTask(id, { dueISO: iso });
    showToast('Snoozed to ' + label, 'Undo', () => writeTask(id, { dueISO: prev }));
  }, [writeTask, showToast]);

  // Save from the edit drawer/sheet. Returns 'saved' | 'failed'.
  const saveTask = useCallback(async (d) => {
    const patch = {
      name: d.name, priority: d.priority, dueISO: d.dueISO, personal: d.personal,
      client: d.personal ? '' : d.client, project: d.personal ? '' : d.project,
      status: d.status, notes: d.notes, done: d.status === 'Done'
    };
    try {
      await api.patchTask(d.id, patch);
      patchLocal(d.id, { ...patch, syncFailed: false });
      return 'saved';
    } catch (e) {
      return 'failed';
    }
  }, [patchLocal]);

  // ---- quick add ----
  const clients = useMemo(() => clientsMap(projects, tasks), [projects, tasks]);

  const effectiveQa = useCallback(() => {
    const parsed = parseQuickAdd(qa.name, clients, todayISO);
    return {
      parsed,
      client: qa.client || parsed.client,
      project: qa.project || (qa.client ? '' : parsed.project),
      dueISO: qa.dueISO || parsed.dueISO,
      priority: qa.priority !== 'Soon' ? qa.priority : (parsed.priority || 'Soon'),
      name: parsed.detected.length && parsed.cleanName ? parsed.cleanName : qa.name
    };
  }, [qa, clients, todayISO]);

  const qaSet = useCallback(patch => setQa(s => ({ ...s, ...patch })), []);
  const qaReset = useCallback(() => setQa(EMPTY_QA), []);
  const qaPrefill = useCallback(({ client = '', project = '' }) => {
    setQa({ ...EMPTY_QA, category: 'Work', client, project });
  }, []);

  // Returns true when the task was accepted (form can close).
  const qaAdd = useCallback(() => {
    const eff = effectiveQa();
    if (!eff.name.trim() || (qa.category === 'Work' && !eff.client)) {
      qaSet({ error: true });
      return false;
    }
    const prio = eff.priority.toUpperCase();
    const body = {
      name: eff.name.trim(),
      client: qa.category === 'Work' ? eff.client : '',
      project: qa.category === 'Work' ? eff.project : '',
      dueISO: eff.dueISO || '',
      priority: prio,
      personal: qa.category === 'Personal',
      notes: qa.notes
    };
    const dm = dueMeta(body.dueISO, todayISO);
    const landsOnToday = dm.isToday || dm.late > 0 || URGENT_PRIORITIES.includes(prio);
    const tempId = 'tmp' + Date.now();
    setTasks(s => [...s, { id: tempId, ...body, done: false, justDone: false, sort: 99, status: 'Not Started' }]);
    qaReset();
    api.createTask(body)
      .then(res => setTasks(s => s.map(t => (t.id === tempId ? { ...res.task, justDone: false } : t))))
      .catch(() => setTasks(s => s.map(t => (t.id === tempId ? { ...t, syncFailed: true } : t))));
    if (view === 'today' && !landsOnToday) {
      showToast('Added ✓ — no due date, so it lives in To-do', 'View in To-do', () => setView('todo'));
    } else {
      showToast('Added ✓ — saved to Notion');
    }
    return true;
  }, [effectiveQa, qa, todayISO, view, qaReset, qaSet, showToast]);

  // ---- radar order ----
  const persistOrder = useCallback(order => {
    try { localStorage.setItem('cc-radar-order', JSON.stringify(order)); } catch (e) { /* ignore */ }
    setRadarOrder(order);
  }, []);

  const moveProjectTo = useCallback((fromId, toId) => {
    if (fromId === toId) return;
    setRadarOrder(cur => {
      const order = cur.slice();
      const fi = order.indexOf(fromId), ti = order.indexOf(toId);
      if (fi < 0 || ti < 0) return cur;
      order.splice(fi, 1); order.splice(ti, 0, fromId);
      try { localStorage.setItem('cc-radar-order', JSON.stringify(order)); } catch (e) { /* ignore */ }
      return order;
    });
  }, []);

  const moveProjectBy = useCallback((id, dir) => {
    setRadarOrder(cur => {
      const order = cur.slice();
      const i = order.indexOf(id), j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return cur;
      order.splice(i, 1); order.splice(j, 0, id);
      try { localStorage.setItem('cc-radar-order', JSON.stringify(order)); } catch (e) { /* ignore */ }
      return order;
    });
  }, []);

  const orderedProjects = useMemo(() => {
    const byId = {}; projects.forEach(p => { byId[p.id] = p; });
    return radarOrder.map(id => byId[id]).filter(Boolean);
  }, [projects, radarOrder]);

  // ---- guppy ----
  const guppySend = useCallback(async (text) => {
    const msg = (text || '').trim();
    if (!msg || guppyBusy) return;
    setGuppyBusy(true);
    const history = [...guppyMsgs, { mine: true, text: msg }];
    setGuppyMsgs(history);
    try {
      const res = await api.guppyChat(history.map(m => ({ role: m.mine ? 'user' : 'assistant', text: m.text })));
      setGuppyMsgs(s => [...s, { mine: false, text: res.reply }]);
    } catch (e) {
      setGuppyMsgs(s => [...s, { mine: false, text: "I can't reach my brain right now — try again in a minute." }]);
    } finally {
      setGuppyBusy(false);
    }
  }, [guppyMsgs, guppyBusy]);

  // ---- derived task helpers ----
  const late = useCallback(t => dueMeta(t.dueISO, todayISO).late, [todayISO]);
  const isDueToday = useCallback(t => !!t.dueISO && t.dueISO === todayISO, [todayISO]);
  const visible = useCallback(t => !t.done || t.justDone, []);

  const value = {
    ready, theme, setTheme, P,
    view, setView,
    tasks, projects, orderedProjects, calendar, clients,
    todayISO, nowMin,
    tomorrowISO: addDays(todayISO, 1), nextMonISO: nextMonday(todayISO), nextWeekISO: addDays(todayISO, 7),
    fmtShort,
    syncedAgo, outage, refresh,
    toast, showToast, dismissToast,
    toggleTask, retryTask, snoozeTask, saveTask,
    qa, qaSet, qaReset, qaPrefill, qaAdd, effectiveQa,
    radarOrder, moveProjectTo, moveProjectBy, persistOrder,
    guppyMsgs, guppySend, guppyBusy,
    late, isDueToday, visible
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
