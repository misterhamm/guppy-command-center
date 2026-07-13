import React, { useEffect, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import QuickAddCard from './QuickAddCard.jsx';
import TaskRow from './TaskRow.jsx';
import RadarGrid from './RadarGrid.jsx';
import { todayGroups, taskCounts } from '../../lib/selectors.js';
import { todayEvents, currentAndNext, dayViews } from '../../lib/calendar.js';
import { minLabel, dIso } from '../../lib/dates.js';

function sweptToday() {
  try { return localStorage.getItem('cc-sweep-done') === new Date().toDateString(); } catch (e) { return false; }
}

export default function TodayView() {
  const store = useStore();
  const { tasks, projects, calendar, todayISO, nowMin, tomorrowISO, nextMonISO, P, setView, showToast, snoozeTask } = store;
  const { setEvId, setMenu, listIdsRef } = useDesk();

  const groups = todayGroups(tasks, todayISO);
  const { odCount, tdCount, attention } = (() => { const c = taskCounts(tasks, todayISO); return { ...c, attention: c.attention }; })();
  const evs = todayEvents(calendar, todayISO);
  const { current, next } = currentAndNext(evs, nowMin);
  const stripDay = dayViews([{ iso: todayISO, events: evs }], todayISO, nowMin, P)[0];

  listIdsRef.current = groups.flatMap(g => g.raw.map(t => t.id));

  // End-of-day sweep: after 4pm local, once per day
  const [sweepDismissed, setSweepDismissed] = useState(false);
  const [sweepExcluded, setSweepExcluded] = useState({});
  const after4 = new Date().getHours() >= 16;
  const sweepRaw = tasks.filter(t => !t.done && t.dueISO === todayISO);
  const sweepOn = after4 && !sweepDismissed && !sweptToday() && sweepRaw.length > 0;
  const sweepIncluded = sweepRaw.filter(t => !sweepExcluded[t.id]);
  const markSweepDone = () => {
    try { localStorage.setItem('cc-sweep-done', new Date().toDateString()); } catch (e) { /* ignore */ }
    setSweepDismissed(true);
  };

  const hr = new Date().getHours();
  const dayPart = hr < 12 ? 'Morning' : hr < 17 ? 'Afternoon' : 'Evening';
  const dateLine = dIso(todayISO).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => () => { listIdsRef.current = []; }, [listIdsRef]);

  return (
    <div style={{ padding: '22px 26px 90px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Overview</div>
        <div style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 500 }}>{dateLine}</div>
        <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--muted)' }}>{dayPart}, Chris — {odCount} overdue, {tdCount} due today.</div>
      </div>

      <QuickAddCard variant="today" />

      {sweepOn && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderLeft: '4px solid var(--amber)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800 }}>End of day</span>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{sweepRaw.length} {sweepRaw.length === 1 ? 'task' : 'tasks'} still open today — snooze to tomorrow?</span>
            <span onClick={markSweepDone} tabIndex={0} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer' }}>Not now</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
            {sweepRaw.map(t => {
              const inc = !sweepExcluded[t.id];
              return (
                <div key={t.id} onClick={() => setSweepExcluded(s => ({ ...s, [t.id]: !s[t.id] }))} tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', cursor: 'pointer' }}>
                  <span style={{ width: 15, height: 15, border: '1.5px solid ' + (inc ? P.green : P.boxBorder), borderRadius: 4, background: inc ? P.green : P.boxBg, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 800, flex: 'none' }}>{inc ? '✓' : ''}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: inc ? P.ink : P.faint }}>{t.name}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            // On Friday (or the weekend) Monday is the sensible landing spot
            const dow = dIso(todayISO).getDay();
            const weekEnd = dow === 5 || dow === 6 || dow === 0;
            const sweepTo = (iso, label) => { sweepIncluded.forEach(t => snoozeTask(t.id, iso, label)); markSweepDone(); showToast(`Snoozed ${sweepIncluded.length} to ${label} — see you then.`); };
            return (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {weekEnd && (
                  <div onClick={() => sweepTo(nextMonISO, 'Monday')} tabIndex={0} className="hover-green-bg" style={{ background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 12.5, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>Snooze {sweepIncluded.length} until Monday</div>
                )}
                <div
                  onClick={() => sweepTo(tomorrowISO, 'tomorrow')}
                  tabIndex={0}
                  className={weekEnd ? 'hover-green' : 'hover-green-bg'}
                  style={weekEnd
                    ? { background: 'var(--card)', color: 'var(--soft)', border: '1px solid var(--line2)', fontWeight: 700, fontSize: 12.5, padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }
                    : { background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 12.5, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}
                >Snooze {sweepIncluded.length} to tomorrow</div>
              </div>
            );
          })()}
        </div>
      )}

      {attention === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: 22, textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', marginBottom: 18 }}>
          Nothing urgent. Radar's below if you want a look around.
        </div>
      )}

      {groups.map(g => (
        <React.Fragment key={g.key}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: g.red ? P.red : 'var(--ink)' }}>{g.label}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{g.count}</span>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid ' + (g.red ? 'var(--red)' : 'var(--line)'), borderRadius: 10, overflow: 'visible', marginBottom: 14 }}>
            {g.raw.map(t => <TaskRow key={t.id} t={t} />)}
          </div>
        </React.Fragment>
      ))}

      {/* Calendar strip */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'stretch', gap: 10 }}>
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 12, borderRight: '1px solid var(--line-soft)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>Calendar</div>
          <div style={{ fontSize: 12, color: 'var(--soft)', fontWeight: 600, marginTop: 2 }}>
            {next ? 'Next: ' + minLabel(next.startMin) : current ? 'Now: ' + current.title : 'Done for today'}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 0 }}>
          {stripDay && stripDay.events.length > 0 ? stripDay.events.map(ev => (
            <div key={ev.id} onClick={() => { setEvId(ev.id); setMenu(null); }} tabIndex={0} style={{ flex: ev.tag === 'UP NEXT' ? 1.3 : 1, border: ev.stripBorder, borderRadius: 8, padding: '8px 10px', background: ev.bg, opacity: ev.opacity, cursor: 'pointer', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: ev.timeColor, fontVariantNumeric: 'tabular-nums' }}>{ev.time}</span>
                {ev.hasTag && <span style={{ fontSize: 10, fontWeight: 800, color: ev.tagColor, background: ev.tagBg, padding: '1px 5px', borderRadius: 4, letterSpacing: '.03em' }}>{ev.tag}</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: ev.titleColor, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.displayTitle}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{ev.locLabel}</span>
                {ev.hasJoin && <a href={ev.joinUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--green)', background: 'var(--green-soft)', padding: '1px 6px', borderRadius: 4 }}>{ev.join} ↗</a>}
              </div>
            </div>
          )) : (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, color: 'var(--muted)', padding: '0 4px' }}>No meetings today — clear day.</div>
          )}
        </div>
        <div onClick={() => setView('calendar')} tabIndex={0} style={{ flex: 'none', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: 'var(--green)', cursor: 'pointer' }}>Week view →</div>
      </div>

      {/* Project Radar */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>Project Radar</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{projects.length} non-complete · drag to reorder · click for detail</div>
        <div onClick={() => setView('projects')} tabIndex={0} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--green)', cursor: 'pointer' }}>Open Projects →</div>
      </div>
      <RadarGrid />
    </div>
  );
}
