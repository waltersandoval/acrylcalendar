/**
 * COMPONENTE: PaymentSettings
 * Dominio: calendar-editor
 *
 * Configura el módulo de pago de un calendario:
 * - Precio del servicio (en la moneda seleccionada)
 * - Habilitar/deshabilitar checkout con PayPal
 * - Los datos se guardan en section_PAYMENT del calendario
 *
 * Estructura guardada en Firestore (calendars/{id}.section_PAYMENT):
 * {
 *   price:          string  — precio del servicio (ej: "25.00")
 *   currency:       string  — código de moneda (ej: "USD")
 *   paypalEnabled:  boolean — si el checkout PayPal está activo
 * }
 */
import React, { useState } from 'react';
import { Save, CreditCard, DollarSign, ShieldCheck, ToggleLeft, ToggleRight, Info, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { functions } from '../../../lib/firebase';

interface Props {
  calendarId?: string;
  initialData?: any;
  onSave?: (data?: any) => void;
  calendarGroups?: { id: string; name: string }[];
}

const CURRENCY_OPTIONS = [
  { label: 'USD — Dólar Estadounidense', value: 'USD' },
  { label: 'EUR — Euro',                 value: 'EUR' },
  { label: 'HNL — Lempira Hondureño',   value: 'HNL' },
  { label: 'MXN — Peso Mexicano',        value: 'MXN' },
  { label: 'GTQ — Quetzal Guatemalteco', value: 'GTQ' },
];

// Monedas soportadas por PayPal Sandbox (subconjunto)
const PAYPAL_SUPPORTED_CURRENCIES = ['USD', 'EUR', 'MXN', 'GTQ'];

const SECRET_PLACEHOLDER = "••••••••••••••••••••••••";

const PaymentSettings: React.FC<Props> = ({ calendarId, initialData, onSave }) => {
  const [price,         setPrice]         = useState<string>(String(initialData?.price         || ''));
  const [currency,      setCurrency]      = useState<string>(initialData?.currency             || 'USD');
  const [paypalEnabled, setPaypalEnabled] = useState<boolean>(!!initialData?.paypalEnabled);

  // Nuevos estados para PayPal seguro
  const [description, setPaypalDescription] = useState<string>(initialData?.paypalDescription || '');
  const [clientId, setPaypalClientId]       = useState<string>(initialData?.paypalClientId || '');
  const [clientSecret, setPaypalSecret]     = useState<string>(
    initialData?.paypalConfigured ? SECRET_PLACEHOLDER : ''
  );
  const [sandboxMode, setSandboxMode]       = useState<boolean>(
    initialData?.paypalMode ? initialData.paypalMode === 'sandbox' : true
  );
  const [showSecret, setShowSecret]         = useState<boolean>(false);
  const [saving, setSaving]                 = useState<boolean>(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState<boolean>(false);

  const currencySupported = PAYPAL_SUPPORTED_CURRENCIES.includes(currency);
  const priceNum          = parseFloat(price);
  const hasPrice          = !isNaN(priceNum) && priceNum > 0;
  const canEnablePaypal   = hasPrice && currencySupported;

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    const priceNum = parseFloat(price);
    const hasPrice = !isNaN(priceNum) && priceNum > 0;
    const canEnable = hasPrice && currencySupported;

    // Si está habilitando PayPal, validar campos obligatorios
    if (paypalEnabled && canEnable) {
      if (!clientId) {
        setError('El Client ID de PayPal es requerido.');
        return;
      }
      if (!clientSecret) {
        setError('La Llave Secreta (Secret) de PayPal es requerida.');
        return;
      }
    }

    setSaving(true);
    try {
      if (functions && calendarId) {
        const { httpsCallable } = await import('firebase/functions');
        const saveFn = httpsCallable(functions, 'savePaypalConfig');
        await saveFn({
          calendarId,
          price: hasPrice ? priceNum.toFixed(2) : '',
          currency,
          paypalEnabled: canEnable ? paypalEnabled : false,
          description: canEnable && paypalEnabled ? description : '',
          clientId: canEnable && paypalEnabled ? clientId : '',
          clientSecret: canEnable && paypalEnabled ? clientSecret : '',
          sandboxMode: canEnable && paypalEnabled ? sandboxMode : true,
        });
      }

      onSave?.({
        price:          hasPrice ? priceNum.toFixed(2) : '',
        currency,
        paypalEnabled:  canEnable ? paypalEnabled : false,
        paypalClientId: canEnable && paypalEnabled ? clientId : '',
        paypalMode:     canEnable && paypalEnabled ? (sandboxMode ? 'sandbox' : 'live') : 'sandbox',
        paypalDescription: canEnable && paypalEnabled ? description : '',
        paypalConfigured: canEnable && paypalEnabled ? true : (initialData?.paypalConfigured || false)
      });
      setSuccess(true);
    } catch (err: any) {
      console.error('Error al guardar configuración de pagos:', err);
      setError(err.message || 'Error al guardar la configuración de pagos. Por favor verifica tus credenciales.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="srf-panel pb-10 rounded-b-2xl">

      {/* ── Sticky Action Bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 srf-sunken/95 backdrop-blur-md border-b hairline shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-5 py-3 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 ink-3 shrink-0" />
            <h3 className="ink-1 font-bold text-[14px] tracking-tight truncate">
              Módulo de Pago
            </h3>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-md shadow-black/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">

        {/* Sección: Precio */}
        <div className="space-y-4">
          <div>
            <h4 className="text-[16px] font-bold ink-1 tracking-tight">Precio del servicio</h4>
            <p className="text-[13px] ink-3 mt-1">
              Define cuánto cobrarás por cada cita. Si lo dejas en blanco, el servicio será gratuito.
            </p>
          </div>

          {/* Moneda + Precio en fila */}
          <div className="flex gap-3">
            {/* Selector de moneda */}
            <div className="w-48 shrink-0">
              <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 block mb-1.5 ml-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => { setCurrency(e.target.value); if (paypalEnabled) setPaypalEnabled(false); }}
                className="w-full text-[13px] px-3 py-2.5 srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm cursor-pointer font-semibold"
              >
                {CURRENCY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Campo de precio */}
            <div className="flex-1">
              <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 block mb-1.5 ml-1">
                Precio
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ink-3" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-[14px] font-bold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {hasPrice && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-700">
                <CreditCard className="w-4 h-4" />
                <span className="text-[13px] font-semibold">Precio configurado</span>
              </div>
              <span className="text-[22px] font-extrabold text-emerald-700 tracking-tight">
                {currency} {priceNum.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <hr className="hairline" />

        {/* Sección: PayPal Checkout */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-[16px] font-bold ink-1 tracking-tight">Checkout con PayPal</h4>
              <img
                src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg"
                alt="PayPal"
                className="h-5 rounded"
              />
            </div>
            <p className="text-[13px] ink-3">
              Permite que tus clientes paguen la cita online de forma segura con PayPal.
              La cita solo se confirma <strong>después</strong> de verificar el pago.
            </p>
          </div>

          {/* Toggle principal */}
          <button
            type="button"
            disabled={!canEnablePaypal}
            onClick={() => setPaypalEnabled(v => !v)}
            className={`w-full flex items-center justify-between gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              paypalEnabled && canEnablePaypal
                ? 'border-blue-500 bg-blue-50/60 shadow-md shadow-blue-100'
                : 'hairline srf-panel hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                paypalEnabled && canEnablePaypal ? 'bg-blue-100' : 'srf-sunken'
              }`}>
                <ShieldCheck className={`w-5 h-5 ${paypalEnabled && canEnablePaypal ? 'text-blue-600' : 'ink-3'}`} />
              </div>
              <div>
                <p className={`font-bold text-[14px] ${paypalEnabled && canEnablePaypal ? 'text-blue-900' : 'ink-1'}`}>
                  Habilitar PayPal Checkout
                </p>
                <p className="text-[12px] ink-3 mt-0.5">
                  El cliente paga antes de confirmar la cita
                </p>
              </div>
            </div>
            {paypalEnabled && canEnablePaypal
              ? <ToggleRight className="w-8 h-8 text-blue-500 shrink-0" />
              : <ToggleLeft  className="w-8 h-8 text-slate-300 shrink-0" />
            }
          </button>

          {/* Advertencias contextuales */}
          {!hasPrice && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              <p>Primero configura un <strong>precio mayor a 0</strong> para habilitar el checkout.</p>
            </div>
          )}

          {hasPrice && !currencySupported && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              <p>La moneda <strong>{currency}</strong> no es compatible con PayPal. Usa USD, EUR, MXN o GTQ.</p>
            </div>
          )}

          {paypalEnabled && canEnablePaypal && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* Contenedor del Formulario "PayPal Configuraciones" */}
              <div className="srf-sunken border hairline rounded-3xl p-6 space-y-6">
                <div className="border-b hairline pb-3 flex items-center justify-between">
                  <h4 className="font-extrabold ink-1 text-[18px] tracking-tight">
                    PayPal Configuraciones
                  </h4>
                  <span className="text-[11px] font-extrabold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Conexión Directa
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Columna Izquierda: Instrucciones */}
                  <div className="md:col-span-5 space-y-3 srf-panel p-5 rounded-2xl border hairline shadow-sm">
                    <p className="text-[12px] font-extrabold ink-3 uppercase tracking-wider">Instrucciones</p>
                    <ul className="text-[12px] ink-2 space-y-2.5 list-disc pl-4 font-semibold leading-relaxed">
                      <li>Por favor, ingrese una breve <strong>Descripción</strong> para esta configuración.</li>
                      <li>Acceda a <a href="https://developer.paypal.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developer.paypal.com</a></li>
                      <li>Haga clic en <strong>Log in to Dashboard</strong> en la esquina superior derecha e ingrese sus credenciales de PayPal.</li>
                      <li>En la sección de <strong>Apps & Credentials</strong> haga clic en <strong>Create App</strong>.</li>
                      <li>Ingrese el nombre de su aplicación y haga clic en <strong>Create App</strong>.</li>
                      <li>Copie su <strong>Client ID</strong> y su <strong>Secret</strong>, y péguelos en los campos correspondientes.</li>
                      <li className="text-amber-700">Recuerde: si usted elimina o desactiva su <strong>Llave secreta (Secret)</strong> en PayPal, el checkout dejará de funcionar.</li>
                    </ul>
                  </div>

                  {/* Columna Derecha: Formulario */}
                  <div className="md:col-span-7 space-y-4">
                    
                    {/* Input: Descripción */}
                    <div>
                      <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 block mb-1.5 ml-1">
                        Descripción
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Mi Cuenta de Negocios"
                        value={description}
                        onChange={(e) => setPaypalDescription(e.target.value)}
                        className="w-full px-4 py-2.5 text-[13px] font-semibold srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm"
                      />
                    </div>

                    {/* Input: Client ID */}
                    <div>
                      <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 block mb-1.5 ml-1">
                        Client ID
                      </label>
                      <input
                        type="text"
                        placeholder="AWudDtSX4eTP22T7i..."
                        value={clientId}
                        onChange={(e) => setPaypalClientId(e.target.value)}
                        className="w-full px-4 py-2.5 text-[13px] font-mono srf-panel rounded-xl border hairline outline-none focus:ring-2 focus:ring-black/20 focus:border-slate-400 shadow-sm break-all"
                      />
                    </div>

                    {/* Input: Secret */}
                    <div>
                      <label className="text-[11px] font-bold ink-3 uppercase tracking-wider block mb-1.5 block mb-1.5 ml-1">
                        Secret (Llave Secreta)
                      </label>
                      <div className="relative">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          placeholder="EKqG7iVHb13cc..."
                          value={clientSecret}
                          onChange={(e) => setPaypalSecret(e.target.value)}
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
                      <p className="text-[10.5px] ink-3 font-semibold mt-1.5 ml-1">
                        La llave secreta se almacena de forma segura y nunca se expone públicamente.
                      </p>
                    </div>

                    {/* Switch: Sandbox */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSandboxMode(!sandboxMode)}
                        className="relative cursor-pointer focus:outline-none shrink-0"
                      >
                        <div className={`w-11 h-6 rounded-full transition-colors ${sandboxMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 left-0.5 srf-panel w-5 h-5 rounded-full transition-transform duration-200 shadow ${sandboxMode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                      </button>
                      <span className="text-[13px] font-bold ink-1 select-none cursor-pointer" onClick={() => setSandboxMode(!sandboxMode)}>
                        Modo SANDBOX habilitado (para realizar pruebas)
                      </span>
                    </div>

                  </div>

                </div>

                {/* Banner de Estado (Error) */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-[13px] text-red-700 animate-in fade-in duration-200">
                    <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Error de Configuración</p>
                      <p className="mt-0.5 font-semibold text-red-600/90">{error}</p>
                    </div>
                  </div>
                )}

                {/* Banner de Estado (Success) */}
                {success && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-[13px] text-emerald-700 animate-in fade-in duration-200">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Configuración Guardada</p>
                      <p className="mt-0.5 font-semibold text-emerald-600/90 font-medium">Tus credenciales de PayPal han sido verificadas y guardadas de forma segura.</p>
                    </div>
                  </div>
                )}

              </div>
              
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PaymentSettings;
