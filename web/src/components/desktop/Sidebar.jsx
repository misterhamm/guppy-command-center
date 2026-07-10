import React from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { taskCounts } from '../../lib/selectors.js';
import { todayEvents, nowBar } from '../../lib/calendar.js';

export default function Sidebar({ anyFailed }) {
  const { view, setView, tasks, projects, calendar, todayISO, nowMin, P, outage, syncedAgo, refresh, theme, setTheme, showToast } = useStore();
  const { setMenu, setSelId } = useDesk();

  const { open, attention } = taskCounts(tasks, todayISO);
  const now = nowBar(todayEvents(calendar, todayISO), nowMin);
  const nav = [
    { label: 'Today', view: 'today', count: attention },
    { label: 'To-do', view: 'todo', count: open.length },
    { label: 'Projects', view: 'projects', count: projects.length },
    { label: 'Calendar', view: 'calendar', count: '' }
  ];

  const syncLabel = outage === 'notion' ? 'Notion unreachable'
    : outage === 'gcal' ? 'Calendar unreachable'
    : anyFailed ? 'Changes not synced'
    : syncedAgo == null ? 'Syncing…'
    : `Synced ${syncedAgo} min ago`;
  const syncDot = (anyFailed || outage) ? P.red : P.green;

  return (
    <div style={{ width: 210, flex: 'none', background: 'var(--panel)', borderRight: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', padding: '20px 12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 10px 22px' }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, overflow: 'hidden', flex: 'none', border: '1px solid var(--line2)' }}>
          <img src="/guppy.jpg" alt="Guppy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%', display: 'block' }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>Command Center</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(n => {
          const active = view === n.view;
          const go = () => { setView(n.view); setMenu(null); setSelId(null); };
          return (
            <div
              key={n.view}
              onClick={go}
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') go(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: active ? P.green : 'transparent', color: active ? '#fff' : P.soft, fontWeight: active ? 700 : 600, fontSize: 13.5, cursor: 'pointer' }}
            >
              {n.label}
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{n.count}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ padding: '9px 11px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 9, marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.05em', color: 'var(--muted)' }}>{now.kicker}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginTop: 2, lineHeight: 1.35 }}>{now.title}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{now.sub}</div>
        </div>
        <div style={{ padding: '8px 12px 0', borderTop: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: syncDot }} />{syncLabel}
        </div>
        <div
          onClick={() => refresh().catch(() => showToast('Refresh failed — still showing cached data'))}
          tabIndex={0}
          className="hover-green"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', border: '1px solid var(--line2)', borderRadius: 7, padding: '6px 0', textAlign: 'center', background: 'var(--card)', cursor: 'pointer' }}
        >↻ Refresh now</div>
        <div
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          tabIndex={0}
          className="hover-green"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', border: '1px solid var(--line2)', borderRadius: 7, padding: '6px 0', textAlign: 'center', background: 'var(--card)', cursor: 'pointer' }}
        >{theme === 'dark' ? '☀ Light mode' : '☾ Dark mode'}</div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'center', paddingTop: 2 }}>Shortcuts: / add · ↑↓ · ⏎ open · D done · S snooze</div>
      </div>
    </div>
  );
}
