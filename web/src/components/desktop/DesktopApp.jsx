import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import Sidebar from './Sidebar.jsx';
import TodayView from './TodayView.jsx';
import TodoView from './TodoView.jsx';
import ProjectsView from './ProjectsView.jsx';
import CalendarView from './CalendarView.jsx';
import EditDrawer from './EditDrawer.jsx';
import ProjectPopover from './ProjectPopover.jsx';
import EventPopover from './EventPopover.jsx';
import GuppyPanel from './GuppyPanel.jsx';

const DeskCtx = createContext(null);
export const useDesk = () => useContext(DeskCtx);

export default function DesktopApp() {
  const store = useStore();
  const { view, setView, tasks, outage, syncedAgo, toast, dismissToast, showToast, refresh, qaSet } = store;

  const [menu, setMenu] = useState(null);            // open dropdown key
  const [selId, setSelId] = useState(null);          // keyboard-selected task
  const [drawerTask, setDrawerTask] = useState(null);// working copy in the drawer
  const [expId, setExpId] = useState(null);          // expanded project popover
  const [evId, setEvId] = useState(null);            // event popover
  const [guppyOpen, setGuppyOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);       // Today quick-add expanded
  const [todoQaOpen, setTodoQaOpen] = useState(false);
  const listIdsRef = useRef([]);

  const openDrawer = useCallback(id => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    setDrawerTask({ ...t });
    setMenu(null);
  }, [tasks]);

  const closeDrawer = useCallback(() => setDrawerTask(null), []);

  // Global keyboard: / add · ↑↓ select · ⏎ open · D done · S snooze · Esc close
  useEffect(() => {
    const onKey = e => {
      const tag = (e.target.tagName || '').toUpperCase();
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (menu) return setMenu(null);
        if (drawerTask) return setDrawerTask(null);
        if (expId) return setExpId(null);
        if (evId) return setEvId(null);
        if (guppyOpen) return setGuppyOpen(false);
        if (qaOpen || todoQaOpen) { setQaOpen(false); setTodoQaOpen(false); }
        return;
      }
      if (typing) return;
      if (e.key === '/') {
        e.preventDefault();
        if (view === 'todo') setTodoQaOpen(true);
        else { setView('today'); setQaOpen(true); }
        setTimeout(() => { const el = document.querySelector('[data-cc-qa]'); if (el) el.focus(); }, 60);
        return;
      }
      const ids = listIdsRef.current || [];
      if (!ids.length) return;
      const idx = ids.indexOf(selId);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelId(ids[Math.min(ids.length - 1, idx + 1)] || ids[0]); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelId(ids[Math.max(0, idx - 1)] || ids[0]); return; }
      if (!selId) return;
      if (e.key === 'Enter') { e.preventDefault(); openDrawer(selId); return; }
      if (e.key === 'd' || e.key === 'D') { store.toggleTask(selId); return; }
      if (e.key === 's' || e.key === 'S') { setMenu(m => (m === 'snooze:' + selId ? null : 'snooze:' + selId)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu, drawerTask, expId, evId, guppyOpen, qaOpen, todoQaOpen, selId, view, setView, openDrawer, store]);

  const desk = {
    menu, setMenu, selId, setSelId, listIdsRef,
    openDrawer, drawerTask, setDrawerTask, closeDrawer,
    expId, setExpId, evId, setEvId,
    guppyOpen, setGuppyOpen,
    qaOpen, setQaOpen, todoQaOpen, setTodoQaOpen
  };

  const anyFailed = tasks.some(t => t.syncFailed);
  const outageTitle = outage === 'notion' ? "Can't reach Notion" : "Can't reach Google Calendar";
  const outageSub = outage === 'notion'
    ? `Showing tasks & projects from ${syncedAgo ?? '?'} min ago — edits will queue and retry.`
    : 'Events may be out of date — retrying every few minutes.';

  return (
    <DeskCtx.Provider value={desk}>
      <div
        style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--paper)', color: 'var(--ink)' }}
        onClick={() => { if (menu) setMenu(null); }}
      >
        <Sidebar anyFailed={anyFailed} />

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', position: 'relative' }}>
          {outage && (
            <div style={{ position: 'sticky', top: 0, zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--red-soft)', borderBottom: '1px solid var(--red)', padding: '8px 26px' }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--red)', flex: 'none' }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--red)' }}>{outageTitle}</span>
              <span style={{ fontSize: 12, color: 'var(--soft)' }}>{outageSub}</span>
              <span
                onClick={() => refresh().catch(() => showToast('Still unreachable — retrying automatically'))}
                tabIndex={0}
                style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#fff', background: 'var(--red)', padding: '4px 12px', borderRadius: 6, cursor: 'pointer' }}
              >Retry</span>
            </div>
          )}

          {view === 'today' && <TodayView />}
          {view === 'todo' && <TodoView />}
          {view === 'projects' && <ProjectsView />}
          {view === 'calendar' && <CalendarView />}

          {drawerTask && <EditDrawer />}
          {expId && <ProjectPopover />}
          {evId && <EventPopover />}
          <GuppyPanel />

          {toast && (
            <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'var(--toast-bg)', color: 'var(--toast-text)', fontSize: 12.5, fontWeight: 600, padding: '9px 16px', borderRadius: 99, boxShadow: '0 6px 20px var(--shadow-deep)', zIndex: 100, animation: 'toastIn .18s ease', display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
              {toast.msg}
              {toast.actionLabel && (
                <span onClick={() => { if (toast.action) toast.action(); dismissToast(); }} tabIndex={0} style={{ fontWeight: 800, color: 'var(--toast-accent)', cursor: 'pointer' }}>{toast.actionLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </DeskCtx.Provider>
  );
}
