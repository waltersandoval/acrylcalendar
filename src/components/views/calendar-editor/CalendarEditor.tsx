import React, { useEffect, useRef, useState } from 'react';
import {
  Check, Copy, ExternalLink, Eye, Loader2, Monitor,
  RefreshCw, Save, Send, Bell, Calendar as CalendarIcon, ChevronRight
} from 'lucide-react';
import { openExternalUrl } from '../../../lib/device';
import BasicSettings from './BasicSettings';
import SchedulingSettings from './SchedulingSettings';
import FormsSettings from './FormsSettings';
import CommunicationsSettings from './CommunicationsSettings';
import AutomationSettings from './AutomationSettings';
import PaymentSettings from './PaymentSettings';

interface CalendarEditorProps {
  calendarId?: string;
  calendarTitle?: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
  onBack?: () => void;
  unreadCount?: number;
  onShowNotifications?: () => void;
  onTitleChange?: (title: string) => void;
}

const SECTION_COPY: Record<string, { title: string; eyebrow: string }> = {
  BASIC: { title: 'Información general', eyebrow: 'Contenido' },
  DESIGN: { title: 'Diseño visual', eyebrow: 'Apariencia' },
  SCHEDULING: { title: 'Horarios', eyebrow: 'Tiempo' },
  AVAILABILITY: { title: 'Meses y disponibilidad', eyebrow: 'Disponibilidad' },
  SERVICES: { title: 'Servicios', eyebrow: 'Oferta' },
  GROUPS: { title: 'Grupos', eyebrow: 'Organización' },
  FORMS: { title: 'Formularios', eyebrow: 'Datos del cliente' },
  COMMS: { title: 'Comunicaciones', eyebrow: 'Mensajería' },
  AUTO: { title: 'Automatizaciones', eyebrow: 'Flujos' },
  PAYMENT: { title: 'Pagos', eyebrow: 'Checkout' },
  DOMAIN: { title: 'Dominio y URL', eyebrow: 'Enlace público' },
};

function ContextPanel({ section, bookingUrl }: { section: string; bookingUrl: string }) {
  if (section === 'DOMAIN') {
    return (
      <div className="space-y-5 p-5">
        <label className="block text-[11px] font-extrabold uppercase tracking-[0.12em] ink-3">URL pública</label>
        <div className="srf-sunken rounded-xl border hairline p-3 text-xs font-semibold ink-2 break-all">{bookingUrl}</div>
        <button type="button" onClick={() => navigator.clipboard.writeText(bookingUrl)} className="builder-secondary-button">
          <Copy className="w-4 h-4" /> Copiar enlace
        </button>
        <p className="text-xs leading-5 ink-3">Los dominios personalizados estarán disponibles en una siguiente iteración del constructor.</p>
      </div>
    );
  }


  return (
    <div className="space-y-4 p-5">
      <div className="rounded-2xl srf-sunken border hairline p-4">
        <p className="text-xs font-bold ink-1">Propiedades avanzadas</p>
        <p className="mt-2 text-xs leading-5 ink-3">Selecciona elementos dentro de la vista previa para editar aquí sus propiedades específicas.</p>
      </div>
      <div className="space-y-3 opacity-60">
        <div className="h-9 rounded-xl srf-sunken" />
        <div className="h-20 rounded-xl srf-sunken" />
      </div>
    </div>
  );
}

