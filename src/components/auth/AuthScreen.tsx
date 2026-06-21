/**
 * PANTALLA DE AUTENTICACIÓN
 * Login / Registro con email + contraseña (Firebase Auth) y reseteo de contraseña.
 * Estilo iOS, responsive (tarjeta centrada).
 */
import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Loader2, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'register';

const errorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email': return 'El email no es válido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Email o contraseña incorrectos.';
    case 'auth/email-already-in-use': return 'Ya existe una cuenta con ese email.';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Intenta más tarde.';
    default: return 'Ocurrió un error. Intenta de nuevo.';
  }
};

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!auth) { setError('Firebase no está configurado.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      }
    } catch (err: any) {
      setError(errorMessage(err?.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    setNotice(null);
    if (!auth) { setError('Firebase no está configurado.'); return; }
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (popupErr: any) {
        // En PWA/standalone o si el popup se bloquea, usar redirección.
        const code = popupErr?.code || '';
        if (code.includes('popup') || code.includes('cancelled') || code.includes('operation-not-supported')) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (err: any) {
      setError(errorMessage(err?.code || ''));
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) { setError('Escribe tu email para enviarte el enlace.'); return; }
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice('Te enviamos un enlace para restablecer tu contraseña.');
    } catch (err: any) {
      setError(errorMessage(err?.code || ''));
    }
  };

  return (
    <div className="min-h-screen srf-window flex items-center justify-center p-5 pt-safe pb-safe relative overflow-hidden">
      {/* Fondo ambiental tipo Tahoe (luces de vidrio) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[440px] h-[440px] rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative animate-glass-pop">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-black/15" style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-strong))' }}>A</div>
          <h1 className="text-[26px] font-extrabold tracking-tight ink-1 font-display mt-4">Acryl Calendar</h1>
          <p className="ink-3 text-[14px] font-medium mt-1">
            {mode === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta para empezar'}
          </p>
        </div>

        <form onSubmit={submit} className="glass-strong r-window p-6 space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ink-3" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="w-full srf-sunken rounded-2xl pl-12 pr-4 py-3.5 text-[15px] ink-1 outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30" style={{ border: '1px solid var(--hairline)' }} />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ink-3" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className="w-full srf-sunken rounded-2xl pl-12 pr-4 py-3.5 text-[15px] ink-1 outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30" style={{ border: '1px solid var(--hairline)' }} />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ink-3" />
            <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Contraseña" className="w-full srf-sunken rounded-2xl pl-12 pr-12 py-3.5 text-[15px] ink-1 outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/30" style={{ border: '1px solid var(--hairline)' }} />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 ink-3 hover:ink-1">
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {mode === 'login' && (
            <div className="text-right -mt-1">
              <button type="button" onClick={resetPassword} className="text-[13px] font-semibold ink-2 hover:ink-1">¿Olvidaste tu contraseña?</button>
            </div>
          )}

          {error && <p className="text-rose-500 text-[13px] font-medium">{error}</p>}
          {notice && <p className="text-emerald-600 text-[13px] font-medium">{notice}</p>}

          <button type="submit" disabled={loading} className="w-full text-white py-4 rounded-2xl text-[15px] font-bold shadow-md shadow-[var(--accent)]/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60" style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-strong))' }}>
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ background: 'var(--hairline)' }} />
            <span className="text-[12px] font-semibold ink-3">o</span>
            <div className="flex-1 h-px" style={{ background: 'var(--hairline)' }} />
          </div>

          {/* Google */}
          <button type="button" onClick={signInWithGoogle} disabled={loading} className="w-full srf-raised ink-1 py-3.5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-3 hover:brightness-95 active:scale-[0.99] transition-all disabled:opacity-60" style={{ border: '1px solid var(--hairline)' }}>
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001 6.19 5.238 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Continuar con Google
          </button>
        </form>

        <p className="text-center text-[14px] ink-3 mt-6">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setNotice(null); }} className="font-bold ink-1 hover:opacity-80">
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
