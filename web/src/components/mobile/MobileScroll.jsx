import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';

const TRIGGER = 56;

// Scrollable view body with app-style pull-to-refresh: drag down from the top
// of the list to re-sync from Notion/Google.
export default function MobileScroll({ children, style }) {
  const { refresh } = useStore();
  const ref = useRef(null);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const g = useRef({ y: 0, active: false, pull: 0, refreshing: false });
  g.current.pull = pull;
  g.current.refreshing = refreshing;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const point = e => (e.touches ? e.touches[0] : e);
    const onStart = e => {
      if (g.current.refreshing) return;
      g.current.active = el.scrollTop <= 0;
      g.current.y = point(e).clientY;
    };
    const onMove = e => {
      if (!g.current.active || g.current.refreshing) return;
      const dy = point(e).clientY - g.current.y;
      if (dy > 0 && el.scrollTop <= 0) {
        if (e.cancelable) e.preventDefault();
        setDragging(true);
        setPull(Math.min(90, dy * 0.5));
      } else if (g.current.pull) {
        setPull(0);
        setDragging(false);
      }
    };
    const onEnd = async () => {
      if (!g.current.active) return;
      g.current.active = false;
      setDragging(false);
      if (g.current.pull >= TRIGGER) {
        setRefreshing(true);
        setPull(TRIGGER);
        try { await refresh(); } catch (e) { /* refresh() toasts on its own */ }
        setRefreshing(false);
      }
      setPull(0);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [refresh]);

  return (
    <div ref={ref} style={{ flex: 1, overflowY: 'auto', overscrollBehaviorY: 'contain', ...style }}>
      <div style={{ height: pull, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', transition: dragging ? 'none' : 'height .2s ease', margin: '0 -16px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', padding: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', transform: pull >= TRIGGER ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>{refreshing ? '↻' : '↓'}</span>
          {refreshing ? 'Refreshing…' : pull >= TRIGGER ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
      {children}
    </div>
  );
}
