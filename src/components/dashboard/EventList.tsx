/**
 * COMPONENTE EVENT LIST
 * Renderiza las citas (ya filtradas por AppointmentsView) en formato de filas/tarjetas.
 * En móvil: tarjetas individuales con diseño iOS nativo.
 * En escritorio: filas de tabla.
 */

import React, { useState } from 'react';
import { Eye, Mail, RotateCw, XCircle, User, Loader2, CalendarSearch, PlusCircle, Clock, ChevronRight } from 'lucide-react';
import EventDetailsModal from './EventDetailsModal';
import RescheduleModal from './RescheduleModal';
import Sheet from '../ui/Sheet';
import { db } from '../../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { useIsMobileApp } from '../../hooks/useMediaQuery';

interface EventListProps {
  events: any[];
  loading?: boolean;
  /** Si se pasa, el estado vacío muestra un botón "Nueva Cita" (móvil). */
  mobileNewEvent?: () => void;
}

const statusConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  scheduled:       { label: 'Programada',    dotClass: 'bg-emerald-400', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  rescheduled:     { label: 'Reprogramada',  dotClass: 'bg-blue-400',    badgeClass: 'bg-blue-50 text-blue-700 border-blue-100' },
  cancelled:       { label: 'Cancelada',     dotClass: 'bg-red-400',     badgeClass: 'bg-red-50 text-red-700 border-red-100' },
  pending:         { label: 'Pendiente',     dotClass: 'bg-amber-400',   badgeClass: 'bg-amber-50 text-amber-700 border-amber-100' },
  waiting_payment: { label: 'En espera pago',dotClass: 'bg-purple-400',  badgeClass: 'bg-purple-50 text-purple-700 border-purple-100' },
  completed:       { label: 'Completada',    dotClass: 'bg-slate-400',   badgeClass: 'bg-slate-50 text-slate-600 border-slate-200' },
};

function getStatus(item: any) {
  const s = String(item?.status || '').toLowerCase();
  if (s.includes('reprogram') || s === 'rescheduled') return 'rescheduled';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('complet')) return 'completed';
  if (s.includes('pend')) return 'pending';
  if (s.includes('pago') || s.includes('payment')) return 'waiting_payment';
  if (item?.statusColor === 'bg-red-400' || item?.statusColor === 'bg-rose-500') return 'cancelled';
  return 'scheduled';
}