const CalendarEditor: React.FC<CalendarEditorProps> = ({
  calendarId,
  calendarTitle = 'Nuevo Calendario',
  activeSection,
  onSectionChange,
  onBack,
  unreadCount = 0,
  onShowNotifications,
  onTitleChange,
}) => {
  const persistentId = calendarId || 'nuevo-calendario';
  const bookingUrl = `${window.location.origin}/booking/${persistentId}`;
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [calendarGroups, setCalendarGroups] = useState<{ id: string; name: string }[]>([{ id: 'group-1', name: 'Grupo 1' }]);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const sectionSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    const fetchCalendar = async () => {
      if (!calendarId) return;
      try {
        const { db } = await import('../../../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const snapshot = await getDoc(doc(db, 'calendars', calendarId));
        if (!cancelled && snapshot.exists()) {
          const data = snapshot.data();
          setCalendarData(data);
          if (data?.section_SCHEDULING?.groups) {
            setCalendarGroups(data.section_SCHEDULING.groups.map((group: any) => ({ id: group.id, name: group.title || group.name })));
          }
        }
      } catch (error) {
        console.error('No se pudo cargar el calendario:', error);
      }
    };
    fetchCalendar();
    return () => { cancelled = true; };
  }, [calendarId]);

  // NOTA: no reseteamos sectionSaveRef aquí. Hacerlo en un efecto [activeSection]
  // borraba el registro de la sección (los efectos del hijo corren ANTES que los
  // del padre), dejando "Guardar/Publicar" sin acción. Cada sección con
  // formulario re-registra su save vía onRegisterSave en cada render.
  const sectionHasForm = activeSection !== 'DOMAIN';

  const handleSaveSection = async (sectionId: string, data?: any) => {
    if (!calendarId) return;
    setSavingSection(sectionId);
    try {
      const { db } = await import('../../../lib/firebase');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const docData: any = {
        [`section_${sectionId}`]: data || true,
        updatedAt: serverTimestamp(),
      };
      if (sectionId === 'BASIC' && data?.title) {
        docData.title = data.title;
      }
      await setDoc(doc(db, 'calendars', calendarId), docData, { merge: true });

      setCalendarData((previous: any) => ({
        ...previous,
        title: sectionId === 'BASIC' && data?.title ? data.title : (previous?.title || ''),
        [`section_${sectionId}`]: data || true
      }));

      if (sectionId === 'BASIC' && data?.title && onTitleChange) {
        onTitleChange(data.title);
      }

      if (sectionId === 'SCHEDULING' && data?.groups) {
        setCalendarGroups(data.groups.map((group: any) => ({ id: group.id, name: group.title || group.name })));
      }
      setLastSavedAt(new Date());
      setPreviewLoading(true);
      setPreviewVersion((version) => version + 1);
    } catch (error) {
      console.error('Error guardando la sección:', error);
    } finally {
      setSavingSection(null);
    }
  };

  const saveCurrentSection = () => sectionSaveRef.current();

  const sectionMeta = SECTION_COPY[activeSection] || SECTION_COPY.BASIC;
  const registerSave = (save: () => void) => { sectionSaveRef.current = save; };

  const renderSettings = () => {
    if (activeSection === 'BASIC' || activeSection === 'DESIGN') {
      return <BasicSettings key={activeSection} initialTitle={calendarTitle} initialData={calendarData?.section_BASIC} onSave={(data) => handleSaveSection('BASIC', data)} onRegisterSave={registerSave} />;
    }
    if (['SCHEDULING', 'AVAILABILITY', 'SERVICES', 'GROUPS'].includes(activeSection)) {
      return <SchedulingSettings key="scheduling-settings" mode={activeSection} initialData={calendarData?.section_SCHEDULING} initialDataBasic={calendarData?.section_BASIC} onSave={(data) => handleSaveSection('SCHEDULING', data)} calendarGroups={calendarGroups} onGroupsChange={setCalendarGroups} onRegisterSave={registerSave} />;
    }
    if (activeSection === 'FORMS') {
      return <FormsSettings initialData={calendarData?.section_FORMS} onSave={(data) => handleSaveSection('FORMS', data)} calendarGroups={calendarGroups} onRegisterSave={registerSave} />;
    }
    if (activeSection === 'COMMS') {
      return <CommunicationsSettings initialData={calendarData?.section_COMMS} onSave={(data) => handleSaveSection('COMMS', data)} calendarGroups={calendarGroups} onRegisterSave={registerSave} />;
    }
    if (activeSection === 'AUTO') {
      return <AutomationSettings initialData={calendarData?.section_AUTO} onSave={(data) => handleSaveSection('AUTO', data)} calendarGroups={calendarGroups} onRegisterSave={registerSave} />;
    }
    if (activeSection === 'PAYMENT') {
      return <PaymentSettings calendarId={calendarId} initialData={calendarData?.section_PAYMENT} onSave={(data) => handleSaveSection('PAYMENT', data)} onRegisterSave={registerSave} />;
    }
    return <ContextPanel section={activeSection} bookingUrl={bookingUrl} />;
  };

  return (
    <div className="calendar-builder flex flex-1 min-h-0 w-full h-full overflow-hidden">
      <section className="calendar-builder-preview flex-1 min-w-0 min-h-0 flex flex-col bg-slate-50">
        {/* Custom top bar inside preview area (reduced width since it's next to right properties sidebar) */}
        <div className="glass-strong flex mx-4 md:mx-6 mt-4 md:mt-6 r-window px-5 py-3.5 items-center justify-between flex-shrink-0 z-30">
          <div className="flex items-center text-sm font-medium ink-2 min-w-0">
            <span className="flex items-center p-1.5 srf-sunken ink-3 rounded-[9px] mr-3" style={{ border: '1px solid var(--hairline)' }}>
              <CalendarIcon className="w-4 h-4" />
            </span>
            <span className="hover:ink-1 cursor-pointer transition-colors duration-200">Calendarios</span>
            <ChevronRight className="w-4 h-4 mx-2 ink-3 opacity-60" />
            <span className="ink-1 font-semibold">Editor de calendario</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Action buttons moved next to Volver */}
            <button
              type="button"
              onClick={saveCurrentSection}
              disabled={savingSection !== null || !sectionHasForm}
              className="flex items-center gap-2 rounded-[11px] font-bold transition-all duration-200 active:scale-[0.98] h-10 px-3.5 text-[12px] srf-raised ink-1 hover:brightness-95 border hairline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSection !== null ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={saveCurrentSection}
              disabled={savingSection !== null || !sectionHasForm}
              className="flex items-center gap-2 rounded-[11px] font-bold transition-all duration-200 active:scale-[0.98] h-10 px-3.5 text-[12px] accent-fill hover:brightness-110 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingSection !== null ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Publicar
            </button>
            <button
              onClick={onShowNotifications}
              className="w-10 h-10 rounded-full srf-raised ink-2 flex items-center justify-center shadow-sm relative active:scale-95 transition-all cursor-pointer hover:brightness-95 border hairline mr-1"
              title="Notificaciones"
              aria-label="Notificaciones"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full border border-white flex items-center justify-center leading-none animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Toggle device button (Escritorio) */}
            <div className="hidden xl:flex items-center h-9 rounded-xl srf-sunken border hairline p-1 bg-slate-100/50">
              <button type="button" className="h-7 px-3 rounded-lg srf-panel shadow-sm text-xs font-bold ink-1 flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Escritorio</button>
            </div>
            {/* Refresh preview button */}
            <button type="button" title="Recargar vista previa" onClick={() => { setPreviewLoading(true); setPreviewVersion((version) => version + 1); }} className="builder-icon-button"><RefreshCw className="w-4 h-4" /></button>
            
            {/* Back button (Volver) */}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 rounded-[11px] font-bold transition-all duration-200 active:scale-[0.98] h-10 px-4 text-[13px] srf-raised ink-1 hover:brightness-95 border hairline"
              >
                Volver
              </button>
            )}
          </div>
        </div>

        {/* Preview Iframe (Directly fills space, no rounded container outer wrapper) */}
        <div className="flex-1 min-h-0 relative bg-white mt-4">
          {previewLoading && <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin ink-3" /></div>}
          <iframe key={previewVersion} src={bookingUrl} title={`Vista previa de ${calendarTitle}`} onLoad={() => setPreviewLoading(false)} className="w-full h-full border-0" />
        </div>

        <div className="h-10 px-5 border-t hairline bg-white/75 flex items-center justify-between text-[11px] ink-3 shrink-0">
          <span className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Vista previa del calendario público</span>
          <button type="button" onClick={() => openExternalUrl(bookingUrl)} className="font-bold ink-2 hover:ink-1 flex items-center gap-1.5 cursor-pointer"><ExternalLink className="w-3.5 h-3.5" /> Abrir en otra pestaña</button>
        </div>
      </section>

      <aside className="calendar-builder-properties w-[380px] shrink-0 srf-panel border-l hairline min-h-0 overflow-hidden flex flex-col">


        {/* Existing Section Header */}
        <div className="px-5 py-4 border-b hairline shrink-0 srf-panel">
          <p className="text-[10px] uppercase tracking-[0.14em] font-extrabold ink-3">{sectionMeta.eyebrow}</p>
          <h2 className="mt-1 font-display text-lg font-bold ink-1">{sectionMeta.title}</h2>
          <label className="calendar-builder-mobile-section mt-3">
            <span className="sr-only">Sección del editor</span>
            <select value={activeSection} onChange={(event) => onSectionChange(event.target.value)} className="w-full srf-sunken border hairline rounded-xl px-3 py-2 text-sm font-semibold">
              {Object.entries(SECTION_COPY).map(([id, item]) => <option key={id} value={id}>{item.title}</option>)}
            </select>
          </label>
        </div>
        <div className="calendar-builder-properties-content flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {renderSettings()}
        </div>
      </aside>
    </div>
  );
};

export default CalendarEditor;
