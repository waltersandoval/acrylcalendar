/**
 * COMPONENTE: PaymentSettings
 * Dominio: calendar-editor
 *
 * Editor COMPLETO del módulo de pago, integrado dentro del constructor del
 * calendario. Toda la configuración de pagos (precio, moneda, credenciales de
 * PayPal, estilos del botón, conversión de moneda) se administra aquí, scoped
 * al calendario que se está editando. Ya no existe una sección global separada.
 *
 * Backend (sin cambios): cada configuración vive en la colección
 * `payment_configs` (creada/actualizada por la Cloud Function `savePaypalConfig`,
 * que valida las credenciales contra PayPal y guarda el secret en una
 * subcolección privada). El cobro se verifica server-to-server en
 * `verifyPaypalAndCreateEvent`, que ya usa estas configuraciones como fuente
 * principal del precio. Aquí solo cambia DÓNDE se editan.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  PlusCircle, Trash2, Edit2, Save, CreditCard, Eye, EyeOff, AlertCircle, CheckCircle,
  HelpCircle, DollarSign, Globe, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { db, functions } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

interface Props {
  calendarId?: string;
  initialData?: any;
  onSave?: (data?: any) => void;
  calendarGroups?: { id: string; name: string }[];
  onRegisterSave?: (fn: () => void) => void;
}

const SECRET_PLACEHOLDER = "••••••••••••••••••••••••";

const CURRENCY_OPTIONS = [
  { label: 'USD — Dólar Estadounidense', value: 'USD' },
  { label: 'EUR — Euro',                 value: 'EUR' },
  { label: 'HNL — Lempira Hondureño',   value: 'HNL' },
  { label: 'MXN — Peso Mexicano',        value: 'MXN' },
  { label: 'GTQ — Quetzal Guatemalteco', value: 'GTQ' },
];

const COUNTRY_OPTIONS = [
  { label: 'Honduras (HN)', value: 'HN' },
  { label: 'Estados Unidos (US)', value: 'US' },
  { label: 'España (ES)', value: 'ES' },
  { label: 'México (MX)', value: 'MX' },
  { label: 'Guatemala (GT)', value: 'GT' },
  { label: 'El Salvador (SV)', value: 'SV' },
  { label: 'Costa Rica (CR)', value: 'CR' },
  { label: 'Panamá (PA)', value: 'PA' },
  { label: 'Colombia (CO)', value: 'CO' },
];

const BUTTON_COLORS = [
  { label: 'Oro (Por defecto)', value: 'gold' },
  { label: 'Azul', value: 'blue' },
  { label: 'Plata', value: 'silver' },
  { label: 'Negro', value: 'black' },
  { label: 'Blanco', value: 'white' },
];

const BUTTON_SHAPES = [
  { label: 'Rectángulo (Por defecto)', value: 'rect' },
  { label: 'Píldora (Redondeado)', value: 'pill' },
];

const PaymentSettings: React.FC<Props> = ({ calendarId, calendarGroups = [], onRegisterSave }) => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  // Campos del formulario
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [sandboxMode, setSandboxMode] = useState(true);
  const [buttonColor, setButtonColor] = useState('gold');
  const [buttonShape, setButtonShape] = useState('rect');
  const [cardCountry, setCardCountry] = useState('HN');
  const [enableAltCurrency, setEnableAltCurrency] = useState(false);
  const [altCurrency, setAltCurrency] = useState('HNL');
  const [exchangeRate, setExchangeRate] = useState('24.65');
  const [enabled, setEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Suscribirse a las configuraciones de pago del usuario para ESTE calendario
  useEffect(() => {
    if (!user?.uid || !calendarId) { setLoading(false); return; }
    const q = query(collection(db, 'payment_configs'), where('ownerUid', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setConfigs(all.filter((c: any) => c.calendarId === calendarId));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user?.uid, calendarId]);

  const resetForm = () => {
    setEditingConfig(null);
    setDescription('');
    setSelectedGroupId('all');
    setPrice('');
    setCurrency('USD');
    setClientId('');
    setClientSecret('');
    setSandboxMode(true);
    setButtonColor('gold');
    setButtonShape('rect');
    setCardCountry('HN');
    setEnableAltCurrency(false);
    setAltCurrency('HNL');
    setExchangeRate('24.65');
    setEnabled(true);
    setError(null);
    setSuccess(false);
  };

  const handleCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleEdit = (cfg: any) => {
    setEditingConfig(cfg);
    setDescription(cfg.description || '');
    setSelectedGroupId(cfg.groupId || 'all');
    setPrice(cfg.price || '');
    setCurrency(cfg.currency || 'USD');
    setClientId(cfg.clientId || '');
    setClientSecret(cfg.clientId ? SECRET_PLACEHOLDER : '');
    setSandboxMode(typeof cfg.sandboxMode !== 'undefined' ? cfg.sandboxMode : true);
    setButtonColor(cfg.buttonColor || 'gold');
    setButtonShape(cfg.buttonShape || 'rect');
    setCardCountry(cfg.cardCountry || 'HN');
    setEnableAltCurrency(!!cfg.altCurrency);
    setAltCurrency(cfg.altCurrency || 'HNL');
    setExchangeRate(cfg.exchangeRate || '24.65');
    setEnabled(typeof cfg.enabled !== 'undefined' ? cfg.enabled : true);
    setError(null);
    setSuccess(false);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta configuración de pagos?')) return;
    try {
      await deleteDoc(doc(db, 'payment_configs', id));
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!calendarId) {
      setError('No se pudo determinar el calendario asociado.');
      return;
    }
    if (enabled) {
      if (!clientId) {
        setError('El Client ID de PayPal es requerido para habilitar el checkout.');
        return;
      }
      if (!clientSecret) {
        setError('La Llave Secreta (Secret) de PayPal es requerida.');
        return;
      }
    }

    setSaving(true);
    try {
      if (functions) {
        const { httpsCallable } = await import('firebase/functions');
        const saveFn = httpsCallable(functions, 'savePaypalConfig');
        await saveFn({
          configId: editingConfig?.id || null,
          calendarId,
          groupId: selectedGroupId,
          price: price || '0.00',
          currency,
          description,
          clientId,
          clientSecret,
          sandboxMode,
          buttonColor,
          buttonShape,
          cardCountry,
          altCurrency: enableAltCurrency ? altCurrency : '',
          exchangeRate: enableAltCurrency ? exchangeRate : '1',
          enabled,
        });
        setSuccess(true);
        setTimeout(() => { setIsEditing(false); setSuccess(false); }, 1200);
      }
    } catch (err: any) {
      console.error('Error guardando config de pagos:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  // Registrar la acción primaria para el botón global de "Guardar" del editor:
  // en modo edición guarda el formulario; en modo lista crea una nueva config.
  const primaryRef = useRef<() => void>(() => {});
  primaryRef.current = isEditing ? () => handleSave() : () => handleCreate();
  useEffect(() => { onRegisterSave?.(() => primaryRef.current()); }, [onRegisterSave]);

  const groupName = (groupId: string) => {
    if (!groupId || groupId === 'all') return 'Todos los grupos';
    const g = calendarGroups.find((x) => x.id === groupId);
    return g?.name || 'Servicio específico';
  };

  // ── Modo edición / creación ──────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="srf-panel pb-10 rounded-b-2xl">
        {/* Sticky toolbar */}
        <div className="builder-embedded-toolbar sticky top-0 z-20 srf-sunken/95 backdrop-blur-md border-b hairline shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-5 py-3 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard className="w-4 h-4 ink-3 shrink-0" />
              <h3 className="ink-1 font-bold text-[14px] tracking-tight truncate">
                {editingConfig ? 'Editar configuración de pago' : 'Nueva configuración de pago'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setError(null); }}
                className="px-4 py-2 border hairline ink-2 hover:srf-sunken rounded-xl text-[13px] font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-md shadow-black/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : (<><Save className="w-4 h-4" /> Guardar</>)}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-4 md:p-6 max-w-3xl mx-auto space-y-8">

          {/* Sección A: Asociación y datos generales */}
          <div className="space-y-4">
            <h4 className="text-[13px] font-extrabold ink-3 uppercase tracking-widest block border-b hairline pb-1">Asociación y Datos Generales</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Descripción de Configuración</label>
                <input
                  type="text"
                  placeholder="Ej. PayPal — Servicio Asesorías"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-[13px] font-semibold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Habilitar Método</label>
                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setEnabled(!enabled)} className="relative cursor-pointer focus:outline-none shrink-0">
                    <div className={`w-11 h-6 rounded-full transition-colors ${enabled ? 'accent-bg' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 srf-panel w-5 h-5 rounded-full transition-transform duration-200 shadow ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </button>
                  <span className="text-[13px] font-bold ink-1 select-none cursor-pointer" onClick={() => setEnabled(!enabled)}>
                    {enabled ? 'Habilitado y Activo' : 'Desactivado temporalmente'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Servicio / Grupo específico</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
              >
                <option value="all">Todos los grupos (General)</option>
                {calendarGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name || g.id}</option>
                ))}
              </select>
              <p className="text-[11px] ink-3 font-semibold mt-1.5 ml-1">
                Elige a qué servicio/grupo de este calendario aplica este cobro. "Todos los grupos" cobra de forma general.
              </p>
            </div>
          </div>

          {/* Sección B: Credenciales */}
          <div className="space-y-4">
            <h4 className="text-[13px] font-extrabold ink-3 uppercase tracking-widest block border-b hairline pb-1">Credenciales de PayPal</h4>

            <div className="srf-sunken p-4 rounded-2xl border hairline">
              <div className="flex items-center gap-2 ink-1 font-bold text-[11px] uppercase tracking-wider mb-2">
                <HelpCircle className="w-4 h-4 ink-3" /> Cómo obtener tus credenciales
              </div>
              <ul className="text-[11.5px] ink-2 space-y-1.5 list-disc pl-4 font-semibold leading-relaxed">
                <li>Accede a <a href="https://developer.paypal.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developer.paypal.com</a> → <strong>Log in to Dashboard</strong>.</li>
                <li>En <strong>Apps &amp; Credentials</strong> haz clic en <strong>Create App</strong>.</li>
                <li>Copia el <strong>Client ID</strong> y el <strong>Secret</strong> y pégalos abajo.</li>
                <li className="text-amber-700">Para cobros reales, apaga el modo Sandbox (requiere cuenta de negocios).</li>
              </ul>
            </div>

            <div>
              <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Client ID</label>
              <input
                type="text"
                placeholder="AWudDtSX4eTP22T7i..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-4 py-2.5 text-[13px] font-mono srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm break-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Secret (Llave Secreta)</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="EKqG7iVHb13cc..."
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 text-[13px] font-mono srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm break-all"
                />
                <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 ink-3 hover:ink-2 focus:outline-none cursor-pointer">
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10.5px] ink-3 font-semibold mt-1.5 ml-1">
                La llave secreta se almacena de forma segura y nunca se expone públicamente.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={() => setSandboxMode(!sandboxMode)} className="relative cursor-pointer focus:outline-none shrink-0">
                <div className={`w-11 h-6 rounded-full transition-colors ${sandboxMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 srf-panel w-5 h-5 rounded-full transition-transform duration-200 shadow ${sandboxMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
              <span className="text-[13px] font-bold ink-1 select-none cursor-pointer" onClick={() => setSandboxMode(!sandboxMode)}>
                Modo SANDBOX habilitado (para realizar pruebas)
              </span>
            </div>
          </div>

          {/* Sección C: Precios y estilos */}
          <div className="space-y-4">
            <h4 className="text-[13px] font-extrabold ink-3 uppercase tracking-widest block border-b hairline pb-1">Precios y Estilos</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Moneda Principal</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
                >
                  {CURRENCY_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Precio base del servicio</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ink-3" />
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-[13px] font-bold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Color del Botón</label>
                <select value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold">
                  {BUTTON_COLORS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Forma del Botón</label>
                <select value={buttonShape} onChange={(e) => setButtonShape(e.target.value)} className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold">
                  {BUTTON_SHAPES.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">País por defecto (Tarjeta)</label>
                <select value={cardCountry} onChange={(e) => setCardCountry(e.target.value)} className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold">
                  {COUNTRY_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
            </div>

            {/* Conversión de moneda informativa */}
            <div className="srf-sunken border hairline p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold ink-1">Conversión de Moneda Informativa</span>
                  <p className="text-[11px] ink-3 font-semibold mt-0.5">Muestra un precio aproximado en una moneda alterna para guiar al cliente.</p>
                </div>
                <button type="button" onClick={() => setEnableAltCurrency(!enableAltCurrency)} className="relative cursor-pointer focus:outline-none shrink-0">
                  {enableAltCurrency ? <ToggleRight className="w-8 h-8 text-black" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                </button>
              </div>

              {enableAltCurrency && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Moneda Alterna</label>
                    <input type="text" placeholder="Ej. HNL" value={altCurrency} onChange={(e) => setAltCurrency(e.target.value.toUpperCase())} className="w-full px-4 py-2.5 text-[13px] font-bold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Factor de Cambio Manual</label>
                    <input type="number" step="0.0001" placeholder="Ej. 24.65" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="w-full px-4 py-2.5 text-[13px] font-bold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Banners */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-[13px] text-red-700">
              <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
              <div><p className="font-bold">Error de Configuración</p><p className="mt-0.5 font-semibold text-red-600/90">{error}</p></div>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-[13px] text-emerald-700">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <div><p className="font-bold">Configuración Guardada</p><p className="mt-0.5 font-semibold text-emerald-600/90">Tus cambios se validaron y guardaron de forma segura.</p></div>
            </div>
          )}
        </form>
      </div>
    );
  }

  // ── Modo lista ───────────────────────────────────────────────────────
  return (
    <div className="srf-panel pb-10 rounded-b-2xl">
      <div className="builder-embedded-toolbar sticky top-0 z-20 srf-sunken/95 backdrop-blur-md border-b hairline shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-5 py-3 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 ink-3 shrink-0" />
            <h3 className="ink-1 font-bold text-[14px] tracking-tight truncate">Módulo de Pago</h3>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-md shadow-black/20 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Nueva configuración
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-start gap-3 p-4 srf-sunken border hairline rounded-2xl">
          <Info className="w-4.5 h-4.5 ink-3 shrink-0 mt-0.5" />
          <p className="text-[13px] ink-2 leading-relaxed">
            Configura aquí los cobros de este calendario con PayPal: precio, moneda, credenciales y
            estilos del botón. Puedes tener una configuración general ("Todos los grupos") o una por
            servicio/grupo. El cobro se verifica de forma segura en el servidor.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 ink-3 text-[13px] font-semibold gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Cargando configuraciones...
          </div>
        ) : configs.length === 0 ? (
          <div className="srf-panel border hairline rounded-2xl p-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-full srf-sunken border hairline flex items-center justify-center mb-3">
              <DollarSign className="w-6 h-6 ink-3" />
            </div>
            <h4 className="ink-1 font-bold text-[15px]">Sin métodos de pago</h4>
            <p className="ink-3 text-[12px] mt-1.5 max-w-sm leading-relaxed font-semibold">
              Las citas de este calendario son gratuitas. Crea una configuración de PayPal para cobrar online.
            </p>
            <button type="button" onClick={handleCreate} className="mt-5 px-5 py-2.5 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-black/20">
              <PlusCircle className="w-4 h-4" /> Crear configuración
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg) => (
              <div key={cfg.id} className={`srf-panel border p-5 rounded-2xl shadow-sm relative ${cfg.enabled ? 'hairline' : 'hairline srf-sunken opacity-80'}`}>
                <div className="absolute top-5 right-5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider ink-3">{cfg.enabled ? 'Activo' : 'Desactivado'}</span>
                </div>

                <h3 className="font-extrabold text-[15px] ink-1 tracking-tight pr-20 truncate">{cfg.description || 'Configuración sin nombre'}</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-xs ink-3 font-semibold flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Servicio: <strong className="ink-1">{groupName(cfg.groupId)}</strong></p>
                  <p className="text-xs ink-3 font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Modo: <strong className="ink-1">{cfg.sandboxMode ? 'Sandbox (pruebas)' : 'Producción'}</strong>
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t hairline flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest ink-3 block">Precio</span>
                    <span className="text-lg font-black ink-1">{cfg.currency} {parseFloat(cfg.price || '0').toFixed(2)}</span>
                    {cfg.altCurrency && (
                      <span className="text-[12px] font-extrabold text-emerald-700 ml-2">~ {cfg.altCurrency} {(parseFloat(cfg.price || '0') * parseFloat(cfg.exchangeRate || '1')).toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(cfg)} className="p-2 border hairline ink-2 hover:text-black hover:srf-sunken rounded-xl transition-all cursor-pointer shadow-sm active:scale-95" title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(cfg.id)} className="p-2 border border-red-100 hover:border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSettings;
