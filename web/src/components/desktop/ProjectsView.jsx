import React from 'react';
import { useStore } from '../../state/store.jsx';
import RadarGrid from './RadarGrid.jsx';

export default function ProjectsView() {
  const { projects } = useStore();
  return (
    <div style={{ padding: '22px 26px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Projects</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{projects.length} non-complete · drag to reorder · click for detail · edit in Notion</div>
      </div>
      <RadarGrid />
    </div>
  );
}
