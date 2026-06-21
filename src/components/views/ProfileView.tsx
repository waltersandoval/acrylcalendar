/**
 * VISTA: PERFIL DE USUARIO
 * Cabecera con avatar + datos del usuario + listas agrupadas estilo iOS Settings.
 * Cuenta (cambiar contraseña, biometría, push), Zona peligrosa, Cerrar sesión.
 */
import React, { useEffect, useState } from 'react';
import {
  signOut,
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, functions } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import Sheet from '../ui/Sheet';
import {
  Camera, KeyRound, Fingerprint, Bell, Trash2, LogOut, ChevronRight, Loader2,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  isBiometricSupported, isBiometricEnabled, registerBiometric, disableBiometric,
} from '../../lib/biometrics';
import { enablePush, disablePush, isPushEnabled, isPushConfigured } from '../../lib/push';

const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <span
    onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
    className={`w-12 h-7 rounded-full relative transition-colors duration-200 shrink-0 ${disabled ? 'bg-slate-200 opacity-50 cursor-not-allowed' : checked ? 'bg-black cursor-pointer' : 'bg-slate-300 cursor-pointer'}`}
  >
    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${checked ? 'left-[26px]' : 'left-1'}`} />
  </span>
);

interface RowProps {
  icon: any;
  label: string;
  sublabel?: string;
  tint?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}

const Row: React.FC<RowProps> = ({ icon: Icon, label, sublabel, tint = 'bg-slate-100 text-slate-600', onClick, right, danger }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors text-left">
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50 text-rose-600' : tint}`}>
      <Icon className="w-[18px] h-[18px]" />
    </span>
    <div className="flex-1 min-w-0">
      <p className={`font-semibold text-[15px] ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{label}</p>
      {sublabel && <p className="text-[12px] text-slate-400 font-medium mt-0.5">{sublabel}</p>}
    </div>
    {right !== undefined ? right : <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
  </button>
);

const ProfileView: React.FC = () => {
  const { user } = useAuth();

  const [bioSupported, setBioSupported] = useState(false);
  const [bioOn, setBioOn] = useState(isBiometricEnabled());
  const [pushOn, setPushOn] = useState(isPushEnabled());
  const [busy, setBusy] = useState<string | null>(null);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [pushDiagOpen, setPushDiagOpen] = useState(false);
  const [pushDiag, setPushDiag] = useState<{
    vapid: boolean;
    permission: NotificationPermission | 'unknown';
    tokenInFirestore: boolean | null;
    tokenPreview: string;
  } | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'err' | 'ok'; text: string } | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState('');
  const [delError, setDelError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  useEffect(() => { isBiometricSupported().then(setBioSupported); }, []);
  useEffect(() => { setPhotoURL(user?.photoURL || ''); }, [user?.photoURL]);

  const uploadProfilePhoto = async (file: File) => {
    if (!user || !auth?.currentUser || !db) return;
    if (!file.type.startsWith('image/')) { showToast('Selecciona una imagen valida.'); return; }
    setBusy('photo');
    try {
      const image = new Image();
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = source;
      });
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible.');
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      const nextPhotoURL = canvas.toDataURL('image/jpeg', 0.82);
      await updateProfile(auth.currentUser, { photoURL: nextPhotoURL });
      await setDoc(doc(db, 'users', user.uid), { photoURL: nextPhotoURL, displayName: user.displayName || '', email: user.email || '', updatedAt: serverTimestamp() }, { merge: true });
      setPhotoURL(nextPhotoURL);
      showToast('Foto de perfil actualizada.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo actualizar la foto.');
    } finally { setBusy(null); }
  };

  const toggleBiometric = async () => {
    if (bioOn) { disableBiometric(); setBioOn(false); showToast('Biometría desactivada.'); return; }
    setBusy('bio');
    try {
      await registerBiometric(user?.uid || 'user', user?.displayName || user?.email || 'Usuario');
      setBioOn(true);
      showToast('Biometría activada.');
    } catch (e) {
      console.error(e);
      showToast('No se pudo activar la biometría.');
    } finally { setBusy(null); }
  };

  const togglePush = async () => {
    if (pushOn) { await disablePush(); setPushOn(false); showToast('Notificaciones desactivadas.'); return; }
    setBusy('push');
    const res = await enablePush();
    setBusy(null);
    if (res.ok) { setPushOn(true); showToast('✅ Notificaciones activadas correctamente.'); }
    else if (res.reason === 'no-config') {
      setPushDiagOpen(true);
      showToast('⚠️ Falta la VAPID Key. Ver diagnóstico.');
    }
    else if (res.reason === 'denied') showToast('Permiso de notificaciones denegado por el navegador.');
    else if (res.reason === 'unsupported') showToast('Este dispositivo no soporta push.');
    else showToast('No se pudieron activar las notificaciones.');
  };

  const runPushDiagnostic = async () => {
    setDiagLoading(true);
    setPushDiagOpen(true);

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    const vapidOk = !!vapidKey && vapidKey !== 'REEMPLAZAR_vapidKey' && vapidKey.length > 20;

    const permission = 'Notification' in window ? Notification.permission : 'unknown' as const;

    let tokenInFirestore: boolean | null = null;
    let tokenPreview = '';
    try {
      const uid = auth?.currentUser?.uid;
      if (uid && db) {
        const snap = await getDoc(doc(db, 'users', uid));
        const tokens: string[] = snap.data()?.fcmTokens || [];
        tokenInFirestore = tokens.length > 0;
        tokenPreview = tokens.length > 0 ? tokens[0].substring(0, 30) + '...' : '';
      }
    } catch (e) {
      tokenInFirestore = false;
    }

    setPushDiag({ vapid: vapidOk, permission, tokenInFirestore, tokenPreview });
    setDiagLoading(false);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPwd.length < 6) { setPwdMsg({ type: 'err', text: 'La nueva contraseña debe tener al menos 6 caracteres.' }); return; }
    if (!auth?.currentUser?.email) { setPwdMsg({ type: 'err', text: 'No hay sesión activa.' }); return; }
    setPwdSaving(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, curPwd);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPwd);
      setPwdMsg({ type: 'ok', text: 'Contraseña actualizada.' });
      setCurPwd(''); setNewPwd('');
      setTimeout(() => setPwdOpen(false), 1200);
    } catch (err: any) {
      const code = err?.code || '';
      setPwdMsg({ type: 'err', text: code.includes('wrong-password') || code.includes('invalid-credential') ? 'La contraseña actual es incorrecta.' : 'No se pudo cambiar la contraseña.' });
    } finally { setPwdSaving(false); }
  };

  const deleteAccount = async () => {
    if (delConfirm !== 'ELIMINAR') { setDelError('Escribe ELIMINAR para confirmar.'); return; }
    setDeleting(true); setDelError(null);
    try {
      const fn = httpsCallable(functions, 'deleteAccount');
      await fn({});
      await signOut(auth);
    } catch (err: any) {
      console.error(err);
      setDelError('No se pudo eliminar la cuenta. Vuelve a iniciar sesión e intenta de nuevo.');
      setDeleting(false);
    }
  };

  const logout = async () => { try { await signOut(auth); } catch (e) { console.error(e); } };
  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col pt-1 pb-4">
      {/* Large title */}
      <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-tight text-slate-900 font-display mb-5">Perfil</h1>

      {/* User card */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-5 flex items-center gap-4 mb-6">
        <label className="relative w-[72px] h-[72px] rounded-full shrink-0 cursor-pointer group">
          {photoURL ? (
            <img src={photoURL} alt="" className="w-[72px] h-[72px] rounded-full object-cover border-2 border-white shadow-md ring-1 ring-slate-200" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
              {initial}
            </div>
          )}
          <span className="absolute inset-0 rounded-full bg-black/0 group-active:bg-black/30 transition-colors flex items-center justify-center">
            {busy === 'photo'
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
            }
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadProfilePhoto(file);
            e.currentTarget.value = '';
          }} />
        </label>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-[18px] truncate">{user?.displayName || 'Usuario'}</p>
          <p className="text-slate-400 text-[14px] truncate mt-0.5">{user?.email}</p>
          <p className="text-[12px] text-slate-400 mt-1 font-medium">Toca la foto para cambiarla</p>
        </div>
      </div>

      {/* Grupo: Cuenta */}
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Cuenta</p>
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100 overflow-hidden mb-6">
        <Row
          icon={KeyRound}
          label="Cambiar contraseña"
          sublabel="Actualiza tu contraseña de acceso"
          tint="bg-slate-100 text-slate-900"
          onClick={() => { setPwdMsg(null); setPwdOpen(true); }}
        />
        <Row
          icon={Fingerprint}
          label="Bloqueo biométrico"
          sublabel={bioSupported ? (bioOn ? 'Activado' : 'Desactivado') : 'No disponible en este dispositivo'}
          tint="bg-violet-50 text-violet-600"
          onClick={bioSupported ? toggleBiometric : undefined}
          right={busy === 'bio'
            ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            : <Toggle checked={bioOn} onChange={toggleBiometric} disabled={!bioSupported} />
          }
        />
        <Row
          icon={Bell}
          label="Notificaciones push"
          sublabel={isPushConfigured() ? (pushOn ? 'Activadas' : 'Desactivadas') : '⚠️ VAPID Key no configurada'}
          tint="bg-amber-50 text-amber-600"
          onClick={togglePush}
          right={busy === 'push'
            ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            : <Toggle checked={pushOn} onChange={togglePush} disabled={!isPushConfigured()} />
          }
        />

        {/* Botón de diagnóstico — siempre visible */}
        <button
          onClick={runPushDiagnostic}
          className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-slate-50 transition-colors cursor-pointer border-t border-slate-100"
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-600">
            {diagLoading
              ? <Loader2 className="w-[18px] h-[18px] animate-spin" />
              : pushDiagOpen
                ? <ChevronUp className="w-[18px] h-[18px]" />
                : <ChevronDown className="w-[18px] h-[18px]" />
            }
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[14px] text-slate-700">Diagnóstico de notificaciones</p>
            <p className="text-[11px] text-slate-400 font-medium">Ver estado del sistema de push</p>
          </div>
        </button>

        {/* Panel de diagnóstico expandible */}
        {pushDiagOpen && pushDiag && (
          <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100 space-y-2 pt-3">
            {/* Estado VAPID Key */}
            <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-[13px] ${pushDiag.vapid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {pushDiag.vapid
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                : <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              }
              <div>
                <p className="font-bold">VAPID Key: {pushDiag.vapid ? '✅ Configurada' : '❌ NO configurada'}</p>
                {!pushDiag.vapid && (
                  <p className="text-[11px] mt-1 leading-relaxed">
                    Ve a <strong>Firebase Console</strong> → ⚙️ Project Settings → Cloud Messaging → Web Push certificates → <strong>Generate key pair</strong>. Copia la clave y pégala en <code className="bg-red-100 px-1 rounded">.env.local</code> como <code className="bg-red-100 px-1 rounded">VITE_FIREBASE_VAPID_KEY</code>. Luego reinicia el servidor.
                  </p>
                )}
              </div>
            </div>

            {/* Estado Permisos Navegador */}
            <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-[13px] ${
              pushDiag.permission === 'granted' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : pushDiag.permission === 'denied' ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {pushDiag.permission === 'granted'
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                : pushDiag.permission === 'denied'
                  ? <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              }
              <div>
                <p className="font-bold">Permiso del navegador: {
                  pushDiag.permission === 'granted' ? '✅ Concedido'
                  : pushDiag.permission === 'denied' ? '❌ Bloqueado'
                  : '⚠️ No solicitado'
                }</p>
                {pushDiag.permission === 'denied' && (
                  <p className="text-[11px] mt-1">En Chrome: haz clic en el ícono de candado 🔒 en la barra de URL → Notificaciones → Permitir → Recarga la página.</p>
                )}
              </div>
            </div>

            {/* Estado Token FCM en Firestore */}
            <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-[13px] ${
              pushDiag.tokenInFirestore === true ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {pushDiag.tokenInFirestore
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                : <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              }
              <div>
                <p className="font-bold">Token FCM en Firestore: {pushDiag.tokenInFirestore ? '✅ Registrado' : '❌ NO registrado'}</p>
                {pushDiag.tokenPreview && <p className="text-[10px] mt-0.5 opacity-70 font-mono">{pushDiag.tokenPreview}</p>}
                {!pushDiag.tokenInFirestore && (
                  <p className="text-[11px] mt-1">Activa las notificaciones con el toggle de arriba. Sin token, la Cloud Function no puede enviar la push aunque todo lo demás esté correcto.</p>
                )}
              </div>
            </div>

            {/* Resumen del estado */}
            {pushDiag.vapid && pushDiag.permission === 'granted' && pushDiag.tokenInFirestore && (
              <div className="flex items-center gap-2 p-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 text-[13px]">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <p className="font-bold">✅ Todo está correcto. Las notificaciones push deberían funcionar.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zona peligrosa */}
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Zona peligrosa</p>
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden mb-6">
        <Row
          icon={Trash2}
          label="Eliminar cuenta"
          sublabel="Elimina permanentemente tu cuenta y datos"
          danger
          onClick={() => { setDelError(null); setDelConfirm(''); setDelOpen(true); }}
          right={<ChevronRight className="w-4 h-4 text-rose-300 shrink-0" />}
        />
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={logout}
        className="w-full bg-white rounded-2xl border border-slate-200/60 shadow-sm py-4 flex items-center justify-center gap-2 text-slate-700 font-bold text-[15px] active:bg-slate-50 transition-colors"
      >
        <LogOut className="w-5 h-5" /> Cerrar sesión
      </button>

      {/* Sheet: cambiar contraseña */}
      <Sheet isOpen={pwdOpen} onClose={() => setPwdOpen(false)} maxWidthClass="max-w-md" zIndex={60}>
        <form onSubmit={changePassword} className="bg-white p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Cambiar contraseña</h3>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">Contraseña actual</label>
            <input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/30" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">Nueva contraseña</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/30" />
          </div>
          {pwdMsg && <p className={`text-xs font-medium ${pwdMsg.type === 'err' ? 'text-rose-500' : 'text-emerald-600'}`}>{pwdMsg.text}</p>}
          <div className="flex flex-col gap-3 pt-2">
            <button type="submit" disabled={pwdSaving} className="w-full py-3 bg-black hover:bg-slate-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {pwdSaving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </button>
            <button type="button" onClick={() => setPwdOpen(false)} className="w-full py-3 text-slate-600 font-semibold bg-slate-100 rounded-xl text-sm transition-colors">Cancelar</button>
          </div>
        </form>
      </Sheet>

      {/* Sheet: eliminar cuenta */}
      <Sheet isOpen={delOpen} onClose={() => !deleting && setDelOpen(false)} maxWidthClass="max-w-md" zIndex={70}>
        <div className="bg-white p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Eliminar cuenta</h3>
          <p className="text-sm text-slate-500">Esta acción borra tu cuenta y <strong>todos tus datos</strong> de forma permanente. No se puede deshacer.</p>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1.5">Escribe <strong>ELIMINAR</strong> para confirmar</label>
            <input value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500/30" />
          </div>
          {delError && <p className="text-rose-500 text-xs font-medium">{delError}</p>}
          <div className="flex flex-col gap-3 pt-2">
            <button onClick={deleteAccount} disabled={deleting} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />} Eliminar definitivamente
            </button>
            <button onClick={() => setDelOpen(false)} disabled={deleting} className="w-full py-3 text-slate-600 font-semibold bg-slate-100 rounded-xl text-sm transition-colors">Cancelar</button>
          </div>
        </div>
      </Sheet>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ProfileView;
