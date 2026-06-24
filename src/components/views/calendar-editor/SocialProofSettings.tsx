import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Eye, Info, Layout, Play, Clock } from 'lucide-react';

interface Props {
  initialData?: any;
  onSave?: (data: any) => void;
  onRegisterSave?: (fn: () => void) => void;
}

const SocialProofSettings: React.FC<Props> = ({
  initialData,
  onSave,
  onRegisterSave,
}) => {
  const [enabled, setEnabled] = useState<boolean>(initialData?.enabled || false);
  const [nameDisplay, setNameDisplay] = useState<string>(initialData?.nameDisplay || 'first');
  const [showService, setShowService] = useState<boolean>(initialData?.showService !== false);
  const [showCity, setShowCity] = useState<boolean>(initialData?.showCity !== false);
  const [minTimeLimit, setMinTimeLimit] = useState<string>(initialData?.minTimeLimit || '30m');
  const [frequency, setFrequency] = useState<number>(initialData?.frequency || 30);
  const [position, setPosition] = useState<string>(initialData?.position || 'bottom-left');
  const [animationType, setAnimationType] = useState<string>(initialData?.animationType || 'slide');

  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Sync loaded async initialData
  useEffect(() => {
    if (initialData) {
      setEnabled(!!initialData.enabled);
      setNameDisplay(initialData.nameDisplay || 'first');
      setShowService(initialData.showService !== false);
      setShowCity(initialData.showCity !== false);
      setMinTimeLimit(initialData.minTimeLimit || '30m');
      setFrequency(initialData.frequency || 30);
      setPosition(initialData.position || 'bottom-left');
      setAnimationType(initialData.animationType || 'slide');
    }
  }, [initialData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave?.({
        enabled,
        nameDisplay,
        showService,
        showCity,
        minTimeLimit,
        frequency: Number(frequency),
        position,
        animationType,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error al guardar configuración de prueba social:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveImpl = useRef<() => void>(() => {});
  saveImpl.current = handleSave;
  useEffect(() => {
    onRegisterSave?.(() => saveImpl.current());
  }, [onRegisterSave]);

  // Generar un preview textual rápido
  const getPreviewText = () => {
    let name = 'Mateo Sandoval';
    if (nameDisplay === 'first') name = 'Mateo';
    if (nameDisplay === 'initials') name = 'M. S.';

    let detail = '';
    if (showService && showCity) {
      detail = ' de Madrid reservó Asesoría Financiera';
    } else if (showService) {
      detail = ' reservó Asesoría Financiera';
    } else if (showCity) {
      detail = ' de Madrid agendó una cita';
    } else {
      detail = ' agendó una cita';
    }

    return `${name}${detail} hace 12 minutos`;
  };

  return (
    <div className="srf-panel pb-10 rounded-b-2xl">
      {/* Sticky Action Bar */}
      <div className="builder-embedded-toolbar sticky top-0 z-20 srf-sunken/95 backdrop-blur-md border-b hairline shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-5 py-3 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 ink-3 shrink-0" />
            <h3 className="ink-1 font-bold text-[14px] tracking-tight truncate">
              Prueba Social Automática
            </h3>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 accent-bg hover:brightness-110 text-white rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-md shadow-black/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Toggle principal */}
        <div className="flex items-center justify-between p-4 rounded-2xl srf-sunken border hairline">
          <div className="space-y-1">
            <label htmlFor="sp-enabled" className="text-sm font-bold ink-1 block cursor-pointer">
              Activar Prueba Social
            </label>
            <span className="text-xs ink-3 block leading-relaxed max-w-[240px]">
              Muestra notificaciones flotantes en tiempo real de citas recientes a tus nuevos visitantes.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              id="sp-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
          </label>
        </div>

        {enabled && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Live Preview Box */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Vista Previa del Widget
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 border hairline flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ⚡
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold ink-1 leading-relaxed">
                    {getPreviewText()}
                  </p>
                  <p className="text-[10px] ink-3 mt-0.5">Reserva verificada ✅</p>
                </div>
              </div>
            </div>

            {/* Visualización del Nombre */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3">
                Formato del nombre del cliente
              </label>
              <select
                value={nameDisplay}
                onChange={(e) => setNameDisplay(e.target.value)}
                className="w-full srf-sunken border hairline rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="full">Nombre completo (ej. Mateo Sandoval)</option>
                <option value="first">Solo primer nombre (ej. Mateo)</option>
                <option value="initials">Iniciales (ej. M. S.)</option>
              </select>
            </div>

            {/* Opciones de visualización */}
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3 block">
                Opciones adicionales
              </label>

              <div className="flex items-center justify-between p-3 rounded-xl srf-sunken border hairline">
                <span className="text-xs font-bold ink-2">Mostrar Servicio Reservado</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showService}
                    onChange={(e) => setShowService(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl srf-sunken border hairline">
                <span className="text-xs font-bold ink-2">Mostrar Ciudad</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCity}
                    onChange={(e) => setShowCity(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                </label>
              </div>
            </div>

            {/* Rango de Tiempo Limitado */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Antigüedad máxima de citas
              </label>
              <select
                value={minTimeLimit}
                onChange={(e) => setMinTimeLimit(e.target.value)}
                className="w-full srf-sunken border hairline rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
              >
                <option value="30m">Últimos 30 minutos</option>
                <option value="2h">Últimas 2 horas</option>
                <option value="12h">Últimas 12 horas</option>
                <option value="24h">Últimas 24 horas</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
              </select>
              <p className="text-[11px] ink-3 leading-relaxed">
                Determina qué tan antiguas pueden ser las reservas mostradas para no mostrar datos desactualizados.
              </p>
            </div>

            {/* Frecuencia de rotación */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3">
                Frecuencia de actualización
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full srf-sunken border hairline rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
              >
                <option value={10}>Cada 10 segundos</option>
                <option value={20}>Cada 20 segundos</option>
                <option value={30}>Cada 30 segundos</option>
                <option value={60}>Cada 60 segundos</option>
              </select>
            </div>

            {/* Posición en Pantalla */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3 flex items-center gap-1">
                <Layout className="w-3.5 h-3.5" /> Posición en pantalla
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full srf-sunken border hairline rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
              >
                <option value="bottom-left">Inferior izquierda (Recomendado)</option>
                <option value="bottom-right">Inferior derecha</option>
                <option value="top-left">Superior izquierda</option>
                <option value="top-right">Superior derecha</option>
              </select>
            </div>

            {/* Animación */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3 flex items-center gap-1">
                <Play className="w-3.5 h-3.5" /> Animación de entrada/salida
              </label>
              <select
                value={animationType}
                onChange={(e) => setAnimationType(e.target.value)}
                className="w-full srf-sunken border hairline rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none"
              >
                <option value="slide">Desplazamiento (Slide)</option>
                <option value="fade">Desvanecimiento (Fade)</option>
                <option value="scale">Escala (Scale)</option>
              </select>
            </div>
          </div>
        )}

        {/* Mensaje de éxito */}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl leading-relaxed animate-in fade-in">
            ¡Configuración de prueba social guardada con éxito!
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialProofSettings;
