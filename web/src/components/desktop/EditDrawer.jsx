import React, { useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';
import { dueMeta, fmtShort } from '../../lib/dates.js';
import { PRIORITIES, STATUSES, NOTION_URL, titleCase } from '../../lib/logic.js';

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function Select({ id, value, options, onPick, color, extra }) {
  const { menu, setMenu } = useDesk();
  return (
    <div style={{ position: 'relative' }}>
      <div onClick={e => { e.stopPropagation(); setMenu(m => (m === id ? null : id)); }} tabIndex={0} style={{ border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', color: color || 'var(--ink)' }}>{value} ▾</div>
      {menu === id && (
        <div style={{ position: 'absolute', top: 36, left: 0, zIndex: 70, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 9, boxShadow: '0 8px 24px var(--shadow)', padding: 4, minWidth: 130 }}>
          {options.map(o => (
            <div key={o.label} onClick={e => { e.stopPropagation(); onPick(o); setMenu(null); }} className="hover-panel" style={{ padding: '7px 10px', borderRadius: 6, fontSize: 12.5, fontWeight: o.active ? 800 : 500, cursor: 'pointer' }}>{o.label}</div>
          ))}
          {extra}
        </div>
      )}
    </div>
  );
}

export default function EditDrawer() {
  const { P, todayISO, tomorrowISO, nextMonISO, clients, saveTask, deleteTask } = useStore();
  const { drawerTask: d, setDrawerTask, closeDrawer, setMenu } = useDesk();
  const [sync, setSync] = useState('idle'); // idle | saving | saved | failed
  const [orig] = useState(d);

  const set = patch => setDrawerTask(cur => ({ ...cur, ...patch }));
  const dm = dueMeta(d.dueISO, todayISO);
  const cat = d.personal ? 'Personal' : 'Work';

  const save = async () => {
    if (sync === 'saving') return;
    setSync('saving');
    const result = await saveTask(d);
    setSync(result);
    if (result === 'saved') setTimeout(() => closeDrawer(), 650);
  };

  const dueOpts = [
    { label: 'Today', iso: todayISO },
    { label: 'Tomorrow', iso: tomorrowISO },
    { label: 'Next Mon', iso: nextMonISO },
    { label: 'None', iso: '' }
  ];

  const syncDot = sync === 'saving' ? P.amber : sync === 'saved' ? P.green : sync === 'failed' ? P.red : P.boxBorder;
  const syncLabel = sync === 'saving' ? 'Saving to Notion…' : sync === 'saved' ? 'Saved to Notion ✓' : sync === 'failed' ? 'Save failed — nothing written to Notion.' : 'Saves to Notion';

  return (
    <div
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 340, background: 'var(--card)', borderLeft: '1px solid var(--line2)', boxShadow: '-8px 0 28px var(--shadow)', padding: '18px 20px', zIndex: 85, animation: 'panelIn .18s ease', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, flex: 1 }}>Edit task</span>
        <span onClick={closeDrawer} tabIndex={0} style={{ color: 'var(--muted)', fontSize: 15, cursor: 'pointer', padding: '2px 6px' }}>✕</span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 4 }}>TASK NAME</div>
      <input value={d.name} onChange={e => set({ name: e.target.value })} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 8, padding: '9px 11px', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 12, outlineColor: 'var(--green)', background: 'var(--card-alt)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label="STATUS">
          <Select id="drStatus" value={d.status || 'Not Started'} options={STATUSES.map(s => ({ label: s, active: s === d.status }))} onPick={o => set({ status: o.label, done: o.label === 'Done' })} />
        </Field>
        <Field label="PRIORITY">
          <Select id="drPriority" value={titleCase(d.priority || 'Soon')} options={PRIORITIES.map(p => ({ label: p, active: p === titleCase(d.priority || '') }))} onPick={o => set({ priority: o.label.toUpperCase() })} />
        </Field>
        <Field label="DUE DATE">
          <Select
            id="drDue"
            value={d.dueISO ? dm.label : 'None'}
            color={dm.late > 0 ? P.red : 'var(--ink)'}
            options={dueOpts.map(o => ({ label: o.label, active: (d.dueISO || '') === o.iso, iso: o.iso }))}
            onPick={o => set({ dueISO: o.iso })}
            extra={(
              <div style={{ borderTop: '1px solid var(--line-soft)', margin: '4px 2px 2px', paddingTop: 5 }}>
                <input type="date" onChange={e => { const v = e.target.value; if (v) { set({ dueISO: v }); setMenu(null); } }} style={{ width: '100%', fontSize: 12, color: 'var(--soft)', background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 6px' }} />
              </div>
            )}
          />
        </Field>
        <Field label="CATEGORY">
          <Select id="drCategory" value={cat} options={['Work', 'Personal'].map(c => ({ label: c, active: c === cat }))} onPick={o => set({ personal: o.label === 'Personal' })} />
        </Field>
      </div>

      {!d.personal && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 4 }}>CLIENT <span style={{ color: 'var(--red)' }}>*</span></div>
          <div style={{ marginBottom: 12 }}>
            <Select id="drClient" value={d.client || 'Choose…'} options={Object.keys(clients).map(c => ({ label: c, active: c === d.client }))} onPick={o => set({ client: o.label, project: '' })} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 4 }}>PROJECT</div>
          <div style={{ marginBottom: 12 }}>
            <Select id="drProject" value={d.project || 'None'} color="var(--green)" options={['None', ...(clients[d.client] || [])].map(p => ({ label: p, active: p === (d.project || 'None') }))} onPick={o => set({ project: o.label === 'None' ? '' : o.label })} />
          </div>
        </>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 4 }}>NOTES</div>
      <textarea value={d.notes || ''} onChange={e => set({ notes: e.target.value })} style={{ width: '100%', border: '1px solid var(--line2)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, color: 'var(--soft)', minHeight: 60, marginBottom: 14, lineHeight: 1.45, resize: 'vertical', outlineColor: 'var(--green)', background: 'var(--card-alt)' }} />

      {sync === 'failed' && (
        <div style={{ border: '1px solid var(--red)', background: 'var(--red-soft)', borderRadius: 8, padding: '9px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', flex: 1 }}>Couldn't reach Notion.</span>
          <span onClick={save} tabIndex={0} style={{ fontSize: 12, fontWeight: 800, color: '#fff', background: 'var(--red)', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Retry</span>
          <span onClick={() => { setDrawerTask({ ...orig }); setSync('idle'); }} tabIndex={0} style={{ fontSize: 12, fontWeight: 700, color: 'var(--soft)', cursor: 'pointer' }}>Revert</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div onClick={save} tabIndex={0} className="hover-green-bg" style={{ flex: 1, background: 'var(--green)', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '10px 0', borderRadius: 8, cursor: 'pointer' }}>
          {sync === 'saving' ? 'Saving…' : sync === 'saved' ? 'Saved ✓' : 'Save'}
        </div>
        <div onClick={closeDrawer} tabIndex={0} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', padding: '10px 12px', cursor: 'pointer' }}>Cancel</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: syncDot }} />{syncLabel}
        <span style={{ flex: 1 }} />
        <span style={{ color: 'var(--faint)' }}>⌘⏎ saves</span>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center' }}>
        <a href={NOTION_URL} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700 }}>Open in Notion ↗</a>
        <span
          onClick={() => { closeDrawer(); deleteTask(d.id); }}
          tabIndex={0}
          style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: P.red, cursor: 'pointer', padding: '2px 4px' }}
        >Delete task</span>
      </div>
    </div>
  );
}
