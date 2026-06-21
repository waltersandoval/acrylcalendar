import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {gatePwaForDevice} from './lib/pwaGate';
import {isMobileDevice} from './lib/device';

// Solo móviles/tablets pueden instalar la PWA; en escritorio se comporta como web normal.
gatePwaForDevice();

// En móvil: bloquear zoom por pinch (gestos iOS) y ctrl+rueda, para sentirse nativa.
if (isMobileDevice()) {
  const prevent = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', prevent, {passive: false});
  document.addEventListener('gesturechange', prevent, {passive: false});
  document.addEventListener('gestureend', prevent, {passive: false});
  document.addEventListener(
    'wheel',
    (e) => { if ((e as WheelEvent).ctrlKey) e.preventDefault(); },
    {passive: false},
  );
  // Evitar zoom por doble-tap rápido.
  let lastTouch = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    },
    {passive: false},
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
