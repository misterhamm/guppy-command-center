import React from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { findEvent, currentAndNext, todayEvents } from '../../lib/calendar.js';
import { eventKind, eventView } from '../../lib/enrich.js';

export default function EventPopover() {
  const { calendar, todayISO, nowMin, P, projects, qaPrefill, setView } = useStore();
  const { evId, setEvId, setExpId, setQaOpen } = useDesk();
  const ev = findEvent(calendar, evId);
  if (!ev) return null;

  const { next } = currentAndNext(todayEvents(calendar, todayISO), nowMin);
  const kind = eventKind(ev, ev.dayISO, todayISO, nowMin, next && next.id === ev.id);
  const v = eventView(ev, kind, P);
  const rail = v.rail !== 'transparent' ? v.rail : (v.past ? P.faint : P.green);

  return (
    <div onClick={() => setEvId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(18,16,12,.34)', zIndex: 80, display: 'grid', placeItems: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, maxHeight: '82vh', overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--line2)', borderLeft: '4px solid ' + rail, borderRadius: 12, padding: '16px 18px', boxShadow: '0 18px 50px var(--shadow-deep)', animation: 'popIn .15s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>{v.displayTitle}</span>
          {v.hasTag && <span style={{ fontSize: 10, fontWeight: 800, color: v.tagColor, background: v.tagBg, padding: '2px 7px', borderRadius: 4, letterSpacing: '.03em' }}>{v.tag}</span>}
          <span onClick={() => setEvId(null)} tabIndex={0} style={{ color: 'var(--muted)', fontSize: 15, padding: '2px 6px', cursor: 'pointer' }}>✕</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>
          {ev.dayLabel} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v.time}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, padding: '10px 12px', background: 'var(--card-alt)', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>WHERE</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{ev.location || 'None — blocked time'}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>CLIENT · PROJECT</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{ev.project ? ev.client + ' · ' + ev.project : (ev.client || 'Internal')}</div>
          </div>
        </div>

        {!!ev.join && !v.past && (
          <a href={v.joinUrl} target="_blank" rel="noreferrer" className="hover-green-bg" style={{ display: 'block', marginTop: 10, background: 'var(--green)', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '9px 0', borderRadius: 8 }}>Join {ev.join} ↗</a>
        )}

        <div style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em', marginTop: 12 }}>ATTENDEES · {(ev.attendees || []).length}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
          {(ev.attendees || []).map((a, i) => (
            <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--soft)', background: 'var(--panel)', padding: '3px 9px', borderRadius: 99 }}>{a}</span>
          ))}
        </div>

        <div style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em', marginTop: 12 }}>AGENDA</div>
        <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, marginTop: 3 }}>{ev.agenda}</div>

        <div
          onClick={() => { setEvId(null); qaPrefill({ client: ev.client || '', project: ev.project || '' }); setView('today'); setQaOpen(true); setTimeout(() => { const el = document.querySelector('[data-cc-qa]'); if (el) el.focus(); }, 60); }}
          tabIndex={0}
          className="hover-green-soft"
          style={{ marginTop: 12, border: '1.5px dashed var(--green)', borderRadius: 8, padding: '8px 0', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--green)', cursor: 'pointer', opacity: 0.9 }}
        >+ Add task from this meeting</div>

        {!!ev.project && (
          <div
            onClick={() => { const p = projects.find(x => x.name === ev.project); if (p) { setEvId(null); setExpId(p.id); } }}
            tabIndex={0}
            className="hover-green-soft"
            style={{ marginTop: 8, border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 12px', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--green)', cursor: 'pointer' }}
          >Open project: {ev.project} →</div>
        )}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--muted)' }}>Read-only — synced from Google Calendar.</div>
      </div>
    </div>
  );
}
