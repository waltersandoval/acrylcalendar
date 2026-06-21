import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Calendar as CalendarIcon, Clock, User, Mail, ChevronLeft, ChevronRight, CheckCircle2, Globe, Check, CreditCard, Sparkles, AlertCircle, CalendarDays, ShieldCheck } from 'lucide-react';
import PayPalButton from './PayPalButton';

// Pure helpers for parsing and building slots
const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
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

const minutesToTimeString = (totalMins: number): string => {
  let hours = Math.floor(totalMins / 60);
  const minutes = totalMins % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minStr = minutes < 10 ? `0${minutes}` : String(minutes);
  const hourStr = hours < 10 ? `0${hours}` : String(hours);
  return `${hourStr}:${minStr} ${ampm}`;
};

interface PublicBookingProps {
  calendarId: string;
}

export default function PublicBooking({ calendarId }: PublicBookingProps) {
  const [calendar, setCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'date' | 'form' | 'payment' | 'success'>('date');
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phoneCode: '+504',
    phone: '',
    termsAccepted: false
  });
  const [submitting, setSubmitting] = useState(false);
  // Estado de pago: guarda los datos del form para usarlos en la verificación post-pago
  const [pendingBookingData, setPendingBookingData] = useState<any>(null);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City');
  const [lang, setLang] = useState('es');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [timeFilter, setTimeFilter] = useState<'am' | 'pm'>('am');
  const [bookedEvents, setBookedEvents] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<{ year: number; month: number } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);

  useEffect(() => {
    const fetchCalendar = async () => {
      if (!calendarId) return;
      try {
        const docRef = doc(db, 'calendars', calendarId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCalendar(data);
          if (data?.section_SCHEDULING?.groups?.length > 0) {
            setSelectedGroup(data.section_SCHEDULING.groups[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching calendar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
  }, [calendarId]);

  // Escuchar la configuración de pagos activa
  useEffect(() => {
    if (!calendarId || !db) return;

    const q = query(
      collection(db, 'payment_configs'),
      where('calendarId', '==', calendarId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const configs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Buscar configuración específica para el grupo seleccionado
      let active = configs.find((c: any) => c.groupId === selectedGroup?.id);
      if (!active) {
        // Fallback a todos los grupos
        active = configs.find((c: any) => c.groupId === 'all');
      }

      setPaymentConfig(active || null);
    }, (err) => {
      console.warn("Error receiving active payment config:", err);
    });

    return unsubscribe;
  }, [calendarId, selectedGroup?.id]);

  // Disponibilidad (horarios ocupados): se obtiene vía Cloud Function en vez
  // de leer la colección `events` directamente. Así nunca se descarga al
  // navegador del visitante el nombre/email/teléfono de otros clientes —
  // solo fecha/hora/duración, que es lo único que necesita el calendario.
  const fetchBookedEvents = React.useCallback(async () => {
    if (!calendarId || !functions) return;
    try {
      const availabilityCallable = httpsCallable(functions, 'getCalendarAvailability');
      const result: any = await availabilityCallable({ calendarId });
      setBookedEvents(result?.data?.events || []);
    } catch (err) {
      console.warn('Error fetching availability:', err);
    }
  }, [calendarId]);

  useEffect(() => {
    fetchBookedEvents();
  }, [fetchBookedEvents]);

  useEffect(() => {
    const userLocalTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (calendar?.section_BASIC) {
      if (calendar.section_BASIC.tzMode === 'fixed' && calendar.section_BASIC.fixedTimezone) {
        setSelectedTimezone(calendar.section_BASIC.fixedTimezone);
      } else if (calendar.section_BASIC.tzMode === 'user') {
        setSelectedTimezone(userLocalTz);
      }
      
      if (calendar.section_BASIC.langMode === 'fixed' && calendar.section_BASIC.fixedLanguage) {
        setLang(calendar.section_BASIC.fixedLanguage);
      } else {
        const browserLang = navigator.language.split('-')[0];
        setLang(['es', 'en', 'pt', 'fr', 'de', 'it', 'zh'].includes(browserLang) ? browserLang : 'es');
      }
    }
  }, [calendar]);

  const safeTimezone = React.useMemo(() => {
    try {
      if (selectedTimezone) Intl.DateTimeFormat(undefined, { timeZone: selectedTimezone });
      return selectedTimezone || 'America/Mexico_City';
    } catch (e) {
      return 'America/Mexico_City';
    }
  }, [selectedTimezone]);

  const dict: Record<string, any> = {
    es: { schedule: 'Agendar Cita', notFound: 'Calendario no encontrado', notAvailable: 'Calendario no disponible', selectDateTime: 'Selecciona una fecha y hora', nextDays: 'Próximos días disponibles', availableTimes: 'Horarios disponibles', continue: 'Continuar', back: 'Volver', details: 'Introduce tus detalles', name: 'Nombre completo', email: 'Correo electrónico', phone: 'Teléfono o WhatsApp', terms: '¿Aceptas los términos y condiciones y la política de privacidad? Aceptar', confirm: 'Confirmar Cita', scheduling: 'Agendando...', success: '¡Cita Agendada!', scheduledAt: 'Tu cita ha sido confirmada para el', scheduleAnother: 'Agendar otra cita', timezone: 'Zona Horaria' },
    en: { schedule: 'Schedule Appointment', notFound: 'Calendar not found', notAvailable: 'Calendar not available', selectDateTime: 'Select a date and time', nextDays: 'Next available days', availableTimes: 'Available times', continue: 'Continue', back: 'Back', details: 'Enter your details', name: 'Full Name', email: 'Email', phone: 'Phone or WhatsApp', terms: 'Do you accept the terms and privacy policy? Accept', confirm: 'Confirm Appointment', scheduling: 'Scheduling...', success: 'Appointment Scheduled!', scheduledAt: 'Your appointment has been confirmed for', scheduleAnother: 'Schedule another', timezone: 'Timezone' },
    pt: { schedule: 'Agendar Consulta', notFound: 'Calendário não encontrado', notAvailable: 'Calendário indisponível', selectDateTime: 'Selecione uma data e hora', nextDays: 'Próximos dias disponíveis', availableTimes: 'Horários disponíveis', continue: 'Continuar', back: 'Voltar', details: 'Insira seus detalhes', name: 'Nome completo', email: 'E-mail', phone: 'Telefone ou WhatsApp', terms: 'Você aceita os termos e a política de privacidade? Aceitar', confirm: 'Confirmar Consulta', scheduling: 'Agendando...', success: 'Consulta Agendada!', scheduledAt: 'Sua consulta foi confirmada para', scheduleAnother: 'Agendar outra', timezone: 'Fuso horário' },
    fr: { schedule: 'Planifier un rendez-vous', notFound: 'Calendrier introuvable', notAvailable: 'Calendrier non disponible', selectDateTime: 'Sélectionnez une date et une heure', nextDays: 'Prochains jours disponibles', availableTimes: 'Heures disponibles', continue: 'Continuer', back: 'Retour', details: 'Entrez vos coordonnées', name: 'Nom complet', email: 'E-mail', phone: 'Téléphone ou WhatsApp', terms: 'Acceptez-vous les termes et la politique de confidentialité ? Accepter', confirm: 'Confirmer', scheduling: 'Planification...', success: 'Rendez-vous confirmé!', scheduledAt: 'Votre rendez-vous est confirmé pour le', scheduleAnother: 'Planifier un autre', timezone: 'Fuseau horaire' },
    de: { schedule: 'Termin vereinbaren', notFound: 'Kalender nicht gefunden', notAvailable: 'Kalender nicht verfügbar', selectDateTime: 'Datum und Uhrzeit auswählen', nextDays: 'Nächste verfügbare Tage', availableTimes: 'Verfügbare Zeiten', continue: 'Weiter', back: 'Zurück', details: 'Details eingeben', name: 'Vollständiger Name', email: 'E-Mail', phone: 'Telefon oder WhatsApp', terms: 'Akzeptieren Sie die Bedingungen und die Datenschutzrichtlinie? Akzeptieren', confirm: 'Termin bestätigen', scheduling: 'Planung...', success: 'Termin vereinbart!', scheduledAt: 'Ihr Termin wurde bestätigt für den', scheduleAnother: 'Weiteren Termin planen', timezone: 'Zeitzone' },
    it: { schedule: 'Fissa un appuntamento', notFound: 'Calendario non trovato', notAvailable: 'Calendario non disponible', selectDateTime: 'Seleziona data e ora', nextDays: 'Prossimi giorni disponibili', availableTimes: 'Orari disponibili', continue: 'Continua', back: 'Indietro', details: 'Inserisci i tuoi dettagli', name: 'Nome completo', email: 'Email', phone: 'Telefono o WhatsApp', terms: 'Accetti i termini e la política sulla privacy? Accetto', confirm: 'Conferma appuntamento', scheduling: 'Pianificazione...', success: 'Appuntamento fissato!', scheduledAt: 'Il tuo appuntamento è stato confermato per il', scheduleAnother: 'Fissa un altro appuntamento', timezone: 'Fuso orario' },
    zh: { schedule: '安排约会', notFound: '找不到日历', notAvailable: '日历不可用', selectDateTime: '选择日期和时间', nextDays: '接下来的可用天数', availableTimes: '可用时间', continue: '继续', back: '返回', details: '输入您的详细信息', name: '全名', email: '电子邮件', phone: '电话或 WhatsApp', terms: '您接受条款和隐私政策吗？ 接受', confirm: '确认约会', scheduling: '安排中...', success: '预约成功！', scheduledAt: '您的预约已确认为', scheduleAnother: '安排另一个', timezone: '时区' }
  };
  
  const t = dict[lang] || dict['es'];

  const isDayActive = (date: Date) => {
    // Past days are not active
    const todayZero = new Date();
    todayZero.setHours(0, 0, 0, 0);
    if (date.getTime() < todayZero.getTime()) {
      return false;
    }

    if (!selectedGroup) return true;

    // 1. Check week days config
    if (selectedGroup.days) {
      const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday... 6 is Saturday
      const dayConfig = selectedGroup.days[dayOfWeek];
      if (!dayConfig || !dayConfig.active) return false;
    }

    // 2. Check months active settings (Spanish matching)
    if (selectedGroup.months && selectedGroup.months.length > 0) {
      const monthNamesSpanish = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const targetMonthName = monthNamesSpanish[date.getMonth()];
      const monthConfig = selectedGroup.months.find((m: any) => m.name.toLowerCase() === targetMonthName.toLowerCase());
      if (monthConfig) {
        if (!monthConfig.active) return false;
        const dayOfMonth = date.getDate();
        const startDay = parseInt(monthConfig.start, 10) || 1;
        const endDay = parseInt(monthConfig.end, 10) || 31;
        if (dayOfMonth < startDay || dayOfMonth > endDay) return false;
      }
    }

    // 3. Check blocked dates (YYYY-MM-DD)
    if (selectedGroup.blockedDates && selectedGroup.blockedDates.length > 0) {
      const yr = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const da = String(date.getDate()).padStart(2, '0');
      const dateKey = `${yr}-${mo}-${da}`;
      if (selectedGroup.blockedDates.includes(dateKey)) {
        return false;
      }
    }

    // 4. Check general availability constraints
    if (selectedGroup.availabilityType === '... días corridos') {
      const diffTime = date.getTime() - todayZero.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const rollingDays = parseInt(selectedGroup.availabilityRollingDays, 10) || 90;
      if (diffDays > rollingDays) return false;
    } else if (selectedGroup.availabilityType === 'Hasta cierto día...' && selectedGroup.availabilityDate) {
      const limitTime = new Date(selectedGroup.availabilityDate + 'T23:59:59').getTime();
      if (date.getTime() > limitTime) return false;
    }

    // 5. Check minimum anticipation constraints
    if (selectedGroup.minAnticipationType && selectedGroup.minAnticipationType !== 'Sin anticipación mínima') {
      const now = new Date();
      const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

      if (selectedGroup.minAnticipationType === 'No hay disponibilidad para hoy' && isToday) {
        return false;
      }

      if (selectedGroup.minAnticipationType === 'No hay disponibilidad para hoy ni mañana') {
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const isTomorrow = date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth() && date.getFullYear() === tomorrow.getFullYear();
        if (isToday || isTomorrow) return false;
      }

      const val = parseInt(selectedGroup.minAnticipationValue, 10) || 0;
      if (val > 0) {
        const diffMins = (date.getTime() - now.getTime()) / (1000 * 60);
        if (selectedGroup.minAnticipationType === 'Día(s) y') {
          const diffDays = Math.floor((date.getTime() - todayZero.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < val) return false;
        } else if (selectedGroup.minAnticipationType === 'Horas') {
          if (diffMins < val * 60) return false;
        } else if (selectedGroup.minAnticipationType === 'Minutos') {
          if (diffMins < val) return false;
        }
      }
    }

    return true;
  };

  const availableMonths = React.useMemo(() => {
    const today = new Date();
    let maxDate = new Date(today);
    maxDate.setMonth(today.getMonth() + 12); // default 12 months ahead

    if (selectedGroup) {
      if (selectedGroup.availabilityType === 'Hasta cierto día...' && selectedGroup.availabilityDate) {
        const limit = new Date(selectedGroup.availabilityDate + 'T23:59:59');
        if (!isNaN(limit.getTime())) {
          maxDate = limit;
        }
      } else if (selectedGroup.availabilityType === '... días corridos') {
        const rollingDays = parseInt(selectedGroup.availabilityRollingDays, 10) || 90;
        maxDate = new Date(today);
        maxDate.setDate(today.getDate() + rollingDays);
      }
    }

    const list: { year: number; month: number; label: string }[] = [];
    const monthNamesSpanish = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthNamesEnglish = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    let temp = new Date(today.getFullYear(), today.getMonth(), 1);
    const limitMonthTime = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1).getTime();

    while (temp.getTime() <= limitMonthTime) {
      const y = temp.getFullYear();
      const m = temp.getMonth();
      const monthLabel = lang === 'es' ? monthNamesSpanish[m] : monthNamesEnglish[m];
      list.push({
        year: y,
        month: m,
        label: `${monthLabel} ${y}`
      });
      temp.setMonth(temp.getMonth() + 1);
    }

    return list;
  }, [selectedGroup, lang]);

  useEffect(() => {
    if (availableMonths.length > 0) {
      const exists = currentMonthYear && availableMonths.some(m => m.year === currentMonthYear.year && m.month === currentMonthYear.month);
      if (!exists) {
        setCurrentMonthYear({ year: availableMonths[0].year, month: availableMonths[0].month });
      }
    }
  }, [availableMonths]);

  // Find the first available active date starting today when selectedGroup changes
  useEffect(() => {
    if (selectedGroup) {
      if (selectedDate && isDayActive(selectedDate)) {
        return;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let found: Date | null = null;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (isDayActive(d)) {
          found = d;
          break;
        }
      }
      
      if (found) {
        setSelectedDate(found);
        setCurrentMonthYear({ year: found.getFullYear(), month: found.getMonth() });
      } else {
        setSelectedDate(null);
      }
      setSelectedTime(null);
    }
  }, [selectedGroup]);

  // Auto-select first active date of the month when visible month changes (if current selectedDate is not in the active month)
  useEffect(() => {
    if (currentMonthYear && selectedGroup) {
      const isCurrentDateInVisibleMonth = selectedDate && 
        selectedDate.getFullYear() === currentMonthYear.year && 
        selectedDate.getMonth() === currentMonthYear.month;

      if (!isCurrentDateInVisibleMonth) {
        const daysInMonth = new Date(currentMonthYear.year, currentMonthYear.month + 1, 0).getDate();
        let foundActive: Date | null = null;
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(currentMonthYear.year, currentMonthYear.month, i);
          if (isDayActive(d)) {
            foundActive = d;
            break;
          }
        }
        if (foundActive) {
          setSelectedDate(foundActive);
          setSelectedTime(null);
        } else {
          setSelectedDate(null);
          setSelectedTime(null);
        }
      }
    }
  }, [currentMonthYear, selectedGroup]);

  const monthDatesGrid = React.useMemo(() => {
    if (!currentMonthYear) return [];
    const { year, month } = currentMonthYear;

    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay(); 
    // Convert Sunday (0) to 6, and subtract 1 to make Monday (0), ..., Sunday (6) for a Monday-first layout
    const firstDayIndex = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const items: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // 1. Previous month padding days
    const tempPrev = new Date(year, month, 0);
    const daysInPrevMonth = tempPrev.getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      items.push({
        date: d,
        isCurrentMonth: false,
        key: `prev-${d.getTime()}`
      });
    }

    // 2. Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      items.push({
        date: d,
        isCurrentMonth: true,
        key: `curr-${i}`
      });
    }

    // 3. Next month padding days to make it a perfect grid of weeks
    const remainingCells = (7 - (items.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      items.push({
        date: d,
        isCurrentMonth: false,
        key: `next-${i}`
      });
    }

    return items;
  }, [currentMonthYear]);

  const timeSlots = React.useMemo(() => {
    if (!selectedDate || !selectedGroup) {
      return [];
    }
    const dayOfWeek = selectedDate.getDay();
    const dayConfig = selectedGroup.days?.[dayOfWeek];
    if (!dayConfig || !dayConfig.active || !dayConfig.times) return [];

    const slots: string[] = [];
    const duration = selectedGroup.sessionDurationMinutes || 
      (parseInt(selectedGroup.sessionTimeHours, 10) * 60 + parseInt(selectedGroup.sessionTimeMinutes, 10)) || 
      30;
    
    // Parse starting point
    let startingStep = 60;
    if (selectedGroup.startingPointMinutes) {
      startingStep = selectedGroup.startingPointMinutes;
    } else if (selectedGroup.startingPoint) {
      const match = selectedGroup.startingPoint.match(/Cada (\d+) minuto\(s\)/);
      if (match) startingStep = parseInt(match[1], 10);
    }

    const interval = typeof selectedGroup.intervalBetweenSessionsMinutes !== 'undefined'
      ? selectedGroup.intervalBetweenSessionsMinutes
      : (parseInt(selectedGroup.intervalHours, 10) * 60 + parseInt(selectedGroup.intervalMinutes, 10)) ||
        0;

    for (const range of dayConfig.times) {
      const startMins = parseTimeToMinutes(range.start);
      const endMins = parseTimeToMinutes(range.end);

      let current = startMins;
      while (current + duration <= endMins) {
        slots.push(minutesToTimeString(current));
        current += startingStep > 0 ? startingStep : (duration + interval);
      }
    }

    // Filter out already booked slots
    const availableSlots = slots.filter(slot => {
      const slotStartMins = parseTimeToMinutes(slot);
      const slotEndMins = slotStartMins + duration;

      const isBooked = bookedEvents.some(event => {
        // Match status (ignore if cancelled)
        const isNotCancelled = event.status !== 'cancelled' && event.statusColor !== 'bg-red-400' && event.status !== 'cancelada';
        if (!isNotCancelled) {
          return false;
        }

        // Must match day, month, and year of the selected appointment date
        let sameDay = false;

        if (event.fullDate) {
          try {
            if (event.fullDate.includes('T')) {
              // ISO string: e.g. 2026-06-18T00:00:00.000Z
              const parts = event.fullDate.split('T')[0].split('-');
              if (parts.length === 3) {
                const ey = parseInt(parts[0], 10);
                const em = parseInt(parts[1], 10) - 1;
                const ed = parseInt(parts[2], 10);
                if (ey === selectedDate.getFullYear() && em === selectedDate.getMonth() && ed === selectedDate.getDate()) {
                  sameDay = true;
                }
              }
            } else {
              // YYYY-MM-DD: e.g. 2026-06-18
              const parts = event.fullDate.split('-');
              if (parts.length === 3) {
                const ey = parseInt(parts[0], 10);
                const em = parseInt(parts[1], 10) - 1;
                const ed = parseInt(parts[2], 10);
                if (ey === selectedDate.getFullYear() && em === selectedDate.getMonth() && ed === selectedDate.getDate()) {
                  sameDay = true;
                }
              }
            }
          } catch (e) {
            // fallback
          }
        }

        // Fallback to day/month comparison in case fullDate parsing was incomplete
        if (!sameDay && event.day && event.month) {
          const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
          const targetMonth = monthNames[selectedDate.getMonth()];
          const matchMonth = String(event.month).toUpperCase() === targetMonth;
          const matchDay = String(event.day) === selectedDate.getDate().toString();
          
          let matchYear = true;
          if (event.fullDate) {
            try {
              const eventDate = new Date(event.fullDate);
              matchYear = eventDate.getFullYear() === selectedDate.getFullYear();
            } catch (e) {}
          }
          if (matchMonth && matchDay && matchYear) {
            sameDay = true;
          }
        }

        if (!sameDay) {
          return false;
        }

        // Check for time overlap
        const eventStartMins = parseTimeToMinutes(event.time);
        
        // Parse event duration if present, default to group duration or 30
        let eventDur = duration;
        if (event.duration) {
          const match = event.duration.match(/(\d+)/);
          if (match) {
            eventDur = parseInt(match[1], 10);
          }
        }
        const eventEndMins = eventStartMins + eventDur;

        // Overlap occurs if slot endpoint is after event start,
        // and slot start is before event endpoint.
        const overlaps = slotEndMins > eventStartMins && slotStartMins < eventEndMins;
        return overlaps;
      });

      return !isBooked;
    });

    // Sort slots by time
    return Array.from(new Set(availableSlots)).sort((a, b) => {
      return parseTimeToMinutes(a) - parseTimeToMinutes(b);
    });
  }, [selectedDate, selectedGroup, bookedEvents]);

  // Automatically select the active filter based on available tabs when selection changes
  useEffect(() => {
    if (timeSlots && timeSlots.length > 0) {
      const hasAM = timeSlots.some(t => t.toUpperCase().includes('AM'));
      const hasPM = timeSlots.some(t => t.toUpperCase().includes('PM'));
      if (hasAM) {
        setTimeFilter('am');
      } else if (hasPM) {
        setTimeFilter('pm');
      }
    }
  }, [timeSlots]);

  const filteredTimeSlots = React.useMemo(() => {
    if (timeFilter === 'am') {
      return timeSlots.filter(t => t.toUpperCase().includes('AM'));
    }
    if (timeFilter === 'pm') {
      return timeSlots.filter(t => t.toUpperCase().includes('PM'));
    }
    return timeSlots;
  }, [timeSlots, timeFilter]);

  // ─────────────────────────────────────────────────────────────
  // Helpers para construir los datos de booking
  // ─────────────────────────────────────────────────────────────
  const buildBookingData = () => {
    if (!selectedDate || !selectedTime) return null;
    const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    const monthStr = monthNames[selectedDate.getMonth()];
    const dayStr = selectedDate.getDate().toString();
    const duration = selectedGroup
      ? `${selectedGroup.sessionDurationMinutes || (parseInt(selectedGroup.sessionTimeHours, 10)*60 + parseInt(selectedGroup.sessionTimeMinutes, 10)) || 30} minutos`
      : (calendar?.section_BASIC?.duration || '30 minutos');
    const serviceName = selectedGroup
      ? `${calendar?.title || 'Consulta'} - ${selectedGroup.title || selectedGroup.name}`
      : (calendar?.title || 'Consulta');
    return {
      calendarId,
      ownerUid: calendar?.ownerUid || calendar?.createdBy || null,
      groupId: selectedGroup?.id || null,
      groupTitle: selectedGroup?.title || selectedGroup?.name || null,
      month: monthStr,
      day: dayStr,
      time: selectedTime,
      service: serviceName,
      type: calendar?.type || 'Consulta',
      duration,
      client: formData.name,
      email: formData.email,
      phone: `${formData.phoneCode}-${formData.phone}`,
      termsAccepted: formData.termsAccepted,
      fullDate: selectedDate.toISOString(),
    };
  };

  // ─────────────────────────────────────────────────────────────
  // Paso 1: al confirmar el form → decidir si pagar o crear directo
  // ─────────────────────────────────────────────────────────────
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !formData.name || !formData.email || !formData.phone || !formData.termsAccepted) return;

    setBookingError(null);

    // Si hay configuración de pago activa (nueva o legacy fallback) → ir a pago
    let hasPrice = false;
    let paypalEnabled = false;

    if (paymentConfig) {
      hasPrice = !!paymentConfig.price && parseFloat(paymentConfig.price) > 0;
      paypalEnabled = !!paymentConfig.enabled;
    } else {
      hasPrice = !!calendar?.section_PAYMENT?.price && parseFloat(calendar.section_PAYMENT.price) > 0;
      paypalEnabled = !!calendar?.section_PAYMENT?.paypalEnabled;
    }

    if (hasPrice && paypalEnabled) {
      setPendingBookingData(buildBookingData());
      setPaypalError(null);
      setStep('payment');
      return;
    }

    // ── Flujo sin pago (igual que antes) ──────────────────────
    setSubmitting(true);
    try {
      const data = buildBookingData()!;
      let priceStr = '';
      if (paymentConfig) {
        priceStr = `${paymentConfig.currency} ${parseFloat(paymentConfig.price).toFixed(2)}`;
      } else if (calendar?.section_PAYMENT?.price && calendar?.section_PAYMENT?.currency) {
        priceStr = `${calendar.section_PAYMENT.currency} ${calendar.section_PAYMENT.price}`;
      }

      if (!functions) {
        throw new Error('El servicio de reservas no está disponible en este momento.');
      }

      const createEventCallable = httpsCallable(functions, 'createEvent');
      const result: any = await createEventCallable({ ...data, price: priceStr });
      if (result?.data?.success) {
        setStep('success');
      } else {
        throw new Error(result?.data?.message || 'No se pudo agendar la cita.');
      }
    } catch (err: any) {
      console.error('Error al agendar:', err);
      const rawMessage = err.message || '';
      if (rawMessage.includes('FAILED_PRECONDITION') || rawMessage.includes('failed-precondition') || rawMessage.includes('disponible')) {
        setBookingError('El horario seleccionado ya no está disponible o presenta un conflicto de horario.');
        // Refrescar los horarios ocupados para que el calendario refleje el cupo recién tomado.
        fetchBookedEvents();
      } else {
        setBookingError(rawMessage || 'Hubo un error al agendar la cita. Por favor intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Paso 2: PayPal aprobó el pago → verificar server-side y crear cita
  // ─────────────────────────────────────────────────────────────
  const handlePayPalApprove = async (paypalOrderId: string) => {
    if (!pendingBookingData || !functions) return;
    setSubmitting(true);
    setPaypalError(null);
    try {
      const verifyFn = httpsCallable(functions, 'verifyPaypalAndCreateEvent');
      const result: any = await verifyFn({ ...pendingBookingData, paypalOrderId });
      if (result?.data?.success) {
        setStep('success');
      } else {
        setPaypalError(result?.data?.message || 'No se pudo verificar el pago. Contacta al administrador.');
      }
    } catch (err: any) {
      console.error('Error verificando pago PayPal:', err);
      setPaypalError(err.message || 'Error al procesar el pago. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen srf-panel flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="min-h-screen srf-panel flex items-center justify-center">
        <div className="text-center p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold ink-1 mb-2">Calendario no encontrado</h2>
          <p className="ink-3 text-sm">El enlace proporcionado no es válido o el calendario ya no existe.</p>
        </div>
      </div>
    );
  }

  if (calendar.status === false) {
    return (
      <div className="min-h-screen srf-panel flex items-center justify-center">
        <div className="text-center max-w-md w-full p-6">
          <div className="w-16 h-16 srf-sunken ink-3 rounded-2xl flex items-center justify-center mx-auto mb-6 border hairline">
            <CalendarIcon className="w-8 h-8 ink-3" />
          </div>
          <h2 className="text-2xl font-bold ink-1 mb-3">Calendario no disponible</h2>
          <p className="ink-3 text-sm mb-6 leading-relaxed">El administrador ha desactivado temporalmente este calendario y no se pueden agendar nuevas citas en este momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] py-6 px-4 sm:px-6 lg:py-16 flex items-center justify-center font-sans">
      <div className="w-full max-w-[1200px] srf-panel border hairline shadow-[0_32px_120px_-32px_rgba(15,23,42,0.12)] rounded-[32px] overflow-hidden flex flex-col lg:flex-row min-h-[780px] relative divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        
        {/* Info Column (Sidebar) */}
        <div className="w-full lg:w-[360px] flex flex-col p-8 sm:p-10 srf-sunken relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-slate-600/5 rounded-full blur-3xl pointer-events-none" />
          
          {calendar?.section_BASIC?.logoBase64 && (
            <div className="mb-6 flex items-center justify-start">
              <img 
                src={calendar.section_BASIC.logoBase64} 
                alt="Logo" 
                className="max-h-16 max-w-full rounded-2xl object-contain srf-panel p-2 border hairline shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-3xl font-extrabold ink-1 tracking-tight font-display leading-[1.15]">
              {selectedGroup ? (selectedGroup.title || selectedGroup.name) : (calendar.title || t.schedule)}
            </h1>
            {selectedGroup && (
              <div className="mt-2.5">
                <span className="inline-flex items-center ink-3 font-bold text-xs srf-sunken px-2.5 py-1 rounded-lg border hairline">
                  {calendar.title || 'Servicio'}
                </span>
              </div>
            )}
          </div>

          <p className="ink-2 mb-6 flex items-center text-sm font-semibold">
            <Clock className="w-4 h-4 mr-2.5 ink-1" />
            {selectedGroup 
              ? `${selectedGroup.sessionDurationMinutes || (parseInt(selectedGroup.sessionTimeHours, 10)*60 + parseInt(selectedGroup.sessionTimeMinutes, 10)) || 30} minutos`
              : (calendar?.section_BASIC?.duration || '30 minutos')}
          </p>

          {(() => {
            const hasActiveConfig = !!paymentConfig && !!paymentConfig.enabled;
            const hasLegacyPrice = !paymentConfig && !!calendar?.section_PAYMENT?.price && parseFloat(calendar.section_PAYMENT.price) > 0;
            
            const isPayable = paymentConfig
              ? (!!paymentConfig.enabled && parseFloat(paymentConfig.price) > 0)
              : (!!calendar?.section_PAYMENT?.paypalEnabled && parseFloat(calendar?.section_PAYMENT?.price || '0') > 0);

            if (!isPayable) return null;

            const dispPrice = paymentConfig ? paymentConfig.price : calendar.section_PAYMENT.price;
            const dispCurrency = paymentConfig ? paymentConfig.currency : calendar.section_PAYMENT.currency;
            
            const hasAlt = paymentConfig
              ? (!!paymentConfig.altCurrency && !!paymentConfig.exchangeRate && parseFloat(paymentConfig.exchangeRate) > 0)
              : false;
            const altCurr = paymentConfig ? paymentConfig.altCurrency : '';
            const rate = paymentConfig ? parseFloat(paymentConfig.exchangeRate) : 1;
            const altPriceVal = paymentConfig ? (parseFloat(paymentConfig.price) * rate) : 0;

            return (
              <div className="mb-6 bg-emerald-500/[0.04] border border-emerald-500/10 p-3.5 rounded-2xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold text-emerald-600/80 uppercase tracking-widest">Inversión / Precio</p>
                    <p className="text-sm font-extrabold text-emerald-700 font-display">
                      {dispCurrency} {parseFloat(dispPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
                {hasAlt && (
                  <div className="pl-10 border-t border-emerald-500/5 pt-2 flex flex-col">
                    <span className="text-[9px] font-black text-emerald-600/70 uppercase tracking-wider">Conversión aproximada</span>
                    <span className="text-xs font-black text-emerald-800">
                      {altCurr} {altPriceVal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {selectedGroup?.description && (
            <p className="text-sm ink-3 mb-6 leading-relaxed srf-panel p-4 rounded-2xl border hairline shadow-sm relative italic">
              "{selectedGroup.description}"
            </p>
          )}

          {/* Timezone Selector */}
          <div className="mt-auto pt-6 border-t hairline">
            {calendar?.section_BASIC?.tzMode === 'user' ? (
              <div className="mb-2">
                <label className="text-[10px] font-extrabold ink-3 uppercase tracking-widest mb-2 block">{t.timezone}</label>
                <div className="relative">
                  <Globe className="w-4 h-4 ink-3 absolute left-3 top-3" />
                  <select 
                    value={selectedTimezone}
                    onChange={(e) => setSelectedTimezone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 srf-panel border hairline hover:border-slate-300 rounded-xl text-xs ink-1 font-semibold outline-none focus:ring-2 focus:ring-slate-900/20 cursor-pointer shadow-sm transition-all"
                  >
                    <option value="America/Mexico_City">America/Mexico City</option>
                    <option value="America/Guatemala">America/Guatemala</option>
                    <option value="America/El_Salvador">America/El_Salvador</option>
                    <option value="America/Tegucigalpa">America/Tegucigalpa</option>
                    <option value="America/Managua">America/Managua</option>
                    <option value="America/Costa_Rica">America/Costa_Rica</option>
                    <option value="America/Panama">America/Panama</option>
                    <option value="America/Havana">America/Havana</option>
                    <option value="America/Santo_Domingo">America/Santo_Domingo</option>
                    <option value="America/Puerto_Rico">America/Puerto_Rico</option>
                    <option value="America/Bogota">America/Bogota</option>
                    <option value="America/Caracas">America/Caracas</option>
                    <option value="America/Guayaquil">America/Guayaquil</option>
                    <option value="America/Lima">America/Lima</option>
                    <option value="America/La_Paz">America/La_Paz</option>
                    <option value="America/Asuncion">America/Asuncion</option>
                    <option value="America/Santiago">America/Santiago</option>
                    <option value="America/Buenos_Aires">America/Buenos_Aires</option>
                    <option value="America/Montevideo">America/Montevideo</option>
                    <option value="Europe/Madrid">Europe/Madrid</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="mb-2">
                <span className="text-[10px] font-extrabold ink-3 uppercase tracking-widest mb-1.5 block">{t.timezone}</span>
                <span className="text-xs ink-2 flex items-center font-bold"><Globe className="w-3.5 h-3.5 mr-2 ink-3" /> {selectedTimezone}</span>
              </div>
            )}
          </div>

          {/* Ticket Slot Card with high graphic detail */}
          {selectedDate && selectedTime && (
            <div className="mt-6 p-4 bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-2xl shadow-md shadow-slate-950/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 srf-panel/10 rounded-full blur-xl pointer-events-none" />
              <p className="text-[9px] font-extrabold tracking-widest uppercase opacity-75 mb-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> Tu Selección
              </p>
              <h3 className="text-sm font-extrabold font-display flex items-center gap-1.5 capitalize mb-1">
                <CalendarDays className="w-4 h-4 opacity-80" />
                {selectedDate.toLocaleDateString(lang, { weekday: 'long', month: 'long', day: 'numeric', timeZone: safeTimezone })}
              </h3>
              <p className="text-xs font-bold opacity-90 flex items-center gap-1.5">
                <Clock className="w-4 h-4 opacity-80" />
                {selectedTime}
              </p>
            </div>
          )}
        </div>

        {/* Action Column */}
        <div className="flex-1 flex flex-col p-8 sm:p-10 lg:p-12 srf-panel relative">
          {step === 'date' && (
            <div className="h-full flex flex-col justify-between">
              
              <div className="space-y-8">
                {/* Steps Header bar */}
                <div className="flex items-center justify-between border-b hairline pb-4">
                  <h2 className="text-xl font-bold ink-1 tracking-tight font-display">{t.selectDateTime}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-8 rounded-full bg-slate-900 transition-all duration-300" />
                    <span className="h-2 w-2 rounded-full bg-slate-200 transition-all duration-300" />
                  </div>
                </div>

                {/* Service selector group */}
                {calendar?.section_SCHEDULING?.groups && calendar.section_SCHEDULING.groups.length > 1 && (
                  <div className="p-5 srf-sunken rounded-2xl border hairline">
                    <span className="text-[10px] font-extrabold ink-3 uppercase tracking-wider block mb-3.5">
                      Selecciona un servicio o profesional
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {calendar.section_SCHEDULING.groups.map((g: any) => {
                        const isChosen = selectedGroup?.id === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setSelectedGroup(g);
                              setSelectedTime(null);
                            }}
                            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all relative group cursor-pointer ${
                              isChosen
                                ? 'border-slate-900 srf-panel ring-4 ring-slate-100 shadow-md'
                                : 'hairline srf-panel hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            {isChosen && (
                              <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center animate-in scale-in-50">
                                <Check className="w-3 h-3 text-white stroke-[3.5]" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-extrabold ink-1 text-sm group-hover:ink-1 transition-colors">{g.title || g.name}</h4>
                              {g.description && (
                                <p className="text-xs ink-3 mt-1.5 line-clamp-2 leading-relaxed font-medium">{g.description}</p>
                              )}
                            </div>
                            
                            {g.admins && g.admins.length > 0 && (
                              <div className="flex gap-2 mt-4 items-center pt-3 border-t hairline">
                                <div className="flex -space-x-1.5">
                                  {g.admins.map((adm: any, idx: number) => (
                                    <div key={adm.id || idx} className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border-2 border-white text-[9px] flex items-center justify-center font-bold ink-1" title={adm.name}>
                                      {adm.name.charAt(0).toUpperCase()}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] ink-3 font-semibold uppercase tracking-wider">
                                  {g.admins.length === 1 ? '1 Especialista' : `${g.admins.length} Especialistas`}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subgrid: Calendar left, Timeslots right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Calendar Widget Left */}
                  <div className="lg:col-span-7 srf-panel">
                    {currentMonthYear && availableMonths.length > 0 && (
                      <div className="flex items-center justify-between mb-5 srf-sunken border hairline p-2 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            const currentIdx = availableMonths.findIndex(m => m.year === currentMonthYear.year && m.month === currentMonthYear.month);
                            if (currentIdx > 0) {
                              setCurrentMonthYear({
                                year: availableMonths[currentIdx - 1].year,
                                month: availableMonths[currentIdx - 1].month
                              });
                            }
                          }}
                          disabled={availableMonths.findIndex(m => m.year === currentMonthYear.year && m.month === currentMonthYear.month) <= 0}
                          className="p-2 rounded-xl border hairline srf-panel shadow-sm ink-2 disabled:opacity-20 disabled:cursor-not-allowed hover:srf-sunken transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="relative flex items-center">
                          <select
                            value={`${currentMonthYear.year}-${currentMonthYear.month}`}
                            onChange={(e) => {
                              const [y, m] = e.target.value.split('-').map(Number);
                              setCurrentMonthYear({ year: y, month: m });
                            }}
                            className="text-xs font-black ink-1 bg-transparent py-0.5 border-none outline-none focus:ring-0 cursor-pointer pr-1 uppercase tracking-wider font-display"
                          >
                            {availableMonths.map((m) => (
                              <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const currentIdx = availableMonths.findIndex(m => m.year === currentMonthYear.year && m.month === currentMonthYear.month);
                            if (currentIdx >= 0 && currentIdx < availableMonths.length - 1) {
                              setCurrentMonthYear({
                                year: availableMonths[currentIdx + 1].year,
                                month: availableMonths[currentIdx + 1].month
                              });
                            }
                          }}
                          disabled={availableMonths.findIndex(m => m.year === currentMonthYear.year && m.month === currentMonthYear.month) >= availableMonths.length - 1}
                          className="p-2 rounded-xl border hairline srf-panel shadow-sm ink-2 disabled:opacity-20 disabled:cursor-not-allowed hover:srf-sunken transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Day labels (Headers) */}
                    <div className="grid grid-cols-7 gap-1.5 text-center mb-3">
                      {(lang === 'es' ? ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']).map((wd) => (
                        <span key={wd} className="text-[10px] font-black ink-3 tracking-widest py-1">
                          {wd}
                        </span>
                      ))}
                    </div>

                    {/* Date digits grid */}
                    <div className="grid grid-cols-7 gap-1.5 min-h-[250px]">
                      {monthDatesGrid.map((item) => {
                        const { date, isCurrentMonth, key } = item;
                        const active = isCurrentMonth && isDayActive(date);
                        const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
                        const isToday = new Date().toDateString() === date.toDateString();

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!active}
                            onClick={() => {
                              if (active) {
                                setSelectedDate(date);
                                setSelectedTime(null);
                              }
                            }}
                            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all min-h-[46px] relative cursor-pointer group select-none ${
                              !isCurrentMonth
                                ? 'opacity-0 pointer-events-none'
                                : !active
                                  ? 'opacity-20 srf-sunken border-transparent text-slate-300 cursor-not-allowed'
                                  : isSelected
                                    ? 'border-slate-900 bg-slate-900 text-white font-extrabold shadow-md shadow-slate-950/20 scale-102 ring-2 ring-slate-100'
                                    : 'hairline srf-panel hover:border-slate-300 hover:srf-sunken ink-1 font-bold hover:scale-102'
                            }`}
                          >
                            <span className="text-xs tracking-tight">
                              {date.getDate()}
                            </span>
                            {isToday && isCurrentMonth && (
                              <span className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'srf-panel' : 'bg-slate-900 animate-pulse'}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Side: Available schedules */}
                  <div className="lg:col-span-5 srf-sunken p-5 rounded-2xl border hairline flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2 pb-3 border-b hairline">
                      <p className="text-[10px] font-extrabold ink-3 uppercase tracking-widest">{t.availableTimes}</p>
                      
                      {selectedDate && timeSlots.length > 0 && (
                        <div className="inline-flex rounded-xl p-0.5 bg-slate-200/50 border hairline shadow-inner">
                          <button
                            type="button"
                            onClick={() => setTimeFilter('am')}
                            className={`px-3.5 py-1 text-[10px] font-black rounded-lg transition-all duration-200 cursor-pointer ${
                              timeFilter === 'am'
                                ? 'srf-panel ink-1 shadow-sm'
                                : 'ink-3 hover:ink-1'
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimeFilter('pm')}
                            className={`px-3.5 py-1 text-[10px] font-black rounded-lg transition-all duration-200 cursor-pointer ${
                              timeFilter === 'pm'
                                ? 'srf-panel ink-1 shadow-sm'
                                : 'ink-3 hover:ink-1'
                            }`}
                          >
                            PM
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      {selectedDate ? (
                        timeSlots.length > 0 ? (
                          filteredTimeSlots.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                              {filteredTimeSlots.map((time, i) => {
                                const isSelected = selectedTime === time;
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setSelectedTime(time)}
                                    className={`p-3 rounded-xl border text-xs font-extrabold transition-all text-center cursor-pointer ${
                                      isSelected
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10'
                                        : 'hairline srf-panel hover:border-slate-300 hover:srf-sunken ink-1 hover:scale-101'
                                    }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-10 srf-panel rounded-2xl border border-dashed hairline px-4">
                              <p className="text-xs ink-3 font-bold">
                                {lang === 'es'
                                  ? `No hay cupos disponibles por la ${timeFilter === 'am' ? 'mañana (AM)' : 'tarde/noche (PM)'}.`
                                  : `No spots left in the ${timeFilter.toUpperCase()}.`}
                              </p>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-10 srf-panel rounded-2xl border border-dashed hairline px-4">
                            <p className="text-xs ink-3 font-bold">Sin horarios definidos para hoy.</p>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-12 srf-panel rounded-2xl border border-dashed hairline px-4 flex flex-col items-center justify-center h-full">
                          <CalendarIcon className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                          <p className="text-xs ink-3 font-extrabold text-center">Selecciona un día en el calendario.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Sticky bottom CTA and errors in date selection step */}
              <div className="mt-8 pt-6 border-t hairline flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="hidden sm:block">
                  {selectedDate && selectedTime ? (
                    <p className="text-xs ink-3 font-semibold">Cita seleccionada. Haz clic en continuar para ingresar tus datos.</p>
                  ) : (
                    <p className="text-xs ink-3 font-semibold">Selecciona una fecha y hora superiores antes de continuar.</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep('form')}
                  className="px-6 py-3.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-slate-950 text-white rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-md shadow-slate-950/10 hover:shadow-lg sm:w-auto w-full group"
                >
                  {t.continue} <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

            </div>
          )}

          {step === 'form' && (
            <div className="animate-in fade-in slide-in-from-right-5 duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b hairline pb-4 mb-6">
                  <div className="flex items-center">
                    <button 
                      type="button"
                      onClick={() => setStep('date')} 
                      className="ink-3 hover:ink-1 transition-colors mr-3 p-1 rounded-lg hover:srf-sunken cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold ink-1 tracking-tight font-display">{t.details}</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-200 transition-all duration-300" />
                    <span className="h-2 w-8 rounded-full bg-slate-900 transition-all duration-300" />
                  </div>
                </div>

                <form onSubmit={handleBooking} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-extrabold ink-3 uppercase tracking-widest mb-1.5 ml-1">{t.name}</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-3.5 w-4.5 h-4.5 ink-3 group-focus-within:ink-1 transition-colors" />
                      <input
                        required
                        type="text"
                        className="w-full pl-11 pr-4 py-3 srf-sunken border hairline rounded-xl text-sm ink-1 placeholder-slate-400 focus:srf-panel focus:ring-4 focus:ring-slate-100 focus:border-slate-950 outline-none transition-all font-semibold"
                        placeholder="Ej. Juan Pérez"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold ink-3 uppercase tracking-widest mb-1.5 ml-1">{t.email}</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-3.5 w-4.5 h-4.5 ink-3 group-focus-within:ink-1 transition-colors" />
                      <input
                        required
                        type="email"
                        className="w-full pl-11 pr-4 py-3 srf-sunken border hairline rounded-xl text-sm ink-1 placeholder-slate-400 focus:srf-panel focus:ring-4 focus:ring-slate-100 focus:border-slate-950 outline-none transition-all font-semibold"
                        placeholder="Ej. juan@correo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold ink-3 uppercase tracking-widest mb-1.5 ml-1">{t.phone}</label>
                    <div className="flex gap-2.5">
                      <select
                        className="w-24 srf-sunken border hairline rounded-xl px-3.5 py-3 text-xs ink-1 focus:srf-panel focus:ring-4 focus:ring-slate-100 focus:border-slate-950 outline-none cursor-pointer transition-all font-extrabold"
                        value={formData.phoneCode}
                        onChange={(e) => setFormData({ ...formData, phoneCode: e.target.value })}
                      >
                        <option value="+504">HN +504</option>
                        <option value="+1">US +1</option>
                        <option value="+34">ES +34</option>
                        <option value="+52">MX +52</option>
                        <option value="+57">CO +57</option>
                        <option value="+54">AR +54</option>
                        <option value="+56">CL +56</option>
                      </select>
                      <input
                        required
                        type="tel"
                        className="flex-1 px-4.5 py-3 srf-sunken border hairline rounded-xl text-sm ink-1 placeholder-slate-400 focus:srf-panel focus:ring-4 focus:ring-slate-100 focus:border-slate-950 outline-none transition-all font-semibold"
                        placeholder="Ej. 12345678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-start srf-sunken border hairline p-3.5 rounded-2xl mt-6">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        id="terms"
                        type="checkbox"
                        required
                        className="w-4 h-4 text-slate-950 srf-panel border-slate-300 rounded focus:ring-slate-950 focus:ring-2 cursor-pointer transition-all"
                        checked={formData.termsAccepted}
                        onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                      />
                    </div>
                    <label htmlFor="terms" className="ml-3 text-xs font-semibold ink-3 leading-normal select-none cursor-pointer">
                      {t.terms}
                    </label>
                  </div>

                  {bookingError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 rounded-2xl text-xs font-bold leading-normal flex items-start gap-2.5 animate-in shake-1">
                      <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                      <div>{bookingError}</div>
                    </div>
                  )}

                  <div className="pt-6 border-t hairline flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep('date')}
                      className="px-5 py-3.5 srf-sunken hover:bg-slate-200 transition-colors ink-1 rounded-xl text-sm font-bold cursor-pointer"
                    >
                      Atrás
                    </button>
                    
                    <button
                      type="submit"
                      disabled={submitting || !formData.name || !formData.email || !formData.phone || !formData.termsAccepted}
                      className="flex-1 py-3.5 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-black hover:to-slate-900 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-md shadow-slate-950/20 focus:ring-4 focus:ring-slate-500/20"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Procesando...
                        </span>
                      ) : (
                        t.confirm
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {step === 'payment' && (() => {
            const payPrice = paymentConfig ? paymentConfig.price : (calendar?.section_PAYMENT?.price || '0');
            const payCurrency = paymentConfig ? paymentConfig.currency : (calendar?.section_PAYMENT?.currency || 'USD');
            // Normalizar a código ISO de 3 letras para PayPal
            const currencyMap: Record<string, string> = {
              'USD': 'USD', 'United States Dollar': 'USD',
              'EUR': 'EUR', 'Euro': 'EUR',
              'HNL': 'HNL', 'Lempira hondureño': 'HNL',
              'MXN': 'MXN', 'Peso mexicano': 'MXN',
              'GTQ': 'GTQ', 'Quetzal guatemalteco': 'GTQ',
            };
            const isoCode = currencyMap[payCurrency] || 'USD';

            return (
              <div className="animate-in fade-in slide-in-from-right-5 duration-300 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b hairline pb-4 mb-6">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => { setStep('form'); setPaypalError(null); }}
                      className="ink-3 hover:ink-1 transition-colors mr-3 p-1 rounded-lg hover:srf-sunken cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold ink-1 tracking-tight font-display">Pago seguro</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                    <span className="h-2 w-2 rounded-full bg-slate-200" />
                    <span className="h-2 w-8 rounded-full bg-slate-900" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-5 max-w-md mx-auto w-full">
                  {/* Resumen de la cita */}
                  <div className="srf-sunken border hairline rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-extrabold ink-3 uppercase tracking-widest">Resumen de tu reserva</p>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-sm">
                        <p className="font-extrabold ink-1 capitalize">
                          {selectedDate?.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="ink-3 font-semibold">{selectedTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl srf-sunken flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 ink-2" />
                      </div>
                      <p className="text-sm font-semibold ink-1">{formData.name} · {formData.email}</p>
                    </div>
                    <div className="pt-3 border-t hairline space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold ink-3">Total a pagar</span>
                        <span className="text-lg font-black text-emerald-700">{payCurrency} {parseFloat(payPrice).toFixed(2)}</span>
                      </div>
                      {paymentConfig?.altCurrency && paymentConfig?.exchangeRate && parseFloat(paymentConfig.exchangeRate) > 0 && (
                        <div className="flex items-center justify-between text-xs ink-3">
                          <span className="font-semibold">Conversión aproximada</span>
                          <span className="font-bold text-emerald-600">
                            {paymentConfig.altCurrency} {(parseFloat(payPrice) * parseFloat(paymentConfig.exchangeRate)).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botones PayPal */}
                  <div className="srf-panel border hairline rounded-2xl p-5 shadow-sm">
                    <p className="text-[10px] font-extrabold ink-3 uppercase tracking-widest mb-4">Selecciona tu método de pago</p>
                    {submitting ? (
                      <div className="flex flex-col items-center gap-3 py-6">
                        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-bold ink-1">Verificando pago con el servidor...</p>
                        <p className="text-xs ink-3">Esto puede tomar unos segundos</p>
                      </div>
                    ) : (
                      <PayPalButton
                        clientId={paymentConfig ? paymentConfig.clientId : calendar?.section_PAYMENT?.paypalClientId}
                        amount={parseFloat(payPrice).toFixed(2)}
                        currency={isoCode}
                        color={paymentConfig?.buttonColor}
                        shape={paymentConfig?.buttonShape}
                        buyerCountry={paymentConfig?.cardCountry}
                        description={`Reserva: ${calendar?.title || 'Cita'} — ${selectedDate?.toLocaleDateString(lang, { day: 'numeric', month: 'short' })} ${selectedTime}`}
                        onApprove={handlePayPalApprove}
                        onError={(err) => {
                          console.error('PayPal error:', err);
                          setPaypalError('Ocurrió un error con PayPal. Por favor intenta de nuevo.');
                        }}
                        disabled={submitting}
                      />
                    )}
                  </div>

                  {/* Error de pago */}
                  {paypalError && (
                    <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <p className="font-bold">Error al procesar el pago</p>
                        <p className="text-xs mt-0.5">{paypalError}</p>
                      </div>
                    </div>
                  )}

                  {/* Badge de seguridad */}
                  <div className="flex items-center justify-center gap-2 ink-3 py-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <p className="text-[11px] font-semibold">Pago 100% seguro · Procesado por PayPal</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {step === 'success' && (
            <div className="animate-in fade-in zoom-in-98 duration-500 flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-20 h-20 bg-emerald-500/[0.08] text-emerald-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-500/[0.02]">
                <CheckCircle2 className="w-11 h-11" />
              </div>
              <h2 className="text-2xl font-black ink-1 mb-2 font-display">{t.success}</h2>
              <p className="ink-3 max-w-md mb-8 text-sm font-semibold leading-relaxed">
                {t.scheduledAt}{' '}
                <span className="ink-1 font-extrabold srf-sunken px-2.5 py-1 rounded-lg inline-block my-1 capitalize">
                  {selectedDate?.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: safeTimezone })}
                </span>{' '}
                a las <span className="text-slate-950 font-extrabold">{selectedTime}</span> ({selectedTimezone}).
              </p>
              
              <button 
                type="button"
                onClick={() => {
                  setStep('date');
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setFormData({ name: '', email: '', phoneCode: '+504', phone: '', termsAccepted: false });
                }}
                className="px-6 py-3 srf-sunken hover:bg-slate-200/80 hover:ink-1 ink-2 rounded-xl font-bold transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                {t.scheduleAnother}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
