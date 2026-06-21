/**
 * VISTA: PaymentConfigsView
 * Dominio: pagos
 *
 * Permite a los usuarios administrar sus configuraciones de pago de forma centralizada.
 * Cada configuración puede vincularse a un calendario y a un grupo/servicio específico,
 * permitiendo configurar el método de pago a nivel granular.
 */
import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Edit2, ChevronLeft, Save, CreditCard, Eye, EyeOff, AlertCircle, CheckCircle, HelpCircle, DollarSign, Globe, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

  if (isEditing) {
    return (
      <div className="bg-white pb-10 rounded-2xl border border-slate-200/60 shadow-sm animate-in fade-in duration-300">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/60 rounded-t-2xl">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-bold bg-white border border-slate-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" /> Volver a la Lista
            </button>
            <div className="flex items-center gap-3">
              <h3 className="text-slate-900 font-extrabold text-sm tracking-tight hidden md:block">
                {editingConfig ? 'Editar Configuración' : 'Nueva Configuración de Pagos'}
              </h3>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
          
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-slate-800" />
              PayPal Configuraciones
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">
              Configura tu cuenta de cobros, asóciala a un calendario o grupo específico, y define el precio de tus citas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Columna Izquierda: Instrucciones */}
            <div className="lg:col-span-4 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 shadow-inner">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <HelpCircle className="w-4.5 h-4.5 text-slate-500" />
                Instrucciones
              </div>
              <ul className="text-[11.5px] text-slate-600 space-y-3 list-disc pl-4 font-semibold leading-relaxed">
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
                <h4 className="text-[13px] font-extrabold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Asociación y Datos Generales</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Descripción de Configuración</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. PayPal Walter - Servicio Asesorías"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 text-[13px] font-semibold bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Habilitar Método</label>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setEnabled(!enabled)}
                        className="relative cursor-pointer focus:outline-none shrink-0"
                      >
                        <div className={`w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-black' : 'bg-slate-350 bg-slate-300'}`}>
                          <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 shadow ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </button>
                      <span className="text-[13px] font-bold text-slate-700 select-none cursor-pointer" onClick={() => setEnabled(!enabled)}>
                        {enabled ? 'Habilitado y Activo' : 'Desactivado temporalmente'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Calendario a asociar</label>
                    <select
                      value={selectedCalendarId}
                      onChange={(e) => {
                        setSelectedCalendarId(e.target.value);
                        setSelectedGroupId('all');
                      }}
                      className="w-full text-[13px] px-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
                    >
                      <option value="" disabled>Selecciona un calendario</option>
                      {calendars.map(c => (
                        <option key={c.id} value={c.id}>{c.title || 'Sin título'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Servicio / Grupo específico</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
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
                <h4 className="text-[13px] font-extrabold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Credenciales de PayPal</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Client ID</label>
                    <input
                      type="text"
                      placeholder="AWudDtSX4eTP22T7i..."
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="w-full px-4 py-2.5 text-[13px] font-mono bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm break-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Secret (Llave Secreta)</label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        placeholder="EKqG7iVHb13cc..."
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 text-[13px] font-mono bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm break-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
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
                      <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 shadow ${sandboxMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </button>
                  <span className="text-[13px] font-bold text-slate-700 select-none cursor-pointer" onClick={() => setSandboxMode(!sandboxMode)}>
                    Modo SANDBOX habilitado (para realizar pruebas)
                  </span>
                </div>
              </div>

              {/* Sección C: Precios, Personalización y Conversión */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[13px] font-extrabold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1">Precios y Estilos</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Moneda Principal</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
                    >
                      {CURRENCY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Precio</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-[13px] font-bold bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Color del Botón</label>
                    <select
                      value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold"
                    >
                      {BUTTON_COLORS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Forma del Botón</label>
                    <select
                      value={buttonShape}
                      onChange={(e) => setButtonShape(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold"
                    >
                      {BUTTON_SHAPES.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">País por defecto (Tarjeta)</label>
                    <select
                      value={cardCountry}
                      onChange={(e) => setCardCountry(e.target.value)}
                      className="w-full text-[13px] px-3 py-2.5 bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm font-semibold"
                    >
                      {COUNTRY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub-sección: Conversión de moneda */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-slate-800">Conversión de Moneda Informativa</span>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Muestra un precio aproximado en una moneda alterna para guiar al cliente.</p>
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
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Moneda Alterna</label>
                        <input
                          type="text"
                          placeholder="Ej. HNL"
                          value={altCurrency}
                          onChange={(e) => setAltCurrency(e.target.value.toUpperCase())}
                          className="w-full px-4 py-2.5 text-[13px] font-bold bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">Factor de Cambio Manual</label>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="Ej. 24.65"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(e.target.value)}
                          className="w-full px-4 py-2.5 text-[13px] font-bold bg-white rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Banners y Botón de guardar */}
              <div className="space-y-4 pt-4 border-t border-slate-150 border-slate-100">
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

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-3 text-[13px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl transition-all cursor-pointer shadow-sm hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 text-[13px] font-bold bg-black text-white hover:bg-slate-900 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-black/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Guardando y Validando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4.5 h-4.5" /> Guardar Configuración
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>

        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2 font-display">
            <CreditCard className="w-5.5 h-5.5 text-slate-800" />
            Configuraciones de Cobro
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Administra tus métodos de pago por PayPal, precios por calendario y conversiones informativas de moneda.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-5 py-2.5 bg-black hover:bg-slate-900 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-md shadow-black/15 cursor-pointer active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4.5 h-4.5" /> Crear Configuración
        </button>
      </div>

      {/* List configs */}
      {configs.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <CreditCard className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-slate-800 font-bold text-base">No hay métodos de pago configurados</h3>
          <p className="text-slate-400 text-xs mt-1.5 max-w-sm leading-relaxed font-semibold">
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
              <div key={cfg.id} className={`bg-white border p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-4 relative group ${cfg.enabled ? 'border-slate-200' : 'border-slate-200 bg-slate-50/40 opacity-75'}`}>
                
                {/* Active/Inactive Badge */}
                <div className="absolute top-5 right-5 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {cfg.enabled ? 'Activo' : 'Desactivado'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-extrabold text-[15px] text-slate-900 tracking-tight pr-14 truncate">
                    {cfg.description || 'Configuración sin nombre'}
                  </h3>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      Calendario: <strong className="text-slate-700">{cfg.calendarName || 'No asignado'}</strong>
                    </p>
                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      Servicio: <strong className="text-slate-700">{groupName}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Precio Principal</span>
                      <span className="text-lg font-black text-slate-900">
                        {cfg.currency} {parseFloat(cfg.price).toFixed(2)}
                      </span>
                    </div>

                    {cfg.altCurrency && (
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Conversión de Referencia</span>
                        <span className="text-[13px] font-extrabold text-emerald-700">
                          ~ {cfg.altCurrency} {(parseFloat(cfg.price) * parseFloat(cfg.exchangeRate)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-2 pt-2 border-t border-slate-100/60 justify-end">
                  <button
                    onClick={() => handleEdit(cfg)}
                    className="p-2 border border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
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
