/**
 * VISTA: CONFIGURACIONES
 * Preferencias del usuario. Carga y guarda en Firestore (appSettings/main).
 */
import React, { useEffect, useState } from 'react';
import { Save, Info, X, Loader2, Check } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../lib/auth';
import { useIsMobileApp } from '../../hooks/useMediaQuery';

interface AppSettings {
  bookingSlug: string;
  currency: string;
  countryCodes: string[];
  showBranding: boolean;
  timezone: string;
  timeFormat: string;
  weekStart: string;
  showAmPm: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  notifyBrowser: boolean;
  notifyRecipient: string;
  emailFrom: string;
  emailName: string;
  emailReplyTo: string;
}

const DEFAULTS: AppSettings = {
  bookingSlug: 'acrylnagels',
  currency: 'United States Dollar',
  countryCodes: ['HN'],
  showBranding: false,
  timezone: 'America/Guatemala',
  timeFormat: '12h (AM/PM)',
  weekStart: 'domingo',
  showAmPm: true,
  notifyInApp: true,
  notifyEmail: true,
  notifyBrowser: false,
  notifyRecipient: 'waltersandoval24@hotmail.es',
  emailFrom: 'team@acrylnagelshn.com',
  emailName: 'AcrylNagels',
  emailReplyTo: 'cisaire6@gmail.com',
};

const CURRENCIES = ['United States Dollar', 'Euro', 'Lempira hondureño', 'Peso mexicano', 'Quetzal guatemalteco'];
const TIMEZONES = ['America/Guatemala', 'America/Tegucigalpa', 'America/Mexico_City', 'America/El_Salvador', 'America/Managua', 'America/Costa_Rica', 'America/Panama', 'America/Bogota', 'Europe/Madrid'];
const COUNTRY_OPTIONS = ['HN', 'GT', 'SV', 'MX', 'US', 'ES', 'CO', 'NI', 'CR', 'PA'];

