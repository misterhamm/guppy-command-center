import React, { useEffect, useState } from 'react';
import { useStore } from './state/store.jsx';
import DesktopApp from './components/desktop/DesktopApp.jsx';
import MobileApp from './components/mobile/MobileApp.jsx';

// One responsive app: desktop layout at wide viewports, the mobile composition
// (bottom nav + sheet stack) at narrow ones — not a squeezed desktop.
const BREAKPOINT = 900;

export default function App() {
  const { ready } = useStore();
  const [wide, setWide] = useState(() => window.innerWidth >= BREAKPOINT);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
    const onChange = e => setWide(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13.5, fontWeight: 600 }}>
        Loading your command center…
      </div>
    );
  }
  return wide ? <DesktopApp /> : <MobileApp />;
}
