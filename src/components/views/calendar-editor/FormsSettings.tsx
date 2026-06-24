import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Save, Info, Plus, Trash2, Edit2, MessageSquare, ExternalLink, Heart, List, FileDown, Phone, CheckCircle2 } from 'lucide-react';

interface Props {
  initialData?: any;
  onSave?: (data: any) => void;
  onRegisterSave?: (fn: () => void) => void;
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

interface PostActionConfig {
  id: 'message' | 'redirect' | 'thank_you' | 'summary' | 'pdf' | 'whatsapp';
  enabled: boolean;
  title?: string;
  message?: string;
  url?: string;
  phone?: string;
  buttonText?: string;
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
  postActions?: PostActionConfig[];
}

const defaultFields: FormField[] = [
  { id: '1', label: 'Nombre', type: 'text', required: true, isDefault: true },
  { id: '2', label: 'Email', type: 'text', required: true, isDefault: true },
  { id: '3', label: 'Teléfono', type: 'text', required: true, isDefault: true },
];

const ensurePostActions = (group: any): PostActionConfig[] => {
  if (group?.postActions && group.postActions.length > 0) {
    return group.postActions;
  }
  return [
    { id: 'message', enabled: group?.postAction === 'message' || !group?.postAction, message: group?.successMessage || '¡Tu cita fue registrada con éxito!', buttonText: group?.buttonText || 'Regresar al home' },
    { id: 'redirect', enabled: group?.postAction === 'redirect', url: group?.redirectUrl || '' },
    { id: 'thank_you', enabled: false, title: '¡Gracias por tu reserva!', message: 'Tu cita ha sido agendada. Nos pondremos en contacto contigo pronto.' },
    { id: 'summary', enabled: false },
    { id: 'pdf', enabled: false },
    { id: 'whatsapp', enabled: false, phone: '', message: 'Hola {cliente}, tu cita para {servicio} fue registrada para {fecha}.' },
  ];
};

const FormsSettings: React.FC<Props> = ({ initialData, onSave, onRegisterSave, calendarGroups }) => {
  const [activeGroupId, setActiveGroupId] = useState(
    initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData[0].id 
      : 'group-1'
  );
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Partial<FormField> | null>(null);
  
  // By default we have one group, just like scheduling
  const [groupsData, setGroupsData] = useState<GroupFormData[]>(() => {
    const raw = initialData?.groupsData && initialData.groupsData.length > 0 
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
        ];
    return raw.map((g: any) => ({
      ...g,
      postActions: ensurePostActions(g)
    }));
  });

  // Sync groupsData with calendarGroups (add external ones, rename existing)
  // Sync loaded async initialData
  useEffect(() => {
    if (initialData?.groupsData && initialData.groupsData.length > 0) {
      setGroupsData(initialData.groupsData.map((g: any) => ({
        ...g,
        postActions: ensurePostActions(g)
      })));
      if (!initialData.groupsData.some((g: any) => g.id === activeGroupId)) {
        setActiveGroupId(initialData.groupsData[0].id);
      }
    }
  }, [initialData]);

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
              postActions: ensurePostActions({ postAction: 'message' })
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

  // Registra el guardado de esta sección para el botón único del header.
  const saveImpl = React.useRef<() => void>(() => {});
  saveImpl.current = () => onSave?.(groupsData);
  useEffect(() => { onRegisterSave?.(() => saveImpl.current()); }, [onRegisterSave]);

