import React, { useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { taskView } from '../../lib/enrich.js';
import { concernDot } from '../../lib/themes.js';
import { isStale, nextLate, nextDueNow, NOTION_URL, PROJECT_STATUSES } from '../../lib/logic.js';
import { fmtShort } from '../../lib/dates.js';

const EDIT_STATUSES = [...PROJECT_STATUSES, 'Complete'];

export default function ProjectPopover() {
  const { projects, tasks, P, todayISO, toggleTask, qaPrefill, setView, saveProject, showToast, logos, logoFor, uploadLogo } = useStore();
  const { expId, setExpId, openDrawer, setQaOpen } = useDesk();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null); // { status, concernsText, statusText }
  const [sync, setSync] = useState('idle');
  const fileRef = useRef(null);

  const p = projects.find(x => x.id === expId);
  if (!p) return null;

  const st = P.STATUS[p.status] || P.STATUS.Active;
  const rel = tasks.filter(t => t.project === p.name && (!t.done || t.justDone));
  const stale = isStale(p, todayISO);
  const logo = logoFor(p);
  const projectLogo = logos.projects[p.id];

  const startEdit = () => {
    setDraft({ status: p.status, concernsText: (p.concerns || []).map(c => c.text).join('\n'), statusText: p.statusText || '' });
    setSync('idle');
    setEditing(true);
  };
  const save = async () => {
    if (sync === 'saving') return;
    setSync('saving');
    const result = await saveProject({ id: p.id, ...draft });
    setSync(result);
    if (result === 'saved') {
      setEditing(false);
      if (draft.status === 'Complete') { setExpId(null); showToast(p.name + ' marked Complete — off the radar 🎉'); }
      else showToast('Project saved to Notion ✓');
    }
  };
  const pickLogo = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try { await uploadLogo(p.id, file); showToast('Project logo saved to Notion ✓'); }
    catch (err) { showToast("Couldn't save the logo — " + err.message); }
    e.target.value = '';
  };

  const kicker = { fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em' };

  return (
    <div onClick={() => setExpId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(18,16,12,.34)', zIndex: 80, display: 'grid', placeItems: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 460, maxHeight: '82vh', overflowY: 'auto', background: 'var(--card)', border: '1px solid var(--line2)', borderLeft: '4px solid ' + st.rail, borderRadius: 12, padding: '16px 18px', boxShadow: '0 18px 50px var(--shadow-deep)', animation: 'popIn .15s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {logo && <img src={logo} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'contain', flex: 'none', background: 'var(--card-alt)' }} />}
          <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>{p.name}</span>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 5 }}>{st.word}</span>
          <span onClick={() => setExpId(null)} tabIndex={0} style={{ color: 'var(--muted)', fontSize: 15, padding: '2px 6px', cursor: 'pointer' }}>✕</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>
          {p.client} · <a href={NOTION_URL} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Open in Notion ↗</a>
          {!editing && <> · <span onClick={startEdit} tabIndex={0} style={{ color: 'var(--green)', fontWeight: 700, cursor: 'pointer' }}>✎ Edit</span></>}
        </div>

        {editing ? (
          <>
            <div style={{ ...kicker, marginTop: 14, marginBottom: 5 }}>STATUS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {EDIT_STATUSES.map(s => {
                const active = draft.status === s;
                const sp = P.STATUS[s];
                return (
                  <span key={s} onClick={() => setDraft(d => ({ ...d, status: s }))} tabIndex={0} style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : (sp ? sp.rail : P.soft), background: active ? (sp ? sp.rail : P.green) : 'var(--card)', border: '1px solid ' + (active ? (sp ? sp.rail : P.green) : 'var(--line2)'), borderRadius: 99, padding: '6px 12px', cursor: 'pointer' }}>{s}</span>
                );
              })}
            </div>
            <div style={{ ...kicker, marginTop: 14, marginBottom: 4 }}>NEXT CONCERN <span style={{ fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>· one per line</span></div>
            <textarea value={draft.concernsText} onChange={e => setDraft(d => ({ ...d, concernsText: e.target.value }))} placeholder={'Vendor sandbox down — escalate\nContent sign-off needed by Friday'} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: 'var(--ink)', minHeight: 70, lineHeight: 1.5, resize: 'vertical', outlineColor: 'var(--green)', background: 'var(--card-alt)' }} />
            <div style={{ ...kicker, marginTop: 12, marginBottom: 4 }}>CURRENT STATUS</div>
            <textarea value={draft.statusText} onChange={e => setDraft(d => ({ ...d, statusText: e.target.value }))} placeholder="Where things stand, in a sentence or two." style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: 'var(--ink)', minHeight: 56, lineHeight: 1.5, resize: 'vertical', outlineColor: 'var(--green)', background: 'var(--card-alt)' }} />

            <div style={{ ...kicker, marginTop: 12, marginBottom: 5 }}>PROJECT LOGO</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--line2)', background: 'var(--card-alt)', display: 'grid', placeItems: 'center', overflow: 'hidden', flex: 'none' }}>
                {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 14, color: 'var(--faint)', fontWeight: 800 }}>{(p.client || '?')[0]}</span>}
              </div>
              <span onClick={() => fileRef.current && fileRef.current.click()} tabIndex={0} className="hover-green" style={{ fontSize: 12, fontWeight: 700, color: 'var(--soft)', border: '1px solid var(--line2)', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', background: 'var(--card)' }}>{projectLogo ? 'Replace logo' : 'Upload logo'}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{projectLogo ? 'Saved on this project in Notion' : 'Falls back to the ' + (p.client || 'client') + ' company icon'}</span>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" onChange={pickLogo} style={{ display: 'none' }} />
            </div>

            {sync === 'failed' && (
              <div style={{ border: '1px solid var(--red)', background: 'var(--red-soft)', borderRadius: 8, padding: '9px 12px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', flex: 1 }}>Couldn't reach Notion.</span>
                <span onClick={save} tabIndex={0} style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: 'var(--red)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Retry</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
              <div onClick={save} tabIndex={0} className="hover-green-bg" style={{ flex: 1, background: 'var(--green)', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '9px 0', borderRadius: 8, cursor: 'pointer' }}>
                {sync === 'saving' ? 'Saving…' : sync === 'saved' ? 'Saved ✓' : 'Save to Notion'}
              </div>
              <div onClick={() => { setEditing(false); setSync('idle'); }} tabIndex={0} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', padding: '9px 12px', cursor: 'pointer' }}>Cancel</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ ...kicker, marginTop: 12 }}>CURRENT CONCERNS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {(p.concerns || []).map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>
                  <span style={{ color: concernDot(c.tone, P), fontWeight: 800, flex: 'none' }}>•</span>
                  <span>{c.text}</span>
                </div>
              ))}
              {(p.concerns || []).length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>None noted — <span onClick={startEdit} tabIndex={0} style={{ color: 'var(--green)', fontWeight: 700, cursor: 'pointer' }}>add one</span>.</div>}
            </div>

            <div style={{ fontSize: 13, color: 'var(--soft)', marginTop: 10, lineHeight: 1.45 }}>
              <span style={kicker}>CURRENT STATUS</span><br />{p.statusText || <span style={{ color: 'var(--muted)' }}>No status text yet.</span>}
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
              <div style={{ ...kicker, marginBottom: 2 }}>RELATED TASKS · {rel.length}</div>
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
              Status, concerns & status text are editable here — everything else lives in Notion.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
