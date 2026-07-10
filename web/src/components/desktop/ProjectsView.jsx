import React, { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import RadarGrid from './RadarGrid.jsx';
import { PROJECT_STATUSES } from '../../lib/logic.js';

export default function ProjectsView() {
  const { projects, P } = useStore();
  const [filter, setFilter] = useState('all');

  const chips = [
    { key: 'all', label: 'All · ' + projects.length },
    ...PROJECT_STATUSES
      .map(s => ({ key: s, count: projects.filter(p => p.status === s).length }))
      .filter(c => c.count > 0)
      .map(c => ({ key: c.key, label: c.key + ' · ' + c.count }))
  ];

  return (
    <div style={{ padding: '22px 26px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Projects</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{projects.length} non-complete · drag to reorder · click to view & edit</div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {chips.map(c => {
          const active = filter === c.key;
          const st = P.STATUS[c.key];
          return (
            <div
              key={c.key}
              onClick={() => setFilter(active && c.key !== 'all' ? 'all' : c.key)}
              tabIndex={0}
              style={{ fontSize: 12.5, fontWeight: active ? 700 : 600, color: active ? 'var(--paper)' : st ? st.rail : P.soft, background: active ? 'var(--ink)' : 'var(--card)', border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'), borderRadius: 99, padding: '6px 13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >{c.label}</div>
          );
        })}
      </div>
      <RadarGrid statusFilter={filter} />
    </div>
  );
}
