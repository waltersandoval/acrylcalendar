import React, { useState, useRef, useEffect } from 'react';
import { Info, Save, PlusCircle, Trash2, Copy, Settings as SettingsIcon, Clock, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronUp, ChevronDown, Globe, Lightbulb } from 'lucide-react';
// Removed useIsMobileApp import to prevent unused import warnings
// import { useIsMobileApp } from '../../../hooks/useMediaQuery';

const CustomDatePicker = ({ value, onChange, placeholder, className }: { value: string, onChange: (val: string) => void, placeholder: string, className?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value + 'T12:00:00') : new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const yr = newDate.getFullYear();
    const mo = String(newDate.getMonth() + 1).padStart(2, '0');
    const da = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yr}-${mo}-${da}`);
    setIsOpen(false);
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const totalDays = daysInMonth(currentYear, currentMonth);
  const firstDay = firstDayOfMonth(currentYear, currentMonth);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    // Empty spots
    days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
  }
  for (let i = 1; i <= totalDays; i++) {
    const isSelected = value === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, i).toDateString() && !isSelected;
    
    days.push(
      <div 
        key={`day-${i}`} 
        onClick={(e) => { e.stopPropagation(); handleDateClick(i); }}
        className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer text-[13px] font-medium transition-colors ${
          isSelected ? 'accent-bg text-white shadow-sm' : 
          isToday ? 'srf-sunken text-black' : 'ink-2 hover:srf-sunken'
        }`}
      >
        {i}
      </div>
    );
  }

  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={className || "flex items-center srf-panel border hairline hover:border-slate-300 rounded-xl px-4 py-3 text-sm w-full transition-all shadow-sm cursor-pointer"}
      >
         <CalendarIcon className="w-4 h-4 ink-3 mr-2.5" />
         <span className={`font-semibold ${value ? 'ink-1' : 'ink-3'}`}>
           {value ? value.split('-').reverse().join('/') : placeholder}
         </span>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 srf-panel border hairline rounded-xl shadow-xl z-[9999] p-4 w-[280px]">
           {value && (
             <div className="bg-[#eef2f6] ink-1 font-semibold text-xs py-2 px-3 rounded-lg text-center mb-4">
               {value.split('-').reverse().join('/')}
             </div>
           )}
           <div className="flex justify-between items-center mb-4 px-1">
             <span className="font-bold ink-1 text-sm capitalize">
               {monthNames[currentMonth]} de {currentYear}
             </span>
             <div className="flex gap-1.5">
               <button onClick={handlePrevMonth} className="p-1 rounded-full accent-bg hover:brightness-110 text-white transition-colors cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
               <button onClick={handleNextMonth} className="p-1 rounded-full accent-bg hover:brightness-110 text-white transition-colors cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
             </div>
           </div>
           
           <div className="grid grid-cols-7 gap-1 text-center mb-2">
             {dayNames.map(d => (
               <div key={d} className="text-[11px] font-semibold ink-3">{d}</div>
             ))}
           </div>
           <div className="grid grid-cols-7 gap-1 place-items-center">
             {days.map((day, idx) => (
               <React.Fragment key={idx}>{day}</React.Fragment>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

const CustomTimePicker = ({ value, onChange, disabled = false }: { value: string, onChange?: (val: string) => void, disabled?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse value like '8:00 a. m.'
  const parseTimeParts = (timeStr: string) => {
    let hours = 8;
    let minutes = 0;
    let ampm = 'AM';

    if (timeStr) {
      const clean = timeStr.toLowerCase().trim();
      
      if (clean.includes('p.m.') || clean.includes('pm') || clean.includes('p. m.') || clean.includes('p')) {
        ampm = 'PM';
      } else {
        ampm = 'AM';
      }

      const match = clean.match(/(\d+):(\d+)/);
      if (match) {
        hours = parseInt(match[1], 10) || 8;
        minutes = parseInt(match[2], 10) || 0;
      }
    }
    return { hours, minutes, ampm };
  };

  const { hours, minutes, ampm } = parseTimeParts(value);

  useEffect(() => {
    if (disabled) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [disabled]);

  const updateTime = (newH: number, newM: number, newAmpm: string) => {
    if (disabled || !onChange) return;
    const period = newAmpm === 'AM' ? 'a. m.' : 'p. m.';
    const formatted = `${newH}:${String(newM).padStart(2, '0')} ${period}`;
    onChange(formatted);
  };

  const handleHourUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextH = hours === 12 ? 1 : hours + 1;
    updateTime(nextH, minutes, ampm);
  };

  const handleHourDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextH = hours === 1 ? 12 : hours - 1;
    updateTime(nextH, minutes, ampm);
  };

  const handleMinUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextM = (minutes + 5) % 60;
    updateTime(hours, nextM, ampm);
  };

  const handleMinDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextM = (minutes - 5 + 60) % 60;
    updateTime(hours, nextM, ampm);
  };

  const handleAmpmToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextAmpm = ampm === 'AM' ? 'PM' : 'AM';
    updateTime(hours, minutes, nextAmpm);
  };

  if (disabled) {
    return (
      <div className="relative w-full flex-1 max-w-[150px] opacity-45 pointer-events-none select-none">
        <div className="w-full srf-sunken border hairline ink-3 text-[13px] rounded-xl py-2 pl-9 pr-3 font-semibold text-center shadow-sm min-h-[38px] flex items-center justify-center">
          <Clock className="w-4 h-4 text-slate-300 absolute left-3 top-[11px]" />
          <span>{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full flex-1 max-w-[150px]" ref={dropdownRef}>
      <div 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className="w-full srf-sunken border border-transparent hover:border-slate-300 focus-within:border-slate-300 focus-within:srf-panel ink-1 text-[13px] rounded-xl py-2 pl-9 pr-3 outline-none font-semibold text-center transition-all duration-200 shadow-sm cursor-pointer hover:shadow-md select-none relative z-10 flex items-center justify-center min-h-[38px]"
      >
        <Clock className="w-4 h-4 ink-3 absolute left-3 top-[11px] z-20 pointer-events-none" />
        <span className="font-semibold ink-1">{value || '8:00 a. m.'}</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 srf-panel border hairline rounded-2xl shadow-xl z-[99999] p-4 w-[200px] flex flex-col items-center">
          {/* Picker Columns */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {/* Hour Column */}
            <div className="flex flex-col items-center">
              <button 
                type="button"
                onClick={handleHourUp}
                className="p-1 rounded-lg hover:srf-sunken ink-3 hover:ink-1 transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="font-bold ink-1 text-[15px] my-1 w-7 text-center select-none">
                {String(hours).padStart(2, '0')}
              </span>
              <button 
                type="button"
                onClick={handleHourDown}
                className="p-1 rounded-lg hover:srf-sunken ink-3 hover:ink-1 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Separator */}
            <span className="font-bold ink-3 text-base mb-1 select-none">:</span>

            {/* Minute Column */}
            <div className="flex flex-col items-center">
              <button 
                type="button"
                onClick={handleMinUp}
                className="p-1 rounded-lg hover:srf-sunken ink-3 hover:ink-1 transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="font-bold ink-1 text-[15px] my-1 w-7 text-center select-none">
                {String(minutes).padStart(2, '0')}
              </span>
              <button 
                type="button"
                onClick={handleMinDown}
                className="p-1 rounded-lg hover:srf-sunken ink-3 hover:ink-1 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Spacer */}
            <span className="w-1"></span>

            {/* AM/PM Column */}
            <div className="flex flex-col items-center">
              <button 
                type="button"
                onClick={handleAmpmToggle}
                className="p-1 rounded-lg hover:srf-sunken ink-3 hover:ink-1 transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="font-bold ink-1 text-[14px] my-1 w-8 text-center select-none">
                {ampm}
              </span>
              <button 
                type="button"
                onClick={handleAmpmToggle}
                className="p-1 rounded-lg hover:srf-sunken ink-3 hover:ink-1 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Separator line */}
          <div className="w-full border-t hairline my-2"></div>

          {/* Close button */}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="w-full text-center py-1.5 text-xs font-bold ink-2 hover:text-black srf-sunken hover:bg-slate-200/60 rounded-xl transition-all border hairline hover:border-slate-300 cursor-pointer"
          >
            CERRAR
          </button>
        </div>
      )}
    </div>
  );
};

interface Props {
  initialData?: any;
  initialDataBasic?: any;
  onSave?: (data: any) => void;
  onRegisterSave?: (fn: () => void) => void;
  calendarGroups?: {id: string; name: string}[];
  onGroupsChange?: (groups: {id: string; name: string}[]) => void;
  mode?: string;
}

interface TimeRange {
  start: string;
  end: string;
}

interface DaySettings {
  name: string;
  active: boolean;
  times: TimeRange[];
}

interface MonthSettings {
  name: string;
  active: boolean;
  start: string;
  end: string;
}

interface GroupSettings {
  id: string;
  name: string;
  title: string;
  description: string;
  administrators: { id: string; name: string; avatar: string | null }[];
  startingPoint: string;
  customStartingPoint?: boolean;
  sessionTimeHours: string;
  sessionTimeMinutes: string;
  intervalHours: string;
  intervalMinutes: string;
  blockSchedules: boolean;
  days: DaySettings[];
  months: MonthSettings[];
  sessions: string;
  availabilityType: string;
  availabilityDate: string;
  availabilityRollingDays: string;
  minAnticipationType: string;
  minAnticipationValue: string;
  newBlockedDate: string;
  blockedDates: string[];
  
  // Advanced Settings
  approvalType: string;
  allowCancel: string;
  allowReschedule: string;
  unavailableDisplay: string;
  timeLimit: string;
  emailLimit: string;
  advanceLimit: string;
}

const defaultDays: DaySettings[] = [
  { name: 'Domingo', active: false, times: [{ start: '8:00 a. m.', end: '5:00 p. m.' }] },
  { name: 'Lunes', active: true, times: [{ start: '8:00 a. m.', end: '12:00 p. m.' }, { start: '2:00 p. m.', end: '6:00 p. m.' }] },
  { name: 'Martes', active: true, times: [{ start: '8:00 a. m.', end: '12:00 p. m.' }, { start: '2:00 p. m.', end: '6:00 p. m.' }] },
  { name: 'Miércoles', active: true, times: [{ start: '8:00 a. m.', end: '12:00 p. m.' }, { start: '2:00 p. m.', end: '6:00 p. m.' }] },
  { name: 'Jueves', active: true, times: [{ start: '8:00 a. m.', end: '12:00 p. m.' }, { start: '2:00 p. m.', end: '6:00 p. m.' }] },
  { name: 'Viernes', active: true, times: [{ start: '8:00 a. m.', end: '12:00 p. m.' }, { start: '2:00 p. m.', end: '6:00 p. m.' }] },
  { name: 'Sábado', active: false, times: [{ start: '8:00 a. m.', end: '1:00 p. m.' }] },
];

const defaultMonths: MonthSettings[] = [
  { name: 'Enero', active: true, start: '1', end: '31' },
  { name: 'Febrero', active: false, start: '1', end: '28' },
  { name: 'Marzo', active: false, start: '1', end: '31' },
  { name: 'Abril', active: false, start: '1', end: '30' },
  { name: 'Mayo', active: false, start: '1', end: '31' },
  { name: 'Junio', active: false, start: '1', end: '30' },
  { name: 'Julio', active: false, start: '1', end: '31' },
  { name: 'Agosto', active: false, start: '1', end: '31' },
  { name: 'Septiembre', active: false, start: '1', end: '30' },
  { name: 'Octubre', active: true, start: '1', end: '31' },
  { name: 'Noviembre', active: true, start: '1', end: '30' },
  { name: 'Diciembre', active: true, start: '1', end: '31' },
];

const createDefaultGroup = (id: string, name: string): GroupSettings => ({
  id,
  name,
  title: name === 'Grupo 1' ? 'Grupo 1' : 'Nuevo Grupo',
  description: '',
  administrators: [],
  startingPoint: 'Cada 60 minuto(s)',
  customStartingPoint: false,
  sessionTimeHours: '1',
  sessionTimeMinutes: '0',
  intervalHours: '0',
  intervalMinutes: '0',
  blockSchedules: false,
  days: JSON.parse(JSON.stringify(defaultDays)),
  months: JSON.parse(JSON.stringify(defaultMonths)),
  sessions: '1',
  availabilityType: 'Indefinidamente',
  availabilityDate: '',
  availabilityRollingDays: '90',
  minAnticipationType: 'Día(s) y',
  minAnticipationValue: '1',
  newBlockedDate: '',
  blockedDates: [],
  
  approvalType: 'Aprobación automática',
  allowCancel: 'Acepte cancelación',
  allowReschedule: 'No se aceptan reprogramaciones',
  unavailableDisplay: 'Oculto',
  timeLimit: '1',
  emailLimit: 'Sin límite',
  advanceLimit: '1',
});

const STANDARD_STARTING_POINTS = [
  "Cada 5 minuto(s)",
  "Cada 10 minuto(s)",
  "Cada 15 minuto(s)",
  "Cada 20 minuto(s)",
  "Cada 30 minuto(s)",
  "Cada 60 minuto(s)",
  "Cada 90 minuto(s)",
  "Cada 120 minuto(s)",
  "Cada 150 minuto(s)",
  "Cada 180 minuto(s)",
  "Cada 210 minuto(s)",
  "Cada 240 minuto(s)"
];

const parseStartingPoint = (val: string): number => {
  if (!val) return 60;
  const match = val.match(/Cada (\d+) minuto\(s\)/);
  return match ? parseInt(match[1], 10) : 60;
};

const formatStartingPoint = (mins: number): string => {
  return `Cada ${mins} minuto(s)`;
};

const timeToMinutes = (hours: string | number, minutes: string | number): number => {
  const h = parseInt(String(hours), 10) || 0;
  const m = parseInt(String(minutes), 10) || 0;
  return h * 60 + m;
};

const minutesToTimeParts = (totalMins: number): { hours: string, minutes: string } => {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return { hours: String(h), minutes: String(m) };
};

const parseTimeToMinutes = (timeStr: string): number => {
  const clean = timeStr.toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  const isPM = clean.includes('pm') || clean.includes('p.m.');
  const isAM = clean.includes('am') || clean.includes('a.m.');
  const timePart = clean.replace('am', '').replace('pm', '').replace('a.m.', '').replace('p.m.', '');
  const [hStr, mStr] = timePart.split(':');
  let hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;
  if (isPM && hours !== 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
};

interface OverlapError {
  dayName: string;
  group1Name: string;
  group2Name: string;
  time1: string;
  time2: string;
}

const findCrossGroupOverlap = (groupsList: any[]): OverlapError | null => {
  for (let i = 0; i < groupsList.length; i++) {
    const g1 = groupsList[i];
    for (let j = i + 1; j < groupsList.length; j++) {
      const g2 = groupsList[j];
      
      // Compare each of the 7 days of the week
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const d1 = g1.days?.[dayIdx];
        const d2 = g2.days?.[dayIdx];
        
        if (d1?.active && d2?.active) {
          for (const t1 of d1.times || []) {
            const start1 = parseTimeToMinutes(t1.start);
            const end1 = parseTimeToMinutes(t1.end);
            
            for (const t2 of d2.times || []) {
              const start2 = parseTimeToMinutes(t2.start);
              const end2 = parseTimeToMinutes(t2.end);
              
              if (start1 < end2 && start2 < end1) {
                return {
                  dayName: d1.name,
                  group1Name: g1.title || g1.name || `Grupo ${i + 1}`,
                  group2Name: g2.title || g2.name || `Grupo ${j + 1}`,
                  time1: `${t1.start} a ${t1.end}`,
                  time2: `${t2.start} a ${t2.end}`
                };
              }
            }
          }
        }
      }
    }
  }
  return null;
};

const SchedulingSettings: React.FC<Props> = ({ initialData, initialDataBasic, onSave, onRegisterSave, calendarGroups, onGroupsChange, mode }) => {
  const isMobileApp = true; // Force mobile/stacked layout inside properties sidebar
  const [timezone, setTimezone] = useState('America/Guatemala');
  const calendarTimezone = initialDataBasic?.fixedTimezone || 'America/Guatemala';

  useEffect(() => {
    if (initialDataBasic?.fixedTimezone) {
      setTimezone(initialDataBasic.fixedTimezone);
    }
  }, [initialDataBasic]);
  const [groups, setGroups] = useState<GroupSettings[]>(
    initialData?.groups && initialData.groups.length > 0 
      ? initialData.groups 
      : [createDefaultGroup('group-1', 'Grupo 1')]
  );
  const [activeGroupId, setActiveGroupId] = useState<string>(
    initialData?.groups && initialData.groups.length > 0
      ? initialData.groups[0].id
      : 'group-1'
  );
  const [preventCrossGroupOverlaps, setPreventCrossGroupOverlaps] = useState<boolean>(
    initialData?.preventCrossGroupOverlaps ?? false
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Administrator Add modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');

  // Sync groups name changes to parent
  useEffect(() => {
    if (onGroupsChange) {
      onGroupsChange(groups.map(g => ({ id: g.id, name: g.name })));
    }
  }, [groups]);

  // Sync loaded async initialData
  useEffect(() => {
    if (initialData?.groups && initialData.groups.length > 0) {
      setGroups(initialData.groups);
      if (!initialData.groups.some((g: any) => g.id === activeGroupId)) {
        setActiveGroupId(initialData.groups[0].id);
      }
    }
    if (initialData && typeof initialData.preventCrossGroupOverlaps !== 'undefined') {
      setPreventCrossGroupOverlaps(!!initialData.preventCrossGroupOverlaps);
    }
  }, [initialData]);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0] || createDefaultGroup('group-1', 'Grupo 1');

  const updateGroup = (updates: Partial<GroupSettings>) => {
    setGroups(groups.map(g => g.id === activeGroupId ? { ...g, ...updates } : g));
  };

  const handleAddGroup = () => {
    const newId = `group-${Date.now()}`;
    const targetName = `Grupo ${groups.length + 1}`;
    const newGroup = createDefaultGroup(newId, targetName);
    setGroups([...groups, newGroup]);
    setActiveGroupId(newId);
    setErrorMessage(null);
  };

  const handleDeleteGroup = (id: string) => {
    if (groups.length === 1) {
      alert("Debe haber al menos un grupo.");
      return;
    }
    if (window.confirm("¿Seguro que deseas eliminar este grupo?")) {
      const newGroups = groups.filter(g => g.id !== id);
      setGroups(newGroups);
      if (activeGroupId === id) {
        setActiveGroupId(newGroups[0].id);
      }
      setErrorMessage(null);
    }
  };

  const handleDuplicateGroup = (id: string) => {
    const groupToDupe = groups.find(g => g.id === id);
    if (!groupToDupe) return;
    
    const newId = `group-${Date.now()}`;
    const dupedTitle = `${groupToDupe.title || groupToDupe.name} copia`;
    const newGroup: GroupSettings = {
      ...groupToDupe,
      id: newId,
      name: dupedTitle,
      title: dupedTitle
    };
    setGroups([...groups, newGroup]);
    setActiveGroupId(newId);
    setErrorMessage(null);
  };

  const validateGroups = (): boolean => {
    setErrorMessage(null);

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const gName = g.title || g.name || `Grupo ${i + 1}`;
      
      if (!g.title?.trim() && !g.name?.trim()) {
        setErrorMessage(`El grupo "${gName}" requiere un Título válido.`);
        return false;
      }
      
      const sessionMins = timeToMinutes(g.sessionTimeHours, g.sessionTimeMinutes);
      if (sessionMins <= 0) {
        setErrorMessage(`La duración de la sesión para "${gName}" debe ser mayor que 0.`);
        return false;
      }
      
      const startingMins = parseStartingPoint(g.startingPoint);
      if (startingMins < 0) {
        setErrorMessage(`El punto de partida para "${gName}" no puede ser negativo.`);
        return false;
      }
      
      const intervalMins = timeToMinutes(g.intervalHours, g.intervalMinutes);
      if (intervalMins < 0) {
        setErrorMessage(`El intervalo entre sesiones para "${gName}" no puede ser negativo.`);
        return false;
      }

      // Validar solapamientos e intervalos duplicados en el mismo día para el grupo
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const d = g.days?.[dayIdx];
        if (d?.active && d.times) {
          for (let ti = 0; ti < d.times.length; ti++) {
            const t1 = d.times[ti];
            const start1 = parseTimeToMinutes(t1.start);
            const end1 = parseTimeToMinutes(t1.end);
            
            if (start1 >= end1) {
              setErrorMessage(`En ${d.name} (${gName}), la hora de inicio (${t1.start}) debe ser anterior a la hora de fin (${t1.end}).`);
              return false;
            }
            
            for (let tj = ti + 1; tj < d.times.length; tj++) {
              const t2 = d.times[tj];
              const start2 = parseTimeToMinutes(t2.start);
              const end2 = parseTimeToMinutes(t2.end);
              
              if (start1 === start2 && end1 === end2) {
                setErrorMessage(`En ${d.name} (${gName}), el intervalo de ${t1.start} a ${t1.end} está duplicado.`);
                return false;
              }
              
              if (start1 < end2 && start2 < end1) {
                setErrorMessage(`En ${d.name} (${gName}), el intervalo de ${t1.start} a ${t1.end} se solapa con el intervalo de ${t2.start} a ${t2.end}.`);
                return false;
              }
            }
          }
        }
      }
    }

    if (preventCrossGroupOverlaps) {
      const overlap = findCrossGroupOverlap(groups);
      if (overlap) {
        setErrorMessage(
          `Cruce de horario detectado: El horario de ${overlap.dayName} de "${overlap.group1Name}" (${overlap.time1}) se solapa con "${overlap.group2Name}" (${overlap.time2}).`
        );
        return false;
      }
    }

    return true;
  };

  const handleSave = () => {
    if (validateGroups()) {
      const updatedGroups = groups.map(g => ({
        ...g,
        admins: g.administrators,
        startingPointMinutes: parseStartingPoint(g.startingPoint),
        sessionDurationMinutes: timeToMinutes(g.sessionTimeHours, g.sessionTimeMinutes),
        intervalBetweenSessionsMinutes: timeToMinutes(g.intervalHours, g.intervalMinutes)
      }));
      if (onSave) {
        onSave({
          groups: updatedGroups,
          preventCrossGroupOverlaps
        });
      }
    }
  };

  // Registra el guardado de esta sección para el botón único del header.
  const saveImpl = useRef<() => void>(() => {});
  saveImpl.current = handleSave;
  useEffect(() => { onRegisterSave?.(() => saveImpl.current()); }, [onRegisterSave]);

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setGroups(
      initialData?.groups && initialData.groups.length > 0 
        ? initialData.groups 
        : [createDefaultGroup('group-1', 'Grupo 1')]
    );
    setPreventCrossGroupOverlaps(initialData?.preventCrossGroupOverlaps ?? false);
    setErrorMessage(null);
    if (initialData?.groups && initialData.groups.length > 0) {
      setActiveGroupId(initialData.groups[0].id);
    } else {
      setActiveGroupId('group-1');
    }
  };

  const updateDay = (dayIndex: number, updates: Partial<DaySettings>) => {
    const newDays = [...activeGroup.days];
    newDays[dayIndex] = { ...newDays[dayIndex], ...updates };
    updateGroup({ days: newDays });
  };

  const updateDayTime = (dayIndex: number, timeIndex: number, updates: Partial<TimeRange>) => {
    const newDays = [...activeGroup.days];
    const newTimes = [...newDays[dayIndex].times];
    newTimes[timeIndex] = { ...newTimes[timeIndex], ...updates };
    newDays[dayIndex].times = newTimes;
    updateGroup({ days: newDays });
  };

  const addTimeRange = (dayIndex: number) => {
    const newDays = [...activeGroup.days];
    newDays[dayIndex].times.push({ start: '12:00 p. m.', end: '1:00 p. m.' });
    updateGroup({ days: newDays });
  };

  const removeTimeRange = (dayIndex: number, timeIndex: number) => {
    const newDays = [...activeGroup.days];
    newDays[dayIndex].times = newDays[dayIndex].times.filter((_, i) => i !== timeIndex);
    updateGroup({ days: newDays });
  };

  const updateMonth = (monthIndex: number, updates: Partial<MonthSettings>) => {
    const newMonths = [...activeGroup.months];
    newMonths[monthIndex] = { ...newMonths[monthIndex], ...updates };
    updateGroup({ months: newMonths });
  };

  const addBlockedDate = () => {
    if (activeGroup.newBlockedDate && !activeGroup.blockedDates.includes(activeGroup.newBlockedDate)) {
      updateGroup({ 
        blockedDates: [...activeGroup.blockedDates, activeGroup.newBlockedDate],
        newBlockedDate: ''
      });
    }
  };

  const removeBlockedDate = (dateToRemove: string) => {
    updateGroup({
      blockedDates: activeGroup.blockedDates.filter(d => d !== dateToRemove)
    });
  };

  const removeAdmin = (adminId: string) => {
    updateGroup({
      administrators: activeGroup.administrators.filter(a => a.id !== adminId)
    });
  };

  return (
    <div className="srf-panel pb-6 rounded-b-2xl">
      {/* ── Sticky Action Bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 srf-sunken/95 backdrop-blur-md border-b hairline shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
        {/* Row 1: Group selector dropdown */}
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex-1 min-w-0">
            <select
              value={activeGroupId}
              onChange={(e) => setActiveGroupId(e.target.value)}
              className="w-full srf-panel border hairline rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer outline-none bg-transparent"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.title || g.name}</option>
              ))}
            </select>
          </div>
          {mode === 'GROUPS' && (
            <button
              onClick={handleAddGroup}
              className="flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm text-xs font-semibold gap-1.5 shrink-0 h-9"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Nuevo
            </button>
          )}
        </div>

      </div>

      <div className="p-4 space-y-6 srf-panel max-w-5xl mx-auto">
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-600 text-[13px] font-semibold flex items-center gap-3">
            <Info className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {mode === 'GROUPS' && (
          <>
            {/* Group Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm font-semibold ink-3 mb-4 gap-4 srf-sunken p-4 rounded-2xl border hairline animate-fadeIn">
               <div className="flex items-center gap-3">
                 <span className="ink-3 text-[13px] uppercase tracking-wider">Editando Grupo:</span> 
                 <input 
                   type="text" 
                   value={activeGroup.name}
                   onChange={(e) => updateGroup({ name: e.target.value, title: e.target.value })}
                   className="border-b border-transparent hover:border-slate-300 focus:border-black py-1.5 focus:outline-none transition-colors ink-1 font-bold bg-transparent text-base" 
                 />
               </div>
               <div className="flex gap-4">
                 <button onClick={() => handleDeleteGroup(activeGroup.id)} className="flex items-center px-4 py-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer text-[13px]">
                   <Trash2 className="w-4 h-4 mr-1.5" /> Eliminar
                 </button>
                 <button onClick={() => handleDuplicateGroup(activeGroup.id)} className="flex items-center px-4 py-2 hover:srf-sunken text-black rounded-lg transition-colors cursor-pointer text-[13px]">
                   <Copy className="w-4 h-4 mr-1.5" /> Duplicar
                 </button>
               </div>
            </div>

             <div className="grid grid-cols-1 gap-6 animate-fadeIn">
               <div className="space-y-7">
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5">
                     Título <span className="text-red-500 ml-1 opacity-80">*</span> <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <input 
                     type="text" 
                     value={activeGroup.title} 
                     onChange={(e) => updateGroup({ title: e.target.value, name: e.target.value })}
                     placeholder="Ej. Uñas Acrílicas" 
                     className="w-full srf-sunken border border-transparent focus:srf-panel rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/20 focus:border-slate-300 transition-all duration-200 outline-none" 
                   />
                 </div>
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5">
                     Administradores <span className="text-red-500 ml-1 opacity-80">*</span> <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="srf-sunken border hairline rounded-xl p-3 flex flex-wrap gap-2 text-sm min-h-[60px] items-start transition-colors hover:border-slate-300">
                      {activeGroup.administrators.map(admin => (
                        <div key={admin.id} className="srf-panel rounded-lg py-1.5 px-2.5 flex items-center shadow-sm border hairline">
                          {admin.avatar ? (
                            <img src={admin.avatar} alt="" className="w-6 h-6 rounded-full mr-2.5 object-cover"/>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-100 to-slate-50 flex items-center justify-center mr-2.5 border hairline shadow-sm ink-3 font-bold text-[10px]">
                               {admin.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-semibold ink-1 mr-2.5 text-[13px]">{admin.name}</span>
                          <button onClick={() => removeAdmin(admin.id)} className="ink-3 hover:text-rose-500 cursor-pointer transition-colors">
                             <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={(e) => { e.preventDefault(); setIsAdminModalOpen(true); }}
                        className="text-[13px] srf-panel hover:srf-sunken border border-dashed border-slate-300 ink-3 px-4 py-2 flex items-center rounded-lg font-semibold cursor-pointer transition-colors shadow-sm"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Añadir Admin
                      </button>
                   </div>
                 </div>
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5">
                     Descripción <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <textarea 
                     rows={6} 
                     value={activeGroup.description}
                     onChange={(e) => updateGroup({ description: e.target.value })}
                     placeholder="Añade una descripción sobre los servicios o el equipo asignado a este grupo..."
                     className="w-full srf-sunken border border-transparent focus:srf-panel rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/20 focus:border-slate-300 transition-all duration-200 outline-none resize-none" 
                   />
                 </div>
               </div>
            </div>
          </>
        )}

        {mode === 'SERVICES' && (
          <div className="flex flex-col gap-5 animate-fadeIn">
             <div>
                 <div className="flex justify-between items-center mb-2.5 ml-1">
                    <label className="flex items-center text-[13px] font-semibold ink-1">
                       Punto de partida <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                    </label>
                    <label className="flex items-center text-[11px] ink-3 hover:ink-1 cursor-pointer select-none">
                       <input 
                         type="checkbox" 
                         checked={activeGroup.customStartingPoint || !STANDARD_STARTING_POINTS.includes(activeGroup.startingPoint)}
                         onChange={(e) => {
                           const checked = e.target.checked;
                           if (!checked) {
                             updateGroup({ 
                               customStartingPoint: false,
                               startingPoint: 'Cada 60 minuto(s)'
                             });
                           } else {
                             updateGroup({ 
                               customStartingPoint: true 
                             });
                           }
                         }}
                         className="mr-1 rounded border-slate-300 text-black focus:ring-black/20 w-3.5 h-3.5 cursor-pointer" 
                       />
                       Personalizado
                    </label>
                 </div>
                 { (activeGroup.customStartingPoint || !STANDARD_STARTING_POINTS.includes(activeGroup.startingPoint)) ? (
                   <div className="relative">
                     <input 
                       type="text"
                       inputMode="numeric"
                       pattern="[0-9]*"
                       value={(() => {
                         const match = activeGroup.startingPoint.match(/Cada (\d+) minuto\(s\)/);
                         return match ? match[1] : '60';
                       })()}
                       onChange={(e) => {
                         const val = e.target.value.replace(/\D/g, '');
                         const parsedVal = parseInt(val, 10);
                         if (!isNaN(parsedVal) && parsedVal > 0) {
                           updateGroup({ startingPoint: `Cada ${parsedVal} minuto(s)` });
                         } else {
                           updateGroup({ startingPoint: `Cada 1 minuto(s)` });
                         }
                       }}
                       className="w-full srf-sunken border border-transparent focus:srf-panel hover:border-slate-300 focus:border-slate-300 rounded-xl pl-4 pr-16 py-3 text-sm ink-1 font-semibold outline-none transition-all duration-200 focus:ring-2 focus:ring-black/20 shadow-sm"
                     />
                     <span className="absolute right-3 top-3.5 text-xs ink-3 font-bold pointer-events-none">
                       minutos
                     </span>
                   </div>
                 ) : (
                    <select 
                      value={activeGroup.startingPoint}
                      onChange={(e) => updateGroup({ startingPoint: e.target.value })}
                      className="w-full srf-sunken border border-transparent focus:srf-panel hover:border-slate-300 focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 font-semibold outline-none cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-black/20 shadow-sm"
                    >
                       <option value="Cada 5 minuto(s)">Cada 5 minuto(s)</option>
                       <option value="Cada 10 minuto(s)">Cada 10 minuto(s)</option>
                       <option value="Cada 15 minuto(s)">Cada 15 minuto(s)</option>
                       <option value="Cada 20 minuto(s)">Cada 20 minuto(s)</option>
                       <option value="Cada 30 minuto(s)">Cada 30 minuto(s)</option>
                       <option value="Cada 60 minuto(s)">Cada 60 minuto(s)</option>
                       <option value="Cada 90 minuto(s)">Cada 90 minuto(s)</option>
                       <option value="Cada 120 minuto(s)">Cada 120 minuto(s)</option>
                       <option value="Cada 150 minuto(s)">Cada 150 minuto(s)</option>
                       <option value="Cada 180 minuto(s)">Cada 180 minuto(s)</option>
                       <option value="Cada 210 minuto(s)">Cada 210 minuto(s)</option>
                       <option value="Cada 240 minuto(s)">Cada 240 minuto(s)</option>
                    </select>
                 )}
             </div>
             <div className="md:col-span-2">
                <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5 ml-1">
                   Tiempo de la sesión <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                </label>
                <div className="flex gap-3">
                   <select 
                     value={activeGroup.sessionTimeHours}
                     onChange={(e) => updateGroup({ sessionTimeHours: e.target.value })}
                     className="w-full srf-panel border hairline hover:border-slate-300 focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 font-semibold outline-none cursor-pointer transition-all focus:ring-2 focus:ring-black/20 shadow-sm"
                   >
                      {[...Array(24)].map((_, i) => (
                        <option key={`sh-${i}`} value={String(i)}>{i} hora{i !== 1 ? 's' : ''}</option>
                      ))}
                   </select>
                   <select 
                     value={activeGroup.sessionTimeMinutes}
                     onChange={(e) => updateGroup({ sessionTimeMinutes: e.target.value })}
                     className="w-full srf-panel border hairline hover:border-slate-300 focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 font-semibold outline-none cursor-pointer transition-all focus:ring-2 focus:ring-black/20 shadow-sm"
                   >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(min => (
                        <option key={`sm-${min}`} value={String(min)}>{min} minutos</option>
                      ))}
                   </select>
                </div>
             </div>
             <div className="md:col-span-2">
                <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5 ml-1">
                   Intervalo entre sesiones <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                </label>
                <div className="flex gap-3">
                   <select 
                     value={activeGroup.intervalHours}
                     onChange={(e) => updateGroup({ intervalHours: e.target.value })}
                     className="w-full srf-panel border hairline hover:border-slate-300 focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 font-semibold outline-none cursor-pointer transition-all focus:ring-2 focus:ring-black/20 shadow-sm"
                   >
                      {[...Array(24)].map((_, i) => (
                        <option key={`ih-${i}`} value={String(i)}>{i} hora{i !== 1 ? 's' : ''}</option>
                      ))}
                   </select>
                   <select 
                     value={activeGroup.intervalMinutes}
                     onChange={(e) => updateGroup({ intervalMinutes: e.target.value })}
                     className="w-full srf-panel border hairline hover:border-slate-300 focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 font-semibold outline-none cursor-pointer transition-all focus:ring-2 focus:ring-black/20 shadow-sm"
                   >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(min => (
                        <option key={`im-${min}`} value={String(min)}>{min} minutos</option>
                      ))}
                   </select>
                </div>
             </div>
          </div>
        )}

        {mode === 'GROUPS' && (
          <div className="flex items-center pt-2 animate-fadeIn">
            <label className="flex items-center cursor-pointer group srf-sunken border hairline rounded-xl px-5 py-4 w-full md:w-auto transition-colors hover:srf-sunken">
              <div className="relative">
                 <input 
                   type="checkbox" 
                   className="sr-only" 
                   checked={preventCrossGroupOverlaps}
                   onChange={(e) => setPreventCrossGroupOverlaps(e.target.checked)}
                 />
                 <div className={`block w-12 h-7 rounded-full transition-colors ${preventCrossGroupOverlaps ? 'accent-bg' : 'bg-slate-300'}`}></div>
                 <div className={`dot absolute left-1 top-1 srf-panel w-5 h-5 rounded-full transition-transform shadow-sm ${preventCrossGroupOverlaps ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <span className="ml-4 text-[13px] font-semibold ink-1 select-none">Bloquear horarios cruzados entre diferentes grupos del calendario.</span>
            </label>
            <Info className="w-4 h-4 ink-3 ml-3 cursor-help hidden md:block" />
          </div>
        )}

        {(!mode || mode === 'SCHEDULING') && (
          <div className="animate-fadeIn">
            {/* Horario Disponible */}
            <div>
             {isMobileApp ? (
             <div>
                <div className="flex items-center mb-4">
                   <h3 className="text-[17px] font-bold ink-1 flex items-center tracking-tight">
                      Horarios Habilitados <span className="text-red-500 ml-1 opacity-80">*</span> <Info className="w-4 h-4 ink-3 ml-2" />
                   </h3>
                </div>

                {/* Zona horaria — informativa y de solo lectura */}
                <div className="flex items-center srf-sunken border hairline rounded-xl px-4 py-3 gap-3 mb-4">
                   <Globe className="w-4.5 h-4.5 ink-3 shrink-0" />
                   <div className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold ink-1 truncate">{calendarTimezone}</span>
                      <span className="block text-[10px] font-semibold ink-3 leading-tight">Configurado en Información General</span>
                   </div>
                </div>

                {/* Days card — same style as Meses Disponibles */}
                <div className="srf-sunken/60 border hairline rounded-2xl overflow-hidden">
                   {activeGroup.days.map((day, dayIndex) => (
                      <div
                        key={day.name}
                        className={`px-4 py-3 ${dayIndex < activeGroup.days.length - 1 ? 'border-b hairline' : ''}`}
                      >
                         {/* Day row header: checkbox + label (+ disabled badge) */}
                         <div className="flex items-center justify-between mb-0">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                               <div className="relative flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={day.active}
                                    onChange={(e) => updateDay(dayIndex, { active: e.target.checked })}
                                    className="sr-only"
                                  />
                                  <span className={`w-[20px] h-[20px] rounded-md border-2 flex items-center justify-center transition-all shadow-sm ${day.active ? 'accent-bg border-transparent' : 'border-slate-300 srf-panel'}`}>
                                    {day.active && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                  </span>
                               </div>
                               <span className={`text-[14px] font-semibold select-none ${day.active ? 'ink-1' : 'ink-3'}`}>{day.name}</span>
                            </label>
                            {!day.active && (
                               <span className="text-[11px] font-bold ink-3 srf-panel border hairline rounded-lg px-2.5 py-1">Día deshabilitado</span>
                            )}
                         </div>

                         {/* Time ranges */}
                         {day.active && (
                            <div className="mt-2.5 space-y-2">
                               {day.times.map((time, ti) => (
                                  <div key={ti} className="flex items-center gap-2">
                                     <div className="flex-1 min-w-0">
                                        <CustomTimePicker value={time.start} onChange={(val) => updateDayTime(dayIndex, ti, { start: val })} />
                                     </div>
                                     <span className="ink-3 text-[11px] font-bold shrink-0">a</span>
                                     <div className="flex-1 min-w-0">
                                        <CustomTimePicker value={time.end} onChange={(val) => updateDayTime(dayIndex, ti, { end: val })} />
                                     </div>
                                     {ti === 0 ? (
                                        <button onClick={() => addTimeRange(dayIndex)} className="shrink-0 ink-1 w-8 h-8 flex items-center justify-center rounded-xl srf-panel border hairline active:srf-sunken transition-colors">
                                           <PlusCircle className="w-4 h-4" />
                                        </button>
                                     ) : (
                                        <button onClick={() => removeTimeRange(dayIndex, ti)} className="shrink-0 text-rose-400 w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 border border-rose-100 active:bg-rose-100 transition-colors">
                                           <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     )}
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>
                   ))}
                </div>

                {/* Tip */}
                <div className="srf-sunken border hairline rounded-2xl p-4 flex items-start gap-3 mt-4">
                   <Lightbulb className="w-4.5 h-4.5 ink-3 shrink-0 mt-0.5" />
                   <div>
                      <p className="font-bold ink-1 text-[13px]">Consejo</p>
                      <p className="text-[12px] ink-3 mt-0.5">Puedes agregar múltiples rangos de horario en un mismo día presionando el botón +.</p>
                   </div>
                </div>
             </div>
               ) : (
               <>
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                  <h3 className="text-lg font-semibold ink-1 flex items-center tracking-tight">
                     Horarios Habilitados <span className="text-red-500 ml-1 opacity-80">*</span> <Info className="w-4 h-4 ink-3 ml-2" />
                  </h3>
                  <span className="text-[13px] font-semibold ink-3 flex items-center srf-sunken px-3 py-1.5 rounded-lg border hairline">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div> {calendarTimezone}
                  </span>
               </div>

               <div className="space-y-1">
                  {activeGroup.days.map((day, dayIndex) => (
                     <div key={day.name} className="flex items-start gap-4 py-2">
                        {/* Day Label Column */}
                        <div className="w-[130px] flex-shrink-0 pt-2 relative z-10">
                          <label className="flex items-center cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={day.active}
                                onChange={(e) => updateDay(dayIndex, { active: e.target.checked })}
                                className="sr-only"
                               />
                              <span className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-all shadow-sm ${day.active ? 'accent-bg border-transparent' : 'border-slate-300 srf-panel'}`}>
                                {day.active && <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                              </span>
                            </div>
                            <span className={`ml-3.5 text-[14px] font-semibold select-none transition-colors ${day.active ? 'ink-1' : 'ink-3 group-hover:ink-1'}`}>{day.name}</span>
                          </label>
                        </div>

                        {/* Time Inputs Column with Connecting Lines */}
                        <div className="flex-1 relative flex flex-col gap-3 ml-2">
                           {/* Vertical stem connecting first row checkbox to multiple rows */}
                           {((day.active && day.times.length > 1) || (!day.active && day.times.length > 1)) && (
                             <div className="absolute left-[-136px] top-[18px] bottom-[18px] w-[2px] bg-slate-200 rounded-full"></div>
                           )}

                           {day.active ? (
                              day.times.map((time, timeIndex) => (
                                <div key={timeIndex} className="flex items-center gap-3 relative group/time">
                                   {/* Horizontal branch line for additional rows */}
                                   {timeIndex > 0 && (
                                     <div className="absolute left-[-136px] top-1/2 w-[136px] h-[2px] bg-slate-200 rounded-r-lg"></div>
                                   )}
                                   <CustomTimePicker 
                                     value={time.start} 
                                     onChange={(val) => updateDayTime(dayIndex, timeIndex, { start: val })}
                                   />
                                   <span className="ink-3 text-[13px] font-semibold mx-1">a</span>
                                   <CustomTimePicker 
                                     value={time.end} 
                                     onChange={(val) => updateDayTime(dayIndex, timeIndex, { end: val })}
                                   />
                                   {timeIndex === 0 ? (
                                     <button onClick={() => addTimeRange(dayIndex)} className="text-black hover:ink-1 hover:srf-sunken w-9 h-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer ml-1 relative z-10">
                                        <PlusCircle className="w-[18px] h-[18px]" />
                                     </button>
                                   ) : (
                                     <button onClick={() => removeTimeRange(dayIndex, timeIndex)} className="text-rose-400 hover:text-rose-500 hover:bg-rose-50 w-9 h-9 flex items-center justify-center rounded-lg transition-colors cursor-pointer ml-1 opacity-0 group-hover/time:opacity-100 focus:opacity-100 relative z-10">
                                       <Trash2 className="w-[17px] h-[17px]" />
                                     </button>
                                   )}
                                </div>
                              ))
                           ) : (
                              // Inactive state view - typically just grayed out first row, maybe we show all rows if they exist to demonstrate tree branch
                              day.times.map((time, timeIndex) => (
                                <div key={timeIndex} className={`flex items-center gap-3 relative opacity-40 pointer-events-none`}>
                                   {timeIndex > 0 && (
                                     <div className="absolute left-[-136px] top-1/2 w-[136px] h-[2px] bg-slate-200 rounded-r-lg"></div>
                                   )}
                                   <CustomTimePicker value={time.start} disabled={true} />
                                    <span className="ink-3 text-sm font-semibold mx-1">a</span>
                                    <CustomTimePicker value={time.end} disabled={true} />
                                </div>
                              ))
                           )}
                        </div>
                     </div>
                  ))}
               </div>
               </>
               )}
            </div>
          </div>
        )}

        {(!mode || mode === 'AVAILABILITY') && (
          <div className="animate-fadeIn">
            {/* Fechas Disponible */}
            <div>
               <div className="mb-6">
                  <h3 className="text-lg font-semibold ink-1 flex items-center tracking-tight">
                     Meses disponibles <span className="text-red-500 ml-1 opacity-80">*</span> <Info className="w-4 h-4 ink-3 ml-2" />
                  </h3>
               </div>

               <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-w-4xl px-4 py-4 srf-sunken/50 border hairline rounded-2xl">
                  {activeGroup.months.map((month, monthIndex) => (
                     <div key={month.name} className="flex flex-col gap-2">
                        <label className="flex items-center cursor-pointer mb-1">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={month.active}
                              onChange={(e) => updateMonth(monthIndex, { active: e.target.checked })}
                              className="sr-only"
                            />
                            <span className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-all shadow-sm ${month.active ? 'accent-bg border-transparent' : 'border-slate-300 srf-panel'}`}>
                              {month.active && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </span>
                          </div>
                          <span className={`ml-3 text-[13px] font-semibold select-none ${month.active ? 'ink-1' : 'ink-3'}`}>{month.name}</span>
                        </label>

                        <div className={`flex items-center gap-2 ${!month.active && 'opacity-40 pointer-events-none'}`}>
                           <select 
                             value={month.start}
                             onChange={(e) => updateMonth(monthIndex, { start: e.target.value })}
                             className="w-full srf-panel border hairline hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs ink-1 font-semibold outline-none cursor-pointer transition-colors shadow-sm focus:ring-2 focus:ring-black/20"
                           >
                              {[...Array(31)].map((_, i) => (
                                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                              ))}
                           </select>
                           <span className="ink-3 text-xs font-bold px-1">a</span>
                           <select 
                             value={month.end}
                             onChange={(e) => updateMonth(monthIndex, { end: e.target.value })}
                             className="w-full srf-panel border hairline hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs ink-1 font-semibold outline-none cursor-pointer transition-colors shadow-sm focus:ring-2 focus:ring-black/20"
                           >
                              {[...Array(31)].map((_, i) => (
                                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <hr className="border-t hairline my-10" />
          </div>
        )}

        {/* Lower specs */}
        <div className="grid grid-cols-1 gap-6 max-w-4xl">
           {mode === 'SERVICES' && (
             <div>
                <label className="flex items-center text-xs font-semibold ink-2 mb-2.5 ml-1 animate-fadeIn">
                   Cantidad de Sesiones <Info className="w-3.5 h-3.5 ink-3 ml-1 cursor-help" />
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={activeGroup.sessions} 
                  onChange={(e) => updateGroup({ sessions: e.target.value })}
                  className="w-full max-w-[120px] srf-panel border hairline focus:border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 ink-1 font-semibold shadow-sm transition-all text-center" 
                />
             </div>
           )}

           {(!mode || mode === 'AVAILABILITY') && (
              <>
                <div className="animate-fadeIn">
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-2.5 ml-1">
                      Disponibilidad <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   
                   {activeGroup.availabilityType === '... días corridos' ? (
                     <div className="flex">
                        <input 
                          type="number"
                          min="1"
                          value={activeGroup.availabilityRollingDays}
                          onChange={(e) => updateGroup({ availabilityRollingDays: e.target.value })}
                          className="w-24 srf-panel border hairline border-r-0 rounded-l-xl px-4 py-3 text-sm focus:outline-none ink-1 font-semibold text-center z-10 focus:border-slate-300 focus:ring-2 focus:ring-black/20 shadow-sm"
                        />
                        <select 
                          value={activeGroup.availabilityType}
                          onChange={(e) => updateGroup({ availabilityType: e.target.value })}
                          className="w-full srf-panel border hairline focus:border-slate-300 rounded-r-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 ink-1 font-semibold shadow-sm transition-all cursor-pointer"
                        >
                           <option value="Indefinidamente">Indefinidamente</option>
                           <option value="Hasta cierto día...">Hasta cierto día...</option>
                           <option value="... días corridos">... días corridos</option>
                        </select>
                     </div>
                   ) : activeGroup.availabilityType === 'Hasta cierto día...' ? (
                     <div className="flex">
                        <select 
                          value={activeGroup.availabilityType}
                          onChange={(e) => updateGroup({ availabilityType: e.target.value })}
                          className="w-full srf-panel border hairline border-r-0 focus:border-slate-300 rounded-l-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 ink-1 font-semibold shadow-sm transition-all cursor-pointer z-10"
                        >
                           <option value="Indefinidamente">Indefinidamente</option>
                           <option value="Hasta cierto día...">Hasta cierto día...</option>
                           <option value="... días corridos">... días corridos</option>
                        </select>
                        <div className="w-full relative srf-panel rounded-r-xl shadow-sm">
                          <CustomDatePicker 
                            value={activeGroup.availabilityDate}
                            onChange={(val) => updateGroup({ availabilityDate: val })}
                            placeholder="Seleccione fecha"
                            className="flex items-center bg-transparent border hairline hover:border-slate-300 rounded-r-xl px-4 py-3 text-sm w-full transition-all cursor-pointer h-full border-l-0 focus-within:ring-2 focus-within:ring-black/20"
                          />
                        </div>
                     </div>
                   ) : (
                     <select 
                       value={activeGroup.availabilityType}
                       onChange={(e) => updateGroup({ availabilityType: e.target.value })}
                       className="w-full srf-panel border hairline focus:border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 ink-1 font-semibold shadow-sm transition-all cursor-pointer"
                     >
                        <option value="Indefinidamente">Indefinidamente</option>
                        <option value="Hasta cierto día...">Hasta cierto día...</option>
                        <option value="... días corridos">... días corridos</option>
                     </select>
                   )}

                   {activeGroup.availabilityType === 'Hasta cierto día...' && activeGroup.availabilityDate && (
                     <p className="text-[13px] ink-3 mt-2 font-medium leading-relaxed">Los horarios sólo pueden ser recibidos antes de las 11:59 pm del día {activeGroup.availabilityDate.split('-').reverse().join('/')}</p>
                   )}
                   {activeGroup.availabilityType === '... días corridos' && (
                     <p className="text-[13px] ink-3 mt-2 font-medium leading-relaxed">Estás disponible para nuevas citas durante {activeGroup.availabilityRollingDays || 0} días calendario a partir de hoy</p>
                   )}
                </div>
                
                <div className="md:col-span-2">
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-3 block">
                      Anticipación mínima <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="flex max-w-sm">
                      {['Día(s) y', 'Horas', 'Minutos'].includes(activeGroup.minAnticipationType) && (
                        <input 
                          type="number" 
                          min="0"
                          value={activeGroup.minAnticipationValue} 
                          onChange={(e) => updateGroup({ minAnticipationValue: e.target.value })}
                          className="w-24 srf-panel border hairline border-r-0 rounded-l-xl px-4 py-3 text-sm focus:outline-none ink-1 font-semibold text-center z-10 focus:border-slate-300 focus:ring-2 focus:ring-black/20 shadow-sm" 
                        />
                      )}
                      <select 
                        value={activeGroup.minAnticipationType}
                        onChange={(e) => updateGroup({ minAnticipationType: e.target.value })}
                        className={`w-full srf-panel border hairline focus:border-slate-300 px-4 py-3 text-sm ink-1 font-semibold outline-none cursor-pointer focus:ring-2 focus:ring-black/20 shadow-sm ${['Día(s) y', 'Horas', 'Minutos'].includes(activeGroup.minAnticipationType) ? 'rounded-r-xl border-l-0' : 'rounded-xl'}`}
                      >
                         <option value="Sin anticipación mínima">Sin anticipación mínima</option>
                         <option value="No hay disponibilidad para hoy">No hay disponibilidad para hoy</option>
                         <option value="No hay disponibilidad para hoy ni mañana">No hay disponibilidad para hoy ni mañana</option>
                         <option value="Día(s) y">Día(s) y</option>
                         <option value="Horas">Horas</option>
                         <option value="Minutos">Minutos</option>
                      </select>
                   </div>
                   {['Día(s) y', 'Horas', 'Minutos'].includes(activeGroup.minAnticipationType) && (
                      <p className="text-[13px] ink-3 mt-2.5 font-medium leading-relaxed">Este grupo no recibirá citas para el próximo {activeGroup.minAnticipationValue || 0} {activeGroup.minAnticipationType.replace('Día(s) y', 'Día(s)').trim()}</p>
                   )}
                </div>

                <div className="md:col-span-2">
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-3">
                      Bloqueos de calendario puntuales (Vacaciones / Festivos) <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="flex flex-col gap-2.5">
                      <div className="w-full">
                        <CustomDatePicker 
                          value={activeGroup.newBlockedDate} 
                          onChange={(val) => updateGroup({ newBlockedDate: val })} 
                          placeholder="Seleccione una fecha exacta" 
                        />
                      </div>
                      <button 
                        onClick={addBlockedDate}
                        disabled={!activeGroup.newBlockedDate}
                        className="accent-bg hover:brightness-110 text-white font-bold text-[13px] w-full py-3 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm text-center"
                      >
                        AGREGAR
                      </button>
                   </div>

                   <div className="mt-5 border hairline rounded-xl p-4 flex flex-wrap gap-2.5 max-w-3xl min-h-[70px] srf-sunken/30 animate-fadeIn">
                      {activeGroup.blockedDates.map(date => (
                         <div key={date} className="srf-panel border border-rose-100 text-rose-500 text-[13px] font-semibold px-3 py-1.5 rounded-lg flex items-center shadow-sm">
                            {date.split('-').reverse().join('/')}
                            <button onClick={() => removeBlockedDate(date)} className="ml-2 bg-rose-50 rounded-md p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-100 cursor-pointer transition-colors"><X className="w-3.5 h-3.5" /></button>
                         </div>
                      ))}
                      {activeGroup.blockedDates.length === 0 && (
                        <span className="ink-3 text-[13px] font-medium flex items-center italic">Ninguna fecha específica bloqueada.</span>
                      )}
                    </div>
                </div>
              </>
           )}
        </div>

        {/* Advanced Config block */}
        {(!mode || mode === 'AVAILABILITY') && (
          <div className="border hairline rounded-xl overflow-hidden mt-10 srf-panel max-w-3xl shadow-sm animate-fadeIn">
            <div 
              onClick={() => setShowAdvanced(!showAdvanced)} 
              className="p-5 flex justify-between items-center cursor-pointer hover:srf-sunken transition-colors select-none"
            >
               <div className="flex items-center ink-1 font-semibold text-[14px]">
                  <SettingsIcon className="w-4 h-4 mr-2 ink-2" /> Configuraciones avanzadas
               </div>
               <svg className={`w-5 h-5 ink-3 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </div>
            
            <div className={`border-t hairline ${showAdvanced ? 'block' : 'hidden'}`}>
               <div className="p-7 space-y-7">
                 {/* Aprobación de nuevas citas */}
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-2 mb-3">
                     Aprobación de nuevas citas <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.approvalType === 'Aprobación automática' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.approvalType === 'Aprobación automática'} onChange={() => updateGroup({ approvalType: 'Aprobación automática' })} />
                       <span className="text-[14px] ink-1 font-medium">Aprobación automática</span>
                     </label>
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.approvalType === 'Aprobación manual' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.approvalType === 'Aprobación manual'} onChange={() => updateGroup({ approvalType: 'Aprobación manual' })} />
                       <span className="text-[14px] ink-1 font-medium">Aprobación manual</span>
                     </label>
                   </div>
                 </div>
                 
                 <hr className="border-t hairline" />

                 {/* Permitir que los suscriptores cancelen sus citas */}
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-2 mb-3">
                     Permitir que los suscriptores cancelen sus citas <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.allowCancel === 'Acepte cancelación' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.allowCancel === 'Acepte cancelación'} onChange={() => updateGroup({ allowCancel: 'Acepte cancelación' })} />
                       <span className="text-[14px] ink-1 font-medium">Acepte cancelación</span>
                     </label>
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.allowCancel === 'No acepte cancelación' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.allowCancel === 'No acepte cancelación'} onChange={() => updateGroup({ allowCancel: 'No acepte cancelación' })} />
                       <span className="text-[14px] ink-1 font-medium">No acepte cancelación</span>
                     </label>
                   </div>
                 </div>

                 <hr className="border-t hairline" />

                 {/* Permitir a los suscriptores reprogramar sus horarios */}
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-2 mb-3">
                     Permitir a los suscriptores reprogramar sus horarios <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.allowReschedule === 'Aceptar reprogramación' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.allowReschedule === 'Aceptar reprogramación'} onChange={() => updateGroup({ allowReschedule: 'Aceptar reprogramación' })} />
                       <span className="text-[14px] ink-1 font-medium">Aceptar reprogramación</span>
                     </label>
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.allowReschedule === 'No se aceptan reprogramaciones' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.allowReschedule === 'No se aceptan reprogramaciones'} onChange={() => updateGroup({ allowReschedule: 'No se aceptan reprogramaciones' })} />
                       <span className="text-[14px] ink-1 font-medium">No se aceptan reprogramaciones</span>
                     </label>
                   </div>
                 </div>

                 <hr className="border-t hairline" />

                 {/* Visualización de las horas no disponibles */}
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-2 mb-3">
                     Visualización de las horas no disponibles <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.unavailableDisplay === 'Mostrar como ocupado' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.unavailableDisplay === 'Mostrar como ocupado'} onChange={() => updateGroup({ unavailableDisplay: 'Mostrar como ocupado' })} />
                       <span className="text-[14px] ink-1 font-medium">Mostrar como ocupado</span>
                     </label>
                     <label className="flex items-center cursor-pointer group">
                       <span className={`w-4 h-4 rounded-full border-[5px] mr-2 transition-colors ${activeGroup.unavailableDisplay === 'Oculto' ? 'border-black srf-panel' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}></span>
                       <input type="radio" className="sr-only" checked={activeGroup.unavailableDisplay === 'Oculto'} onChange={() => updateGroup({ unavailableDisplay: 'Oculto' })} />
                       <span className="text-[14px] ink-1 font-medium">Oculto</span>
                     </label>
                   </div>
                 </div>

                 <hr className="border-t hairline" />

                 {/* Límite de programación por tiempo */}
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-2 mb-2">
                     Límite de programación por tiempo <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <input 
                     type="number"
                     value={activeGroup.timeLimit}
                     onChange={(e) => updateGroup({ timeLimit: e.target.value })}
                     className="w-full max-w-sm srf-panel border hairline focus:border-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-black/10 ink-1 shadow-sm transition-all"
                   />
                 </div>

                 {/* Límite de programación por correo electrónico */}
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-2 mb-2">
                     Límite de programación por correo electrónico <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <select 
                     value={activeGroup.emailLimit}
                     onChange={(e) => updateGroup({ emailLimit: e.target.value })}
                     className="w-full max-w-sm srf-panel border hairline focus:border-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-black/10 ink-1 shadow-sm transition-all cursor-pointer"
                   >
                      <option value="Sin límite">Sin límite</option>
                      <option value="1 Programación">1 Programación</option>
                      <option value="2 Horarios">2 Horarios</option>
                      <option value="3 Horarios">3 Horarios</option>
                      <option value="4 Horarios">4 Horarios</option>
                      <option value="5 Horarios">5 Horarios</option>
                      <option value="10 Horarios">10 Horarios</option>
                   </select>
                 </div>

                 {/* Antiguo */}
                 <div>
                   <label className="flex items-center text-[13px] font-semibold ink-2 mb-2">
                     Antiguo <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <select 
                     value={activeGroup.advanceLimit}
                     onChange={(e) => updateGroup({ advanceLimit: e.target.value })}
                     className="w-full max-w-sm srf-panel border hairline focus:border-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-black/10 ink-1 shadow-sm transition-all cursor-pointer"
                   >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="Hidden">Hidden</option>
                   </select>
                 </div>

               </div>
            </div>
          </div>
        )}

      </div>

      {/* Administrator Modal Dialog */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="srf-panel rounded-2xl border hairline shadow-2xl max-w-md w-full p-6 relative">
            <button 
              onClick={() => { setIsAdminModalOpen(false); setNewAdminName(''); }} 
              className="absolute top-4 right-4 p-1 rounded-full srf-sunken hover:srf-sunken ink-3 hover:ink-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold ink-1 mb-2">Añadir Administrador</h3>
            <p className="text-xs ink-3 mb-5 leading-relaxed">
              Introduce el nombre del nuevo miembro del equipo para asignarlo como administrador de este grupo de calendario.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold ink-1 mb-2">Nombre completo</label>
                <input 
                  type="text" 
                  value={newAdminName} 
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Ej. Ana María"
                  className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 outline-none focus:ring-2 focus:ring-black/20 transition-all"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button 
                  onClick={() => { setIsAdminModalOpen(false); setNewAdminName(''); }} 
                  className="px-4 py-2 border hairline hover:srf-sunken ink-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!newAdminName.trim()}
                  onClick={() => {
                    const newAdmin = {
                      id: `admin-${Date.now()}`,
                      name: newAdminName.trim(),
                      avatar: null
                    };
                    updateGroup({
                      administrators: [...(activeGroup.administrators || []), newAdmin]
                    });
                    setNewAdminName('');
                    setIsAdminModalOpen(false);
                  }}
                  className="px-4 py-2 accent-bg hover:brightness-110 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-md shadow-slate-950/10"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SchedulingSettings;

