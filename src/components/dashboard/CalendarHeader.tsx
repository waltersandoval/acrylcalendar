/**
 * COMPONENTE CALENDAR HEADER
 * Cabecera de la Lista de Citas: crear cita y filtros (estado, calendario,
 * administrador, rango de fechas y búsqueda). Es controlado: el estado de los
 * filtros vive en AppointmentsView.
 */

import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, ChevronDown, Search } from 'lucide-react';
import NewEventModal from './NewEventModal';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../../lib/auth';

interface CalendarHeaderProps {
  selectedCalendarFilter?: string | null;
  setSelectedCalendarFilter?: (val: string | null) => void;
  status: string;
  setStatus: (s: string) => void;
  counts: Record<string, number>;
  search: string;
  setSearch: (s: string) => void;
  dateFrom: string;
  setDateFrom: (s: string) => void;
  dateTo: string;
  setDateTo: (s: string) => void;
  adminFilter: string;
  setAdminFilter: (s: string) => void;
  admins: { id: string; name: string }[];
}

const statusOptions = [
  { id: 'all', label: 'Todos los estados', color: 'bg-slate-200' },
  { id: 'pending', label: 'Pendiente', color: 'bg-amber-400' },
  { id: 'waiting_payment', label: 'Esperando el pago', color: 'bg-orange-500' },
  { id: 'cancelled', label: 'Cancelada', color: 'bg-rose-500' },
  { id: 'scheduled', label: 'Cita programada', color: 'accent-bg' },
  { id: 'rescheduled', label: 'Reprogramada', color: 'bg-indigo-500' },
  { id: 'completed', label: 'Completado', color: 'bg-[#13CE9C]' },
];

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  selectedCalendarFilter,
  setSelectedCalendarFilter,
  status,
  setStatus,
  counts,
  search,
  setSearch,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  adminFilter,
  setAdminFilter,
  admins,
}) => {
  const { user } = useAuth();
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);

  const selectedStatus = statusOptions.find((o) => o.id === status) || statusOptions[0];

  useEffect(() => {
    if (!user?.uid) {
      setAvailableCalendars([]);
      return;
    }
    try {
      const q = query(collection(db, 'calendars'), where('ownerUid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const firestoreCalendars = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        setAvailableCalendars(firestoreCalendars.filter((c: any) => !c.deletedAt));
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore error in CalendarHeader');
    }
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="px-5 py-4 border-b hairline glass-strong sticky top-0 z-10">
      {/* Fila 1: título + acción */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
        <div>
          <h2 className="text-[20px] font-bold tracking-tight ink-1">Lista de Citas</h2>
          <p className="text-[12px] ink-3 font-medium mt-0.5">{counts.all || 0} {(counts.all || 0) === 1 ? 'cita' : 'citas'} en total</p>
        </div>

        <button
          className="accent-fill hover:brightness-110 px-5 py-2.5 rounded-[11px] text-[13px] font-bold tracking-wide flex items-center shadow-sm transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-[0.98]"
          onClick={() => setIsNewEventModalOpen(true)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Nueva Cita
        </button>
      </div>
      <NewEventModal isOpen={isNewEventModalOpen} onClose={() => setIsNewEventModalOpen(false)} calendarId={selectedCalendarFilter} />

      {/* Fila 2: toolbar de filtros unificada (pista hundida con controles elevados) */}
      <div className="srf-sunken rounded-[14px] p-2 flex flex-wrap items-center gap-2" style={{ border: '1px solid var(--hairline)' }}>
        {/* Estado */}
        <div className="relative group" ref={statusRef}>
          <div
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="flex items-center justify-between srf-panel ink-1 text-[13px] font-medium rounded-[10px] pl-8 pr-10 py-2 transition-all duration-200 cursor-pointer min-w-[170px] hover:brightness-95"
            style={{ border: '1px solid var(--hairline)' }}
          >
            <span>{selectedStatus.label}</span>
          </div>
          <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 ink-3 pointer-events-none" />
          <div className={`absolute left-3 top-3.5 h-2 w-2 rounded-full ${selectedStatus.color}`}></div>

          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-60 srf-panel border hairline shadow-xl rounded-[12px] overflow-hidden z-50 py-1">
              {statusOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => { setStatus(option.id); setIsStatusOpen(false); }}
                  className="flex justify-between items-center px-4 py-2 hover:srf-sunken cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
                    <span className="text-[13px] ink-1">{option.label}</span>
                  </div>
                  <span className="text-[12px] font-bold ink-2">{counts[option.id] || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendario */}
        <div className="relative group">
          <select
            value={selectedCalendarFilter || ''}
            onChange={(e) => setSelectedCalendarFilter?.(e.target.value || null)}
            className="appearance-none srf-panel ink-1 text-[13px] font-medium rounded-[10px] px-4 pr-10 py-2 transition-all duration-200 cursor-pointer hover:brightness-95"
            style={{ border: '1px solid var(--hairline)' }}
          >
            <option value="">Todos los calendarios</option>
            {availableCalendars.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 ink-3 pointer-events-none" />
        </div>

        {/* Administrador */}
        <div className="relative group">
          <select
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            className="appearance-none srf-panel ink-1 text-[13px] font-medium rounded-[10px] px-4 pr-10 py-2 transition-all duration-200 cursor-pointer hover:brightness-95"
            style={{ border: '1px solid var(--hairline)' }}
          >
            <option value="">Administradores</option>
            {admins.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 ink-3 pointer-events-none" />
        </div>

        {/* Rango de fechas */}
        <div className="flex items-center gap-2 srf-panel rounded-[10px] px-3 py-1.5" style={{ border: '1px solid var(--hairline)' }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent ink-2 text-[13px] font-medium outline-none cursor-pointer"
          />
          <span className="ink-3 text-[10px] uppercase font-bold tracking-wider">A</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent ink-2 text-[13px] font-medium outline-none cursor-pointer"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="ink-3 hover:ink-1 text-xs font-bold ml-1"
              title="Limpiar fechas"
            >
              ✕
            </button>
          )}
        </div>

        {/* Búsqueda (ocupa el resto) */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar citas..."
            className="w-full srf-panel ink-1 text-[13px] font-medium rounded-[10px] pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all duration-200"
            style={{ border: '1px solid var(--hairline)' }}
          />
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 ink-3 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
