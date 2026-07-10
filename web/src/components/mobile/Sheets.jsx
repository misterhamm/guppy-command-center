import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useMob } from './MobileApp.jsx';
import { taskView, eventKind, eventView } from '../../lib/enrich.js';
import { concernDot } from '../../lib/themes.js';
import { findEvent, todayEvents, currentAndNext } from '../../lib/calendar.js';
import { isStale, nextLate, nextDueNow, PRIORITIES, STATUSES, NOTION_URL, titleCase } from '../../lib/logic.js';
import { fmtShort, timeRange } from '../../lib/dates.js';

function Pill({ label, active, onClick, P }) {
  return (
    <span onClick={onClick} tabIndex={0} style={{ fontSize: 12.5, fontWeight: 700, color: active ? '#fff' : P.soft, background: active ? P.green : 'var(--card)', border: '1px solid ' + (active ? P.green : 'var(--line2)'), borderRadius: 99, padding: '9px 13px', cursor: 'pointer' }}>{label}</span>
  );
}

function Kicker({ children, mt = 0 }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 5, marginTop: mt }}>{children}</div>;
}

export default function Sheets() {
  const store = useStore();
  const { P, tasks, projects, calendar, clients, todayISO, nowMin, tomorrowISO, nextMonISO, nextWeekISO, toggleTask, snoozeTask, saveTask, qa, qaSet, qaAdd, qaPrefill, effectiveQa, guppyMsgs, guppySend, guppyBusy } = store;
  const { stack, push, pop, closeAll, dr, setDr, drSync, setDrSync, openTaskSheet } = useMob();

  const [guppyInput, setGuppyInput] = useState('');
  const guppyScroll = useRef(null);
  const notesRef = useRef(null);

  const top = stack.length ? stack[stack.length - 1] : null;
  const below = stack.length > 1 ? stack[stack.length - 2] : null;

  useEffect(() => {
    if (guppyScroll.current) guppyScroll.current.scrollTop = guppyScroll.current.scrollHeight;
  }, [guppyMsgs, top]);

  if (!top) return null;

  const label = item => {
    if (!item) return '';
    if (item.type === 'task') return 'Edit task';
    if (item.type === 'actions') return 'Quick actions';
    if (item.type === 'qa') return 'Add task';
    if (item.type === 'guppy') return 'Guppy';
    if (item.type === 'event') { const e = findEvent(calendar, item.id); return e ? e.title.replace(/^\s*\[?placeholder\]?\s*[:\-]?\s*/i, '') : 'Event'; }
    if (item.type === 'project') { const p = projects.find(x => x.id === item.id); return p ? p.name : 'Project'; }
    return '';
  };

  const set = patch => setDr(cur => ({ ...cur, ...patch }));

  // ---- per-type content ----
  let content = null;

  if (top.type === 'actions') {
    const t = tasks.find(x => x.id === top.id);
    if (!t) return null;
    content = (
      <>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, lineHeight: 1.35 }}>{t.name}</div>
        <div onClick={() => { toggleTask(t.id); pop(); }} tabIndex={0} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--green)', color: '#fff', fontWeight: 800, fontSize: 14, padding: '13px 16px', borderRadius: 10, cursor: 'pointer', marginBottom: 10 }}>
          <span>✓</span>{t.done ? 'Mark not done' : 'Mark done'}
        </div>
        <Kicker>SNOOZE TO</Kicker>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {[{ label: 'Tomorrow', iso: tomorrowISO }, { label: 'Next Mon', iso: nextMonISO }, { label: 'Next week', iso: nextWeekISO }].map(o => (
            <span key={o.label} onClick={() => { snoozeTask(t.id, o.iso, o.label); pop(); }} tabIndex={0} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 99, padding: '9px 14px', cursor: 'pointer' }}>{o.label}</span>
          ))}
          <input type="date" onChange={e => { const v = e.target.value; if (v) { snoozeTask(t.id, v, fmtShort(v)); pop(); } }} style={{ fontSize: 12, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 99, padding: '7px 12px', width: 140 }} />
        </div>
        <div onClick={() => { openTaskSheet(t.id, true); setTimeout(() => { if (notesRef.current) notesRef.current.focus(); }, 250); }} tabIndex={0} style={{ border: '1px solid var(--line2)', borderRadius: 10, padding: '12px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--soft)', cursor: 'pointer', marginBottom: 8 }}>✎ Add note</div>
        <div onClick={() => openTaskSheet(t.id, true)} tabIndex={0} style={{ border: '1px solid var(--line2)', borderRadius: 10, padding: '12px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--soft)', cursor: 'pointer' }}>Open full editor</div>
      </>
    );
  }

  if (top.type === 'task' && dr) {
    const cat = dr.personal ? 'Personal' : 'Work';
    const dueChoices = [
      { label: 'Today', iso: todayISO }, { label: 'Tomorrow', iso: tomorrowISO }, { label: 'Next Mon', iso: nextMonISO }, { label: 'None', iso: '' }
    ];
    const save = async () => {
      if (drSync === 'saving') return;
      setDrSync('saving');
      const result = await saveTask(dr);
      setDrSync(result);
      if (result === 'saved') setTimeout(() => { pop(); setDrSync('idle'); }, 650);
    };
    const syncDot = drSync === 'saving' ? P.amber : drSync === 'saved' ? P.green : drSync === 'failed' ? P.red : P.boxBorder;
    const syncLabel = drSync === 'saving' ? 'Saving to Notion…' : drSync === 'saved' ? 'Saved to Notion ✓' : drSync === 'failed' ? 'Save failed — nothing written.' : 'Saves to Notion';
    content = (
      <>
        <Kicker>TASK NAME</Kicker>
        <input value={dr.name} onChange={e => set({ name: e.target.value })} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '11px 12px', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 14, outlineColor: 'var(--green)', background: 'var(--card-alt)' }} />
        <Kicker>STATUS</Kicker>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {STATUSES.map(s => <Pill key={s} label={s} active={s === dr.status} P={P} onClick={() => set({ status: s, done: s === 'Done' })} />)}
        </div>
        <Kicker>PRIORITY</Kicker>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRIORITIES.map(p => <Pill key={p} label={p} active={p === titleCase(dr.priority || '')} P={P} onClick={() => set({ priority: p.toUpperCase() })} />)}
        </div>
        <Kicker>DUE</Kicker>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          {dueChoices.map(o => <Pill key={o.label} label={o.label} active={(dr.dueISO || '') === o.iso} P={P} onClick={() => set({ dueISO: o.iso })} />)}
          <input type="date" value={dr.dueISO && !dueChoices.some(o => o.iso === dr.dueISO) ? dr.dueISO : ''} onChange={e => { const v = e.target.value; if (v) set({ dueISO: v }); }} style={{ fontSize: 12, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 99, padding: '7px 12px', width: 140 }} />
        </div>
        <Kicker>CATEGORY</Kicker>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {['Work', 'Personal'].map(c => <Pill key={c} label={c} active={c === cat} P={P} onClick={() => set({ personal: c === 'Personal' })} />)}
        </div>
        {!dr.personal && (
          <>
            <Kicker>CLIENT <span style={{ color: 'var(--red)' }}>*</span></Kicker>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {Object.keys(clients).map(c => <Pill key={c} label={c} active={c === dr.client} P={P} onClick={() => set({ client: c, project: '' })} />)}
            </div>
            <Kicker>PROJECT</Kicker>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {['None', ...(clients[dr.client] || [])].map(p => <Pill key={p} label={p} active={p === (dr.project || 'None')} P={P} onClick={() => set({ project: p === 'None' ? '' : p })} />)}
            </div>
          </>
        )}
        <Kicker>NOTES</Kicker>
        <textarea ref={notesRef} value={dr.notes || ''} onChange={e => set({ notes: e.target.value })} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: 'var(--soft)', minHeight: 64, marginBottom: 16, lineHeight: 1.45, resize: 'vertical', outlineColor: 'var(--green)', background: 'var(--card-alt)' }} />
        {drSync === 'failed' && (
          <div style={{ border: '1px solid var(--red)', background: 'var(--red-soft)', borderRadius: 10, padding: '10px 13px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--red)', flex: 1 }}>Couldn't reach Notion.</span>
            <span onClick={save} tabIndex={0} style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', background: 'var(--red)', padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>Retry</span>
            <span onClick={() => { const orig = tasks.find(x => x.id === dr.id); if (orig) setDr({ ...orig }); setDrSync('idle'); }} tabIndex={0} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--soft)', cursor: 'pointer' }}>Revert</span>
          </div>
        )}
        <div onClick={save} tabIndex={0} style={{ background: 'var(--green)', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 14, padding: '13px 0', borderRadius: 10, cursor: 'pointer' }}>
          {drSync === 'saving' ? 'Saving…' : drSync === 'saved' ? 'Saved ✓' : 'Save'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: syncDot }} />{syncLabel}
          <span style={{ flex: 1 }} />
          <a href={NOTION_URL} target="_blank" rel="noreferrer" style={{ fontWeight: 700, fontSize: 11.5 }}>Open in Notion ↗</a>
        </div>
      </>
    );
  }

  if (top.type === 'project') {
    const p = projects.find(x => x.id === top.id);
    if (!p) return null;
    const st = P.STATUS[p.status] || P.STATUS.Active;
    const rel = tasks.filter(t => t.project === p.name && (!t.done || t.justDone));
    const stale = isStale(p, todayISO);
    content = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 5 }}>{st.word}</span>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{p.client}</span>
          <a href={NOTION_URL} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700 }}>Open in Notion ↗</a>
        </div>
        <div style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em', marginTop: 14 }}>CURRENT CONCERNS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
          {(p.concerns || []).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.45 }}>
              <span style={{ color: concernDot(c.tone, P), fontWeight: 800, flex: 'none' }}>•</span><span>{c.text}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--soft)', marginTop: 12, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em' }}>CURRENT STATUS</span><br />{p.statusText}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14, padding: '11px 12px', background: 'var(--card-alt)', borderRadius: 10 }}>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>CADENCE</div><div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{p.cadence}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>LAST</div><div style={{ fontSize: 12.5, fontWeight: 700, color: stale ? P.creamText : 'var(--ink)', marginTop: 1 }}>{fmtShort(p.lastISO)}{stale ? ' · stale' : ''}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>NEXT</div><div style={{ fontSize: 12.5, fontWeight: 700, color: (nextLate(p, todayISO) || nextDueNow(p, todayISO)) ? P.red : 'var(--ink)', marginTop: 1 }}>{fmtShort(p.nextISO)}{nextDueNow(p, todayISO) ? ' (today)' : ''}</div></div>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em', marginTop: 14, marginBottom: 2 }}>RELATED TASKS · {rel.length}</div>
        {rel.map(t => {
          const v = taskView(t, P, todayISO);
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--line-soft)', minHeight: 44 }}>
              <span onClick={() => toggleTask(t.id)} tabIndex={0} style={{ width: 44, height: 44, margin: '-10px -12px', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}>
                <span style={{ width: 20, height: 20, border: '1.5px solid ' + v.boxBorder, borderRadius: 6, background: v.boxBg, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>{v.check}</span>
              </span>
              <span onClick={() => openTaskSheet(t.id)} tabIndex={0} style={{ fontSize: 13.5, fontWeight: 600, color: v.nameColor, flex: 1, textDecoration: v.strike, cursor: 'pointer' }}>{t.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: v.dueColor }}>{v.dueDisplay}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>›</span>
            </div>
          );
        })}
        {rel.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '10px 0', borderTop: '1px solid var(--line-soft)' }}>No open tasks on this project.</div>}
        <div onClick={() => { qaPrefill({ client: p.client, project: p.name }); closeAll(); push({ type: 'qa' }); }} tabIndex={0} style={{ marginTop: 14, border: '1.5px dashed var(--green)', borderRadius: 10, padding: '11px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--green)', cursor: 'pointer', opacity: 0.9 }}>+ Add task to this project</div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--muted)' }}>Read-only — edit project details in Notion. Tasks above are live.</div>
      </>
    );
  }

  if (top.type === 'event') {
    const ev = findEvent(calendar, top.id);
    if (!ev) return null;
    const { next } = currentAndNext(todayEvents(calendar, todayISO), nowMin);
    const kind = eventKind(ev, ev.dayISO, todayISO, nowMin, next && next.id === ev.id);
    const v = eventView(ev, kind, P);
    content = (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{ev.dayLabel} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{timeRange(ev.startMin, ev.endMin)}</span></span>
          {v.hasTag && <span style={{ fontSize: 10, fontWeight: 800, color: v.tagColor, background: v.tagBg, padding: '2px 7px', borderRadius: 4, letterSpacing: '.03em' }}>{v.tag}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14, padding: '11px 12px', background: 'var(--card-alt)', borderRadius: 10 }}>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>WHERE</div><div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{ev.location || 'None — blocked time'}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>CLIENT · PROJECT</div><div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{ev.project ? ev.client + ' · ' + ev.project : (ev.client || 'Internal')}</div></div>
        </div>
        {!!ev.join && kind !== 'past' && (
          <a href={v.joinUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 12, background: 'var(--green)', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 14, padding: '12px 0', borderRadius: 10 }}>Join {ev.join} ↗</a>
        )}
        <div style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em', marginTop: 14 }}>ATTENDEES · {(ev.attendees || []).length}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {(ev.attendees || []).map((a, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', background: 'var(--panel)', padding: '4px 10px', borderRadius: 99 }}>{a}</span>
          ))}
        </div>
        <div style={{ fontWeight: 800, color: 'var(--muted)', fontSize: 10.5, letterSpacing: '.04em', marginTop: 14 }}>AGENDA</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5, marginTop: 4 }}>{ev.agenda}</div>
        <div onClick={() => { qaPrefill({ client: ev.client || '', project: ev.project || '' }); closeAll(); push({ type: 'qa' }); }} tabIndex={0} style={{ marginTop: 14, border: '1.5px dashed var(--green)', borderRadius: 10, padding: '11px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--green)', cursor: 'pointer', opacity: 0.9 }}>+ Add task from this meeting</div>
        {!!ev.project && (
          <div onClick={() => { const p = projects.find(x => x.name === ev.project); if (p) push({ type: 'project', id: p.id }); }} tabIndex={0} style={{ marginTop: 8, border: '1px solid var(--line2)', borderRadius: 10, padding: '11px 12px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--green)', cursor: 'pointer' }}>Open project: {ev.project} →</div>
        )}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--muted)' }}>Read-only — synced from Google Calendar.</div>
      </>
    );
  }

  if (top.type === 'qa') {
    const eff = effectiveQa();
    const isWork = qa.category === 'Work';
    const qaProjects = eff.client ? (clients[eff.client] || []) : [];
    const dueOpts = [
      { label: 'Today', iso: todayISO }, { label: 'Tomorrow', iso: tomorrowISO }, { label: 'Next Mon', iso: nextMonISO }
    ];
    const hint = qa.error ? (eff.name.trim() ? 'Pick a client — required for Work tasks.' : 'Give it a name first.') : 'Status starts as Not Started · saves to Notion';
    content = (
      <>
        <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: 9, padding: 2, marginBottom: 14 }}>
          <div onClick={() => qaSet({ category: 'Work' })} tabIndex={0} style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 7, background: isWork ? 'var(--card)' : 'transparent', fontSize: 13, fontWeight: 700, color: isWork ? 'var(--ink)' : 'var(--faint)', cursor: 'pointer', boxShadow: isWork ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>Work</div>
          <div onClick={() => qaSet({ category: 'Personal' })} tabIndex={0} style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 7, background: !isWork ? P.lavBg : 'transparent', fontSize: 13, fontWeight: 700, color: !isWork ? P.lavText : 'var(--faint)', cursor: 'pointer', boxShadow: !isWork ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>Personal</div>
        </div>
        <input placeholder="What needs doing?  (try: borax sitemap fri asap)" value={qa.name} onChange={e => qaSet({ name: e.target.value, error: false })} style={{ width: '100%', border: '1.5px solid ' + (qa.error && !eff.name.trim() ? 'var(--red)' : 'var(--line2)'), borderRadius: 10, padding: 12, fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, outline: 'none', background: 'var(--card-alt)' }} />
        {eff.parsed.detected.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--muted)' }}>Detected:
            {eff.parsed.detected.map((d, i) => <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'var(--green-soft)', padding: '2px 8px', borderRadius: 99 }}>{d}</span>)}
          </div>
        )}
        {isWork && (
          <>
            <Kicker>CLIENT <span style={{ color: 'var(--red)' }}>*</span></Kicker>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {Object.keys(clients).map(c => <Pill key={c} label={c} active={c === eff.client} P={P} onClick={() => qaSet({ client: c, project: '', error: false })} />)}
            </div>
            {qaProjects.length > 0 && (
              <>
                <Kicker>PROJECT</Kicker>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {qaProjects.map(p => <Pill key={p} label={p} active={p === eff.project} P={P} onClick={() => qaSet({ project: p })} />)}
                </div>
              </>
            )}
          </>
        )}
        <Kicker>DUE</Kicker>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          {dueOpts.map(o => <Pill key={o.label} label={o.label} active={eff.dueISO === o.iso} P={P} onClick={() => qaSet({ dueISO: qa.dueISO === o.iso ? '' : o.iso })} />)}
          <input type="date" value={qa.dueISO && !dueOpts.some(o => o.iso === qa.dueISO) ? qa.dueISO : ''} onChange={e => qaSet({ dueISO: e.target.value || '' })} style={{ fontSize: 12, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 99, padding: '7px 12px', width: 140 }} />
        </div>
        <Kicker>PRIORITY</Kicker>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PRIORITIES.map(p => <Pill key={p} label={p} active={p === eff.priority} P={P} onClick={() => qaSet({ priority: p })} />)}
        </div>
        <div onClick={() => qaSet({ noteOpen: !qa.noteOpen })} tabIndex={0} style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', marginBottom: 10 }}>{qa.noteOpen ? '– Hide note' : '+ Add note'}</div>
        {qa.noteOpen && (
          <textarea placeholder="Notes (optional)" value={qa.notes} onChange={e => qaSet({ notes: e.target.value })} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: 'var(--soft)', minHeight: 56, marginBottom: 14, lineHeight: 1.45, resize: 'vertical', outlineColor: 'var(--green)', background: 'var(--card-alt)' }} />
        )}
        <div onClick={() => { if (qaAdd()) pop(); }} tabIndex={0} style={{ background: 'var(--green)', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 14, padding: '13px 0', borderRadius: 10, cursor: 'pointer' }}>Add task</div>
        <div style={{ fontSize: 11.5, color: qa.error ? P.red : 'var(--muted)', marginTop: 10, textAlign: 'center' }}>{hint}</div>
      </>
    );
  }

  if (top.type === 'guppy') {
    const msgs = guppyMsgs.length ? guppyMsgs : [{ mine: false, text: 'Morning! Ask me about any client, project, or what’s on your plate — or paste meeting notes and I’ll draft tasks for you to approve.' }];
    const send = text => {
      const msg = (text != null ? text : guppyInput).trim();
      if (!msg) return;
      setGuppyInput('');
      guppySend(msg);
    };
    content = (
      <>
        <div ref={guppyScroll} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--card-alt)', borderRadius: 12, padding: 14, minHeight: 340, maxHeight: '48vh', overflowY: 'auto', marginBottom: 12 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', background: m.mine ? P.green : 'var(--card)', color: m.mine ? '#fff' : P.ink, fontSize: 13.5, padding: '10px 13px', borderRadius: m.mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px', maxWidth: '88%', lineHeight: 1.5, border: m.mine ? 'none' : '1px solid var(--line)' }}>{m.text}</div>
          ))}
          {guppyBusy && <div style={{ alignSelf: 'flex-start', background: 'var(--card)', color: 'var(--muted)', fontSize: 13.5, padding: '10px 13px', borderRadius: '12px 12px 12px 3px', border: '1px solid var(--line)' }}>…</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {['What do I have on Borax?', 'Summarize my week', 'Turn meeting notes into tasks'].map(c => (
            <span key={c} onClick={() => send(c)} tabIndex={0} style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', border: '1px solid var(--line2)', borderRadius: 99, padding: '7px 12px', cursor: 'pointer' }}>{c}</span>
          ))}
        </div>
        <div style={{ border: '1px solid var(--line2)', borderRadius: 11, padding: '6px 6px 6px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card-alt)' }}>
          <input placeholder="Ask Guppy…" value={guppyInput} onChange={e => setGuppyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13.5, background: 'transparent', color: 'var(--ink)' }} />
          <div onClick={() => send()} tabIndex={0} style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>↑</div>
        </div>
      </>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
      <div onClick={closeAll} style={{ position: 'absolute', inset: 0, background: 'rgba(18,16,12,.42)' }} />
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', background: 'var(--card)', borderRadius: '20px 20px 0 0', animation: 'sheetUp .22s ease', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 'none', display: 'grid', placeItems: 'center', padding: '8px 0 2px' }}>
          <span style={{ width: 38, height: 4.5, borderRadius: 99, background: 'var(--box-border)' }} />
        </div>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px 10px', borderBottom: '1px solid var(--line-soft)' }}>
          {stack.length > 1 && (
            <span onClick={pop} tabIndex={0} style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', cursor: 'pointer', padding: '4px 6px 4px 0', whiteSpace: 'nowrap' }}>← {label(below)}</span>
          )}
          <span style={{ fontSize: 15, fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(top)}</span>
          <span onClick={closeAll} tabIndex={0} style={{ color: 'var(--muted)', fontSize: 16, cursor: 'pointer', padding: '4px 6px' }}>✕</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px calc(26px + env(safe-area-inset-bottom, 0px))' }}>
          {content}
        </div>
      </div>
    </div>
  );
}
