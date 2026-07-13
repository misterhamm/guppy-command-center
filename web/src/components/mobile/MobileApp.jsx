import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import MobileToday from './MobileToday.jsx';
import MobileTodo from './MobileTodo.jsx';
import MobileProjects from './MobileProjects.jsx';
import MobileCalendar from './MobileCalendar.jsx';
import Sheets from './Sheets.jsx';
import { taskCounts } from '../../lib/selectors.js';
import { fmtShort, dIso } from '../../lib/dates.js';

const MobCtx = createContext(null);
export const useMob = () => useContext(MobCtx);

export default function MobileApp() {
  const store = useStore();
  const { view, setView, tasks, projects, P, theme, setTheme, refresh, showToast, toast, dismissToast, outage, syncedAgo, todayISO, textScale, cycleTextScale } = store;

  const [stack, setStack] = useState([]);          // sheet stack
  const [dr, setDr] = useState(null);              // task editor working copy
  const [drSync, setDrSync] = useState('idle');
  const [swipe, setSwipe] = useState(null);        // { id, dx, dragging, open }
  const [reorderMode, setReorderMode] = useState(false);
  const suppressTap = useRef(false);

  const push = useCallback(item => setStack(s => [...s, item]), []);
  const pop = useCallback(() => setStack(s => s.slice(0, -1)), []);
  const closeAll = useCallback(() => { setStack([]); setDrSync('idle'); }, []);

  const openTaskSheet = useCallback((id, replace) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    setDr({ ...t });
    setDrSync('idle');
    setStack(s => [...(replace ? s.slice(0, -1) : s), { type: 'task', id }]);
  }, [tasks]);

  const { open, odCount, tdCount, attention } = taskCounts(tasks, todayISO);

  const titles = { today: 'Overview', todo: 'To-do', projects: 'Projects', calendar: 'Calendar' };
  const dateShort = dIso(todayISO).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  const subs = {
    today: `${dateShort} · ${odCount} overdue, ${tdCount} due · synced ${syncedAgo ?? '–'}m ago`,
    todo: `${open.length} open tasks · synced ${syncedAgo ?? '–'}m ago`,
    projects: `${projects.length} non-complete · tap to view & edit`,
    calendar: 'Read-only · synced from Google'
  };

  const navDefs = [
    { label: 'Overview', view: 'today', count: String(attention) },
    { label: 'To-do', view: 'todo', count: String(open.length) },
    { label: 'Projects', view: 'projects', count: String(projects.length) },
    { label: 'Calendar', view: 'calendar', count: '' }
  ];

  const mob = {
    stack, push, pop, closeAll,
    dr, setDr, drSync, setDrSync,
    swipe, setSwipe, suppressTap,
    openTaskSheet,
    reorderMode, setReorderMode
  };

  const outageTitle = outage === 'notion' ? "Can't reach Notion" : "Can't reach Google Calendar";
  const outageSub = outage === 'notion' ? `Showing data from ${syncedAgo ?? '?'}m ago — edits queue & retry.` : 'Events may be out of date — retrying.';

  return (
    <MobCtx.Provider value={mob}>
      <div style={{ height: '100%', position: 'relative', background: 'var(--paper)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* top bar */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: 'calc(6px + env(safe-area-inset-top, 0px)) 18px 10px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>{titles[view]}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>{subs[view]}</div>
          </div>
          <div onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} tabIndex={0} title="Theme" style={{ width: 38, height: 38, borderRadius: 99, border: '1px solid var(--line2)', background: 'var(--card)', display: 'grid', placeItems: 'center', fontSize: 14, color: 'var(--soft)', cursor: 'pointer', flex: 'none' }}>{theme === 'dark' ? '☀' : '☾'}</div>
          <div onClick={cycleTextScale} tabIndex={0} title={'Text size · ' + Math.round(textScale * 100) + '%'} style={{ width: 38, height: 38, borderRadius: 99, border: '1px solid var(--line2)', background: 'var(--card)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: 'var(--soft)', cursor: 'pointer', flex: 'none' }}>Aa</div>
          <div onClick={() => push({ type: 'guppy' })} tabIndex={0} style={{ width: 38, height: 38, borderRadius: 99, overflow: 'hidden', flex: 'none', border: '2px solid var(--green)', cursor: 'pointer' }}>
            <img src="/guppy.jpg" alt="Guppy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%', display: 'block' }} />
          </div>
        </div>

        {/* connection failure banner */}
        {outage && (
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--red-soft)', borderTop: '1px solid var(--red)', borderBottom: '1px solid var(--red)', padding: '7px 18px' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--red)', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>{outageTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--soft)' }}>{outageSub}</div>
            </div>
            <span onClick={() => refresh().catch(() => showToast('Still unreachable — retrying automatically'))} tabIndex={0} style={{ fontSize: 11.5, fontWeight: 800, color: '#fff', background: 'var(--red)', padding: '5px 11px', borderRadius: 6, cursor: 'pointer', flex: 'none' }}>Retry</span>
          </div>
        )}

        {view === 'today' && <MobileToday />}
        {view === 'todo' && <MobileTodo />}
        {view === 'projects' && <MobileProjects />}
        {view === 'calendar' && <MobileCalendar />}

        {/* FAB */}
        <div onClick={() => push({ type: 'qa' })} tabIndex={0} style={{ position: 'absolute', right: 16, bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))', width: 54, height: 54, borderRadius: 99, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 600, boxShadow: '0 6px 18px var(--shadow-deep)', cursor: 'pointer', zIndex: 30 }}>+</div>

        {/* bottom nav */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--card)', borderTop: '1px solid var(--line)', display: 'flex', padding: '6px 8px calc(14px + env(safe-area-inset-bottom, 6px))', zIndex: 30 }}>
          {navDefs.map(n => {
            const active = view === n.view;
            return (
              <div key={n.view} onClick={() => setView(n.view)} tabIndex={0} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', cursor: 'pointer', minHeight: 44 }}>
                <span style={{ width: 26, height: 3, borderRadius: 2, background: active ? P.green : 'transparent' }} />
                <span style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? P.green : P.soft }}>{n.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{n.count}</span>
              </div>
            );
          })}
        </div>

        <Sheets />

        {/* toast */}
        {toast && (
          <div style={{ position: 'absolute', left: '50%', bottom: 'calc(108px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', background: 'var(--toast-bg)', color: 'var(--toast-text)', fontSize: 12.5, fontWeight: 600, padding: '9px 16px', borderRadius: 99, boxShadow: '0 6px 20px var(--shadow-deep)', zIndex: 60, animation: 'toastIn .18s ease', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 12, maxWidth: '88%' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.msg}</span>
            {toast.actionLabel && <span onClick={() => { if (toast.action) toast.action(); dismissToast(); }} tabIndex={0} style={{ fontWeight: 800, color: 'var(--toast-accent)', cursor: 'pointer' }}>{toast.actionLabel}</span>}
          </div>
        )}
      </div>
    </MobCtx.Provider>
  );
}
