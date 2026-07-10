import React, { useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { projectView } from '../../lib/enrich.js';

// Project Radar card grid — drag to reorder (dashboard-only order), click for
// detail. Read-only otherwise.
export default function RadarGrid() {
  const { orderedProjects, tasks, P, todayISO, moveProjectTo, showToast } = useStore();
  const { setExpId, setMenu } = useDesk();
  const dragging = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
      {orderedProjects.map(p => {
        const v = projectView(p, tasks, P, todayISO);
        return (
          <div
            key={p.id}
            onClick={() => { if (!dragging.current) { setExpId(p.id); setMenu(null); } }}
            tabIndex={0}
            draggable
            onDragStart={e => { dragging.current = p.id; e.dataTransfer.effectAllowed = 'move'; }}
            onDragEnd={() => { dragging.current = null; setDragOverId(null); }}
            onDragOver={e => { e.preventDefault(); if (dragOverId !== p.id) setDragOverId(p.id); }}
            onDrop={e => {
              e.preventDefault();
              const from = dragging.current;
              dragging.current = null;
              setDragOverId(null);
              if (from && from !== p.id) { moveProjectTo(from, p.id); showToast('Radar order saved'); }
            }}
            className="hover-card-shadow"
            style={{ background: 'var(--card)', border: '1px solid ' + (dragOverId === p.id ? P.green : 'var(--line)'), borderLeft: '4px solid ' + v.rail, borderRadius: 10, padding: '11px 12px', display: 'flex', flexDirection: 'column', cursor: 'grab', opacity: v.opacity }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: v.badgeColor, background: v.badgeBg, padding: '2px 7px', borderRadius: 5 }}>{v.statusWord}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>{p.client}</div>
            <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em', marginTop: 8 }}>CURRENT CONCERNS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 3, marginBottom: 9 }}>
              {v.concerns.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--ink)', lineHeight: 1.35 }}>
                  <span style={{ color: c.dot, fontWeight: 800, flex: 'none' }}>•</span>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 'auto', paddingTop: 9, borderTop: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
              {v.chips.map((ch, i) => (
                <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: ch.color, background: ch.bg, padding: '2px 7px', borderRadius: 99 }}>{ch.text}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
