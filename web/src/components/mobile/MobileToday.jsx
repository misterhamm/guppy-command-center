import React, { useRef } from 'react';
import { useStore } from '../../state/store.jsx';
import { useMob } from './MobileApp.jsx';
import TaskCard from './TaskCard.jsx';
import ReorderList from './ReorderList.jsx';
import { todayGroups } from '../../lib/selectors.js';
import { todayEvents, currentAndNext, dayViews } from '../../lib/calendar.js';
import { projectView } from '../../lib/enrich.js';
import { minLabel } from '../../lib/dates.js';

export default function MobileToday() {
  const { tasks, calendar, orderedProjects, projects, todayISO, nowMin, P, setView } = useStore();
  const { push, reorderMode, setReorderMode } = useMob();

  const groups = todayGroups(tasks, todayISO);
  const evs = todayEvents(calendar, todayISO);
  const { current, next } = currentAndNext(evs, nowMin);
  const stripDay = dayViews([{ iso: todayISO, events: evs }], todayISO, nowMin, P)[0];

  let nowTitle = 'No meetings right now';
  let nowSub = next ? 'next at ' + minLabel(next.startMin) : 'clear day';
  if (current) { nowTitle = current.title; nowSub = 'until ' + minLabel(current.endMin || current.startMin + 30); }
  else if (next) { nowTitle = next.title; nowSub = 'in ' + (next.startMin - nowMin) + ' min' + (next.location ? ' · ' + next.location : ''); }

  const projViews = orderedProjects.map(p => ({ p, v: projectView(p, tasks, P, todayISO) }));
  const radarTop = projViews.slice(0, 3);
  const radarRest = projViews.slice(3);

  // horizontal drag-scroll for the calendar strip
  const strip = useRef({});
  const stripDown = e => { const el = e.currentTarget; strip.current = { el, x: e.clientX, l: el.scrollLeft }; try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
  const stripMove = e => { const s = strip.current; if (!s.el) return; s.el.scrollLeft = s.l - (e.clientX - s.x); };
  const stripUp = () => { strip.current = {}; };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      {/* now line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', margin: '4px 0 10px' }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--green)', flex: 'none' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nowTitle}</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', flex: 'none', marginLeft: 'auto' }}>{nowSub}</span>
      </div>

      {groups.map(g => (
        <React.Fragment key={g.key}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0 6px' }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: g.red ? P.red : 'var(--ink)' }}>{g.label}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{g.count}</span>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid ' + (g.red ? 'var(--red)' : 'var(--line)'), borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
            {g.raw.map(t => <TaskCard key={t.id} t={t} />)}
          </div>
        </React.Fragment>
      ))}
      <div style={{ fontSize: 11, color: 'var(--muted)', margin: '-4px 2px 12px' }}>Tap to edit · hold a task for quick actions</div>

      {/* calendar strip */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '6px 0 6px' }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink)' }}>Calendar</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{next ? 'next ' + minLabel(next.startMin) : ''}</span>
        <span onClick={() => setView('calendar')} tabIndex={0} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--green)', cursor: 'pointer' }}>Week view →</span>
      </div>
      <div className="mobile-scroll-x" onPointerDown={stripDown} onPointerMove={stripMove} onPointerUp={stripUp} onPointerCancel={stripUp} style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -16px', padding: '2px 16px 6px', cursor: 'grab', touchAction: 'pan-x pan-y' }}>
        {stripDay && stripDay.events.map(ev => (
          <div key={ev.id} onClick={() => push({ type: 'event', id: ev.id })} tabIndex={0} style={{ flex: 'none', width: 170, border: ev.stripBorder, borderRadius: 10, padding: '9px 11px', background: ev.bg, opacity: ev.opacity, cursor: 'pointer' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: ev.timeColor, fontVariantNumeric: 'tabular-nums' }}>{ev.time}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ev.titleColor, marginTop: 1, lineHeight: 1.25 }}>{ev.displayTitle}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ev.locLabel}</span>
              {ev.hasJoin && <a href={ev.joinUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)', background: 'var(--green-soft)', padding: '1px 5px', borderRadius: 4 }}>{ev.join} ↗</a>}
            </div>
          </div>
        ))}
        {stripDay && stripDay.events.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '8px 4px' }}>No meetings today — clear day.</div>
        )}
      </div>

      {/* radar: full landscape */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '14px 0 8px' }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink)' }}>Project Radar</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>all {projects.length}</span>
        <span onClick={() => setReorderMode(v => !v)} tabIndex={0} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: reorderMode ? P.green : 'var(--muted)', cursor: 'pointer' }}>{reorderMode ? 'Done' : 'Reorder'}</span>
        <span onClick={() => setView('projects')} tabIndex={0} style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', cursor: 'pointer' }}>Details →</span>
      </div>

      {reorderMode ? (
        <>
          <ReorderList />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, padding: '0 2px' }}>Hold ≡ and drag — order is saved to the dashboard (shared with desktop), Notion untouched.</div>
        </>
      ) : (
        <>
          {/* 3 full cards + all remaining as slim rows — nothing hidden */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {radarTop.map(({ p, v }) => (
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
            ))}
          </div>
          {radarRest.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', marginTop: 10 }}>
              {radarRest.map(({ p, v }) => (
                <div key={p.id} onClick={() => push({ type: 'project', id: p.id })} tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', minHeight: 48, cursor: 'pointer', borderLeft: '4px solid ' + v.rail, opacity: v.opacity }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: v.badgeColor, background: v.badgeBg, padding: '1px 6px', borderRadius: 4 }}>{v.statusWord}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.topConcern}</div>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--muted)', flex: 'none' }}>›</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
