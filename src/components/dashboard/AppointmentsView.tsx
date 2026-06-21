/**
 * COMPONENTE APPOINTMENTS VIEW (Lista de Citas)
 * Dueño del estado de filtros y de la carga de eventos.
 * Móvil: header iOS large title + filtros inline + tarjetas.
 * Escritorio: CalendarHeader clásico + EventList en tabla.
 */
import React, { useEffect, useMemo, useState } from 'react';
import CalendarHeader from './CalendarHeader';
import EventList from './EventList';
import NewEventModal from './NewEventModal';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useIsMobileApp } from '../../hooks/useMediaQuery';
import { useAuth } from '../../lib/auth';
import { PlusCircle, SlidersHorizontal, Calendar as CalendarIcon, Users, Search, ChevronDown, ListFilter, X } from 'lucide-react';

interface AppointmentsViewProps {
  calendarFilter: string | null;
  setCalendarFilter: (v: string | null) => void;
}

const STATUS_LIST = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'waiting_payment', label: 'Esperando pago' },
  { id: 'cancelled', label: 'Cancelada' },
  { id: 'scheduled', label: 'Programada' },
  { id: 'rescheduled', label: 'Reprogramada' },
  { id: 'completed', label: 'Completada' },
];

export function normalizeStatus(ev: any): string {
  const s = String(ev?.status || '').toLowerCase();
  if (s.includes('reprogram') || s === 'rescheduled') return 'rescheduled';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('complet')) return 'completed';
  if (s.includes('pend')) return 'pending';
  if (s.includes('pago') || s.includes('payment')) return 'waiting_payment';
  if (s.includes('program') || s === 'scheduled') return 'scheduled';
  if (ev?.statusColor === 'bg-red-400' || ev?.statusColor === 'bg-rose-500') return 'cancelled';
  return 'scheduled';
}

