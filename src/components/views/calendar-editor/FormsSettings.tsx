import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Info, Plus, Trash2, Edit2 } from 'lucide-react';

interface Props {
  initialData?: any;
  onSave?: (data: any) => void;
  calendarGroups?: {id: string; name: string}[];
}

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  isDefault: boolean;
  defaultValue?: string;
  mailingBossLabel?: string;
}

interface GroupFormData {
  id: string;
  name: string;
  fields: FormField[];
  termsAndConditions: boolean;
  postAction: 'message' | 'redirect';
  successMessage: string;
  redirectUrl: string;
  buttonText: string;
}

const defaultFields: FormField[] = [
  { id: '1', label: 'Nombre', type: 'text', required: true, isDefault: true },
  { id: '2', label: 'Email', type: 'text', required: true, isDefault: true },
  { id: '3', label: 'Teléfono', type: 'text', required: true, isDefault: true },
];

const FormsSettings: React.FC<Props> = ({ initialData, onSave, calendarGroups }) => {
  const [activeGroupId, setActiveGroupId] = useState(
    initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData[0].id 
      : 'group-1'
  );
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Partial<FormField> | null>(null);
  
  // By default we have one group, just like scheduling
  const [groupsData, setGroupsData] = useState<GroupFormData[]>(
    initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData
      : [
          {
            id: 'group-1',
            name: 'Grupo 1',
            fields: [...defaultFields],
            termsAndConditions: false,
            postAction: 'message',
            successMessage: '¡Gracias por registrarse!',
            redirectUrl: '',
            buttonText: 'Continuar',
          }
        ]
  );

  // Sync groupsData with calendarGroups (add external ones, rename existing)
  useEffect(() => {
    if (calendarGroups && calendarGroups.length > 0) {
      setGroupsData(prev => {
        let hasChanges = false;
        const newGroupsData = [...prev];
        
        // Add new groups and update names
        calendarGroups.forEach(cg => {
          const existing = newGroupsData.find(g => g.id === cg.id);
          if (existing) {
            if (existing.name !== cg.name) {
              existing.name = cg.name;
              hasChanges = true;
            }
          } else {
            newGroupsData.push({
              id: cg.id,
              name: cg.name,
              fields: [...defaultFields],
              termsAndConditions: false,
              postAction: 'message',
              successMessage: '¡Gracias por registrarse!',
              redirectUrl: '',
              buttonText: 'Continuar',
            });
            hasChanges = true;
          }
        });

        // Remove deleted groups
        const keptGroups = newGroupsData.filter(g => calendarGroups.some(cg => cg.id === g.id));
        if (keptGroups.length !== newGroupsData.length) {
          hasChanges = true;
        }

        return hasChanges ? keptGroups : prev;
      });
      
      // Update active group if current is deleted
      if (!calendarGroups.some(g => g.id === activeGroupId)) {
        setActiveGroupId(calendarGroups[0]?.id || '');
      }
    }
  }, [calendarGroups]);

  const activeGroup = groupsData.find(g => g.id === activeGroupId) || groupsData[0];

  const updateActiveGroup = (updates: Partial<GroupFormData>) => {
    setGroupsData(prev => prev.map(g => g.id === activeGroupId ? { ...g, ...updates } : g));
  };

  const openNewFieldModal = () => {
    setEditingField({
      label: '',
      type: 'Respuesta corta',
      required: false,
      defaultValue: '',
      mailingBossLabel: '',
    });
    setIsFieldModalOpen(true);
  };

  const handleSaveField = () => {
    if (!editingField || !editingField.label) return;
    
    if (editingField.id) {
       // Updating existing
       updateActiveGroup({
         fields: activeGroup.fields.map(f => f.id === editingField.id ? { ...(f as FormField), ...editingField } : f)
       });
    } else {
       // Creating new
       const newField: FormField = {
         id: Math.random().toString(36).substr(2, 9),
         label: editingField.label || 'Nuevo Campo',
         type: editingField.type || 'Respuesta corta',
         required: !!editingField.required,
         isDefault: false,
         defaultValue: editingField.defaultValue || '',
         mailingBossLabel: editingField.mailingBossLabel || '',
       };
       updateActiveGroup({ fields: [...activeGroup.fields, newField] });
    }
    
    setIsFieldModalOpen(false);
    setEditingField(null);
  };

  const removeField = (id: string) => {
    updateActiveGroup({ fields: activeGroup.fields.filter(f => f.id !== id) });
  };

  return (
    <div className="bg-white pb-10 rounded-b-2xl">
      {/* Header logic */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 py-4 border-b border-slate-200/50 bg-[#f5f5f7]/80 backdrop-blur-md sticky top-0 z-10 transition-all duration-300 gap-4 md:gap-0">
         <div className="flex-1">
           <h3 className="text-slate-900 font-semibold text-[15px] tracking-tight">Datos a solicitar en la programación de citas</h3>
         </div>
         <div className="flex gap-4 items-center w-full md:w-auto justify-end">
            <button className="text-black text-xs font-semibold flex items-center tracking-wider hover:text-slate-800 cursor-pointer transition-colors shadow-sm bg-white px-3 py-1.5 rounded-lg border border-slate-200 h-10">
               <SettingsIcon className="w-4 h-4 mr-1.5" /> RÁPIDA
            </button>
            <div className="flex gap-3 border-l border-slate-200/60 pl-5">
              <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[13px] font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={() => onSave?.(groupsData)} className="px-5 py-2.5 bg-black hover:bg-slate-900 text-white rounded-xl text-[13px] font-semibold flex items-center transition-all duration-200 shadow-md shadow-slate-950/20 cursor-pointer">
                <Save className="w-4 h-4 mr-2" /> Guardar Cambios
              </button>
            </div>
         </div>
      </div>

      <div>
        <div className="flex border-b border-slate-200/60 px-6 pt-3 bg-white overflow-x-auto no-scrollbar shadow-sm relative z-0">
           {groupsData.map(g => (
             <button 
               key={g.id}
               onClick={() => setActiveGroupId(g.id)}
               className={`px-6 py-3 text-[13px] font-semibold border-b-[3px] transition-all duration-200 whitespace-nowrap cursor-pointer rounded-t-xl ${activeGroupId === g.id ? 'border-black text-black bg-slate-100/30' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
             >
               {g.name}
             </button>
           ))}
        </div>

        <div className="p-8 max-w-4xl mx-auto">
           <div className="space-y-6">
              {activeGroup.fields.map(field => (
                <div key={field.id} className="relative group bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-colors">
                  <label className="block text-[13px] font-semibold text-slate-700 mb-3">
                    {field.isDefault ? (
                      <div className="flex items-center">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md mr-3 text-xs tracking-wider uppercase border border-slate-200/60">Predeterminado</span>
                        {field.label} {field.required && <span className="text-red-500 opacity-80 ml-1.5">*</span>}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="bg-slate-100 text-slate-900 px-2.5 py-1 rounded-md mr-3 text-xs tracking-wider uppercase border border-slate-200">Personalizado</span>
                        <div className="flex justify-between items-center flex-1">
                          <div className="flex items-center">
                            <span className="text-[13px] font-semibold text-slate-800">{field.label}</span>
                            {field.required && <span className="text-red-500 opacity-80 ml-1.5">*</span>}
                            <span className="text-xs text-slate-400 ml-3 bg-slate-100 px-2 py-0.5 rounded-full">{field.type}</span>
                          </div>
                          <div className="flex gap-1 ml-3">
                            <button onClick={() => { setEditingField(field); setIsFieldModalOpen(true); }} className="text-slate-500 hover:text-black p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                              <Edit2 className="w-[18px] h-[18px]" />
                            </button>
                            <button onClick={() => removeField(field.id)} className="text-rose-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer">
                              <Trash2 className="w-[18px] h-[18px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </label>
                  <input type="text" readOnly value={`Dato para: ${field.label}`} className={`w-full bg-[#f5f5f7] border border-transparent text-slate-500 px-4 py-3 text-[13px] rounded-xl outline-none transition-colors ${!field.isDefault ? 'cursor-not-allowed opacity-70' : 'cursor-default'}`} />
                </div>
              ))}
              
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-colors mt-8">
                 <label className="block text-[13px] font-semibold text-slate-700 mb-4 pb-4 border-b border-slate-100 flex justify-between items-center">
                   <span className="flex-1">Términos, Condiciones y Política de Privacidad <Info className="w-4 h-4 text-slate-400 inline-block ml-1.5" /></span>
                   <span className="text-red-500 opacity-80 ml-3">*</span>
                 </label>
                 <label className="flex items-center p-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors -ml-2 -mb-2 -mr-2">
                    <div className="relative flex items-center justify-center mr-4">
                      <input 
                        type="checkbox" 
                        checked={activeGroup.termsAndConditions}
                        onChange={(e) => updateActiveGroup({ termsAndConditions: e.target.checked })} 
                        className="peer appearance-none w-5 h-5 rounded-[6px] border border-slate-300 checked:bg-black checked:border-transparent transition-all cursor-pointer shadow-sm" 
                      />
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div>
                      <span className="text-slate-800 text-[14px] font-semibold block">Requerir aceptación de términos explícita</span>
                      <span className="text-slate-500 text-xs mt-0.5 block">Añade una casilla obligatoria al final del formulario de registro.</span>
                    </div>
                 </label>
              </div>

              <button onClick={openNewFieldModal} className="w-full bg-slate-50 hover:bg-slate-100 text-black border border-dashed border-slate-300 hover:border-slate-400 font-semibold text-[13px] py-4 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm mt-8 group">
                <Plus className="w-5 h-5 mr-2 opacity-70 group-hover:opacity-100 transition-opacity" /> AGREGAR NUEVO CAMPO PERSONALIZADO
              </button>
           </div>
        </div>
      </div>

      <hr className="border-t border-slate-200/60 mb-6" />

      {/* Action after subscription */}
      <div>
         <div className="px-8 pb-2">
            <h3 className="text-slate-900 font-semibold text-lg tracking-tight">Acción después de la suscripción</h3>
         </div>

         <div className="p-8 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
               
               <div className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center ${activeGroup.postAction === 'message' ? 'border-transparent shadow-none' : 'border-transparent hover:bg-slate-50'}`}>
                 <div 
                    onClick={() => updateActiveGroup({ postAction: 'message' })}
                    className="flex flex-col items-center text-center cursor-pointer group mb-6 relative"
                 >
                    <div className={`w-28 h-20 rounded-xl mb-4 flex items-center justify-center transition-colors relative border-dashed border-2 ${activeGroup.postAction === 'message' ? 'border-black bg-slate-50/50' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                       {activeGroup.postAction === 'message' ? (
                          <div className="absolute -top-3 -right-3 bg-black text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                       ) : (
                          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white border border-slate-300"></div>
                       )}
                       <div className={`transition-colors ${activeGroup.postAction === 'message' ? 'text-black' : 'text-slate-300'}`}>
                         <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 16.17L5.83 13l1.41-1.41L9 13.34l7.59-7.59L18 7.17 9 16.17z"/></svg>
                       </div>
                    </div>
                    <h4 className="font-semibold text-slate-700 text-[15px] mb-2">Mostrar mensaje de éxito</h4>
                    <p className="text-[13px] text-slate-500 max-w-[280px] leading-relaxed">Cuando haga la cita, su usuario verá un mensaje escrito por usted y continuará en la página de citas.</p>
                 </div>

                  <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${activeGroup.postAction === 'message' ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                     <div className="w-full text-left space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div>
                           <label className="text-[13px] font-semibold text-slate-500 mb-1.5 block">Mensaje exitoso <span className="text-red-500">*</span></label>
                           <div className="relative">
                             <input 
                               type="text" 
                               value={activeGroup.successMessage} 
                               onChange={(e) => updateActiveGroup({ successMessage: e.target.value })}
                               maxLength={255}
                               className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-300 px-4 py-2.5 rounded-md text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-black transition-all" 
                             />
                             <span className="absolute right-3 top-3 text-[10px] text-slate-400">{activeGroup.successMessage.length}/255</span>
                           </div>
                        </div>

                        <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                           <div className="bg-slate-50 px-4 py-3 flex justify-between items-center cursor-pointer border-b border-slate-200">
                             <div className="flex items-center text-slate-600 font-semibold text-[14px]">
                               <SettingsIcon className="w-4 h-4 mr-2 text-slate-400" />
                               Botón de la página de gracias
                             </div>
                             <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                           </div>
                           <div className="p-5 space-y-4">
                             <div>
                                <label className="text-[13px] font-semibold text-slate-500 mb-1.5 block">Título <span className="text-red-500">*</span></label>
                                <div className="relative">
                                  <input 
                                     type="text"
                                     value={activeGroup.buttonText || 'Regresar al home'} 
                                     onChange={(e) => updateActiveGroup({ buttonText: e.target.value })}
                                     maxLength={255}
                                     className="w-full bg-white border border-slate-200 hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-black transition-all" 
                                  />
                                  <span className="absolute right-3 top-3 text-[10px] text-slate-400">{(activeGroup.buttonText || 'Regresar al home').length}/255</span>
                                </div>
                             </div>
                             <div>
                                <label className="text-[13px] font-semibold text-slate-500 mb-2 block">Acción <span className="text-red-500">*</span></label>
                                <div className="space-y-2">
                                   <label className="flex items-center cursor-pointer">
                                      <input type="radio" name="btnAction" className="w-4 h-4 text-black focus:ring-black border-slate-300" defaultChecked />
                                      <span className="ml-2 text-[13px] text-slate-700 font-medium">Ir al calendario</span>
                                   </label>
                                   <label className="flex items-center cursor-pointer">
                                      <input type="radio" name="btnAction" className="w-4 h-4 text-black focus:ring-black border-slate-300" />
                                      <span className="ml-2 text-[13px] text-slate-700 font-medium">Ir a este grupo</span>
                                   </label>
                                   <label className="flex items-center cursor-pointer">
                                      <input type="radio" name="btnAction" className="w-4 h-4 text-black focus:ring-black border-slate-300" />
                                      <span className="ml-2 text-[13px] text-slate-700 font-medium">URL...</span>
                                   </label>
                                </div>
                             </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center ${activeGroup.postAction === 'redirect' ? 'border-transparent shadow-none' : 'border-transparent hover:bg-slate-50'}`}>
                 <div 
                    onClick={() => updateActiveGroup({ postAction: 'redirect' })}
                    className="flex flex-col items-center text-center cursor-pointer group mb-6 relative"
                 >
                    <div className={`w-28 h-20 rounded-xl mb-4 flex items-center justify-center transition-colors relative border-dashed border-2 ${activeGroup.postAction === 'redirect' ? 'border-black bg-slate-50/50' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                       {activeGroup.postAction === 'redirect' ? (
                          <div className="absolute -top-3 -right-3 bg-black text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                       ) : (
                          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white border border-slate-300"></div>
                       )}
                       <div className={`transition-colors flex flex-col items-center justify-center relative w-full h-full ${activeGroup.postAction === 'redirect' ? 'text-black' : 'text-slate-300'}`}>
                          <div className="h-6 w-14 border-2 border-current rounded-sm flex items-center justify-center text-[10px] font-bold">www.</div>
                          <div className="absolute bottom-2 right-6">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M13 10L6 10 6 22 13 22 10ZM12 20L7 20 7 12 12 12 12 20Z"/><path d="M15 15l-3 4 5 1L15 15z" className="text-black"/></svg>
                          </div>
                       </div>
                    </div>
                    <h4 className="font-semibold text-slate-700 text-[15px] mb-2">Redireccion a la URL</h4>
                    <p className="text-[13px] text-slate-500 max-w-[280px] leading-relaxed">Después de hacer la cita, el usuario será redirigido a la URL indicada por usted.</p>
                 </div>
                  
                  <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${activeGroup.postAction === 'redirect' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="w-full text-left space-y-5" onClick={(e) => e.stopPropagation()}>
                        <div>
                           <label className="text-[13px] font-semibold text-slate-500 mb-1.5 block">URL de destino <span className="text-red-500">*</span></label>
                           <input 
                             type="url" 
                             value={activeGroup.redirectUrl} 
                             onChange={(e) => updateActiveGroup({ redirectUrl: e.target.value })}
                             placeholder="https://su-sitio.com/gracias-compra"
                             className="w-full bg-white border border-slate-200 hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] text-slate-700 outline-none focus:ring-1 focus:ring-black transition-all" 
                           />
                           <p className="text-[11px] text-slate-400 mt-1">Asegúrese de incluir https:// en el enlace.</p>
                        </div>
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </div>

      {isFieldModalOpen && editingField && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#f5f7f9] rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
             <button 
               onClick={() => setIsFieldModalOpen(false)}
               className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-white rounded-full p-0.5 shadow-sm border border-slate-200/50 hover:bg-slate-50 transition-colors"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
             
             <div className="px-6 py-5 border-b border-white bg-[#f5f7f9]">
                <h4 className="font-semibold text-slate-800 text-[15px]">Título</h4>
             </div>
             
             <div className="p-6 space-y-5 bg-[#f5f7f9]">
                <div>
                   <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 ml-1">Título</label>
                   <div className="border border-slate-200 bg-white rounded-xl overflow-hidden focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-black/20 shadow-sm transition-all">
                      <div className="bg-[#f0f2f5] border-b border-slate-200 px-3 py-1.5 flex gap-2">
                        <button className="text-slate-500 hover:text-slate-800 font-serif font-bold italic w-6 h-6 flex items-center justify-center rounded">I</button>
                        <button className="text-slate-500 hover:text-slate-800 font-serif font-bold underline w-6 h-6 flex items-center justify-center rounded">U</button>
                        <button className="text-slate-500 hover:text-slate-800 w-6 h-6 flex items-center justify-center rounded">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                        </button>
                        <div className="w-px h-4 bg-slate-300 my-auto ml-1 mr-1"></div>
                        <button className="text-slate-500 hover:text-slate-800 font-serif font-bold w-6 h-6 flex items-center justify-center rounded">T<sub className="text-[10px]">x</sub></button>
                      </div>
                      <input 
                        type="text"
                        value={editingField.label}
                        onChange={(e) => setEditingField({...editingField, label: e.target.value})}
                        className="w-full px-3 py-2 text-[13px] font-medium outline-none text-slate-800"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-[13px] font-semibold text-slate-700 mb-1.5 ml-1">Tipo de respuesta</label>
                   <select 
                     value={editingField.type}
                     onChange={(e) => setEditingField({...editingField, type: e.target.value})}
                     className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-black/20 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 font-medium outline-none transition-all shadow-sm cursor-pointer"
                   >
                     <option value="Respuesta corta">Respuesta corta</option>
                     <option value="Respuesta larga">Respuesta larga</option>
                     <option value="Varias opciones de respuesta">Varias opciones de respuesta</option>
                     <option value="Una opción de respuesta">Una opción de respuesta</option>
                     <option value="Lista desplegable">Lista desplegable</option>
                     <option value="Oculto">Oculto</option>
                   </select>
                </div>

                <div className="flex items-center">
                   <label className="flex items-center cursor-pointer group">
                     <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={editingField.required}
                          onChange={(e) => setEditingField({...editingField, required: e.target.checked})}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${editingField.required ? 'bg-black' : 'bg-slate-300'}`}></div>
                        <div className={`dot absolute left-[3px] top-[3px] bg-white w-4.5 h-4.5 rounded-full transition-transform shadow-sm flex items-center justify-center ${editingField.required ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                     <span className="ml-3 text-[13px] font-semibold text-slate-700 select-none">Requerido</span>
                   </label>
                </div>

                <div>
                   <label className="flex items-center text-[13px] font-semibold text-slate-700 mb-1.5 ml-1">
                     Valor por defecto <Info className="w-3.5 h-3.5 text-slate-400 ml-1.5 cursor-help" />
                   </label>
                   <div className="relative">
                     <input 
                       type="text"
                       maxLength={255}
                       value={editingField.defaultValue || ''}
                       onChange={(e) => setEditingField({...editingField, defaultValue: e.target.value})}
                       className="w-full bg-white border border-slate-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 font-medium outline-none transition-all shadow-sm"
                     />
                     <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-slate-400">{editingField.defaultValue?.length || 0}/255</span>
                   </div>
                </div>

                <div>
                   <label className="flex items-center text-[13px] font-semibold text-slate-700 mb-1.5 ml-1">
                     Etiqueta de MailingBoss <Info className="w-3.5 h-3.5 text-slate-400 ml-1.5 cursor-help" />
                   </label>
                   <div className="relative">
                     <input 
                       type="text"
                       maxLength={255}
                       value={editingField.mailingBossLabel || ''}
                       onChange={(e) => setEditingField({...editingField, mailingBossLabel: e.target.value})}
                       className="w-full bg-white border border-slate-200 focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-4 py-2.5 text-[13px] text-slate-800 font-medium outline-none transition-all shadow-sm"
                     />
                     <span className="absolute right-3 top-2.5 text-[10px] font-semibold text-slate-400">{editingField.mailingBossLabel?.length || 0}/255</span>
                   </div>
                </div>

                <div className="pt-4 flex justify-between gap-3">
                   <button 
                     onClick={() => setIsFieldModalOpen(false)}
                     className="px-6 py-2.5 text-[13px] font-bold text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors w-full text-center"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleSaveField}
                     className="px-6 py-2.5 text-[13px] font-bold bg-[#13CE9C] hover:bg-[#10b981] text-white rounded-xl transition-colors shadow-sm w-full text-center"
                   >
                     GUARDAR
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsSettings;