const EventList: React.FC<EventListProps> = ({ events, loading, mobileNewEvent }) => {
  const isMobileApp = useIsMobileApp();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [reschedulingEvent, setReschedulingEvent] = useState<any>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5">
          <CalendarSearch className="w-10 h-10 text-slate-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-[19px] font-bold text-slate-800 mb-1.5">No hay citas</h3>
        <p className="text-[14px] text-slate-400 max-w-[260px]">
          Ajusta los filtros o crea una nueva cita.
        </p>
        {mobileNewEvent && (
          <button
            onClick={mobileNewEvent}
            className="mt-6 inline-flex items-center gap-2 bg-black text-white font-bold text-[14px] px-5 py-3 rounded-2xl active:scale-95 transition-transform shadow-md"
          >
            <PlusCircle className="w-5 h-5" /> Nueva Cita
          </button>
        )}
      </div>
    );
  }

  // ─── MÓVIL: tarjetas iOS ───────────────────────────────────────────────────
  if (isMobileApp) {
    return (
      <>
        <div className="flex flex-col gap-3 pb-2">
          {events.map((item) => {
            const statusKey = getStatus(item);
            const cfg = statusConfig[statusKey] || statusConfig.scheduled;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedEvent(item)}
                className="w-full bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex items-center gap-4 text-left active:bg-slate-50 transition-colors"
              >
                {/* Date badge */}
                <div className="flex flex-col items-center justify-center bg-slate-100 rounded-xl w-12 h-14 shrink-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400 leading-none">{item.month}</span>
                  <span className="text-[22px] font-extrabold text-slate-900 leading-tight">{item.day}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dotClass}`} />
                    <span className="text-[13px] font-extrabold text-slate-900 truncate">{item.service}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[12px] text-slate-500 font-medium">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.client}</span>
                  </div>
                </div>

                {/* Status + arrow */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg.badgeClass}`}>
                    {cfg.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            );
          })}
        </div>

        {selectedEvent && (
          <EventDetailsModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onDelete={handleDeleteEvent}
          />
        )}

        <RescheduleModal
          isOpen={!!reschedulingEvent}
          onClose={() => setReschedulingEvent(null)}
          event={reschedulingEvent}
        />

        <Sheet isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} maxWidthClass="max-w-sm" zIndex={60}>
          <div className="bg-white p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Cancelar Cita</h3>
            <p className="text-slate-600 mb-6 text-sm">¿Estás seguro de que deseas cancelar esta cita? El espacio volverá a estar disponible.</p>
            <div className="flex flex-col-reverse gap-3">
              <button onClick={() => setEventToDelete(null)} className="px-4 py-3 text-slate-600 font-semibold bg-slate-100 rounded-xl cursor-pointer transition-colors text-sm">Atrás</button>
              <button
                onClick={() => {
                  if (eventToDelete) handleDeleteEvent(eventToDelete);
                  setEventToDelete(null);
                }}
                className="px-4 py-3 bg-black text-white font-bold rounded-xl cursor-pointer transition-colors text-sm"
              >
                Cancelar Cita
              </button>
            </div>
          </div>
        </Sheet>
      </>
    );
  }

  // ─── ESCRITORIO: filas de tabla ────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar bg-white relative">
      {events.map((item) => (
        <div
          key={item.id}
          className="flex flex-col lg:flex-row items-start lg:items-center py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors px-6 cursor-pointer group"
          onClick={() => setSelectedEvent(item)}
        >
          <div className="hidden sm:flex items-center justify-center w-4 mr-3">
            <div className={`h-2 w-2 rounded-full ${item.statusColor || 'bg-slate-300'}`}></div>
          </div>

          <div className="flex flex-row md:flex-row w-full lg:w-auto flex-1">
            <div className="flex flex-col items-center justify-center min-w-[3.5rem] mr-6">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">{item.month}</span>
              <span className="text-xl font-bold text-slate-800 leading-none">{item.day}</span>
            </div>

            <div className="flex flex-col min-w-[200px] flex-1 lg:flex-none mr-6">
              <span className="text-xs font-bold text-slate-700">{item.time}</span>
              <span className="text-[11px] font-medium text-slate-500 mt-0.5 whitespace-pre-line leading-relaxed">{item.service}</span>
            </div>

            <div className="hidden md:flex items-center lg:border-l border-slate-200 lg:pl-6 min-w-[120px] mr-6">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{item.type}</span>
            </div>

            <div className="hidden md:flex items-center lg:border-l border-slate-200 lg:pl-6 flex-1 min-w-[200px]">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mr-2">
                 <User className="h-3.5 w-3.5" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold text-slate-700 truncate">{item.client}</span>
            </div>
          </div>

          <div className="md:hidden w-full flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
             <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{item.type}</span>
              <div className="flex items-center text-slate-700">
                <User className="h-3 w-3 mr-1" strokeWidth={2.5} />
                <span className="text-[11px] font-bold truncate max-w-[120px]">{item.client}</span>
              </div>
             </div>
          </div>

          <div className="flex items-center space-x-1 mt-4 lg:mt-0 justify-end w-full lg:w-auto opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer" title="Ver detalle" onClick={(e) => { e.stopPropagation(); setSelectedEvent(item); }}>
              <Eye className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer disabled:opacity-30" title={item.email ? `Enviar correo a ${item.email}` : 'Sin email'} disabled={!item.email} onClick={(e) => { e.stopPropagation(); if (item.email) window.location.href = `mailto:${item.email}?subject=${encodeURIComponent('Sobre tu cita')}`; }}>
              <Mail className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer" title="Reagendar" onClick={(e) => { e.stopPropagation(); setReschedulingEvent(item); }}>
              <RotateCw className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" title="Cancelar cita" onClick={(e) => { e.stopPropagation(); if (item.id && item.isCancelable !== false) setEventToDelete(item.id); }}>
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}

      <RescheduleModal
        isOpen={!!reschedulingEvent}
        onClose={() => setReschedulingEvent(null)}
        event={reschedulingEvent}
      />

      <Sheet isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} maxWidthClass="max-w-sm" zIndex={60}>
        <div className="bg-white p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Cancelar Cita</h3>
          <p className="text-slate-600 mb-6 text-sm">¿Estás seguro de que deseas cancelar esta cita? El espacio volverá a estar disponible.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button onClick={() => setEventToDelete(null)} className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg cursor-pointer transition-colors text-sm">Atrás</button>
            <button
              onClick={() => {
                if (eventToDelete) handleDeleteEvent(eventToDelete);
                setEventToDelete(null);
              }}
              className="px-4 py-2.5 bg-black text-white font-bold rounded-lg cursor-pointer transition-colors text-sm"
            >
              Cancelar Cita
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

export default EventList;
