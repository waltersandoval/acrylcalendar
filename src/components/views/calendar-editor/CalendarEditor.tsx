import React, { useState } from 'react';
import { Edit2, Loader2, Settings, Calendar, FileText, Mail, Zap, CreditCard } from 'lucide-react';
import { openExternalUrl } from '../../../lib/device';
import BasicSettings from './BasicSettings';
import SchedulingSettings from './SchedulingSettings';
import FormsSettings from './FormsSettings';
import CommunicationsSettings from './CommunicationsSettings';
import AutomationSettings from './AutomationSettings';

interface CalendarEditorProps {
  calendarId?: string;
  calendarTitle?: string;
  onBack?: () => void;
}

const CalendarEditor: React.FC<CalendarEditorProps> = ({ calendarId, calendarTitle = 'Nuevo Calendario', onBack }) => {
  const persistentId = calendarId || 'nuevo-calendario';
  const initialLink = `${window.location.origin}/booking/${persistentId}`;
  
  const [openSection, setOpenSection] = useState<string>('BASIC');
  const [isLinkGenerated, setIsLinkGenerated] = useState<boolean>(true);
  const [generatedLink, setGeneratedLink] = useState<string>(initialLink);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<any>(null);

  React.useEffect(() => {
    setGeneratedLink(`${window.location.origin}/booking/${persistentId}`);
  }, [persistentId]);

  React.useEffect(() => {
    const fetchCal = async () => {
      if (!calendarId) return;
      try {
        const { db } = await import('../../../lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const d = await getDoc(doc(db, 'calendars', calendarId));
        if (d.exists()) {
          const data = d.data();
          setCalendarData(data);
          
          if (data?.section_SCHEDULING?.groups) {
            setCalendarGroups(data.section_SCHEDULING.groups.map((g: any) => ({
              id: g.id,
              name: g.name
            })));
          }
        }
      } catch (err) { }
    };
    fetchCal();
  }, [calendarId]);

  // Create shared groups state for scheduling and forms components
  const [calendarGroups, setCalendarGroups] = useState<{id: string, name: string}[]>([
    { id: 'group-1', name: 'Grupo 1' }
  ]);

  const toggleSection = (section: string) => {
    if (!section) return;
    setOpenSection(section);
  };

  const handleSaveSection = async (sectionId: string, nextSectionId: string | null, data?: any) => {
    if (!calendarId) {
      console.warn('No calendarId provided, skipping save.');
      if (nextSectionId) toggleSection(nextSectionId);
      return;
    }

    setSavingSection(sectionId);
    try {
      const { db } = await import('../../../lib/firebase');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'calendars', calendarId), {
         [`section_${sectionId}`]: data || true,
         updatedAt: serverTimestamp()
      }, { merge: true });
      console.log(`Saved section ${sectionId}`);

      // Update local calendarData state
      setCalendarData((prev: any) => ({
        ...prev,
        [`section_${sectionId}`]: data || true
      }));

      // If we saved scheduling, update calendarGroups state reactively
      if (sectionId === 'SCHEDULING' && data?.groups) {
        setCalendarGroups(data.groups.map((g: any) => ({
          id: g.id,
          name: g.title || g.name
        })));
      }
    } catch(e) {
      console.error('Error saving calendar section:', e);
    } finally {
      setSavingSection(null);
      if (nextSectionId) {
         toggleSection(nextSectionId);
      } else {
         generateLink(); // For the last payment step
      }
    }
  };

  const generateLink = () => {
    const persistentId = calendarId || 'nuevo-calendario';
    setGeneratedLink(`${window.location.origin}/booking/${persistentId}`);
    setIsLinkGenerated(true);
    setOpenSection('');
  };

  return (
    <div className="flex flex-col flex-1 h-full max-w-5xl mx-auto w-full pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-10 pt-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center srf-panel hover:srf-sunken ink-3 hover:ink-1 rounded-full border hairline transition-all duration-200 cursor-pointer shadow-sm">
              <svg className="w-5 h-5 -ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-2xl font-bold tracking-tight ink-1 flex items-center">
            {calendarTitle}
            <div className="ml-3 w-8 h-8 flex items-center justify-center srf-sunken ink-1 rounded-lg text-sm border hairline shadow-sm">👤</div>
          </h2>
        </div>
        
        <label className="flex items-center cursor-pointer group">
          <div className="relative">
             <input type="checkbox" className="sr-only peer" defaultChecked />
             <div className="block bg-slate-300 peer-checked:accent-bg w-12 h-7 rounded-full transition-colors border border-slate-300/20 peer-checked:border-slate-900/20 shadow-inner"></div>
             <div className="dot absolute left-1 top-1 srf-panel w-5 h-5 rounded-full transition-transform duration-300 transform peer-checked:translate-x-5 shadow-[0_2px_5px_rgba(0,0,0,0.2)]"></div>
          </div>
        </label>
      </div>

      {/* URL Box */}
      {isLinkGenerated ? (
        <div className="srf-panel border hairline rounded-2xl p-4 flex flex-col md:flex-row items-center shadow-sm mb-10 gap-4 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div className="flex-1 w-full srf-sunken border border-transparent hover:border-slate-300 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-black/20 rounded-xl px-4 py-3 flex items-center transition-all">
             <input 
               type="text" 
               readOnly 
               value={generatedLink}
               className="w-full bg-transparent ink-1 text-[13px] font-semibold outline-none"
             />
          </div>
          <div className="flex rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-slate-800/10">
            <button className="accent-bg hover:brightness-110 px-4 py-3 text-white transition-colors cursor-pointer group tooltip-trigger relative">
              <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
            <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="accent-bg hover:brightness-110 px-4 py-3 text-white border-l border-slate-800/50 transition-colors cursor-pointer group tooltip-trigger relative">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
            <button onClick={() => openExternalUrl(generatedLink)} className="accent-bg hover:brightness-110 px-4 py-3 text-white border-l border-slate-800/50 transition-colors cursor-pointer group tooltip-trigger relative">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="srf-sunken border hairline rounded-2xl p-6 flex items-center shadow-sm mb-10 gap-6 transition-colors hover:srf-sunken">
           <div className="w-14 h-14 rounded-2xl srf-panel border hairline flex items-center justify-center ink-3 shadow-sm">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
           </div>
           <div>
             <h3 className="font-semibold ink-1 text-[15px] tracking-tight">Enlace del calendario no generado</h3>
             <p className="text-[13px] ink-3 mt-1">Completa todas las configuraciones obligatorias para generar el enlace final permanente.</p>
           </div>
        </div>
      )}

      {/* Selector de Pasos */}
      <div className="flex flex-nowrap gap-1 srf-sunken p-1 rounded-xl border hairline mb-6 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
        {[
          { id: 'BASIC', title: 'Configuración Básica', icon: <Settings className="w-4 h-4" /> },
          { id: 'SCHEDULING', title: 'Programación', icon: <Calendar className="w-4 h-4" /> },
          { id: 'FORMS', title: 'Formularios & Redirección', icon: <FileText className="w-4 h-4" /> },
          { id: 'COMMS', title: 'Comunicaciones', icon: <Mail className="w-4 h-4" /> },
          { id: 'AUTO', title: 'Automatización', icon: <Zap className="w-4 h-4" /> },
        ].map((sec) => {
          const isActive = openSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setOpenSection(sec.id)}
              className={`flex-1 min-w-max md:min-w-0 px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'srf-panel ink-1 shadow-sm border hairline font-extrabold scale-102'
                  : 'ink-3 hover:ink-1 hover:srf-panel/50'
              }`}
            >
              {sec.icon}
              <span className="hidden lg:inline">{sec.title}</span>
            </button>
          );
        })}
      </div>

      {/* Componentes Directos Sin Contenedores Desplegables */}
      {openSection === 'BASIC' && (
        <BasicSettings 
          initialTitle={calendarTitle}
          initialData={calendarData?.section_BASIC}
          onSave={(data) => handleSaveSection('BASIC', 'SCHEDULING', data)} 
        />
      )}

      {openSection === 'SCHEDULING' && (
        <SchedulingSettings 
          initialData={calendarData?.section_SCHEDULING}
          onSave={(data) => handleSaveSection('SCHEDULING', 'FORMS', data)} 
          calendarGroups={calendarGroups}
          onGroupsChange={setCalendarGroups}
        />
      )}

      {openSection === 'FORMS' && (
        <FormsSettings 
          initialData={calendarData?.section_FORMS}
          onSave={(data) => handleSaveSection('FORMS', 'COMMS', data)} 
          calendarGroups={calendarGroups}
        />
      )}

      {openSection === 'COMMS' && (
        <CommunicationsSettings 
          initialData={calendarData?.section_COMMS}
          onSave={(data) => handleSaveSection('COMMS', 'AUTO', data)} 
          calendarGroups={calendarGroups}
        />
      )}

      {openSection === 'AUTO' && (
        <AutomationSettings 
          initialData={calendarData?.section_AUTO}
          onSave={(data) => handleSaveSection('AUTO', null, data)} 
          calendarGroups={calendarGroups}
        />
      )}

    </div>
  );
};

export default CalendarEditor;
