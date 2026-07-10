import React, { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useMob } from './MobileApp.jsx';
import { dayViews } from '../../lib/calendar.js';

export default function MobileCalendar() {
  const { calendar, todayISO, nowMin, P } = useStore();
  const { push } = useMob();
  const [week, setWeek] = useState('this');
  const days = dayViews(calendar[week], todayISO, nowMin, P);

  const tab = (key, label) => {
    const active = week === key;
    return (
      <div onClick={() => setWeek(key)} tabIndex={0} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 7, background: active ? 'var(--card)' : 'transparent', fontSize: 12.5, fontWeight: 700, color: active ? 'var(--ink)' : 'var(--faint)', cursor: 'pointer', boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>{label}</div>
    );
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2px 16px calc(96px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: 9, padding: 2, margin: '6px 0 14px' }}>
        {tab('this', 'This week')}
        {tab('next', 'Next week')}
      </div>

      {days.map(day => (
        <React.Fragment key={day.iso}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.05em', color: day.labelColor }}>{day.label}</span>
            {day.isToday && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', background: 'var(--green)', padding: '1px 6px', borderRadius: 4, letterSpacing: '.04em' }}>TODAY</span>}
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
            {day.empty && <div style={{ padding: '13px 14px', fontSize: 12.5, color: 'var(--muted)' }}>No meetings — clear day.</div>}
            {day.events.map(ev => (
              <div key={ev.id} onClick={() => push({ type: 'event', id: ev.id })} tabIndex={0} style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--line-soft)', minHeight: 48, opacity: ev.opacity, background: ev.bg, borderLeft: '3px solid ' + ev.rail, cursor: 'pointer', alignItems: 'center' }}>
                <div style={{ width: 78, flex: 'none', fontSize: 12, fontWeight: 700, color: ev.timeColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>{ev.time}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: ev.titleColor, lineHeight: 1.3 }}>{ev.displayTitle}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ev.locLabel}</span>
                    {ev.hasJoin && <a href={ev.joinUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)', background: 'var(--green-soft)', padding: '1px 5px', borderRadius: 4 }}>{ev.join} ↗</a>}
                  </div>
                </div>
                {ev.hasTag && <div style={{ fontSize: 9.5, fontWeight: 800, color: ev.tagColor, background: ev.tagBg, padding: '2px 6px', borderRadius: 4, flex: 'none' }}>{ev.tag}</div>}
                <div style={{ fontSize: 13, color: 'var(--muted)', flex: 'none' }}>›</div>
              </div>
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
