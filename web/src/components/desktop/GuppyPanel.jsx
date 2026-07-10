import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store.jsx';
import { useDesk } from './DesktopApp.jsx';

const GREETING = { mine: false, text: 'Morning! Ask me about any client, project, or what’s on your plate — or paste meeting notes and I’ll draft tasks for you to approve.' };

const CHIPS = ['What do I have on Borax?', 'Summarize my week', 'Turn meeting notes into tasks'];

export default function GuppyPanel() {
  const { P, guppyMsgs, guppySend, guppyBusy } = useStore();
  const { guppyOpen, setGuppyOpen } = useDesk();
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const msgs = guppyMsgs.length ? guppyMsgs : [GREETING];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [guppyMsgs, guppyOpen]);

  const send = text => {
    const msg = (text != null ? text : input).trim();
    if (!msg) return;
    setInput('');
    guppySend(msg);
  };

  return (
    <>
      {guppyOpen && (
        <div style={{ position: 'fixed', right: 20, bottom: 80, width: 380, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 14, boxShadow: '0 16px 48px var(--shadow-deep)', zIndex: 90, overflow: 'hidden', animation: 'popIn .15s ease' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, overflow: 'hidden', flex: 'none', border: '1px solid var(--line2)' }}>
              <img src="/guppy.jpg" alt="Guppy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%', display: 'block' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>Guppy</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Knows your tasks, projects & calendar</div>
            </div>
            <span onClick={() => setGuppyOpen(false)} tabIndex={0} style={{ color: 'var(--muted)', fontSize: 14, cursor: 'pointer', padding: '2px 6px' }}>✕</span>
          </div>

          <div ref={scrollRef} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--card-alt)', height: '55vh', maxHeight: 520, overflowY: 'auto' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', background: m.mine ? P.green : 'var(--card)', color: m.mine ? '#fff' : P.ink, fontSize: 13, padding: '9px 12px', borderRadius: m.mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px', maxWidth: '88%', lineHeight: 1.5, border: m.mine ? 'none' : '1px solid var(--line)' }}>{m.text}</div>
            ))}
            {guppyBusy && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--card)', color: 'var(--muted)', fontSize: 13, padding: '9px 12px', borderRadius: '12px 12px 12px 3px', border: '1px solid var(--line)' }}>…</div>
            )}
          </div>

          <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 9, flexWrap: 'wrap' }}>
              {CHIPS.map(c => (
                <span key={c} onClick={() => send(c)} tabIndex={0} className="hover-green" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--soft)', border: '1px solid var(--line2)', borderRadius: 99, padding: '4px 10px', cursor: 'pointer' }}>{c}</span>
              ))}
            </div>
            <div style={{ border: '1px solid var(--line2)', borderRadius: 9, padding: '5px 6px 5px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                placeholder="Ask Guppy…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send(); }}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--ink)' }}
              />
              <div onClick={() => send()} tabIndex={0} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--green)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>↑</div>
            </div>
          </div>
        </div>
      )}

      <div
        onClick={e => { e.stopPropagation(); setGuppyOpen(v => !v); }}
        tabIndex={0}
        className="hover-scale"
        style={{ position: 'fixed', right: 20, bottom: 20, width: 46, height: 46, borderRadius: 99, overflow: 'hidden', border: '2px solid var(--card)', boxShadow: '0 3px 12px var(--shadow-deep)', cursor: 'pointer', zIndex: 90, background: 'var(--green)' }}
      >
        <img src="/guppy.jpg" alt="Open Guppy chat" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 12%', display: 'block' }} />
      </div>
    </>
  );
}
