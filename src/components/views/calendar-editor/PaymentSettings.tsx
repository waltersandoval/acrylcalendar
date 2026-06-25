/**
 * COMPONENTE: PaymentSettings
 * Dominio: calendar-editor
 *
 * VISTA DE SOLO LECTURA (resumen heredado).
 *
 * El módulo de pago ya NO se configura aquí: las credenciales de PayPal, el
 * precio, la moneda y los estilos del botón viven de forma centralizada en
 * "Configuración de Pagos" (colección `payment_configs`). Esta pestaña sólo
 * muestra un resumen del estado de pago heredado para este calendario y enlaza
 * a la configuración global para editarlo.
 *
 * Por qué: el backend (verifyPaypalAndCreateEvent) ya resuelve el precio y las
 * credenciales con precedencia GLOBAL-first (payment_configs como fuente
 * principal y section_PAYMENT sólo como fallback legacy). Tener un segundo
 * formulario de credenciales aquí duplicaba datos y, además, generaba configs
 * `payment_configs` duplicadas/erróneas. Centralizar evita esa confusión.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, ShieldCheck, ArrowRight, Info, DollarSign, AlertTriangle } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface Props {
  calendarId?: string;
  initialData?: any;
  onSave?: (data?: any) => void;
  calendarGroups?: { id: string; name: string }[];
  onRegisterSave?: (fn: () => void) => void;
  onNavigateToPayments?: () => void;
}

const PaymentSettings: React.FC<Props> = ({ calendarId, initialData, onRegisterSave, onNavigateToPayments }) => {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sección de solo lectura: registramos un guardado vacío para que el botón
  // global de "Guardar" del editor no falle al invocar esta sección.
  const noop = useRef<() => void>(() => {});
  useEffect(() => { onRegisterSave?.(() => noop.current()); }, [onRegisterSave]);

  // Configuraciones de pago globales del usuario, filtradas por este calendario.
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

  const activeConfigs = configs.filter((c) => c.enabled);
  const hasActive = activeConfigs.length > 0;
  const hasDisabledOnly = !hasActive && configs.length > 0;

  const legacy = initialData || {};
  const hasLegacyPrice = !!legacy.price && parseFloat(legacy.price) > 0;

  const groupLabel = (groupId: string) =>
    !groupId || groupId === 'all' ? 'Todos los grupos (general)' : 'Servicio / grupo específico';

  return (
    <div className="srf-panel pb-10 rounded-b-2xl">

      {/* ── Sticky Action Bar ─────────────────────────────────────────── */}
      <div className="builder-embedded-toolbar sticky top-0 z-20 srf-sunken/95 backdrop-blur-md border-b hairline shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-5 py-3 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 ink-3 shrink-0" />
            <h3 className="ink-1 font-bold text-[14px] tracking-tight truncate">
              Módulo de Pago
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToPayments?.()}
            className="px-5 py-2 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-md shadow-black/20 cursor-pointer"
          >
            Configurar pagos <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="p-4 max-w-2xl mx-auto space-y-6">

        {/* Explicación */}
        <div className="flex items-start gap-3 p-4 srf-sunken border hairline rounded-2xl">
          <Info className="w-4.5 h-4.5 ink-3 shrink-0 mt-0.5" />
          <p className="text-[13px] ink-2 leading-relaxed">
            La configuración de pagos (precio, moneda, credenciales de PayPal y estilos del botón)
            se administra de forma centralizada en{' '}
            <button
              type="button"
              onClick={() => onNavigateToPayments?.()}
              className="font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Configuración de Pagos
            </button>
            . Aquí ves un resumen de lo que aplica a este calendario.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 ink-3 text-[13px] font-semibold gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Cargando estado de pagos...
          </div>
        ) : hasActive ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-[14px] font-bold text-emerald-800">PayPal activo</p>
                <p className="text-[12px] text-emerald-700/90">
                  Este calendario cobra las citas online mediante PayPal.
                </p>
              </div>
            </div>

            {activeConfigs.map((cfg) => (
              <div key={cfg.id} className="srf-panel border hairline rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold ink-1 text-[14px] tracking-tight truncate pr-3">
                    {cfg.description || 'Configuración de pago'}
                  </h4>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full shrink-0">
                    Activo
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="ink-3 font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> {groupLabel(cfg.groupId)}
                  </span>
                  <span className="text-[18px] font-black ink-1 tracking-tight">
                    {cfg.currency} {parseFloat(cfg.price || '0').toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => onNavigateToPayments?.()}
              className="w-full flex items-center justify-center gap-2 py-3 srf-panel border hairline rounded-xl text-[13px] font-bold ink-2 hover:srf-sunken transition-all cursor-pointer"
            >
              Editar configuración de pagos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : hasDisabledOnly ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="text-[14px] font-bold">Pago desactivado</p>
                <p className="text-[12px] text-amber-700/90 mt-0.5">
                  Existe una configuración de pago para este calendario pero está desactivada.
                  Actívala desde Configuración de Pagos para cobrar las citas.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToPayments?.()}
              className="w-full flex items-center justify-center gap-2 py-3 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold transition-all cursor-pointer shadow-md shadow-black/20"
            >
              Ir a Configuración de Pagos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasLegacyPrice && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-amber-800">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="text-[14px] font-bold">Precio heredado (configuración anterior)</p>
                  <p className="text-[12px] text-amber-700/90 mt-0.5">
                    Este calendario tiene un precio anterior de{' '}
                    <strong>{legacy.currency || 'USD'} {parseFloat(legacy.price).toFixed(2)}</strong>.
                    Te recomendamos recrearlo en Configuración de Pagos para gestionarlo de forma centralizada.
                  </p>
                </div>
              </div>
            )}

            <div className="srf-panel border hairline rounded-2xl p-8 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full srf-sunken border hairline flex items-center justify-center mb-3">
                <DollarSign className="w-6 h-6 ink-3" />
              </div>
              <h4 className="ink-1 font-bold text-[15px]">No hay método de pago para este calendario</h4>
              <p className="ink-3 text-[12px] mt-1.5 max-w-sm leading-relaxed font-semibold">
                Las citas de este calendario son gratuitas. Para cobrar online, crea una
                configuración de PayPal y asóciala a este calendario.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToPayments?.()}
                className="mt-5 px-5 py-2.5 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-black/20"
              >
                Configurar pagos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentSettings;
