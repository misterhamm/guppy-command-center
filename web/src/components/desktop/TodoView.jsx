import React, { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import QuickAddCard from './QuickAddCard.jsx';
import TaskRow from './TaskRow.jsx';
import { todoGroups, taskCounts, TODO_EMPTY_LINES } from '../../lib/selectors.js';

export default function TodoView() {
  const { tasks, todayISO, P } = useStore();
  const { todoQaOpen, setTodoQaOpen, listIdsRef, setSelId } = useDesk();
  const [filter, setFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const { open, odCount, tdCount } = taskCounts(tasks, todayISO);
  const { groups, completed } = todoGroups(tasks, filter, showCompleted, todayISO, P);
  listIdsRef.current = groups.flatMap(g => g.raw.map(t => t.id));

  const filterDefs = [
    { key: 'all', label: 'All Active · ' + open.length },
    { key: 'today', label: 'Today · ' + tdCount },
    { key: 'overdue', label: 'Overdue · ' + odCount },
    { key: 'work', label: 'Work · ' + open.filter(t => !t.personal).length },
    { key: 'personal', label: 'Personal · ' + open.filter(t => t.personal).length }
  ];

  return (
    <div style={{ padding: '22px 26px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>To-do</div>
        <div onClick={() => setTodoQaOpen(v => !v)} tabIndex={0} className="hover-green-bg" style={{ marginLeft: 'auto', background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 12.5, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>+ Add task</div>
      </div>

      {todoQaOpen && <QuickAddCard variant="todo" />}

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        {filterDefs.map(f => {
          const active = filter === f.key;
          return (
            <div
              key={f.key}
              onClick={() => { setFilter(f.key); setSelId(null); }}
              tabIndex={0}
              style={{ fontSize: 12.5, fontWeight: active ? 700 : 600, color: active ? 'var(--paper)' : f.key === 'overdue' ? P.red : P.soft, background: active ? 'var(--ink)' : 'var(--card)', border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'), borderRadius: 99, padding: '6px 13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >{f.label}</div>
          );
        })}
        <div onClick={() => setShowCompleted(v => !v)} tabIndex={0} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: showCompleted ? P.green : 'var(--muted)', cursor: 'pointer', padding: '6px 4px' }}>
          {showCompleted ? 'Hide completed' : 'Show completed · ' + completed.length}
        </div>
      </div>

      {groups.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: 26, textAlign: 'center', fontSize: 13.5, color: 'var(--muted)' }}>
          {TODO_EMPTY_LINES[filter] || TODO_EMPTY_LINES.all}
        </div>
      )}

      {groups.map(g => (
        <React.Fragment key={g.label}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 5px' }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.07em', color: g.red ? P.red : 'var(--muted)' }}>{g.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.count}</span>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'visible', marginBottom: 12 }}>
            {g.raw.map(t => <TaskRow key={t.id} t={t} compact />)}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
