import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Info, Plus, Trash2, Edit2, Mail, Bell, Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';

interface Props {
  initialData?: any;
  onSave?: (data: any) => void;
  onRegisterSave?: (fn: () => void) => void;
  calendarGroups?: {id: string; name: string}[];
}

interface NotificationTemplate {
  active: boolean;
  subject: string;
  body: string;
}

interface Reminder extends NotificationTemplate {
  id: string;
  days: number;
  hours: number;
  minutes: number;
  channels: string[];
  target: 'prospect' | 'host';
}

interface GroupCommunications {
  id: string;
  name: string;
  confirmMode: 'yes' | 'no';
  adminNotify: boolean;
  receivePending: boolean;
  cancelMode: 'yes' | 'no';
  remindMode: 'yes' | 'no';
  reminders: Reminder[];
  senderMode: 'custom' | 'default';
  senderName: string;
  senderEmail: string;
  replyTo: string;
  templates: {
    confirm: NotificationTemplate;
    adminNew: NotificationTemplate;
    cancel: NotificationTemplate;
  }
}

const defaultTemplate = {
  active: true,
  subject: '🎉 Tu cita se ha programado con éxito!',
  body: '🎉 Importante! lee y verifica que hayas seleccionado el día y la hora deseada:\n\n🎉 Tu cita de {group_title}, se ha programado con éxito!\n\n👍 Hola, {lead_name}.\n\n😃 Soy el asistente virtual...'
};

const defaultReminder: Reminder = {
  id: '1',
  days: 1,
  hours: 0,
  minutes: 0,
  channels: ['Email', 'WhatsApp'],
  target: 'prospect',
  active: true,
  subject: 'Estas a 1 día de consentirte 🎉 !!!!',
  body: 'Hola, {lead_name}\n\nFalta 1 día para tu cita de {group_title}!\n\nGracias por tu preferencia.\nAcryl Nagels...El reflejo de tu expresión!'
};

const defaultGroupComms: GroupCommunications = {
  id: '1',
  name: 'Grupo 1',
  confirmMode: 'yes',
  adminNotify: true,
  receivePending: true,
  cancelMode: 'yes',
  remindMode: 'yes',
  reminders: [{ ...defaultReminder }],
  senderMode: 'custom',
  senderName: '',
  senderEmail: 'team@tu-negocio.com',
  replyTo: '',
  templates: {
    confirm: { ...defaultTemplate },
    adminNew: { ...defaultTemplate, subject: '{lead_name} se ha suscrito!' },
    cancel: { ...defaultTemplate, subject: 'Cita cancelada' }
  }
};

