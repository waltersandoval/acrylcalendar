import React, { useEffect, useRef, useState } from 'react';
import {
  Check, Copy, ExternalLink, Eye, Loader2, Monitor,
  RefreshCw, Save, Send,
} from 'lucide-react';
import { openExternalUrl } from '../../../lib/device';
import { useHeaderActions } from '../../../lib/headerActions';
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
}

const SECTION_COPY: Record<string, { title: string; eyebrow: string }> = {
  BASIC: { title: 'Información general', eyebrow: 'Contenido' },
  DESIGN: { title: 'Diseño visual', eyebrow: 'Apariencia' },
  SCHEDULING: { title: 'Horarios', eyebrow: 'Disponibilidad' },
  SERVICES: { title: 'Servicios', eyebrow: 'Oferta' },
  GROUPS: { title: 'Grupos', eyebrow: 'Organización' },
  FORMS: { title: 'Formularios', eyebrow: 'Datos del cliente' },
  COMMS: { title: 'Comunicaciones', eyebrow: 'Mensajería' },
  AUTO: { title: 'Automatizaciones', eyebrow: 'Flujos' },
  PAYMENT: { title: 'Pagos', eyebrow: 'Checkout' },
  DOMAIN: { title: 'Dominio y URL', eyebrow: 'Enlace público' },
  PUBLISH: { title: 'Publicación', eyebrow: 'Estado' },
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

  if (section === 'PUBLISH') {
    return (
      <div className="space-y-5 p-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><Check className="w-4 h-4" /> Calendario publicado</div>
          <p className="mt-2 text-xs leading-5 text-emerald-700">Tu enlace público está activo. Guarda cualquier cambio antes de compartirlo.</p>
        </div>
        <button type="button" onClick={() => openExternalUrl(bookingUrl)} className="builder-secondary-button">
          <ExternalLink className="w-4 h-4" /> Abrir calendario
        </button>
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

  useEffect(() => {
    sectionSaveRef.current = () => {};
  }, [activeSection]);

  const handleSaveSection = async (sectionId: string, data?: any) => {
    if (!calendarId) return;
    setSavingSection(sectionId);
    try {
      const { db } = await import('../../../lib/firebase');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'calendars', calendarId), {
        [`section_${sectionId}`]: data || true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setCalendarData((previous: any) => ({ ...previous, [`section_${sectionId}`]: data || true }));
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
  useHeaderActions([
    ...(onBack ? [{ label: 'Volver', variant: 'ghost' as const, onClick: onBack }] : []),
    { label: 'Guardar cambios', variant: 'ghost' as const, icon: <Save className="w-4 h-4" />, onClick: saveCurrentSection, loading: savingSection !== null },
    { label: 'Publicar', variant: 'primary' as const, icon: <Send className="w-4 h-4" />, onClick: saveCurrentSection, loading: savingSection !== null },
  ], [activeSection, savingSection, onBack]);

  const sectionMeta = SECTION_COPY[activeSection] || SECTION_COPY.BASIC;
  const registerSave = (save: () => void) => { sectionSaveRef.current = save; };

  const renderSettings = () => {
    if (activeSection === 'BASIC' || activeSection === 'DESIGN') {
      return <BasicSettings key={activeSection} initialTitle={calendarTitle} initialData={calendarData?.section_BASIC} onSave={(data) => handleSaveSection('BASIC', data)} onRegisterSave={registerSave} />;
    }
    if (['SCHEDULING', 'SERVICES', 'GROUPS'].includes(activeSection)) {
      return <SchedulingSettings key={activeSection} initialData={calendarData?.section_SCHEDULING} onSave={(data) => handleSaveSection('SCHEDULING', data)} calendarGroups={calendarGroups} onGroupsChange={setCalendarGroups} onRegisterSave={registerSave} />;
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
        <div className="h-14 px-5 flex items-center justify-between gap-4 border-b hairline bg-white/75 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center gap-2 text-xs font-bold ink-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Publicado</span>
            <span className="w-px h-4 bg-slate-200" />
            <span className="text-xs ink-3 truncate">{savingSection ? 'Guardando…' : lastSavedAt ? 'Guardado hace un momento' : 'Listo para editar'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center h-9 rounded-xl srf-sunken border hairline p-1">
              <button type="button" className="h-7 px-3 rounded-lg srf-panel shadow-sm text-xs font-bold ink-1 flex items-center gap-2"><Monitor className="w-3.5 h-3.5" /> Escritorio</button>
            </div>
            <button type="button" title="Recargar vista previa" onClick={() => { setPreviewLoading(true); setPreviewVersion((version) => version + 1); }} className="builder-icon-button"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative bg-white">
          {previewLoading && <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin ink-3" /></div>}
          <iframe key={previewVersion} src={bookingUrl} title={`Vista previa de ${calendarTitle}`} onLoad={() => setPreviewLoading(false)} className="w-full h-full border-0" />
        </div>

        <div className="h-10 px-5 border-t hairline bg-white/75 flex items-center justify-between text-[11px] ink-3 shrink-0">
          <span className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Vista previa del calendario público</span>
          <button type="button" onClick={() => openExternalUrl(bookingUrl)} className="font-bold ink-2 hover:ink-1 flex items-center gap-1.5 cursor-pointer"><ExternalLink className="w-3.5 h-3.5" /> Abrir en otra pestaña</button>
        </div>
      </section>

      <aside className="calendar-builder-properties w-[380px] shrink-0 srf-panel border-l hairline min-h-0 overflow-hidden flex flex-col">
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
