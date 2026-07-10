import React, { useRef } from 'react';
import { useStore } from '../../state/store.jsx';
import { useMob } from './MobileApp.jsx';
import { taskView } from '../../lib/enrich.js';

// Mobile task card: swipe right = done, swipe left = pinned actions,
// long-press = quick-actions sheet, tap = full editor.
export default function TaskCard({ t }) {
  const { P, todayISO, tomorrowISO, toggleTask, retryTask, snoozeTask } = useStore();
  const { swipe, setSwipe, suppressTap, push, openTaskSheet } = useMob();
  const v = taskView(t, P, todayISO);
  const g = useRef({});
  const lpTimer = useRef(null);
  const lpFired = useRef(false);

  const mine = !!(swipe && swipe.id === t.id);
  const dx = mine ? swipe.dx : 0;

  const down = e => {
    if (swipe && swipe.id !== t.id) setSwipe(null);
    g.current = { x: e.clientX, y: e.clientY, base: mine && swipe.open ? -156 : 0, drag: false, id: t.id };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    clearTimeout(lpTimer.current);
    lpFired.current = false;
    lpTimer.current = setTimeout(() => { if (!g.current.drag) { lpFired.current = true; push({ type: 'actions', id: t.id }); } }, 480);
  };
  const move = e => {
    if (g.current.id !== t.id) return;
    const ddx = e.clientX - g.current.x, ddy = e.clientY - g.current.y;
    if (!g.current.drag) {
      if (Math.abs(ddy) > 12) { clearTimeout(lpTimer.current); return; }
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) { g.current.drag = true; clearTimeout(lpTimer.current); }
      else return;
    }
    const val = Math.max(-156, Math.min(120, g.current.base + ddx));
    setSwipe({ id: t.id, dx: val, dragging: true, open: false });
  };
  const up = () => {
    clearTimeout(lpTimer.current);
    if (g.current.id !== t.id) return;
    const wasDrag = g.current.drag;
    g.current = {};
    if (!wasDrag) return;
    suppressTap.current = true;
    const cur = swipe && swipe.id === t.id ? swipe.dx : 0;
    if (cur > 80) { setSwipe(null); toggleTask(t.id); }
    else if (cur < -70) setSwipe({ id: t.id, dx: -156, dragging: false, open: true });
    else setSwipe(null);
  };
  const tap = () => {
    if (lpFired.current || suppressTap.current) { lpFired.current = false; suppressTap.current = false; return; }
    if (swipe && swipe.id === t.id && swipe.open) { setSwipe(null); return; }
    openTaskSheet(t.id);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', paddingLeft: 18, fontWeight: 800, fontSize: 13, opacity: mine && dx > 0 ? Math.min(1, dx / 80) : 0 }}>✓ Done</div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, display: 'flex' }}>
        <div onClick={e => { e.stopPropagation(); setSwipe(null); snoozeTask(t.id, tomorrowISO, 'Tomorrow'); }} style={{ width: 88, background: 'var(--amber)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 800, textAlign: 'center', cursor: 'pointer', lineHeight: 1.3 }}>Snooze<br />Tmrw</div>
        <div onClick={e => { e.stopPropagation(); setSwipe(null); push({ type: 'actions', id: t.id }); }} style={{ width: 68, background: 'var(--panel)', color: 'var(--soft)', display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>More</div>
      </div>
      <div
        onClick={tap}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        tabIndex={0}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', minHeight: 52, opacity: v.opacity, cursor: 'pointer', background: 'var(--card)', transform: `translateX(${dx}px)`, transition: mine && swipe.dragging ? 'none' : 'transform .18s ease', touchAction: 'pan-y', position: 'relative' }}
      >
        <span onClick={e => { e.stopPropagation(); toggleTask(t.id); }} tabIndex={0} role="checkbox" aria-checked={t.done} style={{ width: 44, height: 44, margin: '-11px -11px -11px -14px', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}>
          <span style={{ width: 22, height: 22, border: '1.5px solid ' + v.boxBorder, borderRadius: 7, background: v.boxBg, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{v.check}</span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: v.nameColor, textDecoration: v.strike, lineHeight: 1.3 }}>{t.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: v.clientChipColor, background: v.clientChipBg, padding: '1px 7px', borderRadius: 99 }}>{v.clientChip}</span>
            {!!t.project && <span style={{ fontSize: 11, fontWeight: 600, color: v.projChipColor, background: v.projChipBg, border: '1px solid transparent', padding: '1px 7px', borderRadius: 99 }}>{t.project}</span>}
            <span style={{ fontSize: 11.5, fontWeight: 700, color: v.dueColor, fontVariantNumeric: 'tabular-nums' }}>{v.dueDisplay}</span>
            {t.justDone && <span style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600 }}>Nice — done ✓</span>}
            {t.syncFailed && <span onClick={e => { e.stopPropagation(); retryTask(t.id); }} style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', background: 'var(--red)', padding: '1px 7px', borderRadius: 5 }}>Sync failed · Retry</span>}
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: v.prColor, background: v.prBg, padding: '2px 7px', borderRadius: 5, flex: 'none' }}>{t.priority}</span>
      </div>
    </div>
  );
}
