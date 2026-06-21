import React, { useState } from 'react';
import { Save, Settings } from 'lucide-react';

interface Props {
  initialData?: any;
  onSave?: (data: any) => void;
  onRegisterSave?: (fn: () => void) => void;
  calendarGroups?: {id: string; name: string}[];
}

interface GroupAutomation {
  id: string;
  name: string;
  syncMode: 'no' | 'yes';
  meetMode: 'no' | 'yes';
  subMode: 'no' | 'yes';
  subList: string;
  socialMode: 'no' | 'yes';
  socialCampaign: string;
}

const defaultGroupAutomation: GroupAutomation = {
  id: '1',
  name: 'Grupo 1',
  syncMode: 'no',
  meetMode: 'no',
  subMode: 'no',
  subList: '',
  socialMode: 'no',
  socialCampaign: ''
};

const AutomationSettings: React.FC<Props> = ({ initialData, onSave, onRegisterSave, calendarGroups }) => {
  const [activeGroupId, setActiveGroupId] = useState(
    initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData[0].id 
      : 'group-1'
  );
  const [groupsData, setGroupsData] = useState<GroupAutomation[]>(
    initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData
      : [{ ...defaultGroupAutomation, id: 'group-1' }]
  );

  React.useEffect(() => {
    if (calendarGroups && calendarGroups.length > 0) {
      setGroupsData(prev => {
        let hasChanges = false;
        const newGroupsData = [...prev];
        
        calendarGroups.forEach(cg => {
          const existing = newGroupsData.find(g => g.id === cg.id);
          if (existing) {
            if (existing.name !== cg.name) {
              existing.name = cg.name;
              hasChanges = true;
            }
          } else {
            newGroupsData.push({
              ...defaultGroupAutomation,
              id: cg.id,
              name: cg.name
            });
            hasChanges = true;
          }
        });

        const keptGroups = newGroupsData.filter(g => calendarGroups.some(cg => cg.id === g.id));
        if (keptGroups.length !== newGroupsData.length) {
          hasChanges = true;
        }

        return hasChanges ? keptGroups : prev;
      });
      
      if (!calendarGroups.some(g => g.id === activeGroupId)) {
        setActiveGroupId(calendarGroups[0]?.id || '');
      }
    }
  }, [calendarGroups]);

  const activeGroup = groupsData.find(g => g.id === activeGroupId) || groupsData[0];

  const updateActiveGroup = (updates: Partial<GroupAutomation>) => {
    setGroupsData(prev => prev.map(g => g.id === activeGroupId ? { ...g, ...updates } : g));
  };

  // Registra el guardado de esta sección para el botón único del header.
  const saveImpl = React.useRef<() => void>(() => {});
  saveImpl.current = () => onSave?.(groupsData);
  React.useEffect(() => { onRegisterSave?.(() => saveImpl.current()); }, [onRegisterSave]);

  return (
    <div className="srf-panel pb-6 rounded-b-2xl">
      <div className="builder-embedded-toolbar flex flex-col justify-between items-start px-4 py-3 border-b hairline srf-sunken/80 backdrop-blur-md sticky top-0 z-10 transition-all duration-300 gap-2">
         <h3 className="ink-1 font-semibold text-[13px] tracking-tight">Sincronización y Automatizaciones</h3>
         <div className="flex gap-4 items-center w-full justify-end">
            <button className="ink-1 text-xs font-semibold flex items-center tracking-wider hover:text-black cursor-pointer transition-colors shadow-sm srf-panel px-3 py-1.5 rounded-lg border hairline h-9">
               <Settings className="w-3.5 h-3.5 mr-1.5" /> RÁPIDA
            </button>
         </div>
      </div>

      <div className="px-4 py-3 bg-slate-50 border-b hairline">
        <select
          value={activeGroupId}
          onChange={(e) => setActiveGroupId(e.target.value)}
          className="w-full srf-panel border hairline rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer outline-none bg-transparent"
        >
          {groupsData.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Sync google */}
      <div>
        <div className="px-4 pt-4 pb-2">
           <h3 className="ink-1 font-semibold text-sm tracking-tight flex items-center">
             Sincronizar con Google Calendar
           </h3>
        </div>
        <div className="px-4 pb-4 border-b hairline">
           <div className="grid grid-cols-1 gap-4 max-w-4xl">
              <div onClick={() => updateActiveGroup({ syncMode: 'no'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.syncMode==='no'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                 <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.syncMode==='no'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                   <span className="font-bold text-lg">No</span> 
                 </div>
                 <div><h4 className="font-semibold text-sm ink-1 mb-0.5">No sincronizar</h4><p className="text-[13px] ink-3">No crear eventos en mi calendario.</p></div>
              </div>
              <div onClick={() => updateActiveGroup({ syncMode: 'yes'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.syncMode==='yes'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                 <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.syncMode==='yes'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                   <span className="font-bold text-lg">Sí</span> 
                 </div>
                 <div><h4 className="font-semibold text-sm ink-1 mb-0.5">Sincronizar</h4><p className="text-[13px] ink-3">Registrar citas automáticamente.</p></div>
              </div>
           </div>
        </div>
      </div>

      {/* Reuniones */}
      <div>
        <div className="px-4 pt-4 pb-2">
           <h3 className="ink-1 font-semibold text-sm tracking-tight flex items-center">
             Reuniones (Google Meet y Zoom)
           </h3>
        </div>
        <div className="px-4 pb-4 border-b hairline">
           <div className="grid grid-cols-1 gap-4 max-w-4xl">
              <div onClick={() => updateActiveGroup({ meetMode: 'no'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.meetMode==='no'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                 <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.meetMode==='no'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                   <span className="font-bold text-lg">No</span> 
                 </div>
                 <div><h4 className="font-semibold text-sm ink-1 mb-0.5">No permitir reuniones</h4><p className="text-[13px] ink-3">No crear enlaces de video.</p></div>
              </div>
              <div onClick={() => updateActiveGroup({ meetMode: 'yes'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.meetMode==='yes'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                 <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.meetMode==='yes'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                   <span className="font-bold text-lg">Sí</span>  
                 </div>
                 <div><h4 className="font-semibold text-sm ink-1 mb-0.5">Permitir reuniones</h4><p className="text-[13px] ink-3">Crea enlaces en Zoom o Meet.</p></div>
              </div>
           </div>
        </div>
      </div>

      {/* Suscripcion Lista */}
      <div>
        <div className="px-4 pt-4 pb-2">
           <h3 className="ink-1 font-semibold text-sm tracking-tight flex items-center">
             Suscripción a lista de correo
           </h3>
        </div>
        <div className="px-4 pb-4 border-b hairline">
           <div className="grid grid-cols-1 gap-4 max-w-4xl mb-4">
              <div onClick={() => updateActiveGroup({ subMode: 'no'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.subMode==='no'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                 <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.subMode==='no'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                   <span className="font-bold text-lg">No</span> 
                 </div>
                 <div><h4 className="font-semibold text-sm ink-1 mb-0.5">No Suscribir</h4><p className="text-[13px] ink-3">No añadir a listas de marketing.</p></div>
              </div>
              <div onClick={() => updateActiveGroup({ subMode: 'yes'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.subMode==='yes'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                 <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.subMode==='yes'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                   <span className="font-bold text-lg">Sí</span> 
                 </div>
                 <div><h4 className="font-semibold text-sm ink-1 mb-0.5">Suscripción automática</h4><p className="text-[13px] ink-3">Añadir usuarios a la lista.</p></div>
              </div>
           </div>
           
           <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeGroup.subMode === 'yes' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="max-w-4xl space-y-4 pt-4 border-t hairline animate-in fade-in slide-in-from-top-4">
                 <label className="text-[13px] font-semibold ink-1 block ml-1">Selecciona la lista destino <span className="text-red-500 opacity-80">*</span></label>
                 <div className="relative">
                   <select 
                      className="w-full srf-panel border hairline hover:border-slate-300 focus:border-black px-4 py-3 rounded-xl text-[13px] ink-1 outline-none focus:ring-2 focus:ring-black/10 shadow-sm transition-all appearance-none cursor-pointer"
                      value={activeGroup.subList}
                      onChange={(e) => updateActiveGroup({ subList: e.target.value })}
                   >
                     <option value="">Seleccione una Lista</option>
                     <option value="lista1">Nuevos Clientes</option>
                     <option value="lista2">Clientes VIP</option>
                     <option value="lista3">Promociones Recurrentes</option>
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 ink-3">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                   </div>
                 </div>
                 <div className="flex gap-2.5 mt-4 ml-1">
                   <div className="px-3.5 py-1.5 srf-sunken border hairline rounded-lg ink-2 font-medium text-xs shadow-sm">Acryl Nagels</div>
                   <div className="px-3.5 py-1.5 srf-sunken border hairline rounded-lg ink-2 font-medium text-xs shadow-sm">Acrylnagels</div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Social Proof */}
      <div>
        <div className="px-4 pt-4 pb-2">
           <h3 className="ink-1 font-semibold text-sm tracking-tight flex items-center">
             Prueba social
           </h3>
        </div>
        <div className="px-4 pb-4">
           <div className="grid grid-cols-1 gap-4 max-w-4xl">
              <div onClick={() => updateActiveGroup({ socialMode: 'no'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.socialMode==='no'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                 <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.socialMode==='no'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                   <span className="font-bold text-lg">No</span> 
                 </div>
                 <div><h4 className="font-semibold text-sm ink-1 mb-0.5">Desactivado</h4><p className="text-[13px] ink-3">Ocultar prueba social grupal.</p></div>
              </div>
              <div className="flex flex-col gap-4">
                 <div onClick={() => updateActiveGroup({ socialMode: 'yes'})} className={`flex items-center gap-4 cursor-pointer group p-4 rounded-2xl border transition-all duration-300 ${activeGroup.socialMode==='yes'?'border-black srf-sunken shadow-sm':'hairline srf-panel hover:border-slate-300 hover:srf-sunken'}`}>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${activeGroup.socialMode==='yes'?'srf-panel border text-black shadow-sm hairline':'srf-sunken ink-3 group-hover:srf-panel border border-transparent group-hover:hairline'}`}> 
                      <span className="font-bold text-lg">Sí</span> 
                    </div>
                    <div><h4 className="font-semibold text-sm ink-1 mb-0.5">Activo</h4><p className="text-[13px] ink-3">Mostrar actividad reciente.</p></div>
                 </div>
                 
                 <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeGroup.socialMode === 'yes' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                   <div className="pb-4 pt-2 animate-in fade-in slide-in-from-top-4">
                      <label className="text-[13px] font-semibold ink-1 block mb-2.5 ml-1">Campaña de Prueba Social</label>
                      <div className="relative">
                         <select 
                            className="w-full srf-panel border hairline hover:border-slate-300 focus:border-black px-4 py-3 rounded-xl text-[13px] ink-1 outline-none focus:ring-2 focus:ring-black/10 shadow-sm transition-all appearance-none cursor-pointer"
                            value={activeGroup.socialCampaign}
                            onChange={(e) => updateActiveGroup({ socialCampaign: e.target.value })}
                         >
                            <option value="">Seleccionar campaña</option>
                            <option value="campaña1">Reservas recientes</option>
                            <option value="campaña2">Citas premium</option>
                         </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 ink-3">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                         </div>
                      </div>
                   </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
export default AutomationSettings;
