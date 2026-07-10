import React, { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { dayViews } from '../../lib/calendar.js';
import { GCAL_URL } from '../../lib/logic.js';

export default function CalendarView() {
  const { calendar, todayISO, nowMin, P } = useStore();
  const { setEvId } = useDesk();
  const [week, setWeek] = useState('this');
  const days = dayViews(calendar[week], todayISO, nowMin, P);

  const tab = key => ({
    onClick: () => setWeek(key),
    tabIndex: 0,
    style: {
      padding: '6px 16px', borderRadius: 6,
      background: week === key ? 'var(--card)' : 'transparent',
      fontSize: 12.5, fontWeight: 700,
      color: week === key ? 'var(--ink)' : 'var(--faint)',
      cursor: 'pointer',
      boxShadow: week === key ? '0 1px 2px rgba(0,0,0,.08)' : 'none'
    }
  });

  return (
    <div style={{ padding: '22px 26px 90px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Calendar</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Work calendar · read-only · click an event for details</div>
        <a href={GCAL_URL} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700 }}>Open Google Calendar ↗</a>
      </div>

      <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: 8, padding: 2, width: 'fit-content', marginBottom: 16 }}>
        <div {...tab('this')}>This week</div>
        <div {...tab('next')}>Next week</div>
      </div>

      {days.map(day => (
        <React.Fragment key={day.iso}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', color: day.labelColor }}>{day.label}</span>
            {day.isToday && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', background: 'var(--green)', padding: '1px 6px', borderRadius: 4, letterSpacing: '.04em' }}>TODAY</span>}
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, marginBottom: 14, overflow: 'hidden' }}>
            {day.empty && <div style={{ padding: '12px 14px', fontSize: 12.5, color: 'var(--muted)' }}>No meetings — clear day.</div>}
            {day.events.map(ev => (
              <div key={ev.id} onClick={() => setEvId(ev.id)} tabIndex={0} className="hover-dim" style={{ display: 'flex', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', opacity: ev.opacity, background: ev.bg, borderLeft: '3px solid ' + ev.rail, cursor: 'pointer', alignItems: 'center' }}>
                <div style={{ width: 92, flex: 'none', fontSize: 12.5, fontWeight: 700, color: ev.timeColor, fontVariantNumeric: 'tabular-nums' }}>{ev.time}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: ev.titleColor }}>{ev.displayTitle}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{ev.locLabel}</span>
                    {ev.hasJoin && <a href={ev.joinUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--green)', background: 'var(--green-soft)', padding: '1px 6px', borderRadius: 4 }}>{ev.join} ↗</a>}
                  </div>
                </div>
                {ev.hasTag && <div style={{ fontSize: 10, fontWeight: 800, color: ev.tagColor, background: ev.tagBg, padding: '2px 6px', borderRadius: 4, flex: 'none' }}>{ev.tag}</div>}
                <div style={{ fontSize: 13, color: 'var(--muted)', flex: 'none' }}>›</div>
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
