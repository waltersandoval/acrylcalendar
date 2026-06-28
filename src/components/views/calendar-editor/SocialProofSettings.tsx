import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Eye, Info, Layout, Play, Clock, Search, Pencil, Trash2, Check, X, Users } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Props {
  calendarId?: string;
  initialData?: any;
  onSave?: (data: any) => void;
  onRegisterSave?: (fn: () => void) => void;
}

interface SpRecord {
  id: string;
  client: string;
  service: string;
  city: string;
  status: string;
  ts: number;
}

const SocialProofSettings: React.FC<Props> = ({
  calendarId,
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

  // ─────────────────────────────────────────────────────────────
  // Registros mostrados en la prueba social (colección social_proof_events).
  // El dueño puede buscarlos, editar el nombre/servicio/ciudad o eliminarlos.
  // ─────────────────────────────────────────────────────────────
  const [records, setRecords] = useState<SpRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ client: string; service: string; city: string }>({ client: '', service: '', city: '' });
  const [recordError, setRecordError] = useState<string | null>(null);
  const [savingRecord, setSavingRecord] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarId) {
      setRecords([]);
      setRecordsLoading(false);
      return;
    }
    setRecordsLoading(true);
    // Sin orderBy para no requerir un índice compuesto: ordenamos en cliente.
    const qy = query(collection(db, 'social_proof_events'), where('calendarId', '==', calendarId));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list: SpRecord[] = [];
        snap.forEach((d) => {
          const data: any = d.data();
          let ts = 0;
          if (data.timestamp) {
            try {
              ts = data.timestamp.toDate ? data.timestamp.toDate().getTime() : new Date(data.timestamp).getTime();
            } catch (e) { /* timestamp inválido: queda en 0 */ }
          }
          list.push({
            id: d.id,
            client: data.client || '',
            service: data.service || '',
            city: data.city || '',
            status: data.status || '',
            ts,
          });
        });
        list.sort((a, b) => b.ts - a.ts);
        setRecords(list);
        setRecordsLoading(false);
      },
      (err) => {
        console.error('Error al cargar registros de prueba social:', err);
        setRecordError('No se pudieron cargar los registros.');
        setRecordsLoading(false);
      }
    );
    return () => unsub();
  }, [calendarId]);

  const filteredRecords = records.filter((r) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      r.client.toLowerCase().includes(term) ||
      r.service.toLowerCase().includes(term) ||
      r.city.toLowerCase().includes(term)
    );
  });

  const startEdit = (r: SpRecord) => {
    setEditingId(r.id);
    setEditForm({ client: r.client, service: r.service, city: r.city });
    setRecordError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRecordError(null);
  };

  const saveEdit = async (id: string) => {
    setSavingRecord(true);
    setRecordError(null);
    try {
      await updateDoc(doc(db, 'social_proof_events', id), {
        client: editForm.client.trim() || 'Cliente',
        service: editForm.service.trim(),
        city: editForm.city.trim(),
      });
      setEditingId(null);
    } catch (err) {
      console.error('Error al actualizar registro de prueba social:', err);
      setRecordError('No se pudo guardar el cambio.');
    } finally {
      setSavingRecord(false);
    }
  };

  const deleteRecord = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de la prueba social? Dejará de mostrarse en el widget.')) return;
    setDeletingId(id);
    setRecordError(null);
    try {
      await deleteDoc(doc(db, 'social_proof_events', id));
    } catch (err) {
      console.error('Error al eliminar registro de prueba social:', err);
      setRecordError('No se pudo eliminar el registro.');
    } finally {
      setDeletingId(null);
    }
  };

  const relTime = (ts: number) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 0) return '';
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'hace un momento';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} d`;
  };

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

            {/* Registros / Nombres mostrados en la prueba social */}
            <div className="space-y-3 pt-4 border-t hairline">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Nombres registrados
                </label>
                <span className="text-[11px] font-bold ink-3 tabular-nums">{records.length}</span>
              </div>
              <p className="text-[11px] ink-3 leading-relaxed">
                Registros que el widget muestra a tus visitantes. Búscalos, edita el nombre, servicio o ciudad, o elimínalos. Los cambios afectan solo a la prueba social, no a la cita original.
              </p>

              {/* Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre, servicio o ciudad..."
                  className="w-full srf-sunken border hairline rounded-xl pl-9 pr-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {recordError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                  {recordError}
                </div>
              )}

              {recordsLoading ? (
                <div className="text-xs ink-3 py-4 text-center">Cargando registros...</div>
              ) : records.length === 0 ? (
                <div className="text-xs ink-3 py-6 text-center leading-relaxed">
                  Aún no hay registros. Aparecerán aquí cuando se agenden citas con la prueba social activada.
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-xs ink-3 py-6 text-center">Sin resultados para “{search.trim()}”.</div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredRecords.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl srf-sunken border hairline">
                      {editingId === r.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.client}
                            onChange={(e) => setEditForm((f) => ({ ...f, client: e.target.value }))}
                            placeholder="Nombre del cliente"
                            className="w-full srf-panel border hairline rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editForm.service}
                              onChange={(e) => setEditForm((f) => ({ ...f, service: e.target.value }))}
                              placeholder="Servicio"
                              className="w-full srf-panel border hairline rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                            <input
                              type="text"
                              value={editForm.city}
                              onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                              placeholder="Ciudad"
                              className="w-full srf-panel border hairline rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={cancelEdit}
                              disabled={savingRecord}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold ink-2 hover:srf-panel border hairline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </button>
                            <button
                              onClick={() => saveEdit(r.id)}
                              disabled={savingRecord}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white accent-bg hover:brightness-110 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> {savingRecord ? 'Guardando...' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                            {(r.client || '?').trim().charAt(0) || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold ink-1 truncate">{r.client || 'Cliente'}</p>
                            <p className="text-[11px] ink-3 truncate">
                              {[r.service, r.city].filter(Boolean).join(' · ') || 'Sin detalles'}
                              {r.ts ? ` — ${relTime(r.ts)}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(r)}
                              title="Editar"
                              className="p-1.5 rounded-lg ink-3 hover:ink-1 hover:srf-panel transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteRecord(r.id)}
                              disabled={deletingId === r.id}
                              title="Eliminar"
                              className="p-1.5 rounded-lg ink-3 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
