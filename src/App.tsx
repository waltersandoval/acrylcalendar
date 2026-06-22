/**
 * COMPONENTE APP (ENTRY POINT)
 * Enruta entre la reserva pública (/booking/:id), la pantalla de autenticación y
 * el panel admin. El panel requiere sesión; opcionalmente exige biometría.
 * Registra el listener de push en foreground cuando el usuario está autenticado.
 */

import React, { useEffect, useState } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import PublicBooking from './components/public/PublicBooking';
import AuthScreen from './components/auth/AuthScreen';
import { useDynamicManifest } from './hooks/useDynamicManifest';
import { AuthProvider, useAuth } from './lib/auth';
import { isBiometricEnabled, verifyBiometric } from './lib/biometrics';
import { listenForegroundPush, isPushEnabled } from './lib/push';
import { Loader2, Fingerprint } from 'lucide-react';

function BiometricGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(() => isBiometricEnabled());

  const unlock = async () => {
    const ok = await verifyBiometric();
    if (ok) setLocked(false);
  };

  useEffect(() => {
    if (locked) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!locked) return <>{children}</>;

  return (
    <div className="min-h-screen srf-window flex flex-col items-center justify-center p-6 text-center pt-safe pb-safe">
      <div className="w-20 h-20 rounded-3xl bg-slate-100 text-slate-800 flex items-center justify-center mb-6">
        <Fingerprint className="w-10 h-10" />
      </div>
      <h1 className="text-[22px] font-bold text-slate-900">Desbloquea con biometría</h1>
      <p className="text-slate-500 text-[14px] mt-2 max-w-[260px]">Usa tu huella o Face ID para acceder a tu cuenta.</p>
      <button onClick={unlock} className="mt-8 bg-black text-white font-bold px-8 py-3.5 rounded-2xl shadow-md active:scale-95 transition-transform">
        Desbloquear
      </button>
    </div>
  );
}

function AdminGate() {
  const { user, loading } = useAuth();

  // Registrar el listener de notificaciones en primer plano (foreground).
  // Solo se activa si el usuario tiene push habilitado en este dispositivo.
  // Se llama una sola vez cuando el usuario está autenticado.
  useEffect(() => {
    if (user && isPushEnabled()) {
      listenForegroundPush();
    }
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen srf-window flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-black animate-spin" />
      </div>
    );
  }

  // Bypass solo-dev para previsualizar el panel sin login (no afecta producción).
  const devBypass = import.meta.env.DEV && typeof localStorage !== 'undefined' && localStorage.getItem('devBypassAuth') === '1';

  if (!user && !devBypass) return <AuthScreen />;

  return (
    <BiometricGate>
      <Dashboard />
    </BiometricGate>
  );
}

export default function App() {
  if (import.meta.env.DEV && typeof localStorage !== 'undefined') {
    localStorage.setItem('devBypassAuth', '1');
    localStorage.setItem('forceMobileUI', '1');
  }
  // Inyecta el manifest PWA del cliente en rutas /booking/* (no-op en admin).
  useDynamicManifest();

  const path = window.location.pathname;

  // La reserva pública NO requiere sesión.
  if (path.startsWith('/booking/')) {
    const calendarId = path.split('/')[2];
    if (calendarId) {
      return <PublicBooking calendarId={calendarId} />;
    }
  }

  return (
    <AuthProvider>
      <AdminGate />
    </AuthProvider>
  );
}
