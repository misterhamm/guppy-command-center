import React from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';

function Menu({ open, options, current, onPick, minWidth = 170, right }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', top: 36, [right ? 'right' : 'left']: 0, zIndex: 40, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 9, boxShadow: '0 8px 24px var(--shadow)', padding: 4, minWidth, animation: 'popIn .12s ease' }}>
      {options.map(o => (
        <div key={o} onClick={e => { e.stopPropagation(); onPick(o); }} className="hover-panel" style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: o === current ? 800 : 500, color: 'var(--ink)', cursor: 'pointer' }}>{o}</div>
      ))}
    </div>
  );
}

// Full Quick Add (Today) and the compact To-do variant.
export default function QuickAddCard({ variant = 'today' }) {
  const store = useStore();
  const { qa, qaSet, qaAdd, effectiveQa, clients, todayISO, tomorrowISO, nextMonISO, P } = store;
  const { menu, setMenu, qaOpen, setQaOpen, setTodoQaOpen } = useDesk();
  const eff = effectiveQa();
  const isWork = qa.category === 'Work';
  const qaProjects = eff.client ? (clients[eff.client] || []) : [];
  const dueOpts = [
    { label: 'Today', iso: todayISO },
    { label: 'Tomorrow', iso: tomorrowISO },
    { label: 'Next Mon', iso: nextMonISO }
  ];
  const hint = qa.error
    ? (eff.name.trim() ? 'Pick a client — required for Work tasks.' : 'Give it a name first.')
    : 'Status starts as Not Started · saves to Notion';
  const hintColor = qa.error ? P.red : 'var(--muted)';
  const submit = () => { if (qaAdd()) { setQaOpen(false); setTodoQaOpen(false); } };

  const toggle = (
    <div style={{ display: 'flex', background: 'var(--panel)', borderRadius: 7, padding: 2, flex: 'none' }}>
      <div onClick={e => { e.stopPropagation(); qaSet({ category: 'Work' }); }} tabIndex={0} style={{ padding: '5px 12px', borderRadius: 6, background: isWork ? 'var(--card)' : 'transparent', fontSize: 12.5, fontWeight: 700, color: isWork ? 'var(--ink)' : 'var(--faint)', cursor: 'pointer', boxShadow: isWork ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>Work</div>
      <div onClick={e => { e.stopPropagation(); qaSet({ category: 'Personal' }); }} tabIndex={0} style={{ padding: '5px 12px', borderRadius: 6, background: !isWork ? P.lavBg : 'transparent', fontSize: 12.5, fontWeight: 700, color: !isWork ? P.lavText : 'var(--faint)', cursor: 'pointer', boxShadow: !isWork ? '0 1px 2px rgba(0,0,0,.08)' : 'none' }}>Personal</div>
    </div>
  );

  const clientPicker = (right) => (
    <div style={{ position: 'relative' }}>
      <div onClick={e => { e.stopPropagation(); setMenu(m => (m === 'qaClient' ? null : 'qaClient')); }} tabIndex={0} style={{ border: '1px solid ' + (qa.error && isWork && !eff.client ? 'var(--red)' : 'var(--line2)'), borderRadius: 8, padding: '7px 10px', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center', background: 'var(--card)', cursor: 'pointer' }}>
        {!right && <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Client<span style={{ color: 'var(--red)' }}>*</span></span>}
        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{eff.client || 'Choose…'} ▾</span>
      </div>
      <Menu open={menu === 'qaClient'} options={Object.keys(clients)} current={eff.client} right={right} onPick={c => { qaSet({ client: c, project: '', error: false }); setMenu(null); }} />
    </div>
  );

  if (variant === 'todo') {
    return (
      <div style={{ background: 'var(--card)', border: '1.5px solid var(--green)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {toggle}
          <input
            placeholder="Add a task…"
            value={qa.name}
            onChange={e => qaSet({ name: e.target.value, error: false })}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setTodoQaOpen(false); }}
            data-cc-qa="1"
            style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', border: 'none', outline: 'none', padding: '6px 4px', background: 'transparent' }}
          />
          {isWork && clientPicker(true)}
          <div onClick={submit} tabIndex={0} className="hover-green-bg" style={{ flex: 'none', background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Add</div>
        </div>
        <div style={{ fontSize: 11.5, color: hintColor, marginTop: 8 }}>{hint}</div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--card)', border: '1.5px solid ' + (qaOpen ? 'var(--green)' : 'var(--line)'), borderRadius: 10, padding: '10px 12px', marginBottom: 18, boxShadow: '0 1px 2px var(--line-soft)' }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {toggle}
        <input
          placeholder="Add a task…  (try: borax sitemap fri asap)"
          value={qa.name}
          onChange={e => qaSet({ name: e.target.value, error: false })}
          onFocus={() => setQaOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setQaOpen(false); }}
          data-cc-qa="1"
          style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', border: 'none', outline: 'none', padding: '6px 4px', background: 'transparent' }}
        />
        <div onClick={submit} tabIndex={0} className="hover-green-bg" style={{ flex: 'none', background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Add task</div>
      </div>

      {qaOpen && (
        <>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {isWork && (
              <>
                {clientPicker(false)}
                <div style={{ position: 'relative' }}>
                  <div onClick={e => { e.stopPropagation(); setMenu(m => (m === 'qaProject' ? null : 'qaProject')); }} tabIndex={0} style={{ border: '1.5px dashed var(--green)', borderRadius: 8, padding: '6.5px 10px', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center', background: 'var(--green-soft)', cursor: 'pointer', opacity: 0.9 }}>
                    <span style={{ color: 'var(--green)', fontWeight: 700 }}>{eff.project || '+ Link a project'}</span>
                    <span style={{ color: 'var(--green)' }}>▾</span>
                  </div>
                  <Menu open={menu === 'qaProject'} options={qaProjects.length ? qaProjects : ['— pick a client first —']} current={eff.project} onPick={p => { if (qaProjects.length) qaSet({ project: p }); setMenu(null); }} />
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {dueOpts.map(o => {
                const active = eff.dueISO === o.iso;
                return (
                  <div key={o.label} onClick={() => qaSet({ dueISO: qa.dueISO === o.iso ? '' : o.iso })} tabIndex={0} style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : P.soft, background: active ? P.green : 'var(--card)', border: '1px solid ' + (active ? P.green : 'var(--line2)'), borderRadius: 99, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>{o.label}</div>
                );
              })}
              <input
                type="date"
                value={qa.dueISO && !dueOpts.some(o => o.iso === qa.dueISO) ? qa.dueISO : ''}
                onChange={e => qaSet({ dueISO: e.target.value || '' })}
                title="Pick a date"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 99, padding: '5px 10px', cursor: 'pointer', width: 132 }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <div onClick={e => { e.stopPropagation(); setMenu(m => (m === 'qaPriority' ? null : 'qaPriority')); }} tabIndex={0} style={{ border: '1px solid var(--line2)', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center', background: 'var(--card)', cursor: 'pointer' }}>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Priority</span>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{eff.priority} ▾</span>
              </div>
              <Menu open={menu === 'qaPriority'} options={['ASAP', 'High', 'Now', 'Soon', 'Someday']} current={eff.priority} minWidth={120} onPick={p => { qaSet({ priority: p }); setMenu(null); }} />
            </div>
            <div onClick={e => { e.stopPropagation(); qaSet({ noteOpen: !qa.noteOpen }); }} tabIndex={0} className="hover-text-green" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', padding: '7px 8px', cursor: 'pointer', borderRadius: 6 }}>{qa.noteOpen ? '– Hide note' : '+ Add note'}</div>
          </div>

          {qa.noteOpen && (
            <textarea placeholder="Notes (optional)" value={qa.notes} onChange={e => qaSet({ notes: e.target.value })} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: 'var(--soft)', minHeight: 52, marginTop: 10, lineHeight: 1.45, resize: 'vertical', outlineColor: 'var(--green)', background: 'var(--card)' }} />
          )}

          {eff.parsed.detected.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
              Detected:
              {eff.parsed.detected.map((d, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'var(--green-soft)', padding: '2px 8px', borderRadius: 99 }}>{d}</span>
              ))}
              <span style={{ color: 'var(--muted)' }}>— applied on add; adjust chips to override.</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11 }}>
            <div style={{ fontSize: 11.5, color: hintColor }}>{hint}</div>
            <div onClick={() => { setQaOpen(false); qaSet({ error: false }); setMenu(null); }} tabIndex={0} style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', padding: '7px 10px', cursor: 'pointer' }}>Cancel</div>
            <div onClick={submit} tabIndex={0} className="hover-green-bg" style={{ background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 18px', borderRadius: 8, cursor: 'pointer' }}>Add task ⏎</div>
          </div>
        </>
      )}
    </div>
  );
}
