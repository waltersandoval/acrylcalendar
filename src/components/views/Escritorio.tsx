/**
 * VISTA: ESCRITORIO / INICIO
 * Vista principal con estadísticas de actividad y resúmenes.
 * Móvil: large title iOS + tarjetas apiladas con jerarquía nativa.
 * Escritorio: grid responsivo.
 */
import React, { useMemo, useState, useEffect } from 'react';
import ActivityStats from '../dashboard/ActivityStats';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, User, Loader2, ChevronRight, CalendarClock, ArrowRight } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../../lib/auth';
import { useIsMobileApp } from '../../hooks/useMediaQuery';

interface EscritorioProps {
  activeActivityTab: string;
  setActiveActivityTab: (tab: string) => void;
  onViewAll?: () => void;
}

const Escritorio: React.FC<EscritorioProps> = ({ activeActivityTab, setActiveActivityTab, onViewAll }) => {
  const { user } = useAuth();
  const isMobileApp = useIsMobileApp();
  const [events, setEvents] = useState<any[]>([]);
  const [calendarsCount, setCalendarsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setEvents([]);
      setCalendarsCount(0);
      setLoading(false);
      return;
    }
    let unsubscribeEvents: () => void;
    let unsubscribeCalendars: () => void;

    try {
      const qEvents = query(collection(db, 'events'), where('ownerUid', '==', user.uid));
      unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
        const firestoreEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setEvents(firestoreEvents);
        setLoading(false);
      }, (error) => {
        console.warn("Firestore error events:", error);
        setLoading(false);
      });

      const qCalendars = query(collection(db, 'calendars'), where('ownerUid', '==', user.uid));
      unsubscribeCalendars = onSnapshot(qCalendars, (snapshot) => {
        setCalendarsCount(snapshot.docs.length);
      }, (error) => {
         console.warn("Firestore error calendars:", error);
      });
    } catch (e) {
      console.warn("App iniciada sin configuración de Firebase.");
      setLoading(false);
    }

    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribeCalendars) unsubscribeCalendars();
    };
  }, [user?.uid]);

  const chartData = useMemo(() => {
    const now = new Date();
    const filteredEvents = events.filter(e => {
       if (!e.fullDate) return true;
       const eventDate = new Date(e.fullDate);
       if (activeActivityTab === '7 days') {
         const diffDays = Math.ceil(Math.abs(now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
         return diffDays <= 7;
       }
       if (activeActivityTab === '30 days') {
         const diffDays = Math.ceil(Math.abs(now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
         return diffDays <= 30;
       }
       return true;
    });

    const dataByDate: Record<string, number> = {};
    filteredEvents.forEach(item => {
       const dateKey = `${item.day} ${item.month}`;
       if (!dataByDate[dateKey]) dataByDate[dateKey] = 0;
       if (item.statusColor !== 'bg-red-400' && item.status !== 'cancelled' && item.status !== 'cancelada') {
         dataByDate[dateKey] += 1;
       }
    });
    return Object.keys(dataByDate).map(key => ({ name: key, citas: dataByDate[key] }));
  }, [events, activeActivityTab]);

  const upcomingAppointments = useMemo(() => {
    return events.filter(item => item.statusColor !== 'bg-red-400').slice(0, 4);
  }, [events]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-black animate-spin mb-4" />
        <p className="ink-3 font-medium">Cargando escritorio...</p>
      </div>
    );
  }

  // ─── MÓVIL ────────────────────────────────────────────────────────────────
  if (isMobileApp) {
    return (
      <div className="flex flex-col gap-5 pb-4">
        {/* Large title */}
        <div className="pt-1">
          <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-tight ink-1 font-display">Inicio</h1>
          <p className="ink-3 font-medium text-[14px] mt-0.5">Tu actividad y resumen</p>
        </div>

        {/* Stats */}
        <ActivityStats
          activeActivityTab={activeActivityTab}
          setActiveActivityTab={setActiveActivityTab}
          events={events}
          calendarsCount={calendarsCount}
        />

        {/* Próximas citas */}
        <div className="srf-panel rounded-3xl border hairline shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b hairline">
            <h2 className="text-[16px] font-bold ink-1">Próximas Citas</h2>
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-[13px] font-bold text-black active:opacity-60 transition-opacity"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {upcomingAppointments.map((appointment, i) => (
                <div key={appointment.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex flex-col items-center justify-center srf-sunken rounded-xl w-11 h-12 shrink-0">
                    <span className="text-[9px] font-bold uppercase ink-3 leading-none">{appointment.month}</span>
                    <span className="text-[18px] font-extrabold ink-1 leading-tight">{appointment.day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold ink-1 truncate">{appointment.service.replace('\n', ' ')}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[12px] ink-3 font-medium">
                        <Clock className="w-3 h-3" />
                        {appointment.time.split(' - ')[0]}
                      </span>
                      <span className="flex items-center gap-1 text-[12px] ink-3 font-medium truncate">
                        <User className="w-3 h-3 shrink-0" />
                        {appointment.client}
                      </span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-full srf-sunken flex items-center justify-center mb-3">
                <CalendarClock className="w-7 h-7 ink-3" />
              </div>
              <p className="ink-1 font-bold text-[15px]">Sin citas próximas</p>
              <p className="ink-3 text-[13px] mt-1">Cuando tengas citas aparecerán aquí.</p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="srf-panel rounded-3xl border hairline shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[16px] font-bold ink-1">Actividad de Citas</h2>
            <button onClick={onViewAll} className="text-[13px] font-bold text-black flex items-center gap-1 active:opacity-60 transition-opacity">
              Ver más <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {chartData.length > 0 ? (
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="citas" fill="#000000" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 border-2 border-dashed hairline rounded-2xl">
              <CalendarClock className="w-8 h-8 text-slate-300 mb-2" />
              <p className="ink-3 text-[13px]">Sin actividad aún</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ESCRITORIO ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl w-full mx-auto flex flex-col space-y-6 flex-1">
      <ActivityStats 
        activeActivityTab={activeActivityTab} 
        setActiveActivityTab={setActiveActivityTab} 
        events={events}
        calendarsCount={calendarsCount}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {/* Gráfico de actividad */}
        <div className="srf-panel rounded-2xl border hairline p-6 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-[16px] font-bold ink-1">Actividad de Citas</h3>
             <button onClick={onViewAll} className="text-sm ink-1 font-semibold hover:text-black transition-colors cursor-pointer flex items-center gap-1">
               Ver más <ChevronRight className="w-4 h-4" />
             </button>
           </div>
           {chartData.length > 0 ? (
             <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="citas" fill="#000000" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
           ) : (
             <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-center border-2 border-dashed hairline rounded-2xl py-8">
                <div className="w-14 h-14 rounded-full srf-sunken ink-3 flex items-center justify-center mb-3">
                  <CalendarClock className="w-7 h-7" />
                </div>
                <h4 className="ink-1 font-bold text-[15px]">Aún no hay actividad</h4>
                <p className="ink-3 text-[13px] mt-1 max-w-[240px]">Cuando tengas citas, aquí verás su actividad y rendimiento.</p>
             </div>
           )}
        </div>

        {/* Próximas citas */}
        <div className="srf-panel rounded-2xl border hairline p-6 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-[16px] font-bold ink-1">Próximas Citas</h3>
              <button onClick={onViewAll} className="text-sm ink-1 font-semibold hover:text-black transition-colors cursor-pointer">Ver todas</button>
           </div>
           
           <div className="flex flex-col space-y-4">
             {upcomingAppointments.length > 0 ? (
               upcomingAppointments.map(appointment => (
                 <div key={appointment.id} className="flex items-center gap-4 p-3 rounded-xl border hairline hover:srf-sunken transition-colors">
                    <div className="flex flex-col items-center justify-center srf-sunken ink-1 rounded-lg w-12 h-12 flex-shrink-0">
                      <span className="text-xs font-semibold uppercase">{appointment.month}</span>
                      <span className="text-lg font-bold leading-none">{appointment.day}</span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                       <h4 className="text-sm font-bold ink-1 truncate">{appointment.service.replace('\n', ' ')}</h4>
                       <div className="flex items-center gap-3 mt-1 ink-3">
                          <span className="flex items-center gap-1 text-[11px] font-medium"><Clock className="w-3 h-3" /> {appointment.time.split(' - ')[0]}</span>
                          <span className="flex items-center gap-1 text-[11px] font-medium truncate"><User className="w-3 h-3" /> {appointment.client}</span>
                       </div>
                    </div>
                    <div className="hidden sm:block">
                       <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white ${appointment.statusColor}`}>
                          Confirmada
                       </span>
                    </div>
                 </div>
               ))
             ) : (
                <div className="text-center py-8">
                  <p className="ink-3 text-sm">No hay próximas citas agendadas.</p>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Escritorio;
