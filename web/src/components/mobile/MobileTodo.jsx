import React, { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import TaskCard from './TaskCard.jsx';
import MobileScroll from './MobileScroll.jsx';
import { todoGroups, taskCounts, TODO_EMPTY_LINES } from '../../lib/selectors.js';

export default function MobileTodo() {
  const { tasks, todayISO, P } = useStore();
  const [filter, setFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const { open, odCount, tdCount } = taskCounts(tasks, todayISO);
  const { groups, completed } = todoGroups(tasks, filter, showCompleted, todayISO, P);

  const filterDefs = [
    { key: 'all', label: 'All Active · ' + open.length },
    { key: 'today', label: 'Today · ' + tdCount },
    { key: 'overdue', label: 'Overdue · ' + odCount },
    { key: 'work', label: 'Work · ' + open.filter(t => !t.personal).length },
    { key: 'personal', label: 'Personal · ' + open.filter(t => t.personal).length }
  ];

  return (
    <MobileScroll style={{ padding: '2px 16px calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="mobile-scroll-x" style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '6px -16px 10px', padding: '0 16px' }}>
        {filterDefs.map(f => {
          const active = filter === f.key;
          return (
            <div key={f.key} onClick={() => setFilter(f.key)} tabIndex={0} style={{ flex: 'none', fontSize: 12.5, fontWeight: active ? 700 : 600, color: active ? 'var(--paper)' : f.key === 'overdue' ? P.red : P.soft, background: active ? 'var(--ink)' : 'var(--card)', border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'), borderRadius: 99, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{f.label}</div>
          );
        })}
        <div onClick={() => setShowCompleted(v => !v)} tabIndex={0} style={{ flex: 'none', fontSize: 12.5, fontWeight: 600, color: showCompleted ? P.green : 'var(--muted)', border: '1px dashed var(--line2)', borderRadius: 99, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {showCompleted ? 'Hide completed' : 'Completed · ' + completed.length}
        </div>
      </div>

      {groups.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 26, textAlign: 'center', fontSize: 13.5, color: 'var(--muted)' }}>
          {TODO_EMPTY_LINES[filter] || TODO_EMPTY_LINES.all}
        </div>
      )}

      {groups.map(g => (
        <React.Fragment key={g.label}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 5px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em', color: g.red ? P.red : 'var(--muted)' }}>{g.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.count}</span>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            {g.raw.map(t => <TaskCard key={t.id} t={t} />)}
          </div>
        </React.Fragment>
      ))}
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, padding: '0 2px' }}>Hold a task for quick actions · sorted overdue → today → upcoming</div>
    </MobileScroll>
  );
}
