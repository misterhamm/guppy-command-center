import React from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { taskView } from '../../lib/enrich.js';
import { concernDot } from '../../lib/themes.js';
import { isStale, nextLate, nextDueNow, NOTION_URL } from '../../lib/logic.js';
import { fmtShort } from '../../lib/dates.js';

export default function ProjectPopover() {
  const { projects, tasks, P, todayISO, toggleTask, qaPrefill, setView } = useStore();
  const { expId, setExpId, openDrawer, setQaOpen } = useDesk();
  const p = projects.find(x => x.id === expId);
  if (!p) return null;

  const st = P.STATUS[p.status] || P.STATUS.Active;
  const rel = tasks.filter(t => t.project === p.name && (!t.done || t.justDone));
  const stale = isStale(p, todayISO);

  return (
    <div onClick={() => setExpId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(18,16,12,.34)', zIndex: 80, display: 'grid', placeItems: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 460, maxHeight: '82vh', overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--line2)', borderLeft: '4px solid ' + st.rail, borderRadius: 12, padding: '16px 18px', boxShadow: '0 18px 50px var(--shadow-deep)', animation: 'popIn .15s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>{p.name}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 5 }}>{st.word}</span>
          <span onClick={() => setExpId(null)} tabIndex={0} style={{ color: 'var(--muted)', fontSize: 15, padding: '2px 6px', cursor: 'pointer' }}>✕</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>
          {p.client} · <a href={NOTION_URL} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Open in Notion ↗</a>
        </div>

        <div style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em', marginTop: 12 }}>CURRENT CONCERNS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          {(p.concerns || []).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>
              <span style={{ color: concernDot(c.tone, P), fontWeight: 800, flex: 'none' }}>•</span>
              <span>{c.text}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 10, lineHeight: 1.45 }}>
          <span style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em' }}>CURRENT STATUS</span><br />{p.statusText}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12, padding: '10px 12px', background: 'var(--card-alt)', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>CADENCE</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{p.cadence}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>LAST CHECKED</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: stale ? P.creamText : 'var(--ink)', marginTop: 1 }}>{fmtShort(p.lastISO)}{stale ? ' · stale' : ''}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>NEXT CHECK-IN</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: (nextLate(p, todayISO) || nextDueNow(p, todayISO)) ? P.red : 'var(--ink)', marginTop: 1 }}>{fmtShort(p.nextISO)}{nextDueNow(p, todayISO) ? ' (today)' : ''}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 2 }}>RELATED TASKS · {rel.length}</div>
          {rel.map(t => {
            const v = taskView(t, P, todayISO);
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--line-soft)' }}>
                <span onClick={() => toggleTask(t.id)} tabIndex={0} style={{ width: 32, height: 32, margin: -8, display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}>
                  <span style={{ width: 15, height: 15, border: '1.5px solid ' + v.boxBorder, borderRadius: 4, background: v.boxBg, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 800 }}>{v.check}</span>
                </span>
                <span onClick={() => { setExpId(null); openDrawer(t.id); }} tabIndex={0} className="hover-text-green" style={{ fontSize: 12.5, fontWeight: 600, color: v.nameColor, flex: 1, textDecoration: v.strike, cursor: 'pointer' }}>{t.name}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: v.dueColor }}>{v.dueDisplay}</span>
              </div>
            );
          })}
          {rel.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)', padding: '7px 0', borderTop: '1px solid var(--line-soft)' }}>No open tasks on this project.</div>}
        </div>

        <div
          onClick={() => { setExpId(null); qaPrefill({ client: p.client, project: p.name }); setView('today'); setQaOpen(true); setTimeout(() => { const el = document.querySelector('[data-cc-qa]'); if (el) el.focus(); }, 60); }}
          tabIndex={0}
          className="hover-green-soft"
          style={{ marginTop: 12, border: '1.5px dashed var(--green)', borderRadius: 8, padding: '8px 0', textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: 'var(--green)', cursor: 'pointer', opacity: 0.9 }}
        >+ Add task to this project</div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--muted)' }}>
          Read-only — edit project details in Notion. Tasks above are live and checkable.
        </div>
      </div>
    </div>
  );
}
