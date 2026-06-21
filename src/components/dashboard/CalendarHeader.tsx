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
  { id: 'scheduled', label: 'Cita programada', color: 'bg-black' },
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
    <div className="px-6 py-5 border-b border-slate-200/50 bg-white/90 backdrop-blur-md sticky top-0 z-10 transition-all duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <h2 className="text-[22px] font-semibold tracking-tight text-slate-900">Lista de Citas</h2>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button
            className="bg-black hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-[13px] font-semibold tracking-wide flex items-center shadow-sm transition-all duration-200 cursor-pointer whitespace-nowrap border border-slate-950"
            onClick={() => setIsNewEventModalOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nueva Cita
          </button>
        </div>
      </div>
      <NewEventModal isOpen={isNewEventModalOpen} onClose={() => setIsNewEventModalOpen(false)} calendarId={selectedCalendarFilter} />

      {/* Filters */}
      <div className="flex justify-between flex-col lg:flex-row items-start lg:items-center mt-2 border-t border-slate-100/50 pt-4 gap-4">

        {/* Left Side: Standard Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Estado */}
          <div className="relative group" ref={statusRef}>
            <div
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center justify-between bg-[#f5f5f7] border border-transparent hover:border-slate-300 text-slate-700 text-[13px] font-medium rounded-xl pl-8 pr-10 py-2 transition-all duration-200 cursor-pointer min-w-[170px]"
            >
              <span>{selectedStatus.label}</span>
            </div>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
            <div className={`absolute left-3 top-3.5 h-2 w-2 rounded-full ${selectedStatus.color}`}></div>

            {isStatusOpen && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 py-1">
                {statusOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => { setStatus(option.id); setIsStatusOpen(false); }}
                    className="flex justify-between items-center px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
                      <span className="text-[13px] text-slate-700">{option.label}</span>
                    </div>
                    <span className="text-[12px] font-bold text-slate-800">{counts[option.id] || 0}</span>
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
              className="appearance-none bg-[#f5f5f7] border border-transparent hover:border-slate-300 text-slate-700 text-[13px] font-medium rounded-xl px-4 pr-10 py-2 transition-all duration-200 cursor-pointer"
            >
              <option value="">Todos los calendarios</option>
              {availableCalendars.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Administrador */}
          <div className="relative group">
            <select
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="appearance-none bg-[#f5f5f7] border border-transparent hover:border-slate-300 text-slate-700 text-[13px] font-medium rounded-xl px-4 pr-10 py-2 transition-all duration-200 cursor-pointer"
            >
              <option value="">Administradores</option>
              {admins.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
          </div>
        </div>

        {/* Right Side: Date range + search */}
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-[#f5f5f7] border border-slate-200/50 rounded-xl px-3 py-1.5 shadow-sm">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-slate-600 text-[13px] font-medium outline-none cursor-pointer"
            />
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">A</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-slate-600 text-[13px] font-medium outline-none cursor-pointer"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold ml-1"
                title="Limpiar fechas"
              >
                ✕
              </button>
            )}
          </div>
          <div className="relative flex-1 lg:min-w-[220px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar citas..."
              className="w-full bg-[#f5f5f7] border border-transparent hover:border-slate-300 text-slate-700 text-[13px] font-medium rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black focus:bg-white placeholder-slate-400 transition-all duration-200"
            />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
