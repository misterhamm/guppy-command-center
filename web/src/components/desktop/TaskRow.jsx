import React from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { taskView } from '../../lib/enrich.js';
import { fmtShort } from '../../lib/dates.js';

// Dense desktop task row used by Today and To-do. `compact` = To-do sizing.
export default function TaskRow({ t, compact }) {
  const { P, todayISO, tomorrowISO, nextMonISO, nextWeekISO, toggleTask, retryTask, snoozeTask } = useStore();
  const { menu, setMenu, selId, openDrawer } = useDesk();
  const v = taskView(t, P, todayISO);
  const menuKey = 'snooze:' + t.id;
  const snoozeOpts = [
    { label: 'Tomorrow', iso: tomorrowISO },
    { label: 'Next Mon', iso: nextMonISO },
    { label: 'Next week', iso: nextWeekISO }
  ];

  return (
    <div
      onClick={() => openDrawer(t.id)}
      tabIndex={0}
      className="hover-row"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '8px 14px' : '9px 14px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', position: 'relative', opacity: v.opacity, boxShadow: selId === t.id ? 'inset 0 0 0 2px ' + P.green : 'none' }}
    >
      <span
        onClick={e => { e.stopPropagation(); toggleTask(t.id); }}
        tabIndex={0}
        role="checkbox"
        aria-checked={t.done}
        style={{ width: 40, height: 40, margin: '-12px -10px -12px -14px', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}
      >
        <span style={{ width: compact ? 16 : 17, height: compact ? 16 : 17, border: '1.5px solid ' + v.boxBorder, borderRadius: 5, background: v.boxBg, color: '#fff', display: 'grid', placeItems: 'center', fontSize: compact ? 10 : 11, fontWeight: 800 }}>{v.check}</span>
      </span>
      <span style={{ fontSize: compact ? 13 : 13.5, fontWeight: 600, color: v.nameColor, flex: 1, minWidth: 0, textDecoration: v.strike }}>{t.name}</span>
      {t.justDone && !compact && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Nice — done ✓</span>}
      {t.syncFailed && (
        <span onClick={e => { e.stopPropagation(); retryTask(t.id); }} tabIndex={0} style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--red)', padding: '2px 8px', borderRadius: 5, cursor: 'pointer' }}>Sync failed · Retry</span>
      )}
      <span style={{ fontSize: compact ? 11 : 11.5, fontWeight: 600, color: v.clientChipColor, background: v.clientChipBg, padding: '2px 8px', borderRadius: 99 }}>{v.clientChip}</span>
      {!!t.project && (
        <span style={{ fontSize: compact ? 11 : 11.5, fontWeight: 600, color: v.projChipColor, background: v.projChipBg, border: '1px solid transparent', padding: '2px 8px', borderRadius: 99 }}>{t.project}</span>
      )}
      <span style={{ fontSize: 12, fontWeight: 700, color: v.dueColor, width: 84, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.dueDisplay}</span>
      <span
        onClick={e => { e.stopPropagation(); setMenu(m => (m === menuKey ? null : menuKey)); }}
        tabIndex={0}
        className="hover-green"
        style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >Snooze ▾</span>
      <span style={{ fontSize: compact ? 10.5 : 11, fontWeight: 800, color: v.prColor, background: v.prBg, padding: '2px 7px', borderRadius: 5, letterSpacing: '.03em' }}>{t.priority}</span>
      {menu === menuKey && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 60, top: 34, zIndex: 40, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 9, boxShadow: '0 8px 24px var(--shadow)', padding: 4, minWidth: 150, animation: 'popIn .12s ease' }}>
          {snoozeOpts.map(o => (
            <div key={o.label} onClick={e => { e.stopPropagation(); setMenu(null); snoozeTask(t.id, o.iso, o.label); }} className="hover-panel" style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>{o.label}</div>
          ))}
          <div style={{ borderTop: '1px solid var(--line-soft)', margin: '4px 2px 2px', paddingTop: 5 }}>
            <input type="date" onChange={e => { const val = e.target.value; if (val) { setMenu(null); snoozeTask(t.id, val, fmtShort(val)); } }} style={{ width: '100%', fontSize: 12, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 6px' }} />
          </div>
        </div>
      )}
    </div>
  );
}
