import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Sheet from '../ui/Sheet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  onReschedule?: (data: any) => void;
}

const RescheduleModal: React.FC<Props> = ({ isOpen, onClose, event, onReschedule }) => {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notifySubscriber, setNotifySubscriber] = useState(true);
  const [notifyHost, setNotifyHost] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate input values with the current event data
  useEffect(() => {
    if (isOpen && event) {
      setDate(event.date || '');
      setStartTime(event.startTime || '');
      setEndTime(event.endTime || '');
      setError(null);
    }
  }, [isOpen, event]);

  const handleReschedule = async () => {
    if (!event) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      const dayObj = new Date(`${date}T00:00:00`);
      
      let monthStr = event.month || '';
      let dayStr = event.day || '';
      if (!isNaN(dayObj.getTime())) {
         monthStr = monthNames[dayObj.getMonth()];
         dayStr = dayObj.getDate().toString();
      }

      const convert24hTo12h = (time24: string): string => {
        if (!time24) return '';
        try {
          const [hStr, mStr] = time24.split(':');
          let hours = parseInt(hStr, 10) || 0;
          const minutes = parseInt(mStr, 10) || 0;
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12; // '0' should be '12'
          const minStr = String(minutes).padStart(2, '0');
          const hrStr = String(hours).padStart(2, '0');
          return `${hrStr}:${minStr} ${ampm}`;
        } catch (e) {
          return time24;
        }
      };

      const formattedTime = convert24hTo12h(startTime) || startTime;

      const payload = {
        eventId: event.id,
        newDate: date,
        newStartTime: startTime,
        newEndTime: endTime,
        notifySubscriber,
        notifyHost
      };

      if (event.id) {
         const eventRef = doc(db, 'events', event.id);
         await updateDoc(eventRef, {
            date: date,
            fullDate: date,
            month: monthStr,
            day: dayStr,
            time: formattedTime,
            startTime: startTime,
            endTime: endTime,
            updatedAt: serverTimestamp()
         });
      }
      
      if (onReschedule) {
        onReschedule(payload);
      }
      
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al reprogramar la cita en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-xl" zIndex={60}>
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 border-b hairline srf-sunken sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-extrabold ink-1 font-display">Reprogramar Cita</h2>
          <p className="text-[11px] font-semibold ink-3 mt-0.5">Define la nueva fecha y hora para este espacio</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200/60 ink-3 cursor-pointer transition-all duration-200 active:scale-90 flex-shrink-0">
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-5">
        {/* Active Event Summary */}
        {event && (
          <div className="srf-sunken border hairline rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold ink-3 uppercase tracking-wider">Cita actual</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm ink-1">{event.client}</h3>
                <p className="text-xs font-semibold ink-3 mt-0.5">{event.service}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block text-[11px] font-bold ink-1 bg-slate-200/60 px-2.5 py-1 rounded-lg">
                  {event.day} {event.month} - {event.time}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Attention Banner */}
        <div className="srf-sunken border hairline ink-2 p-4 rounded-2xl text-[13px] leading-relaxed font-semibold flex gap-2.5 items-start">
           <AlertCircle className="w-5 h-5 ink-3 shrink-0 mt-0.5" />
           <span>
             <strong>Atención:</strong> Al reprogramar la cita de forma manual no se validarán cruces de horarios automáticos en el calendario. Asegúrese de verificar la disponibilidad antes de guardar.
           </span>
        </div>

        {/* Date & Time Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
              <label className="block text-xs font-bold ink-3 mb-2 uppercase tracking-wide">Fecha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <CalendarIcon className="h-4 w-4 ink-3" />
                </div>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full srf-panel border hairline rounded-xl py-3.5 pl-10 pr-3 text-xs font-bold ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm" 
                />
              </div>
           </div>
           <div>
              <label className="block text-xs font-bold ink-3 mb-2 uppercase tracking-wide">De</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 ink-3" />
                </div>
                <input 
                  type="time" 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)} 
                  className="w-full srf-panel border hairline rounded-xl py-3.5 pl-10 pr-3 text-xs font-bold ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm" 
                />
              </div>
           </div>
           <div>
              <label className="block text-xs font-bold ink-3 mb-2 uppercase tracking-wide">A</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Clock className="h-4 w-4 ink-3" />
                </div>
                <input 
                  type="time" 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)} 
                  className="w-full srf-panel border hairline rounded-xl py-3.5 pl-10 pr-3 text-xs font-bold ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm" 
                />
              </div>
           </div>
        </div>

        {/* Email Notifications */}
        <div className="space-y-3 pt-2">
           <label className="flex items-center p-3.5 srf-panel border hairline rounded-xl cursor-pointer hover:border-black transition-all duration-200 shadow-sm">
             <div className="relative flex items-center justify-center">
               <input type="checkbox" className="sr-only" checked={notifySubscriber} onChange={e => setNotifySubscriber(e.target.checked)} />
               <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${notifySubscriber ? 'accent-bg text-white' : 'border border-slate-300'}`}>
                 {notifySubscriber && (
                   <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                   </svg>
                 )}
               </div>
             </div>
             <span className="ml-3 text-xs ink-2 font-semibold leading-relaxed">Enviar correo electrónico de notificación al cliente.</span>
           </label>

           <label className="flex items-center p-3.5 srf-panel border hairline rounded-xl cursor-pointer hover:border-black transition-all duration-200 shadow-sm">
             <div className="relative flex items-center justify-center">
               <input type="checkbox" className="sr-only" checked={notifyHost} onChange={e => setNotifyHost(e.target.checked)} />
               <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${notifyHost ? 'accent-bg text-white' : 'border border-slate-300'}`}>
                 {notifyHost && (
                   <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                   </svg>
                 )}
               </div>
             </div>
             <span className="ml-3 text-xs ink-2 font-semibold leading-relaxed">Enviar correo electrónico de notificación al administrador.</span>
           </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-3 items-center pt-4 border-t hairline mt-6">
           {error && <span className="text-red-500 text-xs font-semibold mr-auto flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</span>}
           <button type="button" onClick={onClose} disabled={loading} className="px-5 py-3 text-xs font-extrabold ink-3 hover:ink-1 cursor-pointer tracking-wider disabled:opacity-50 transition-colors uppercase">
             Cancelar
           </button>
           <button 
             onClick={handleReschedule} 
             disabled={loading}
             className="accent-bg hover:brightness-110 text-white font-extrabold py-3 px-8 rounded-xl shadow-md text-xs tracking-wider cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[160px] uppercase"
           >
             {loading ? 'Guardando...' : 'Reprogramar'}
           </button>
        </div>
      </div>
    </Sheet>
  );
}

export default RescheduleModal;