function eventToDate(ev: any): Date | null {
  if (ev?.fullDate) {
    const d = new Date(ev.fullDate);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

const AppointmentsView: React.FC<AppointmentsViewProps> = ({ calendarFilter, setCalendarFilter }) => {
  const isMobileApp = useIsMobileApp();
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [adminFilter, setAdminFilter] = useState('');

  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setEvents([]);
      setAdmins([]);
      setCalendars([]);
      setLoading(false);
      return;
    }
    let unsubEvents: undefined | (() => void);
    let unsubAdmins: undefined | (() => void);
    let unsubCals: undefined | (() => void);
    try {
      unsubEvents = onSnapshot(query(collection(db, 'events'), where('ownerUid', '==', user.uid)), (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setLoading(false);
      }, (e) => { console.warn('Firestore events error:', e); setLoading(false); });

      unsubAdmins = onSnapshot(query(collection(db, 'administrators'), where('ownerUid', '==', user.uid)), (snap) => {
        setAdmins(snap.docs.map((d) => ({ id: d.id, name: (d.data() as any).name })));
      }, () => {});

      unsubCals = onSnapshot(query(collection(db, 'calendars'), where('ownerUid', '==', user.uid)), (snap) => {
        setCalendars(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter((c: any) => !c.deletedAt));
      }, () => {});
    } catch {
      setLoading(false);
    }
    return () => { unsubEvents?.(); unsubAdmins?.(); unsubCals?.(); };
  }, [user?.uid]);

  const scoped = useMemo(
    () => (calendarFilter ? events.filter((e) => e.calendarId === calendarFilter) : events),
    [events, calendarFilter],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length };
    scoped.forEach((e) => { const id = normalizeStatus(e); c[id] = (c[id] || 0) + 1; });
    return c;
  }, [scoped]);

  const filteredEvents = useMemo(() => {
    const t = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return scoped.filter((e) => {
      if (status !== 'all' && normalizeStatus(e) !== status) return false;
      if (t) {
        const hay = `${e.client || ''} ${e.email || ''} ${e.service || ''} ${e.phone || ''} ${e.type || ''}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      if (from || to) {
        const d = eventToDate(e);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      if (adminFilter) {
        const a = String(e.adminName || e.host || e.groupTitle || '');
        if (a !== adminFilter) return false;
      }
      return true;
    });
  }, [scoped, status, search, dateFrom, dateTo, adminFilter]);

  const activeFiltersCount = [
    status !== 'all',
    !!calendarFilter,
    !!adminFilter,
    !!dateFrom || !!dateTo,
  ].filter(Boolean).length;

  // ─── MÓVIL ────────────────────────────────────────────────────────────────
  if (isMobileApp) {
    return (
      <div className="flex flex-col gap-4 pb-4">
        {/* Large title header (pr-12 para no chocar con el bell de notificaciones) */}
        <div className="flex items-start justify-between gap-3 pt-1 pr-12">
          <div className="min-w-0">
            <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-tight ink-1 font-display">Citas</h1>
            <p className="ink-3 font-medium text-[14px] mt-0.5">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>
          <button
            onClick={() => setShowNewEvent(true)}
            className="shrink-0 accent-bg text-white h-10 px-4 rounded-2xl text-[14px] font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
          >
            <PlusCircle className="w-4 h-4" /> Nueva
          </button>
        </div>

        {/* Search + filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ink-3 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar citas..."
              className="w-full srf-panel border hairline rounded-2xl pl-10 pr-9 py-3 text-[15px] ink-1 outline-none focus:ring-2 focus:ring-black/15 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 ink-3 hover:ink-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`relative shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center transition-colors ${showFilters || activeFiltersCount > 0 ? 'accent-bg border-black text-white' : 'srf-panel hairline ink-3'}`}
            aria-label="Filtros"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && !showFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Status chips (horizontal scroll) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 -mx-4 px-4">
          {STATUS_LIST.map((s) => {
            const active = status === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold border transition-all ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'srf-panel ink-2 hairline hover:border-slate-400'
                }`}
              >
                {s.label}
                {s.id !== 'all' && counts[s.id] > 0 && (
                  <span className={`ml-1.5 text-[11px] ${active ? 'text-slate-300' : 'ink-3'}`}>
                    {counts[s.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Expanded filters panel */}
        {showFilters && (
          <div className="srf-panel rounded-2xl border hairline shadow-sm p-4 flex flex-col gap-3">
            <p className="text-[11px] font-bold ink-3 uppercase tracking-widest">Filtros avanzados</p>

            {/* Calendar filter */}
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ink-3 pointer-events-none" />
              <select value={calendarFilter || ''} onChange={(e) => setCalendarFilter(e.target.value || null)} className="appearance-none w-full srf-sunken border hairline ink-1 text-[14px] font-medium rounded-xl pl-9 pr-8 py-3 outline-none focus:border-black">
                <option value="">Todos los calendarios</option>
                {calendars.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ink-3 pointer-events-none" />
            </div>

            {/* Admin filter */}
            {admins.length > 0 && (
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ink-3 pointer-events-none" />
                <select value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} className="appearance-none w-full srf-sunken border hairline ink-1 text-[14px] font-medium rounded-xl pl-9 pr-8 py-3 outline-none focus:border-black">
                  <option value="">Todos los administradores</option>
                  {admins.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ink-3 pointer-events-none" />
              </div>
            )}

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 srf-sunken border hairline rounded-xl px-3 py-2.5 text-[13px] ink-2 outline-none focus:border-black" />
              <span className="ink-3 text-[10px] font-bold uppercase">–</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 srf-sunken border hairline rounded-xl px-3 py-2.5 text-[13px] ink-2 outline-none focus:border-black" />
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setStatus('all'); setCalendarFilter(null); setAdminFilter(''); setDateFrom(''); setDateTo(''); }}
                className="text-[13px] font-bold text-red-500 text-center py-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Event list */}
        <EventList events={filteredEvents} loading={loading} mobileNewEvent={() => setShowNewEvent(true)} />

        <NewEventModal isOpen={showNewEvent} onClose={() => setShowNewEvent(false)} calendarId={calendarFilter} />
      </div>
    );
  }

  // ─── ESCRITORIO ────────────────────────────────────────────────────────────
  return (
    <div className="srf-panel border-x border-b border-t-0 hairline shadow-sm flex flex-col overflow-hidden flex-1 mb-6 rounded-b-3xl mx-4 md:mx-6">
      <CalendarHeader
        selectedCalendarFilter={calendarFilter}
        setSelectedCalendarFilter={setCalendarFilter}
        status={status}
        setStatus={setStatus}
        counts={counts}
        search={search}
        setSearch={setSearch}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        adminFilter={adminFilter}
        setAdminFilter={setAdminFilter}
        admins={admins}
      />
      <EventList events={filteredEvents} loading={loading} />
    </div>
  );
};

export default AppointmentsView;
