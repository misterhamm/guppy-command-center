import React from 'react';
import { useStore } from '../../state/store.jsx';
import { useMob } from './MobileApp.jsx';
import ReorderList from './ReorderList.jsx';
import { projectView } from '../../lib/enrich.js';

export default function MobileProjects() {
  const { orderedProjects, tasks, P, todayISO } = useStore();
  const { push, reorderMode, setReorderMode } = useMob();

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 2px 2px' }}>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Reorder is saved to the dashboard — Notion untouched</span>
        <span onClick={() => setReorderMode(v => !v)} tabIndex={0} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: reorderMode ? P.green : 'var(--muted)', cursor: 'pointer' }}>{reorderMode ? 'Done' : 'Reorder'}</span>
      </div>

      {reorderMode ? (
        <div style={{ marginTop: 6 }}><ReorderList /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {orderedProjects.map(p => {
            const v = projectView(p, tasks, P, todayISO);
            return (
              <div key={p.id} onClick={() => push({ type: 'project', id: p.id })} tabIndex={0} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: '4px solid ' + v.rail, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', opacity: v.opacity }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: v.badgeColor, background: v.badgeBg, padding: '2px 7px', borderRadius: 5 }}>{v.statusWord}</span>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>{p.client}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 7 }}>
                  {v.concerns.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.35 }}>
                      <span style={{ color: c.dot, fontWeight: 800, flex: 'none' }}>•</span><span>{c.text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
                  {v.chips.map((ch, i) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: ch.color, background: ch.bg, padding: '2px 7px', borderRadius: 99 }}>{ch.text}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