interface SettingsProps {
  embedded?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ embedded = false }) => {
  const isMobileApp = useIsMobileApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('General');
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const navItems = ['General', 'Fechas & Horas', 'Notificaciones'];

  useEffect(() => {
    (async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'appSettings', user.uid));
        if (snap.exists()) {
          setSettings({ ...DEFAULTS, ...(snap.data() as Partial<AppSettings>) });
        }
      } catch (e) {
        console.warn('No se pudo cargar appSettings:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      if (!user?.uid) throw new Error('No hay sesion activa.');
      await setDoc(doc(db, 'appSettings', user.uid), { ...settings, ownerUid: user.uid, updatedAt: serverTimestamp() }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      console.error('Error guardando settings:', e);
      setSaveError(
        e?.code === 'permission-denied' || /insufficient permissions/i.test(e?.message || '')
          ? 'Sin permisos para guardar. Despliega las reglas de Firestore (firebase deploy --only firestore:rules).'
          : 'No se pudo guardar. Intenta de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const addCountry = (code: string) => {
    if (!code || settings.countryCodes.includes(code)) return;
    update('countryCodes', [...settings.countryCodes, code]);
  };
  const removeCountry = (code: string) => {
    update('countryCodes', settings.countryCodes.filter((c) => c !== code));
  };

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }> = ({ checked, onChange, label }) => (
    <label className="flex items-center cursor-pointer group">
      <div className="relative" onClick={(e) => { e.preventDefault(); onChange(!checked); }}>
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-black' : 'bg-slate-200 group-hover:bg-slate-300'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`}></div>
      </div>
      <span className="ml-3 text-sm font-semibold text-slate-600">{label}</span>
    </label>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-7 h-7 text-black animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full max-w-6xl mx-auto w-full">
      {!(embedded || isMobileApp) && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black mb-1">Preferencias del usuario</h2>
          <p className="text-slate-500 font-semibold text-sm">Establezca su zona horaria y el formato de hora que desea mostrar sus calendarios</p>
        </div>
      )}

      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header Row with Tabs and Save Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-2 gap-4">
          <div className="flex overflow-x-auto no-scrollbar">
            {navItems.map(item => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`px-5 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === item
                    ? 'border-black text-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end px-5 py-2 sm:p-0">
             <button
               onClick={handleSave}
               disabled={saving}
               className={`px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center shadow-sm transition-all duration-200 cursor-pointer text-white disabled:opacity-60 ${saved ? 'bg-slate-800 hover:bg-slate-700' : 'bg-black hover:bg-slate-900'}`}
             >
               {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : saved ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
               {saving ? 'GUARDANDO...' : saved ? 'GUARDADO' : 'GUARDAR'}
             </button>
          </div>
        </div>

        {saveError && (
          <div className="mx-5 sm:mx-8 mt-4 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {saveError}
          </div>
        )}

        <div className="p-5 sm:p-8">
          {activeTab === 'General' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Su URL Booking</label>
                <div className="flex items-center w-full overflow-hidden">
                  <span className="bg-slate-50 border border-slate-200 border-r-0 text-slate-400 px-4 py-2.5 rounded-l-lg text-sm font-semibold select-none flex-shrink-0 max-w-[55%] truncate">
                    {window.location.origin}/booking/
                  </span>
                  <input
                    type="text"
                    value={settings.bookingSlug}
                    onChange={(e) => update('bookingSlug', e.target.value)}
                    className="w-full min-w-0 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-r-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de moneda preferido</label>
                <div className="relative">
                  <select
                    value={settings.currency}
                    onChange={(e) => update('currency', e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg pl-12 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
                  >
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <div className="bg-black text-white text-xs font-bold px-1.5 py-0.5 rounded flex items-center justify-center">$</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-bold text-slate-700 mb-2">
                  Códigos de países destacados
                  <Info className="h-3.5 w-3.5 ml-2 text-slate-400 cursor-help" />
                </label>
                <div className="flex flex-col gap-3">
                  <select
                    onChange={(e) => { addCountry(e.target.value); e.target.value = ''; }}
                    defaultValue=""
                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
                  >
                    <option value="">-- Select to add --</option>
                    {COUNTRY_OPTIONS.filter((c) => !settings.countryCodes.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {settings.countryCodes.map((code) => (
                      <div key={code} className="inline-flex items-center bg-white border border-slate-200 rounded-md px-3 py-1.5 shadow-sm text-sm font-bold text-slate-600">
                         {code}
                         <button onClick={() => removeCountry(code)} className="ml-2 text-slate-300 hover:text-slate-500 bg-slate-100 rounded-full p-0.5 cursor-pointer">
                            <X className="h-3 w-3" />
                         </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Desarrollado por Builderall</p>
                <Toggle checked={settings.showBranding} onChange={(v) => update('showBranding', v)} label="Muestra la marca Builderall" />
              </div>
            </div>
          )}

          {activeTab === 'Fechas & Horas' && (
            <div className="max-w-2xl space-y-6">
               <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Zona Horaria</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => update('timezone', e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
                >
                    {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Formato de hora de sus calendarios</label>
                <select
                  value={settings.timeFormat}
                  onChange={(e) => update('timeFormat', e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
                >
                    <option>12h (AM/PM)</option>
                    <option>24h</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">El día que comienza cada semana</label>
                <select
                  value={settings.weekStart}
                  onChange={(e) => update('weekStart', e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black cursor-pointer"
                >
                    <option>domingo</option>
                    <option>lunes</option>
                </select>
              </div>
              <div className="pt-2">
                <Toggle checked={settings.showAmPm} onChange={(v) => update('showAmPm', v)} label={<span className="flex items-center">Mostrar AM/PM<Info className="h-3.5 w-3.5 ml-2 text-slate-400 cursor-help" /></span>} />
              </div>
            </div>
          )}

          {activeTab === 'Notificaciones' && (
            <div className="max-w-2xl space-y-6">
              <div>
                 <label className="text-sm font-bold text-slate-700 mb-3 block">Notificaciones</label>
                 <Toggle checked={settings.notifyInApp} onChange={(v) => update('notifyInApp', v)} label="Recibir notificaciones de citas nuevas y cancelaciones en mi centro de notificaciones" />
              </div>

              <div>
                 <label className="text-sm font-bold text-slate-700 mb-3 block">Via email</label>
                 <Toggle checked={settings.notifyEmail} onChange={(v) => update('notifyEmail', v)} label="También recibir notificaciones en mi correo electrónico" />
              </div>

              <div>
                 <label className="flex items-center text-sm font-bold text-slate-700 mb-2">
                  Destinatario de las notificaciones de la administración
                  <Info className="h-3.5 w-3.5 ml-2 text-slate-400 cursor-help" />
                 </label>
                 <input
                    type="text"
                    value={settings.notifyRecipient}
                    onChange={(e) => update('notifyRecipient', e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                  />
              </div>

              <div className="pb-6 border-b border-slate-100">
                 <label className="flex items-center text-sm font-bold text-slate-700 mb-3">
                  A través de Navegador/Aplicación
                  <Info className="h-3.5 w-3.5 ml-2 text-slate-400 cursor-help" />
                 </label>
                 <Toggle checked={settings.notifyBrowser} onChange={(v) => update('notifyBrowser', v)} label="También recibir notificaciones en mi Navegador/Aplicación" />
              </div>

              <div className="space-y-5 pt-2">
                  <h4 className="text-base font-bold text-slate-800">Remitente del correo electrónico</h4>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Remitente del correo electrónico</label>
                      <input
                          type="email"
                          value={settings.emailFrom}
                          onChange={(e) => update('emailFrom', e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del remitente del correo electrónico</label>
                      <div className="relative">
                          <input
                              type="text"
                              maxLength={40}
                              value={settings.emailName}
                              onChange={(e) => update('emailName', e.target.value)}
                              className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg pl-4 pr-12 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                          />
                          <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-400">{settings.emailName.length}/40</span>
                      </div>
                  </div>

                  <div>
                      <label className="flex items-center text-sm font-bold text-slate-700 mb-2">
                          Responder a
                          <Info className="h-3.5 w-3.5 ml-2 text-slate-400 cursor-help" />
                      </label>
                      <input
                          type="email"
                          value={settings.emailReplyTo}
                          onChange={(e) => update('emailReplyTo', e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      />
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