const NotificationModal = ({ 
  isOpen, 
  onClose, 
  template, 
  onSave,
  isReminder = false
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  template: any; 
  onSave: (t: any) => void; 
  isReminder?: boolean;
}) => {
  const [localTemplate, setLocalTemplate] = useState<any>(template);
  const [activeTab, setActiveTab] = useState('EMAIL');

  useEffect(() => {
    if (isOpen) {
      setLocalTemplate(template);
    }
  }, [isOpen, template]);

  if (!isOpen) return null;

  const variables = [
    { name: 'Nombre del prospecto', tag: '{lead_name}' },
    { name: 'Email del prospecto', tag: '{lead_email}' },
    { name: 'Teléfono del prospecto', tag: '{lead_phone}' },
    { name: 'Título del Calendario', tag: '{calendar_title}' },
    { name: 'Título del grupo', tag: '{group_title}' },
    { name: 'Nombre del administrador', tag: '{host_name}' },
    { name: 'Email del administrador', tag: '{host_email}' },
    { name: 'Estado', tag: '{status}' },
    { name: 'Fecha(s) de las citas', tag: '{calendar_dates}' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#f8f9fa] w-full max-w-5xl h-[85vh] rounded-xl flex flex-col overflow-hidden shadow-2xl relative">
        <div className="flex justify-between items-center p-4 srf-panel border-b hairline">
          <h2 className="text-xl font-bold text-[#374151]">Editar notificación</h2>
          <button onClick={onClose} className="p-1 rounded-full srf-sunken hover:bg-slate-200 ink-3 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Variables */}
          <div className="w-80 srf-panel border-r hairline p-4 flex flex-col">
            <div className="text-sm font-semibold ink-2 mb-3 px-1">Variables disponibles</div>
            <div className="overflow-y-auto pr-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-300">
               {variables.map((v, i) => (
                 <div key={i} className="border hairline rounded-lg p-3 cursor-pointer hover:border-black hover:shadow-xs transition-all srf-panel group">
                   <div className="text-[13px] font-semibold ink-1 group-hover:ink-1">{v.name}</div>
                   <div className="text-[13px] ink-1 font-mono mt-1">{v.tag}</div>
                 </div>
               ))}
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 srf-panel p-6 overflow-y-auto">
             {/* Tabs */}
             <div className="flex border-b hairline mb-6 relative">
               {['EMAIL', 'SMS', 'WHATSAPP'].map(tab => (
                 <button 
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-6 py-3 text-[13px] font-bold tracking-wider relative cursor-pointer
                    ${activeTab === tab ? 'text-black' : 'ink-3 hover:ink-1'}`}
                 >
                   {tab}
                   {activeTab === tab && (
                     <div className="absolute bottom-0 left-0 right-0 h-0.5 accent-bg"></div>
                   )}
                 </button>
               ))}
             </div>

             {/* Activo Toggle */}
             <div className="flex justify-end items-center mb-6">
                <span className="text-[14px] ink-2 mr-3">Activo</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={localTemplate.active}
                    onChange={(e) => setLocalTemplate({...localTemplate, active: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:srf-panel after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:accent-bg"></div>
                </label>
             </div>

             {/* Info Box */}
             <div className="srf-sunken border hairline rounded-xl p-4 mb-6 relative pr-10 text-[13.5px] ink-2 leading-relaxed shadow-sm">
                Si no usas un remitente de correo electrónico personalizado, tus correos serán enviados desde el remitente de "Builderall Booking". Puedes configurar tu propio remitente en la página de "Preferencias".
                <button className="absolute top-4 right-4 ink-3 hover:ink-2 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
             </div>

             {/* Subject */}
             <div className="mb-6">
               <label className="block text-[14px] ink-2 mb-2">Asunto</label>
               <div className="relative">
                 <input 
                   type="text" 
                   value={localTemplate.subject}
                   onChange={e => setLocalTemplate({...localTemplate, subject: e.target.value})}
                   maxLength={255}
                   className="w-full srf-panel border hairline hover:border-slate-300 focus:border-slate-300 px-4 py-3 rounded-lg text-[14px] ink-1 outline-none transition-colors"
                 />
                 <span className="absolute right-3 top-3.5 text-[10px] ink-3">{localTemplate.subject.length}/255</span>
               </div>
             </div>

             {/* Body Editor Mock */}
             <div className="mb-6 flex flex-col flex-1 min-h-[300px]">
               <label className="block text-[14px] ink-2 mb-2">Mensaje</label>
               <div className="border hairline rounded-lg flex flex-col overflow-hidden srf-panel">
                 <div className="bg-[#f8f9fa] border-b hairline p-2 flex items-center space-x-1 overflow-x-auto">
                    {/* Dummy Editor Toolbar */}
                    <button className="px-2 py-1 text-sm srf-panel border hairline rounded ink-2 cursor-pointer">Normal</button>
                    <button className="px-2 py-1 text-sm srf-panel border hairline rounded ink-2 cursor-pointer mr-2">Normal</button>
                    <div className="w-px h-5 bg-slate-300 mx-1"></div>
                    <button className="p-1.5 ink-1 hover:bg-slate-200 rounded font-serif font-bold cursor-pointer">B</button>
                    <button className="p-1.5 ink-1 hover:bg-slate-200 rounded font-serif italic cursor-pointer">I</button>
                    <button className="p-1.5 ink-1 hover:bg-slate-200 rounded font-serif underline cursor-pointer">U</button>
                    <button className="p-1.5 ink-1 hover:bg-slate-200 rounded font-serif line-through cursor-pointer">S</button>
                    <div className="w-px h-5 bg-slate-300 mx-1"></div>
                    <button className="p-1.5 ink-1 hover:bg-slate-200 rounded cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>
                    <button className="p-1.5 ink-1 hover:bg-slate-200 rounded cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16"/></svg></button>
                 </div>
                 <textarea 
                   value={localTemplate.body}
                   onChange={e => setLocalTemplate({...localTemplate, body: e.target.value})}
                   className="w-full p-4 text-[14px] ink-1 outline-none resize-none min-h-[300px]"
                 />
               </div>
             </div>
          </div>
        </div>

        {isReminder && localTemplate && (
          <div className="border-t hairline srf-panel p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[14px] ink-3 mb-2 block">Días antes</label>
              <div className="relative">
                <select 
                  className="w-full srf-panel border hairline hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] ink-1 outline-none focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                  value={localTemplate.days}
                  onChange={e => setLocalTemplate({...localTemplate, days: parseInt(e.target.value)})}
                >
                  {[0,1,2,3,4,5,6,7].map(num => <option key={num} value={num}>{num}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 ink-3 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[14px] ink-3 mb-2 block">Horas antes</label>
              <div className="relative">
                <select 
                  className="w-full srf-panel border hairline hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] ink-1 outline-none focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                  value={localTemplate.hours}
                  onChange={e => setLocalTemplate({...localTemplate, hours: parseInt(e.target.value)})}
                >
                  {Array.from({length: 24}).map((_, num) => <option key={num} value={num}>{num}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 ink-3 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[14px] ink-3 mb-2 block">Minutos antes</label>
              <div className="relative">
                <select 
                  className="w-full srf-panel border hairline hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] ink-1 outline-none focus:ring-1 focus:ring-black appearance-none cursor-pointer"
                  value={localTemplate.minutes}
                  onChange={e => setLocalTemplate({...localTemplate, minutes: parseInt(e.target.value)})}
                >
                  {[0,5,10,15,20,25,30,35,40,45,50,55].map((num) => <option key={num} value={num}>{num}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3 ink-3 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        <div className="border-t hairline srf-panel p-4 flex justify-end items-center gap-4">
           <button onClick={onClose} className="px-6 py-2.5 text-sm font-semibold ink-1 hover:srf-sunken rounded-lg transition-colors cursor-pointer">
             Cancelar
           </button>
           <button onClick={() => onSave(localTemplate)} className="px-8 py-2.5 text-sm font-bold bg-[#13CE9C] hover:bg-[#10b981] text-white rounded-lg transition-colors cursor-pointer uppercase">
             HECHO
           </button>
        </div>
      </div>
    </div>
  );
};

const CommunicationsSettings: React.FC<Props> = ({ initialData, onSave, onRegisterSave, calendarGroups }) => {
  const [activeGroupId, setActiveGroupId] = useState(
    initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData[0].id 
      : 'group-1'
  );
  const [editingTemplate, setEditingTemplate] = useState<{type: 'confirm'|'adminNew'|'cancel'|'reminder', id?: string, name: string} | null>(null);
  const [showReminderMenu, setShowReminderMenu] = useState(false);

  
  const [groupsData, setGroupsData] = useState<GroupCommunications[]>(
    initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData
      : [{ ...defaultGroupComms, id: 'group-1' }]
  );

  useEffect(() => {
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
              ...defaultGroupComms,
              id: cg.id,
              name: cg.name,
              reminders: [{ ...defaultReminder, id: Math.random().toString() }]
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

  const updateActiveGroup = (updates: Partial<GroupCommunications>) => {
    setGroupsData(prev => prev.map(g => g.id === activeGroupId ? { ...g, ...updates } : g));
  };

  const addReminder = (target: 'prospect' | 'host') => {
    const newReminder: Reminder = {
      ...defaultReminder,
      id: Math.random().toString(36).substr(2, 9),
      target
    };
    updateActiveGroup({ reminders: [...activeGroup.reminders, newReminder] });
    setShowReminderMenu(false);
  };

  const removeReminder = (id: string) => {
    updateActiveGroup({ reminders: activeGroup.reminders.filter(r => r.id !== id) });
  };

  // Registra el guardado de esta sección para el botón único del header.
  const saveImpl = React.useRef<() => void>(() => {});
  saveImpl.current = () => onSave?.(groupsData);
  useEffect(() => { onRegisterSave?.(() => saveImpl.current()); }, [onRegisterSave]);

  return (
    <div className="srf-panel pb-4 rounded-b-2xl">
      {/* Container header */}
      <div className="srf-panel rounded-t-2xl">
        <div className="flex border-b hairline px-6 pt-3 overflow-x-auto no-scrollbar relative z-0">
           {groupsData.map(g => (
             <button 
               key={g.id} 
               onClick={() => setActiveGroupId(g.id)}
               className={`px-6 py-4 text-[14px] font-semibold border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${activeGroupId === g.id ? 'border-black text-black' : 'border-transparent ink-3 hover:ink-1'}`}
             >
               {g.name}
             </button>
           ))}
        </div>
      </div>

      <div className="p-8 space-y-12">
        {/* Notificación de Confirmación de Citas */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="ink-1 font-bold text-[17px]">Notificación de Confirmación de Citas</h3>
            <button className="flex items-center ink-1 hover:text-black text-[13px] font-bold uppercase tracking-wider cursor-pointer">
              <SettingsIcon className="w-4 h-4 mr-2" /> PASOS DE CONFIGURACIÓN RÁPIDA
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 mt-4">
            {/* Box 1 */}
            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ confirmMode: 'no'})}
                className="flex items-start cursor-pointer group"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.confirmMode === 'no' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.confirmMode === 'no' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative">
                    <svg className={`w-12 h-12 ${activeGroup.confirmMode === 'no' ? 'text-slate-300' : 'text-slate-200'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">No, no enviar ninguna confirmación</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">No desea que el sistema genere ninguna confirmación. (Por lo tanto, el usuario no podrá realizar una cancelación ya que no recibirá el correo electrónico de confirmación con el enlace de cancelación).</p>
                </div>
              </div>
            </div>

            {/* Box 2 */}
            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ confirmMode: 'yes' })}
                className="flex items-start cursor-pointer group mb-4"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.confirmMode === 'yes' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.confirmMode === 'yes' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative">
                    <svg className={`w-12 h-12 ${activeGroup.confirmMode === 'yes' ? 'text-black' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    {activeGroup.confirmMode === 'yes' && (
                       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-1">
                         <div className="w-5 h-1 bg-slate-200 rounded-full mb-1"></div>
                         <div className="w-3 h-1 bg-slate-200 rounded-full"></div>
                       </div>
                    )}
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">Sí, enviar confirmación</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">El sistema enviará notificaciones de confirmación de citas.</p>
                </div>
              </div>

              {activeGroup.confirmMode === 'yes' && (
                 <div className="ml-[136px] bg-[#f5f7f9] border hairline rounded-md p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[13px] ink-3 font-medium">Canales: Email, WhatsApp</span>
                      <div className="flex items-center mt-1 text-[13px] font-medium text-[#20c997]">
                         <div className="w-4 h-4 rounded-full bg-[#20c997] text-white flex items-center justify-center mr-2">
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                         </div>
                         {activeGroup.templates.confirm.subject.substring(0, 20)}...
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingTemplate({ type: 'confirm', name: 'Confirmación de Cita' })}
                      className="bg-slate-500 hover:bg-slate-600 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded shadow-sm transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                 </div>
              )}
            </div>
          </div>

          {activeGroup.confirmMode === 'yes' && (
            <div className="space-y-4 max-w-4xl">
              <div className="border hairline rounded-md srf-panel">
                <div className="px-5 py-4 border-b hairline flex items-center srf-panel rounded-t-md">
                   <label className="flex items-center cursor-pointer flex-1">
                     <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={activeGroup.adminNotify}
                          onChange={(e) => updateActiveGroup({ adminNotify: e.target.checked })}
                        />
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${activeGroup.adminNotify ? 'accent-bg' : 'srf-sunken border border-slate-300'}`}>
                          {activeGroup.adminNotify && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                        </div>
                     </div>
                     <span className="ml-4 text-[13px] ink-1 font-medium">Enviar correos electrónicos a los administradores cuando se realicen nuevos registros.</span>
                   </label>
                   <Info className="w-4 h-4 ink-3 ml-2" />
                </div>
                {activeGroup.adminNotify && (
                  <div className="p-4 srf-sunken">
                     <div className="bg-[#f5f7f9] border hairline rounded-md p-4 flex items-center justify-between ml-9">
                        <div>
                          <span className="text-[13px] ink-3 font-medium">Canales: Email</span>
                          <div className="flex items-center mt-1 text-[13px] font-medium text-[#20c997]">
                             <div className="w-4 h-4 rounded-full bg-[#20c997] text-white flex items-center justify-center mr-2">
                               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                             </div>
                             {activeGroup.templates.adminNew.subject.substring(0, 20)}...
                          </div>
                        </div>
                        <button 
                          onClick={() => setEditingTemplate({ type: 'adminNew', name: 'Nuevos Registros (Admin)' })}
                          className="bg-slate-500 hover:bg-slate-600 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded shadow-sm transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                     </div>
                  </div>
                )}
              </div>

              <div className="border hairline rounded-md srf-panel">
                <div className="px-5 py-4 flex items-center">
                   <label className="flex items-center cursor-pointer flex-1">
                     <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={activeGroup.receivePending}
                          onChange={(e) => updateActiveGroup({ receivePending: e.target.checked })}
                        />
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${activeGroup.receivePending ? 'accent-bg' : 'srf-sunken border border-slate-300'}`}>
                          {activeGroup.receivePending && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                        </div>
                     </div>
                     <span className="ml-4 text-[13px] ink-1 font-medium">Quiero recibir correos electrónicos de los nuevos registros o de los que están pendientes.</span>
                   </label>
                   <Info className="w-4 h-4 ink-3 ml-2 cursor-help" />
                </div>
              </div>
            </div>
          )}
        </section>

        <hr className="hairline" />

        {/* Notificación de cancelación */}
        <section>
          <div className="flex items-center mb-6">
            <h3 className="ink-1 font-bold text-[17px] mr-3">Notificación de cancelación</h3>
            <span className="bg-[#20c997] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">New</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ cancelMode: 'no'})}
                className="flex items-start cursor-pointer group"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.cancelMode === 'no' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.cancelMode === 'no' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative">
                    <svg className={`w-12 h-12 ${activeGroup.cancelMode === 'no' ? 'text-slate-300' : 'text-slate-200'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    <div className="absolute inset-0 flex items-center justify-center pb-2">
                       <div className="srf-panel rounded-sm text-[#4f78a2]">
                          <X className="w-3.5 h-3.5 font-black" />
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">No enviar correos electrónicos de cancelación</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">No se enviará ningún correo electrónico al suscriptor si se cancela su cita</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ cancelMode: 'yes' })}
                className="flex items-start cursor-pointer group mb-4"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.cancelMode === 'yes' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.cancelMode === 'yes' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative">
                    <svg className={`w-12 h-12 ${activeGroup.cancelMode === 'yes' ? 'text-black' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    <div className="absolute inset-0 flex items-center justify-center pb-2">
                       <div className="srf-panel rounded-sm text-black border border-current">
                          <X className="w-2.5 h-2.5 font-black" strokeWidth={3} />
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">Enviar notificaciones de cancelación.</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">El suscriptor recibirá una notificación si la cita se cancela (independientemente de que la cancele el suscriptor o el administrador del calendario). Puede elegir enviar esta notificación por correo electrónico, sms y WhatsApp.</p>
                </div>
              </div>

              {activeGroup.cancelMode === 'yes' && (
                 <div className="ml-[136px] bg-[#f5f7f9] border hairline rounded-md p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[13px] ink-3 font-medium">Canales: Email, WhatsApp</span>
                      <div className="flex items-center mt-1 text-[13px] font-medium text-[#20c997]">
                         <div className="w-4 h-4 rounded-full bg-[#20c997] text-white flex items-center justify-center mr-2">
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                         </div>
                         <div className="w-4 h-4 rounded-full bg-transparent border border-rose-500 text-rose-500 flex items-center justify-center mr-2">
                           <X className="w-3 h-3" strokeWidth={3} />
                         </div>
                         {activeGroup.templates.cancel.subject.substring(0, 20)}...
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingTemplate({ type: 'cancel', name: 'Notificación de Cancelación' })}
                      className="bg-slate-500 hover:bg-slate-600 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded shadow-sm transition-colors cursor-pointer"
                    >
                      Editar
                    </button>
                 </div>
              )}
            </div>
          </div>

          <div className="max-w-4xl border hairline rounded-md srf-panel px-5 py-4 flex items-center">
             <label className="flex items-center cursor-pointer flex-1">
               <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="sr-only" checked={true} readOnly />
                  <div className="w-5 h-5 rounded-full accent-bg flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
               </div>
               <span className="ml-4 text-[13px] ink-1 font-medium">Las notificaciones de cancelación deben configurarse en el paso &quot;Comunicaciones&quot;.</span>
             </label>
             <Info className="w-4 h-4 ink-3 ml-2 cursor-help" />
          </div>
        </section>

        <hr className="hairline" />

        {/* Recordatorios */}
        <section>
          <div className="flex items-center mb-6">
            <h3 className="ink-1 font-bold text-[17px]">Recordatorios</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ remindMode: 'no'})}
                className="flex items-start cursor-pointer group"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.remindMode === 'no' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.remindMode === 'no' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative">
                    <CalendarIcon className={`w-12 h-12 ${activeGroup.remindMode === 'no' ? 'text-slate-300' : 'text-slate-200'}`} fill="currentColor" stroke="none" />
                    <div className="absolute -top-1 -right-1 srf-panel rounded-full w-6 h-6 flex items-center justify-center">
                       <div className="bg-[#4f78a2] text-white rounded-full w-5 h-5 flex items-center justify-center">
                         <Bell className="w-3 h-3" />
                         <div className="absolute bottom-0 right-0 srf-panel shadow-sm rounded-full w-3 h-3 flex items-center justify-center">
                            <X className="w-2 h-2 text-rose-500" />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">No, no enviar ningún recordatorio</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">No desea que el sistema genere ningún recordatorio.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ remindMode: 'yes' })}
                className="flex items-start cursor-pointer group"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.remindMode === 'yes' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.remindMode === 'yes' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative pt-1">
                    <CalendarIcon className={`w-12 h-12 ${activeGroup.remindMode === 'yes' ? 'fill-slate-100 text-transparent' : 'fill-slate-100 text-transparent'}`} stroke="none" />
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                       <div className="accent-bg text-white rounded-full p-1 shadow-sm">
                         <Bell className="w-3 h-3 fill-current" />
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">Sí, enviar recordatorios</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">¿Quiere que el sistema envíe recordatorios?</p>
                </div>
              </div>
            </div>
          </div>

          {activeGroup.remindMode === 'yes' && (
             <div className="mt-8 relative z-10 w-full overflow-hidden max-w-[100%] max-w-4xl">
                <div className="relative inline-block mb-4">
                  <button onClick={() => setShowReminderMenu(!showReminderMenu)} className="accent-bg hover:brightness-110 text-white font-bold text-[12px] px-4 py-2.5 rounded shadow-sm flex items-center transition-colors cursor-pointer whitespace-nowrap z-20">
                    <Mail className="w-4 h-4 mr-2" /> NUEVO RECORDATORIO <ChevronDown className="w-4 h-4 ml-2" />
                  </button>
                  {showReminderMenu && (
                    <div className="absolute top-full left-0 mt-1 w-48 srf-panel border hairline shadow-lg rounded-md overflow-hidden z-30">
                      <button onClick={() => addReminder('prospect')} className="w-full text-left px-4 py-2.5 text-[13px] ink-1 hover:srf-sunken border-b hairline cursor-pointer">
                        Para los suscriptores
                      </button>
                      <button onClick={() => addReminder('host')} className="w-full text-left px-4 py-2.5 text-[13px] ink-1 hover:srf-sunken cursor-pointer">
                        Para los anfitriones
                      </button>
                    </div>
                  )}
                </div>
                
                {activeGroup.reminders.length === 0 ? (
                  <div className="text-center py-8 border hairline srf-panel ink-3 text-sm">No hay recordatorios configurados.</div>
                ) : (
                  <div className="border hairline srf-panel rounded-md overflow-x-auto w-full relative z-0">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b hairline">
                          <th className="px-5 py-4 font-bold text-[13px] ink-1 srf-panel sticky left-0 z-10 w-1/4">Cuando</th>
                          <th className="px-5 py-4 font-bold text-[13px] ink-1 w-1/3">Asunto</th>
                          <th className="px-5 py-4 font-bold text-[13px] ink-1">Send to</th>
                          <th className="px-5 py-4 font-bold text-[13px] ink-1">Canales</th>
                          <th className="px-5 py-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeGroup.reminders.map((reminder) => (
                           <tr key={reminder.id} className="border-b hairline hover:srf-sunken transition-colors">
                             <td className="px-5 py-4 text-[13px] ink-2 font-medium whitespace-nowrap srf-panel sticky left-0 z-10">
                               {reminder.days} Día(s) y {reminder.hours} Hora(s) y {reminder.minutes} Minuto(s) antes
                             </td>
                             <td className="px-5 py-4 text-[13px] ink-2 font-medium whitespace-nowrap">{reminder.subject.substring(0,25)}...</td>
                             <td className="px-5 py-4 text-[13px] ink-2 font-medium">{reminder.target === 'prospect' ? 'Prospecto' : 'Anfitrión'}</td>
                             <td className="px-5 py-4 text-[13px] ink-2 font-medium whitespace-nowrap">{reminder.channels.join(', ')}</td>
                             <td className="px-5 py-4 text-right whitespace-nowrap">
                               <button 
                                 onClick={() => setEditingTemplate({ type: 'reminder', id: reminder.id, name: 'Recordatorio' })}
                                 className="ink-3 hover:ink-2 mr-4 cursor-pointer"
                               >
                                 <Edit2 className="w-4 h-4" />
                               </button>
                               <button onClick={() => removeReminder(reminder.id)} className="text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          )}
        </section>

        <hr className="hairline" />

        {/* Remitente Email */}
        <section>
          <div className="flex items-center mb-6">
            <h3 className="ink-1 font-bold text-[17px]">Remitente del correo electrónico</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ senderMode: 'default' })}
                className="flex items-start cursor-pointer group"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.senderMode === 'default' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.senderMode === 'default' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative bg-slate-200">
                    <svg className={`w-12 h-12 ${activeGroup.senderMode === 'default' ? 'text-slate-300' : 'text-slate-200'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">Usar remitente de correo electrónico predeterminado</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">El remitente predeterminado actual es: team@tu-negocio.com. Su remitente predeterminado se puede cambiar en la página Preferencias.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div 
                onClick={() => updateActiveGroup({ senderMode: 'custom' })}
                className="flex items-start cursor-pointer group mb-6"
              >
                <div className={`w-28 h-20 rounded-xl flex items-center justify-center relative border-dashed border-2 flex-shrink-0 mr-6 transition-colors ${activeGroup.senderMode === 'custom' ? 'border-black srf-sunken' : 'border-slate-300 srf-panel group-hover:border-slate-400'}`}>
                  {activeGroup.senderMode === 'custom' ? (
                     <div className="absolute -top-3 -right-3 accent-bg text-white rounded-full p-1"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg></div>
                  ) : (
                     <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full srf-panel border border-slate-300"></div>
                  )}
                  <div className="relative">
                    <svg className={`w-12 h-12 ${activeGroup.senderMode === 'custom' ? 'text-black' : 'text-slate-300'}`} viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    {activeGroup.senderMode === 'custom' && (
                       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-1">
                         <div className="w-5 h-1 bg-slate-200 rounded-full mb-1"></div>
                         <div className="w-3 h-1 bg-slate-200 rounded-full"></div>
                       </div>
                    )}
                  </div>
                </div>
                <div className="pt-1">
                  <h4 className="font-bold ink-1 text-[15px] mb-2">Usar remitente de correo electrónico específico</h4>
                  <p className="text-[13px] ink-3 leading-relaxed">Si desea utilizar una dirección de correo electrónico específica para ese grupo, especifíquela a continuación.</p>
                </div>
              </div>

              {activeGroup.senderMode === 'custom' && (
                <div className="space-y-5 max-w-lg mt-2">
                   <div>
                      <label className="text-[13px] ink-3 mb-1.5 block">Remitente del correo electrónico</label>
                      <div className="relative">
                        <select 
                          className="w-full srf-panel border hairline hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] ink-1 outline-none focus:ring-1 focus:ring-black transition-all appearance-none cursor-pointer"
                          value={activeGroup.senderEmail}
                          onChange={(e) => updateActiveGroup({senderEmail: e.target.value})}
                        >
                          <option value="team@tu-negocio.com">team@tu-negocio.com</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 ink-2">
                           <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                        </div>
                      </div>
                   </div>

                   <div>
                      <label className="text-[13px] ink-3 mb-1.5 block">Nombre del remitente del correo electrónico <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input 
                           type="text" 
                           value={activeGroup.senderName} 
                           onChange={(e) => updateActiveGroup({ senderName: e.target.value })}
                           className="w-full srf-panel border hairline hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] ink-1 outline-none focus:ring-1 focus:ring-black transition-all" 
                           maxLength={40}
                        />
                        <span className="absolute right-3 top-3 text-[10px] ink-3">{activeGroup.senderName.length}/40</span>
                      </div>
                   </div>

                   <div>
                      <label className="flex items-center text-[13px] ink-3 mb-1.5">
                        Responder a <span className="text-red-500 ml-1">*</span> 
                        <Info className="w-3 h-3 ink-3 ml-2" />
                      </label>
                      <input 
                         type="email" 
                         value={activeGroup.replyTo} 
                         onChange={(e) => updateActiveGroup({ replyTo: e.target.value })}
                         className="w-full srf-panel border hairline hover:border-slate-300 px-4 py-2.5 rounded-md text-[13px] ink-1 outline-none focus:ring-1 focus:ring-black transition-all" 
                      />
                   </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-4 max-w-4xl">
             <button className="px-6 py-2.5 text-[13px] font-bold ink-1 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer text-center srf-panel border hairline shadow-sm">
               CANCELAR
             </button>
             <button onClick={() => onSave?.(groupsData)} className="px-6 py-2.5 text-[13px] font-bold bg-[#13CE9C] hover:bg-[#10b981] text-white rounded-xl flex items-center transition-colors shadow-sm cursor-pointer text-center font-bold">
               <Save className="w-4 h-4 mr-2" /> GUARDAR
             </button>
          </div>
        </section>

      </div>

      {editingTemplate && activeGroup && (
        <NotificationModal 
          isOpen={true} 
          onClose={() => setEditingTemplate(null)} 
          isReminder={editingTemplate.type === 'reminder'}
          template={
            editingTemplate.type === 'reminder' 
              ? activeGroup.reminders.find(r => r.id === editingTemplate.id) 
              : activeGroup.templates[editingTemplate.type]
          }
          onSave={(updated) => {
            if (editingTemplate.type === 'reminder') {
              updateActiveGroup({
                reminders: activeGroup.reminders.map(r => r.id === editingTemplate.id ? { ...r, ...updated } : r)
              });
            } else {
              updateActiveGroup({
                templates: {
                  ...activeGroup.templates,
                  [editingTemplate.type]: updated
                }
              });
            }
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
};
export default CommunicationsSettings;
