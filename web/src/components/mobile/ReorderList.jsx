import React, { useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { projectView } from '../../lib/enrich.js';

// Explicit reorder mode: hold ≡ and drag. Order is dashboard-only state shared
// with desktop via localStorage — Notion untouched.
export default function ReorderList() {
  const { orderedProjects, tasks, P, todayISO, moveProjectBy, radarOrder } = useStore();
  const [dragId, setDragId] = useState(null);
  const [dragDy, setDragDy] = useState(0);
  const g = useRef({});

  const startDrag = (id, e) => {
    e.preventDefault();
    const row = e.currentTarget.parentElement;
    g.current = { id, y: e.clientY, h: (row && row.getBoundingClientRect().height) || 53 };
    setDragId(id);
    setDragDy(0);
    const onMove = ev => {
      const cur = g.current;
      if (cur.id !== id) return;
      let dy = ev.clientY - cur.y;
      const H = cur.h;
      let i = radarOrderIndex(id);
      while (dy > H * 0.6 && i < orderedProjects.length - 1) { moveProjectBy(id, 1); cur.y += H; dy -= H; i++; }
      while (dy < -H * 0.6 && i > 0) { moveProjectBy(id, -1); cur.y -= H; dy += H; i--; }
      setDragDy(dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      g.current = {};
      setDragId(null);
      setDragDy(0);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // read latest order from the store on each move
  const radarOrderIndex = id => radarOrder.indexOf(id);

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      {orderedProjects.map(p => {
        const v = projectView(p, tasks, P, todayISO);
        const dragging = dragId === p.id;
        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 14px', borderBottom: '1px solid var(--line-soft)', height: 53, borderLeft: '4px solid ' + v.rail, background: 'var(--card)', transform: `translateY(${dragging ? dragDy : 0}px)`, transition: dragging ? 'none' : 'transform .15s ease', boxShadow: dragging ? '0 6px 18px var(--shadow-deep)' : 'none', position: 'relative', zIndex: dragging ? 5 : 1 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: v.badgeColor, background: v.badgeBg, padding: '1px 6px', borderRadius: 4 }}>{v.statusWord}</span>
            </div>
            <span onPointerDown={e => startDrag(p.id, e)} tabIndex={0} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', fontSize: 18, color: 'var(--muted)', cursor: 'grab', touchAction: 'none', userSelect: 'none' }}>≡</span>
          </div>
        );
      })}
    </div>
  );
}
