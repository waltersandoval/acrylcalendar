/**
 * VISTA: PaymentConfigsView
 * Dominio: pagos
 *
 * Permite a los usuarios administrar sus configuraciones de pago de forma centralizada.
 * Cada configuración puede vincularse a un calendario y a un grupo/servicio específico,
 * permitiendo configurar el método de pago a nivel granular.
 */
import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Edit2, ChevronLeft, Save, CreditCard, Eye, EyeOff, AlertCircle, CheckCircle, HelpCircle, DollarSign, Globe, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { useHeaderActions } from '../../lib/headerActions';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

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
  { label: 'Otros (Por defecto)', value: 'US' },
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

const PaymentConfigsView: React.FC = () => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  // Campos del Formulario
  const [description, setDescription] = useState('');
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [sandboxMode, setSandboxMode] = useState(true);
  const [buttonColor, setButtonColor] = useState('gold');
  const [buttonShape, setButtonShape] = useState('rect');
  const [cardCountry, setCardCountry] = useState('HN');
  
  // Conversión Alterna
  const [enableAltCurrency, setEnableAltCurrency] = useState(false);
  const [altCurrency, setAltCurrency] = useState('HNL');
  const [exchangeRate, setExchangeRate] = useState('24.65');
  const [enabled, setEnabled] = useState(true);

  // Estados del envío
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Suscribirse a los calendarios del usuario
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'calendars'), where('memberUids', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setCalendars(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [user?.uid]);

  // Suscribirse a las configuraciones de pago del usuario
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'payment_configs'), where('ownerUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setConfigs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [user?.uid]);

  // Obtener los grupos del calendario seleccionado
  const selectedCalendar = calendars.find(c => c.id === selectedCalendarId);
  const calendarGroups = selectedCalendar?.section_SCHEDULING?.groups || [];

  const handleCreate = () => {
    setEditingConfig(null);
    setDescription('');
    setSelectedCalendarId(calendars[0]?.id || '');
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
    setIsEditing(true);
  };

  const handleEdit = (cfg: any) => {
    setEditingConfig(cfg);
    setDescription(cfg.description || '');
    setSelectedCalendarId(cfg.calendarId || '');
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

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedCalendarId) {
      setError('Debes seleccionar un calendario asociado.');
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
          calendarId: selectedCalendarId,
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
        setTimeout(() => setIsEditing(false), 1500);
      }
    } catch (err: any) {
      console.error('Error guardando config de pagos:', err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  // Acciones publicadas en el header flotante (posición fija, reutilizable).
  // Refs para evitar closures obsoletas: el botón del header siempre invoca la
  // última versión del handler con el estado actual del formulario.
  const saveRef = useRef<() => void>(() => {});
  const createRef = useRef<() => void>(() => {});
  saveRef.current = () => { handleSave(); };
  createRef.current = () => { handleCreate(); };
  useHeaderActions(
    isEditing
      ? [
          { label: 'Cancelar', variant: 'ghost', onClick: () => setIsEditing(false) },
          { label: 'Guardar', variant: 'primary', icon: <Save className="w-4 h-4" />, onClick: () => saveRef.current(), loading: saving },
        ]
      : [
          { label: 'Configurar pagos', variant: 'primary', icon: <PlusCircle className="w-4 h-4" />, onClick: () => createRef.current() },
        ],
    [isEditing, saving],
  );

  if (isEditing) {
    return (
      <div className="srf-panel pb-10 rounded-2xl border hairline shadow-sm animate-in fade-in duration-300">

        {/* Form Body (las acciones Guardar/Cancelar viven en el header flotante) */}
        <form onSubmit={handleSave} className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
          
          <div className="border-b hairline pb-4">
            <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 ink-1" />
              PayPal Configuraciones
            </h2>
            <p className="text-xs ink-3 mt-1.5 leading-relaxed font-semibold">
              Configura tu cuenta de cobros, asóciala a un calendario o grupo específico, y define el precio de tus citas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Columna Izquierda: Instrucciones */}
            <div className="lg:col-span-4 space-y-4 srf-sunken p-5 rounded-2xl border hairline shadow-inner">
              <div className="flex items-center gap-2 ink-1 font-bold text-xs uppercase tracking-wider">
                <HelpCircle className="w-4.5 h-4.5 ink-3" />
                Instrucciones
              </div>
              <ul className="text-[11.5px] ink-2 space-y-3 list-disc pl-4 font-semibold leading-relaxed">
                <li>Asigna una **Descripción** (nombre interno) para identificar tu configuración.</li>
                <li>Selecciona el **Calendario** y el **Servicio** (Grupo) específico que cobrará este monto. Puedes usar "Todos los grupos" para cobro general.</li>
                <li>Acceda a <a href="https://developer.paypal.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developer.paypal.com</a>.</li>
                <li>Haga clic en <strong>Log in to Dashboard</strong> e ingrese sus credenciales.</li>
                <li>En la sección <strong>Apps & Credentials</strong> haga clic en <strong>Create App</strong>.</li>
                <li>Copie el <strong>Client ID</strong> y <strong>Secret</strong> y péguelos en el formulario.</li>
                <li>Elige el **país por defecto** de tu mercado para pre-cargar la dirección y esconder campos innecesarios en la tarjeta de crédito.</li>
                <li className="text-amber-700 font-bold">Importante: Para transacciones reales usa el modo Sandbox apagado, pero asegúrate de tener una cuenta de negocios en PayPal.</li>
              </ul>
            </div>

            {/* Columna Derecha: Formulario */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Sección A: Identificación e Integración */}
              <div className="space-y-4">
                <h4 className="text-[13px] font-extrabold ink-3 uppercase tracking-widest block border-b hairline pb-1">Asociación y Datos Generales</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Descripción de Configuración</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. PayPal Walter - Servicio Asesorías"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 text-[13px] font-semibold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Habilitar Método</label>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEnabled(!enabled)}
                        className="relative cursor-pointer focus:outline-none shrink-0"
                      >
                        <div className={`w-11 h-6 rounded-full transition-colors ${enabled ? 'accent-bg' : 'bg-slate-350 bg-slate-300'}`}>
                          <div className={`absolute top-0.5 left-0.5 srf-panel w-5 h-5 rounded-full transition-transform duration-200 shadow ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </button>
                      <span className="text-[13px] font-bold ink-1 select-none cursor-pointer" onClick={() => setEnabled(!enabled)}>
                        {enabled ? 'Habilitado y Activo' : 'Desactivado temporalmente'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Calendario a asociar</label>
                    <select
                      value={selectedCalendarId}
                      onChange={(e) => {
                        setSelectedCalendarId(e.target.value);
                        setSelectedGroupId('all');
                      }}
                      className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
                    >
                      <option value="" disabled>Selecciona un calendario</option>
                      {calendars.map(c => (
                        <option key={c.id} value={c.id}>{c.title || 'Sin título'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Servicio / Grupo específico</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
                    >
                      <option value="all">Todos los grupos (General)</option>
                      {calendarGroups.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.title || g.name || g.id}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección B: PayPal API Credentials */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[13px] font-extrabold ink-3 uppercase tracking-widest block border-b hairline pb-1">Credenciales de PayPal</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Client ID</label>
                    <input
                      type="text"
                      placeholder="AWudDtSX4eTP22T7i..."
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-4 py-2.5 text-[13px] font-mono srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm break-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Secret (Llave Secreta)</label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        placeholder="EKqG7iVHb13cc..."
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 text-[13px] font-mono srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm break-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 ink-3 hover:ink-2 focus:outline-none cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSandboxMode(!sandboxMode)}
                    className="relative cursor-pointer focus:outline-none shrink-0"
                  >
                    <div className={`w-11 h-6 rounded-full transition-colors ${sandboxMode ? 'bg-blue-500' : 'bg-slate-350 bg-slate-300'}`}>
                      <div className={`absolute top-0.5 left-0.5 srf-panel w-5 h-5 rounded-full transition-transform duration-200 shadow ${sandboxMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </button>
                  <span className="text-[13px] font-bold ink-1 select-none cursor-pointer" onClick={() => setSandboxMode(!sandboxMode)}>
                    Modo SANDBOX habilitado (para realizar pruebas)
                  </span>
                </div>
              </div>

              {/* Sección C: Precios, Personalización y Conversión */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[13px] font-extrabold ink-3 uppercase tracking-widest block border-b hairline pb-1">Precios y Estilos</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Moneda Principal</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
                    >
                      {CURRENCY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Precio</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ink-3" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
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
                    <select
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold"
                    >
                      {BUTTON_COLORS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Forma del Botón</label>
                    <select
                      value={buttonShape}
                      onChange={(e) => setButtonShape(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold"
                    >
                      {BUTTON_SHAPES.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">País por defecto (Tarjeta)</label>
                    <select
                      value={cardCountry}
                      onChange={(e) => setCardCountry(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold"
                    >
                      {COUNTRY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub-sección: Conversión de moneda */}
                <div className="srf-sunken border hairline p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold ink-1">Conversión de Moneda Informativa</span>
                      <p className="text-[11px] ink-3 font-semibold mt-0.5">Muestra un precio aproximado en una moneda alterna para guiar al cliente.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableAltCurrency(!enableAltCurrency)}
                      className="relative cursor-pointer focus:outline-none shrink-0"
                    >
                      {enableAltCurrency ? <ToggleRight className="w-8 h-8 text-black" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                    </button>
                  </div>

                  {enableAltCurrency && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <div>
                        <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Moneda Alterna</label>
                        <input
                          type="text"
                          placeholder="Ej. HNL"
                          value={altCurrency}
                          onChange={(e) => setAltCurrency(e.target.value.toUpperCase())}
                          className="w-full px-4 py-2.5 text-[13px] font-bold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 ml-1">Factor de Cambio Manual</label>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="Ej. 24.65"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          className="w-full px-4 py-2.5 text-[13px] font-bold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Banners y Botón de guardar */}
              <div className="space-y-4 pt-4 border-t border-slate-150 hairline">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-[13px] text-red-700 animate-in fade-in">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Error de Configuración</p>
                      <p className="mt-0.5 font-semibold text-red-600/90">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-[13px] text-emerald-700 animate-in fade-in">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Configuración Guardada</p>
                      <p className="mt-0.5 font-semibold text-emerald-600/90 font-medium">Tus cambios han sido guardados y validados de forma totalmente segura.</p>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>

        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* La acción "Configurar pagos" vive en el header flotante (reutilizable) */}

      {/* List configs */}
      {configs.length === 0 ? (
        <div className="srf-panel border hairline rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
          <div className="w-16 h-16 rounded-full srf-sunken border hairline flex items-center justify-center mb-4">
            <CreditCard className="w-7 h-7 ink-3" />
          </div>
          <h3 className="ink-1 font-bold text-base">No hay métodos de pago configurados</h3>
          <p className="ink-3 text-xs mt-1.5 max-w-sm leading-relaxed font-semibold">
            Configura tu primera cuenta de cobro de PayPal haciendo clic en el botón superior derecho para enlazar tus servicios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((cfg) => {
            const linkedCalendar = calendars.find(c => c.id === cfg.calendarId);
            const matchedGroup = linkedCalendar?.section_SCHEDULING?.groups?.find((g: any) => g.id === cfg.groupId);
            const groupName = cfg.groupId === 'all' ? 'Todos los grupos' : (matchedGroup?.title || matchedGroup?.name || 'Servicio específico');

            return (
              <div key={cfg.id} className={`srf-panel border p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4 relative group ${cfg.enabled ? 'hairline' : 'hairline srf-sunken opacity-75'}`}>
                
                {/* Active/Inactive Badge */}
                <div className="absolute top-5 right-5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider ink-3">
                    {cfg.enabled ? 'Activo' : 'Desactivado'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-extrabold text-[15px] ink-1 tracking-tight pr-14 truncate">
                    {cfg.description || 'Configuración sin nombre'}
                  </h3>
                  
                  <div className="space-y-1">
                    <p className="text-xs ink-3 font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 ink-3" />
                      Calendario: <strong className="ink-1">{cfg.calendarName || 'No asignado'}</strong>
                    </p>
                    <p className="text-xs ink-3 font-semibold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 ink-3" />
                      Servicio: <strong className="ink-1">{groupName}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t hairline flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest ink-3 block">Precio Principal</span>
                      <span className="text-lg font-black ink-1">
                        {cfg.currency} {parseFloat(cfg.price).toFixed(2)}
                      </span>
                    </div>

                    {cfg.altCurrency && (
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest ink-3 block">Conversión de Referencia</span>
                        <span className="text-[13px] font-extrabold text-emerald-700">
                          ~ {cfg.altCurrency} {(parseFloat(cfg.price) * parseFloat(cfg.exchangeRate)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-2 pt-2 border-t hairline justify-end">
                  <button
                    onClick={() => handleEdit(cfg)}
                    className="p-2 border hairline ink-2 hover:text-black hover:srf-sunken rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cfg.id)}
                    className="p-2 border border-red-100 hover:border-red-200 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default PaymentConfigsView;
