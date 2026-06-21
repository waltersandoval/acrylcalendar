import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, User, FileText } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, where } from 'firebase/firestore';
import Sheet from '../ui/Sheet';
import { useAuth } from '../../lib/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  calendarId?: string | null;
}

const NewEventModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, calendarId }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calendarsList, setCalendarsList] = useState<any[]>([]);
  const [selectedCalId, setSelectedCalId] = useState('');
  const [selectedGrpId, setSelectedGrpId] = useState('');
  const [groupsList, setGroupsList] = useState<any[]>([]);

  // Load calendars from Firestore
  useEffect(() => {
    if (!isOpen) return;
    if (!user?.uid) return;
    try {
      const q = query(collection(db, 'calendars'), where('ownerUid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as any
        })).filter((c: any) => !c.deletedAt);
        setCalendarsList(list);

        // Preselect passed calendarId or default to first
        let initialCalId = '';
        if (calendarId && list.some(c => c.id === calendarId)) {
          initialCalId = calendarId;
        } else if (list.length > 0) {
          initialCalId = list[0].id;
        }
        setSelectedCalId(initialCalId);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error loaded calendars inside NewEventModal", e);
    }
  }, [isOpen, calendarId, user?.uid]);

  // Load groups whenever selected calendar changes
  useEffect(() => {
    if (selectedCalId && calendarsList.length > 0) {
      const cal = calendarsList.find(c => c.id === selectedCalId);
      const groups = cal?.section_SCHEDULING?.groups || [];
      setGroupsList(groups);
      if (groups.length > 0) {
        setSelectedGrpId(groups[0].id);
        const firstGroup = groups[0];
        if (firstGroup) {
          setService(firstGroup.name || '');
          setTitle(firstGroup.name || '');
        }
      } else {
        setSelectedGrpId('');
      }
    } else {
      setGroupsList([]);
      setSelectedGrpId('');
    }
  }, [selectedCalId, calendarsList]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      const dayObj = new Date(`${date}T00:00:00`);
      
      let monthStr = '';
      let dayStr = '';
      if(!isNaN(dayObj.getTime())) {
         monthStr = monthNames[dayObj.getMonth()];
         dayStr = dayObj.getDate().toString();
      }

      const activeGroup = groupsList.find(g => g.id === selectedGrpId);
      let durationStr = "30 minutos";
      let groupColor = "bg-slate-900";
      if (activeGroup) {
        const minutes = activeGroup.sessionDurationMinutes || 
          (parseInt(activeGroup.sessionTimeHours, 10) * 60 + parseInt(activeGroup.sessionTimeMinutes, 10)) || 
          30;
        durationStr = `${minutes} minutos`;
        groupColor = activeGroup.color || "bg-slate-900";
      }

      await addDoc(collection(db, 'events'), {
        calendarId: selectedCalId || null,
        ownerUid: user?.uid || null,
        createdBy: user?.uid || null,
        groupId: selectedGrpId || null,
        title: title || service || 'Reserva',
        client,
        service,
        type: service,
        date,
        fullDate: date,
        month: monthStr,
        day: dayStr,
        time: convert24hTo12h(startTime) || startTime,
        startTime,
        endTime,
        status: 'scheduled',
        statusColor: groupColor,
        createdAt: serverTimestamp(),
        duration: durationStr,
        groupColor
      });
      
      if (onSuccess) onSuccess();
      onClose();
      
      // Reset form
      setTitle('');
      setClient('');
      setService('');
      setDate('');
      setStartTime('');
      setEndTime('');
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al programar la cita en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg" zIndex={60}>
      <div className="bg-[#f8f9fa]">
        <div className="flex justify-between items-center p-5 sm:p-6 bg-[#f8f9fa] border-b hairline">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-[#374151]">Nueva Cita</h2>
          <button onClick={onClose} className="p-1.5 rounded-full bg-[#e2e8f0] hover:bg-[#cbd5e1] ink-3 cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-6 pb-6 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] ink-3 mb-2 font-semibold">Calendario</label>
              <select
                value={selectedCalId}
                onChange={e => setSelectedCalId(e.target.value)}
                required
                className="w-full srf-panel border hairline rounded-md py-2.5 px-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black font-medium"
              >
                <option value="">Selecciona calendario</option>
                {calendarsList.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[13px] ink-3 mb-2 font-semibold">Grupo de reserva</label>
              <select
                value={selectedGrpId}
                onChange={e => {
                  setSelectedGrpId(e.target.value);
                  const grp = groupsList.find(g => g.id === e.target.value);
                  if (grp) {
                    setService(grp.name || '');
                    setTitle(grp.name || '');
                  }
                }}
                required
                className="w-full srf-panel border hairline rounded-md py-2.5 px-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black font-medium"
              >
                <option value="">Selecciona grupo</option>
                {groupsList.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] ink-3 mb-2 font-semibold">Asunto / Título</label>
            <div className="relative">
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required
                placeholder="Ej. Consulta general"
                className="w-full srf-panel border hairline rounded-md py-2.5 px-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] ink-3 mb-2 font-semibold">Nombre del Cliente</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 ink-3" />
              </div>
              <input 
                type="text" 
                value={client} 
                onChange={e => setClient(e.target.value)} 
                required
                placeholder="Nombre del cliente"
                className="w-full srf-panel border hairline rounded-md py-2.5 pl-9 pr-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] ink-3 mb-2 font-semibold">Servicio / Tratamiento</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-4 w-4 ink-3" />
              </div>
              <input 
                type="text" 
                value={service} 
                onChange={e => setService(e.target.value)} 
                required
                placeholder="Ej. Manicura Rusa"
                className="w-full srf-panel border hairline rounded-md py-2.5 pl-9 pr-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
             <div>
                <label className="block text-[13px] ink-3 mb-2 font-semibold">Fecha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-4 w-4 ink-3" />
                  </div>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    required
                    className="w-full srf-panel border hairline rounded-md py-2.5 pl-9 pr-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black" 
                  />
                </div>
             </div>
             <div>
                <label className="block text-[13px] ink-3 mb-2 font-semibold">De</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 ink-3" />
                  </div>
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    required
                    className="w-full srf-panel border hairline rounded-md py-2.5 pl-9 pr-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black" 
                  />
                </div>
             </div>
             <div>
                <label className="block text-[13px] ink-3 mb-2 font-semibold">A</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 ink-3" />
                  </div>
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)} 
                    required
                    className="w-full srf-panel border hairline rounded-md py-2.5 pl-9 pr-3 text-[13px] ink-1 outline-none focus:border-black focus:ring-1 focus:ring-black" 
                  />
                </div>
             </div>
          </div>

          <div className="flex flex-wrap justify-end gap-4 sm:gap-6 items-center mt-8 pt-4 border-t hairline">
             {error && <span className="text-red-500 text-xs font-medium mr-auto">{error}</span>}
             <button type="button" onClick={onClose} disabled={loading} className="text-[13px] font-bold ink-2 hover:ink-1 cursor-pointer tracking-wider disabled:opacity-50 transition-colors">
               CANCELAR
             </button>
             <button 
               type="submit"
               disabled={loading}
               className="accent-bg hover:brightness-110 text-white font-bold py-3 px-8 rounded shadow-md text-[13px] tracking-wider cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
             >
               {loading ? 'GUARDANDO...' : 'PROGRAMAR CITA'}
             </button>
          </div>
        </form>
      </div>
    </Sheet>
  );
}

export default NewEventModal;
