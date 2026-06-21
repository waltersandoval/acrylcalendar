/**
 * COMPONENTE ACTIVITY STATS
 * Tarjetas compactas de estadísticas con segmented control de período.
 * Móvil: 3 tarjetas apiladas verticalmente con jerarquía numérica clara.
 * Escritorio: grid 3 columnas.
 */

import React, { useMemo } from 'react';
import { CalendarDays, CalendarCheck, DollarSign, Info, TrendingUp, List } from 'lucide-react';
import { useIsMobileApp } from '../../hooks/useMediaQuery';

interface ActivityStatsProps {
  activeActivityTab: string;
  setActiveActivityTab: (tab: string) => void;
  events: any[];
  calendarsCount: number;
}

const ActivityStats: React.FC<ActivityStatsProps> = ({ activeActivityTab, setActiveActivityTab, events, calendarsCount }) => {
  const isMobileApp = useIsMobileApp();

  const stats = useMemo(() => {
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

    const totalAppointments = filteredEvents.length;
    const cancelledAppointments = filteredEvents.filter(d => d.statusColor === 'bg-red-400' || d.status === 'cancelled' || d.status === 'cancelada').length;
    const activeAppointments = totalAppointments - cancelledAppointments;
    
    let estimatedRevenue = 0;
    filteredEvents.forEach(e => {
      if (e.statusColor !== 'bg-red-400' && e.status !== 'cancelled' && e.status !== 'cancelada') {
        const priceStr = e.price || '';
        const match = priceStr.match(/[\d.]+/);
        if (match) {
          estimatedRevenue += parseFloat(match[0]);
        }
      }
    });

    return { totalAppointments, activeAppointments, cancelledAppointments, estimatedRevenue };
  }, [events, activeActivityTab]);

  const segments = [
    { key: '7 days', label: '7 días' },
    { key: '30 days', label: '30 días' },
    { key: 'All time', label: 'Todo' },
  ];

  if (isMobileApp) {
    return (
      <div className="flex flex-col gap-3">
        {/* Segmented control */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-1 flex items-center shadow-sm">
          {segments.map((seg) => {
            const active = activeActivityTab === seg.key;
            return (
              <button
                key={seg.key}
                onClick={() => setActiveActivityTab(seg.key)}
                className={`flex-1 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        {/* Stats grid: 2 top + 1 bottom full-width */}
        <div className="grid grid-cols-2 gap-3">
          {/* Calendarios */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <CalendarDays className="w-5 h-5 text-slate-700" />
            </div>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none">{calendarsCount}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Calendarios</p>
          </div>

          {/* Citas Activas */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-[28px] font-extrabold text-slate-900 leading-none">{stats.activeAppointments}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Citas activas</p>
          </div>
        </div>

        {/* Ingresos — full width */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ingresos Est.</p>
              <p className="text-[26px] font-extrabold text-slate-900 leading-tight">${stats.estimatedRevenue}</p>
            </div>
          </div>
          <span className="inline-flex items-center bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-1 rounded-xl text-[11px] font-bold">
            Estable <TrendingUp className="h-3 w-3 ml-1 stroke-2" />
          </span>
        </div>
      </div>
    );
  }

  // ─── ESCRITORIO ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col space-y-5">
      <div className="flex justify-between items-end">
        <h2 className="text-[22px] font-semibold text-slate-900 tracking-tight">Actividad Reciente</h2>
        <div className="flex space-x-1 border-b border-slate-200/50 pb-2">
          {['7 días', '30 días', 'Todo'].map((tab) => {
            const tabKey = tab === '7 días' ? '7 days' : tab === '30 días' ? '30 days' : 'All time';
            return (
              <button
                key={tabKey}
                onClick={() => setActiveActivityTab(tabKey)}
                className={`px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-[8px] transition-all duration-200 cursor-pointer ${
                  activeActivityTab === tabKey
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            )
          })}
        </div>
      </div>
      
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-[20px] border border-slate-200/60 p-5 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_4px_-1px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] duration-300">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Calendarios Totales</p>
            <h3 className="text-3xl font-semibold text-slate-900 tracking-tight leading-none">{calendarsCount}</h3>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 border border-slate-200">
            <CalendarDays className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/60 p-5 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_4px_-1px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] duration-300">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Citas Activas</p>
            <div className="flex items-end gap-2.5">
              <h3 className="text-3xl font-semibold text-slate-900 tracking-tight leading-none">{stats.activeAppointments}</h3>
              {stats.cancelledAppointments > 0 && (
                <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-bold mb-0.5 tracking-wide">{stats.cancelledAppointments} CANCELACIÓN{stats.cancelledAppointments !== 1 ? 'ES' : ''}</span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50/80 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100/50">
            <CalendarCheck className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/60 p-5 flex items-center justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_4px_-1px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] duration-300">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
               <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Ingresos Est.</p>
               <Info className="h-3.5 w-3.5 text-slate-300 cursor-pointer hover:text-slate-400 transition-colors" />
            </div>
            <div className="flex items-end gap-2.5">
              <h3 className="text-3xl font-semibold text-slate-900 tracking-tight leading-none">$ {stats.estimatedRevenue}</h3>
              <span className="flex items-center bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md text-[10px] font-bold mb-0.5 tracking-wide">
                Estable <TrendingUp className="h-3 w-3 ml-1 stroke-2" />
              </span>
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-50/80 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100/50">
            <DollarSign className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default ActivityStats;