  return (
    <div className="srf-panel pb-6 rounded-b-2xl">
      {/* Header logic */}
      <div className="builder-embedded-toolbar flex flex-col justify-between items-start px-4 py-3 border-b hairline srf-sunken/80 backdrop-blur-md sticky top-0 z-10 transition-all duration-300 gap-2">
         <div className="flex-1">
            <h3 className="ink-1 font-semibold text-[13px] tracking-tight">Datos a solicitar en la programación de citas</h3>
         </div>
         <div className="flex gap-4 items-center w-full justify-end">
            <button className="text-black text-xs font-semibold flex items-center tracking-wider hover:ink-1 cursor-pointer transition-colors shadow-sm srf-panel px-3 py-1.5 rounded-lg border hairline h-9">
               <SettingsIcon className="w-3.5 h-3.5 mr-1.5" /> RÁPIDA
            </button>
         </div>
      </div>

      <div>
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

        <div className="p-4 max-w-4xl mx-auto">
           <div className="space-y-6">
              {activeGroup.fields.map(field => (
                <div key={field.id} className="relative group srf-panel border hairline p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-colors">
                  <label className="block text-[13px] font-semibold ink-1 mb-3">
                    {field.isDefault ? (
                      <div className="flex items-center">
                        <span className="srf-sunken ink-2 px-2.5 py-1 rounded-md mr-3 text-xs tracking-wider uppercase border hairline">Predeterminado</span>
                        {field.label} {field.required && <span className="text-red-500 opacity-80 ml-1.5">*</span>}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="srf-sunken ink-1 px-2.5 py-1 rounded-md mr-3 text-xs tracking-wider uppercase border hairline">Personalizado</span>
                        <div className="flex justify-between items-center flex-1">
                          <div className="flex items-center">
                            <span className="text-[13px] font-semibold ink-1">{field.label}</span>
                            {field.required && <span className="text-red-500 opacity-80 ml-1.5">*</span>}
                            <span className="text-xs ink-3 ml-3 srf-sunken px-2 py-0.5 rounded-full">{field.type}</span>
                          </div>
                          <div className="flex gap-1 ml-3">
                            <button onClick={() => { setEditingField(field); setIsFieldModalOpen(true); }} className="ink-3 hover:text-black p-2 hover:srf-sunken rounded-lg transition-colors cursor-pointer">
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
                  <input type="text" readOnly value={`Dato para: ${field.label}`} className={`w-full srf-sunken border border-transparent ink-3 px-4 py-3 text-[13px] rounded-xl outline-none transition-colors ${!field.isDefault ? 'cursor-not-allowed opacity-70' : 'cursor-default'}`} />
                </div>
              ))}
              
              <div className="srf-panel border hairline p-5 rounded-2xl shadow-sm hover:border-slate-300 transition-colors mt-8">
                 <label className="block text-[13px] font-semibold ink-1 mb-4 pb-4 border-b hairline flex justify-between items-center">
                   <span className="flex-1">Términos, Condiciones y Política de Privacidad <Info className="w-4 h-4 ink-3 inline-block ml-1.5" /></span>
                   <span className="text-red-500 opacity-80 ml-3">*</span>
                 </label>
                 <label className="flex items-center p-2 rounded-xl cursor-pointer hover:srf-sunken transition-colors -ml-2 -mb-2 -mr-2">
                    <div className="relative flex items-center justify-center mr-4">
                      <input 
                        type="checkbox" 
                        checked={activeGroup.termsAndConditions}
                        onChange={(e) => updateActiveGroup({ termsAndConditions: e.target.checked })} 
                        className="peer appearance-none w-5 h-5 rounded-[6px] border border-slate-300 checked:accent-bg checked:border-transparent transition-all cursor-pointer shadow-sm" 
                      />
                      <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div>
                      <span className="ink-1 text-[14px] font-semibold block">Requerir aceptación de términos explícita</span>
                      <span className="ink-3 text-xs mt-0.5 block">Añade una casilla obligatoria al final del formulario de registro.</span>
                    </div>
                 </label>
              </div>

              <button onClick={openNewFieldModal} className="w-full srf-sunken hover:srf-sunken text-black border border-dashed border-slate-300 hover:border-slate-400 font-semibold text-[13px] py-4 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm mt-8 group">
                <Plus className="w-5 h-5 mr-2 opacity-70 group-hover:opacity-100 transition-opacity" /> AGREGAR NUEVO CAMPO PERSONALIZADO
              </button>
           </div>
        </div>
      </div>

      <hr className="border-t hairline mb-6" />

      {/* Action after booking (Refactored visual cards) */}
      <div>
         <div className="px-4 pb-2">
            <h3 className="ink-1 font-semibold text-lg tracking-tight">Acción después de agendar cita</h3>
            <p className="text-xs ink-3 mt-1 font-medium">Seleccione una o más acciones que se ejecutarán automáticamente al finalizar la reserva.</p>
         </div>

         <div className="p-4 pb-4">
            {/* Visual Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
               {(() => {
                  const currentActions = activeGroup.postActions || ensurePostActions(activeGroup);
                  const cards = [
                     { id: 'message', title: 'Mostrar mensaje de éxito', desc: 'Confirmación rápida en pantalla.', icon: MessageSquare },
                     { id: 'redirect', title: 'Redirigir a URL', desc: 'Enviar a una página personalizada.', icon: ExternalLink },
                     { id: 'thank_you', title: 'Página de agradecimiento', desc: 'Mostrar una sección de gracias.', icon: Heart },
                     { id: 'summary', title: 'Mostrar resumen de cita', desc: 'Fecha, hora y servicio reservado.', icon: List },
                     { id: 'pdf', title: 'Descargar comprobante', desc: 'Permitir bajar un recibo PDF.', icon: FileDown },
                     { id: 'whatsapp', title: 'Abrir WhatsApp', desc: 'Iniciar chat con mensaje dinámico.', icon: Phone },
                  ];

                  const togglePostAction = (actionId: string) => {
                     const updated = currentActions.map(act => act.id === actionId ? { ...act, enabled: !act.enabled } : act);
                     const msgAct = updated.find(a => a.id === 'message');
                     const redirAct = updated.find(a => a.id === 'redirect');
                     
                     updateActiveGroup({
                        postActions: updated,
                        postAction: msgAct?.enabled ? 'message' : (redirAct?.enabled ? 'redirect' : 'message'),
                        successMessage: msgAct?.message || activeGroup.successMessage || '¡Tu cita fue registrada con éxito!',
                        buttonText: msgAct?.buttonText || activeGroup.buttonText || 'Regresar al home',
                        redirectUrl: redirAct?.url || activeGroup.redirectUrl || ''
                     });
                  };

                  return cards.map(card => {
                     const config = currentActions.find(a => a.id === card.id);
                     const isEnabled = !!config?.enabled;
                     const Icon = card.icon;

                     return (
                        <div 
                           key={card.id}
                           onClick={() => togglePostAction(card.id)}
                           className={`p-4.5 rounded-2xl border cursor-pointer select-none transition-all duration-200 relative group flex items-start gap-4 ${
                              isEnabled 
                                 ? 'border-black srf-sunken shadow-sm' 
                                 : 'border-slate-200 hover:border-slate-300 srf-panel hover:shadow-xs'
                           }`}
                        >
                           <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                              isEnabled 
                                 ? 'accent-bg border-transparent text-white' 
                                 : 'srf-sunken border-transparent ink-3 group-hover:bg-slate-100 group-hover:ink-1'
                           }`}>
                              <Icon className="w-5 h-5" />
                           </div>
                           <div className="min-w-0 pr-6 pt-0.5">
                              <h4 className="font-bold text-sm ink-1 leading-normal mb-1">{card.title}</h4>
                              <p className="text-[12px] ink-3 leading-relaxed">{card.desc}</p>
                           </div>
                           <div className="absolute top-4 right-4">
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                 isEnabled 
                                    ? 'accent-bg border-transparent text-white' 
                                    : 'border-slate-300 srf-panel group-hover:border-slate-400'
                              }`}>
                                 {isEnabled && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                              </div>
                           </div>
                        </div>
                     );
                  });
               })()}
            </div>

            {/* Conditional Form Configurations */}
            <div className="max-w-4xl mx-auto space-y-6">
               {(() => {
                  const currentActions = activeGroup.postActions || ensurePostActions(activeGroup);
                  
                  const updateActionField = (actionId: string, fields: Partial<PostActionConfig>) => {
                     const updated = currentActions.map(act => act.id === actionId ? { ...act, ...fields } : act);
                     const msgAct = updated.find(a => a.id === 'message');
                     const redirAct = updated.find(a => a.id === 'redirect');
                     
                     updateActiveGroup({
                        postActions: updated,
                        successMessage: msgAct?.message || activeGroup.successMessage,
                        buttonText: msgAct?.buttonText || activeGroup.buttonText,
                        redirectUrl: redirAct?.url || activeGroup.redirectUrl
                     });
                  };

                  const msgConfig = currentActions.find(a => a.id === 'message');
                  const redirConfig = currentActions.find(a => a.id === 'redirect');
                  const thankConfig = currentActions.find(a => a.id === 'thank_you');
                  const waConfig = currentActions.find(a => a.id === 'whatsapp');

                  return (
                     <>
                        {/* 1. CONFIG: Mostrar mensaje de éxito */}
                        {msgConfig?.enabled && (
                           <div className="srf-panel border hairline rounded-2xl p-5 space-y-4 shadow-sm animate-fadeIn">
                              <h4 className="font-bold text-[14px] ink-1 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-500" /> Configuración: Mensaje de éxito</h4>
                              <div>
                                 <label className="text-[12px] font-semibold ink-3 mb-1.5 block">Mensaje de confirmación <span className="text-rose-500">*</span></label>
                                 <textarea
                                    rows={3}
                                    value={msgConfig.message || ''}
                                    onChange={(e) => updateActionField('message', { message: e.target.value })}
                                    placeholder="Ej. ¡Tu cita fue registrada con éxito!"
                                    className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 transition-all outline-none resize-none"
                                 />
                              </div>
                              <div>
                                 <label className="text-[12px] font-semibold ink-3 mb-1.5 block">Texto del botón de regreso</label>
                                 <input
                                    type="text"
                                    value={msgConfig.buttonText || ''}
                                    onChange={(e) => updateActionField('message', { buttonText: e.target.value })}
                                    placeholder="Ej. Regresar"
                                    className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 transition-all outline-none"
                                 />
                              </div>
                           </div>
                        )}

                        {/* 2. CONFIG: Redirigir a URL */}
                        {redirConfig?.enabled && (
                           <div className="srf-panel border hairline rounded-2xl p-5 space-y-4 shadow-sm animate-fadeIn">
                              <h4 className="font-bold text-[14px] ink-1 flex items-center gap-2"><ExternalLink className="w-4 h-4 text-slate-500" /> Configuración: Redirección de URL</h4>
                              <div>
                                 <label className="text-[12px] font-semibold ink-3 mb-1.5 block">URL de destino <span className="text-rose-500">*</span></label>
                                 <input
                                    type="url"
                                    value={redirConfig.url || ''}
                                    onChange={(e) => updateActionField('redirect', { url: e.target.value })}
                                    placeholder="https://susitio.com/gracias"
                                    className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 transition-all outline-none"
                                 />
                                 <p className="text-[11px] ink-3 mt-1.5">Asegúrese de incluir https:// o http:// en el enlace.</p>
                              </div>
                           </div>
                        )}

                        {/* 3. CONFIG: Página de agradecimiento */}
                        {thankConfig?.enabled && (
                           <div className="srf-panel border hairline rounded-2xl p-5 space-y-4 shadow-sm animate-fadeIn">
                              <h4 className="font-bold text-[14px] ink-1 flex items-center gap-2"><Heart className="w-4 h-4 text-slate-500" /> Configuración: Página de Agradecimiento</h4>
                              <div>
                                 <label className="text-[12px] font-semibold ink-3 mb-1.5 block">Título de agradecimiento <span className="text-rose-500">*</span></label>
                                 <input
                                    type="text"
                                    value={thankConfig.title || ''}
                                    onChange={(e) => updateActionField('thank_you', { title: e.target.value })}
                                    placeholder="Ej. ¡Muchas gracias por elegirnos!"
                                    className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 transition-all outline-none"
                                 />
                              </div>
                              <div>
                                 <label className="text-[12px] font-semibold ink-3 mb-1.5 block">Mensaje detallado <span className="text-rose-500">*</span></label>
                                 <textarea
                                    rows={4}
                                    value={thankConfig.message || ''}
                                    onChange={(e) => updateActionField('thank_you', { message: e.target.value })}
                                    placeholder="Detalles sobre qué esperar a continuación, términos importantes, etc."
                                    className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 transition-all outline-none resize-none"
                                 />
                              </div>
                           </div>
                        )}

                        {/* 4. CONFIG: Abrir WhatsApp */}
                        {waConfig?.enabled && (
                           <div className="srf-panel border hairline rounded-2xl p-5 space-y-4 shadow-sm animate-fadeIn">
                              <h4 className="font-bold text-[14px] ink-1 flex items-center gap-2"><Phone className="w-4 h-4 text-slate-500" /> Configuración: Mensaje de WhatsApp</h4>
                              <div>
                                 <label className="text-[12px] font-semibold ink-3 mb-1.5 block">Número de teléfono (con código de país) <span className="text-rose-500">*</span></label>
                                 <input
                                    type="tel"
                                    value={waConfig.phone || ''}
                                    onChange={(e) => updateActionField('whatsapp', { phone: e.target.value })}
                                    placeholder="Ej. +50412345678"
                                    className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 transition-all outline-none"
                                 />
                              </div>
                              <div>
                                 <label className="text-[12px] font-semibold ink-3 mb-1.5 block">Mensaje de texto automático <span className="text-rose-500">*</span></label>
                                 <textarea
                                    rows={3}
                                    value={waConfig.message || ''}
                                    onChange={(e) => updateActionField('whatsapp', { message: e.target.value })}
                                    placeholder="Ej. Hola {cliente}, tu cita para {servicio} fue registrada para {fecha}."
                                    className="w-full srf-sunken border border-transparent focus:srf-panel focus:border-slate-300 rounded-xl px-4 py-3 text-sm ink-1 focus:ring-2 focus:ring-black/10 transition-all outline-none resize-none"
                                 />
                              </div>
                              
                              {/* Dynamic Variables Helper */}
                              <div className="srf-sunken border hairline rounded-xl p-3.5 space-y-2">
                                 <span className="text-[11px] font-extrabold uppercase tracking-wider ink-3 block">Variables dinámicas disponibles:</span>
                                 <div className="flex flex-wrap gap-1.5 text-xs font-mono font-semibold text-slate-700">
                                    <span className="px-2 py-1 srf-panel border hairline rounded-md">{'{cliente}'}</span>
                                    <span className="px-2 py-1 srf-panel border hairline rounded-md">{'{servicio}'}</span>
                                    <span className="px-2 py-1 srf-panel border hairline rounded-md">{'{fecha}'}</span>
                                    <span className="px-2 py-1 srf-panel border hairline rounded-md">{'{hora}'}</span>
                                    <span className="px-2 py-1 srf-panel border hairline rounded-md">{'{profesional}'}</span>
                                    <span className="px-2 py-1 srf-panel border hairline rounded-md">{'{ubicacion}'}</span>
                                 </div>
                                 <p className="text-[11px] ink-3 leading-relaxed mt-1">Estas etiquetas se reemplazarán automáticamente con los datos de la reserva y del cliente.</p>
                              </div>
                           </div>
                        )}
                     </>
                  );
               })()}
            </div>
         </div>
      </div>

      {isFieldModalOpen && editingField && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#f5f7f9] rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
             <button 
               onClick={() => setIsFieldModalOpen(false)}
               className="absolute top-4 right-4 ink-3 hover:ink-2 srf-panel rounded-full p-0.5 shadow-sm border hairline hover:srf-sunken transition-colors"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
             </button>
             
             <div className="px-6 py-5 border-b border-white bg-[#f5f7f9]">
                <h4 className="font-semibold ink-1 text-[15px]">Título</h4>
             </div>
             
             <div className="p-6 space-y-5 bg-[#f5f7f9]">
                <div>
                   <label className="block text-[13px] font-semibold ink-1 mb-1.5 ml-1">Título</label>
                   <div className="border hairline srf-panel rounded-xl overflow-hidden focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-black/20 shadow-sm transition-all">
                      <div className="bg-[#f0f2f5] border-b hairline px-3 py-1.5 flex gap-2">
                        <button className="ink-3 hover:ink-1 font-serif font-bold italic w-6 h-6 flex items-center justify-center rounded">I</button>
                        <button className="ink-3 hover:ink-1 font-serif font-bold underline w-6 h-6 flex items-center justify-center rounded">U</button>
                        <button className="ink-3 hover:ink-1 w-6 h-6 flex items-center justify-center rounded">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                        </button>
                        <div className="w-px h-4 bg-slate-300 my-auto ml-1 mr-1"></div>
                        <button className="ink-3 hover:ink-1 font-serif font-bold w-6 h-6 flex items-center justify-center rounded">T<sub className="text-[10px]">x</sub></button>
                      </div>
                      <input 
                        type="text"
                        value={editingField.label}
                        onChange={(e) => setEditingField({...editingField, label: e.target.value})}
                        className="w-full px-3 py-2 text-[13px] font-medium outline-none ink-1"
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-[13px] font-semibold ink-1 mb-1.5 ml-1">Tipo de respuesta</label>
                   <select 
                     value={editingField.type}
                     onChange={(e) => setEditingField({...editingField, type: e.target.value})}
                     className="w-full srf-panel border hairline hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-black/20 rounded-xl px-4 py-2.5 text-[13px] ink-1 font-medium outline-none transition-all shadow-sm cursor-pointer"
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
                        <div className={`block w-10 h-6 rounded-full transition-colors ${editingField.required ? 'accent-bg' : 'bg-slate-300'}`}></div>
                        <div className={`dot absolute left-[3px] top-[3px] srf-panel w-4.5 h-4.5 rounded-full transition-transform shadow-sm flex items-center justify-center ${editingField.required ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                     <span className="ml-3 text-[13px] font-semibold ink-1 select-none">Requerido</span>
                   </label>
                </div>

                <div>
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-1.5 ml-1">
                     Valor por defecto <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="relative">
                     <input 
                       type="text"
                       maxLength={255}
                       value={editingField.defaultValue || ''}
                       onChange={(e) => setEditingField({...editingField, defaultValue: e.target.value})}
                       className="w-full srf-panel border hairline focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-4 py-2.5 text-[13px] ink-1 font-medium outline-none transition-all shadow-sm"
                     />
                     <span className="absolute right-3 top-2.5 text-[10px] font-semibold ink-3">{editingField.defaultValue?.length || 0}/255</span>
                   </div>
                </div>

                <div>
                   <label className="flex items-center text-[13px] font-semibold ink-1 mb-1.5 ml-1">
                     Etiqueta de MailingBoss <Info className="w-3.5 h-3.5 ink-3 ml-1.5 cursor-help" />
                   </label>
                   <div className="relative">
                     <input 
                       type="text"
                       maxLength={255}
                       value={editingField.mailingBossLabel || ''}
                       onChange={(e) => setEditingField({...editingField, mailingBossLabel: e.target.value})}
                       className="w-full srf-panel border hairline focus:border-black focus:ring-2 focus:ring-black/10 rounded-xl px-4 py-2.5 text-[13px] ink-1 font-medium outline-none transition-all shadow-sm"
                     />
                     <span className="absolute right-3 top-2.5 text-[10px] font-semibold ink-3">{editingField.mailingBossLabel?.length || 0}/255</span>
                   </div>
                </div>

                <div className="pt-4 flex justify-between gap-3">
                   <button 
                     onClick={() => setIsFieldModalOpen(false)}
                     className="px-6 py-2.5 text-[13px] font-bold ink-1 hover:bg-slate-200/50 rounded-xl transition-colors w-full text-center"
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
