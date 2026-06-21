/**
 * VISTA: NUEVO CALENDARIO
 * Interfaz para crear un calendario de consulta. Tiene layout de escritorio y
 * layout móvil (tarjeta centrada con back, ícono, input y Consejo) según mockups.
 */
import React, { useState } from 'react';
import { CalendarDays, Loader2, ChevronLeft, Info } from 'lucide-react';
import { useIsMobileApp } from '../../hooks/useMediaQuery';
import { useAuth } from '../../lib/auth';
import { useHeaderActions } from '../../lib/headerActions';

const NewCalendar: React.FC<{ onCreate?: (title: string, type: string, id: string) => void; onBack?: () => void }> = ({ onCreate, onBack }) => {
  const isMobileApp = useIsMobileApp();
  const { user } = useAuth();
  const [calendarTitle, setCalendarTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!calendarTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { db } = await import('../../lib/firebase');
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'calendars'), {
        title: calendarTitle,
        type: 'CONSULTA',
        status: true,
        groups: 0,
        schedules: '0',
        createdAt: serverTimestamp(),
        createdBy: user?.uid || null,
        ownerUid: user?.uid || null,
        ownerEmail: user?.email || '',
        memberUids: user?.uid ? [user.uid] : [],
        roles: user?.uid ? { [user.uid]: 'owner' } : {},
      });
      if (onCreate) onCreate(calendarTitle, 'CONSULTA', docRef.id);
    } catch (err: any) {
      console.error(err);
      setError('Error al crear el calendario. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Acción primaria en el header flotante (solo escritorio; en móvil se usa el
  // CTA central de la tarjeta de creación).
  useHeaderActions(
    isMobileApp
      ? []
      : [{ label: 'Crear calendario', variant: 'primary', icon: <CalendarDays className="w-4 h-4" />, onClick: () => handleCreate(), disabled: !calendarTitle.trim() || loading, loading }],
    [isMobileApp, calendarTitle, loading],
  );

  // ---------- MÓVIL ----------
  if (isMobileApp) {
    return (
      <div className="flex flex-col pt-3">
        <div className="flex items-center gap-3 mb-5">
          {onBack && (
            <button onClick={onBack} className="w-11 h-11 rounded-full srf-panel border hairline shadow-sm flex items-center justify-center ink-2 active:scale-95 transition-transform shrink-0" aria-label="Atrás">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight ink-1 font-display truncate">
            Nuevo calendario
          </h1>
        </div>

        <div className="srf-panel rounded-3xl border hairline shadow-sm p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl srf-sunken flex items-center justify-center ink-1 mb-5">
              <CalendarDays className="w-10 h-10" strokeWidth={1.6} />
            </div>
            <h1 className="text-[26px] leading-[1.15] font-extrabold tracking-tight ink-1 font-display">Configurar calendario de consulta</h1>
            <p className="ink-3 font-medium text-[14px] mt-3 leading-relaxed">
              Usted establece su horario de apertura y sus clientes eligen el horario en el que prefieren ser atendidos.
            </p>
          </div>

          <div className="mt-7">
            <label className="block text-[15px] font-bold ink-1 mb-2">Nombre de su calendario</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej. Mentoría, Asesorías, Consultas"
                value={calendarTitle}
                onChange={(e) => setCalendarTitle(e.target.value)}
                maxLength={100}
                className="w-full srf-panel border hairline ink-1 font-medium rounded-2xl pl-4 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black shadow-sm"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-300">{calendarTitle.length}/100</span>
            </div>
          </div>

          <div className="srf-sunken border hairline rounded-2xl p-4 flex items-start gap-3 mt-5">
            <Info className="w-5 h-5 ink-3 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold ink-1 text-[14px]">Consejo</p>
              <p className="text-[13px] ink-3 mt-0.5">Elige un nombre claro que te ayude a identificar este calendario fácilmente.</p>
            </div>
          </div>

          {error && <p className="text-rose-500 text-sm font-medium mt-4">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!calendarTitle.trim() || loading}
            className="w-full mt-6 accent-bg text-white py-4 rounded-2xl text-[15px] font-bold tracking-wide shadow-lg shadow-black/10 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarDays className="h-5 w-5" />}
            {loading ? 'CREANDO...' : 'CREAR CALENDARIO'}
          </button>
        </div>
      </div>
    );
  }

  // ---------- ESCRITORIO ----------
  return (
    <div className="flex flex-col flex-1 h-full max-w-4xl mx-auto w-full pt-8">
      <div className="flex flex-col items-center mt-6">
        <div className="text-center max-w-2xl mb-10">
          <h1 className="text-3xl font-black ink-1 mb-3">Configurar calendario de consulta</h1>
          <p className="ink-3 font-medium text-sm leading-relaxed max-w-lg mx-auto">
            Usted establece su horario de apertura y sus clientes eligen el horario en el que prefieren ser atendidos.
          </p>
        </div>

        <div className="w-full max-w-2xl mb-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Nombre de su calendario (ej. Mentoría 1:1, Citas Online)"
              value={calendarTitle}
              onChange={(e) => setCalendarTitle(e.target.value)}
              maxLength={100}
              className="w-full srf-panel border hairline ink-1 font-semibold rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black shadow-sm transition-all"
            />
            <span className="absolute right-3 top-4 text-[10px] font-bold text-slate-300">{calendarTitle.length}/100</span>
          </div>
          <p className="text-[12px] ink-3 font-medium mt-3 text-center">Usa el botón <strong className="ink-1">“Crear calendario”</strong> arriba a la derecha para continuar.</p>
        </div>
        {error && <p className="text-red-500 text-sm font-medium -mt-4 mb-8">{error}</p>}
      </div>
    </div>
  );
};

export default NewCalendar;
