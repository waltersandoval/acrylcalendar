import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Info, Plus, Trash2, Edit2, Mail, Bell, Calendar as CalendarIcon, ChevronDown, X, Phone, MessageSquare, Check, Eye } from 'lucide-react';

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
  whatsappActive?: boolean;
  whatsappBody?: string;
}

interface Reminder {
  id: string;
  days: number;
  hours: number;
  minutes: number;
  channels: string[];
  target: 'prospect' | 'host';
  active: boolean;
  subject: string;
  body: string;
  whatsappActive?: boolean;
  whatsappBody?: string;
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
    paymentConfirm?: NotificationTemplate;
    cancelAdmin?: NotificationTemplate;
    cancelClient?: NotificationTemplate;
    reschedule?: NotificationTemplate;
    adminNewPayment?: NotificationTemplate;
    adminNewCancel?: NotificationTemplate;
  }
}

const defaultTemplate = {
  active: true,
  subject: '🎉 Tu cita se ha programado con éxito!',
  body: '¡Hola {lead_name}!\n\nTu cita de {group_title} ha sido confirmada con éxito.\n\n📅 Fecha: {calendar_dates}\n\n¡Gracias por tu preferencia!',
  whatsappActive: false,
  whatsappBody: 'Hola {lead_name}, tu cita para {servicio} fue registrada para {fecha}.'
};

const defaultReminder: Reminder = {
  id: '1',
  days: 1,
  hours: 0,
  minutes: 0,
  channels: ['Email'],
  target: 'prospect',
  active: true,
  subject: 'Recordatorio de tu próxima cita ⏰',
  body: 'Hola {lead_name},\n\nFalta 1 día para tu cita de {group_title}.\n\n¡Te esperamos!',
  whatsappActive: false,
  whatsappBody: 'Hola {lead_name}, recordatorio de tu cita para {servicio} mañana.'
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
    adminNew: { ...defaultTemplate, subject: '{lead_name} se ha registrado!' },
    cancel: { ...defaultTemplate, subject: 'Cita cancelada' },
    paymentConfirm: { ...defaultTemplate, subject: 'Confirmación de pago de tu cita 💳', body: 'Hola {lead_name},\n\nHemos registrado el pago de tu cita de {group_title} con éxito.' },
    cancelAdmin: { ...defaultTemplate, subject: 'Cita cancelada por el administrador', body: 'Hola {lead_name},\n\nTe notificamos que tu cita de {group_title} ha sido cancelada por el administrador.' },
    cancelClient: { ...defaultTemplate, subject: 'Has cancelado tu cita', body: 'Hola {lead_name},\n\nTe confirmamos que has cancelado tu cita de {group_title} con éxito.' },
    reschedule: { ...defaultTemplate, subject: 'Tu cita fue reprogramada 📅', body: 'Hola {lead_name},\n\nTu cita de {group_title} fue reprogramada. Nuevos detalles:\n\n📅 Fecha: {calendar_dates}' },
    adminNewPayment: { ...defaultTemplate, subject: 'Nuevo pago recibido 💰', body: 'Hola,\n\nSe ha registrado un nuevo pago para la cita de {lead_name} en {group_title}.' },
    adminNewCancel: { ...defaultTemplate, subject: 'Cita cancelada por cliente ❌', body: 'Hola,\n\nEl cliente {lead_name} ha cancelado su cita de {group_title}.' }
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
  const [localTemplate, setLocalTemplate] = useState<any>({
    active: true,
    subject: '',
    body: '',
    whatsappActive: false,
    whatsappBody: '',
    ...template
  });
  const [activeChannel, setActiveChannel] = useState<'email' | 'whatsapp'>('email');

  useEffect(() => {
    if (isOpen) {
      setLocalTemplate({
        active: true,
        subject: '',
        body: '',
        whatsappActive: false,
        whatsappBody: '',
        ...template
      });
    }
  }, [isOpen, template]);

  if (!isOpen) return null;

  const variables = [
    { name: 'Nombre del cliente', tag: '{lead_name}' },
    { name: 'Email del cliente', tag: '{lead_email}' },
    { name: 'Teléfono del cliente', tag: '{lead_phone}' },
    { name: 'Título del Calendario', tag: '{calendar_title}' },
    { name: 'Título del grupo', tag: '{group_title}' },
    { name: 'Nombre del anfitrión', tag: '{host_name}' },
    { name: 'Email del anfitrión', tag: '{host_email}' },
    { name: 'Estado', tag: '{status}' },
    { name: 'Fecha(s) de las citas', tag: '{calendar_dates}' }
  ];

  // Helper to compile preview with mockup data
  const renderPreviewContent = (text: string) => {
    if (!text) return 'Escribe tu mensaje para ver una vista previa aquí...';
    return text
      .replace(/{lead_name}/g, 'Juan Pérez')
      .replace(/{lead_email}/g, 'juan@correo.com')
      .replace(/{lead_phone}/g, '+504-99887766')
      .replace(/{calendar_title}/g, 'Asesoría VIP')
      .replace(/{group_title}/g, 'Consulta General')
      .replace(/{host_name}/g, 'Dra. María Silva')
      .replace(/{host_email}/g, 'maria.silva@business.com')
      .replace(/{status}/g, 'Confirmada')
      .replace(/{calendar_dates}/g, 'Lunes, 28 de Julio, 10:00 AM');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#f8fafc] w-full max-w-6xl h-[88vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 font-display">Personalizar Notificación</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Editor de plantillas multi-canal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channels selector at top of editor */}
        <div className="bg-white px-6 py-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveChannel('email')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeChannel === 'email'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Mail className="w-4 h-4" />
              Correo Electrónico
            </button>
            <button
              onClick={() => setActiveChannel('whatsapp')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeChannel === 'whatsapp'
                  ? 'bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/20'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Estado:</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={activeChannel === 'email' ? localTemplate.active : !!localTemplate.whatsappActive}
                onChange={(e) => {
                  if (activeChannel === 'email') {
                    setLocalTemplate({...localTemplate, active: e.target.checked});
                  } else {
                    setLocalTemplate({...localTemplate, whatsappActive: e.target.checked});
                  }
                }}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
            </label>
            <span className="text-xs font-black text-slate-800">
              {(activeChannel === 'email' ? localTemplate.active : localTemplate.whatsappActive) ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden divide-x divide-slate-100">
          
          {/* Left panel: Form editor */}
          <div className="flex-1 flex overflow-hidden">
            {/* Variables list */}
            <div className="w-64 bg-slate-50/50 p-4 overflow-y-auto space-y-4 shrink-0">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Etiquetas Dinámicas</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Haz click para insertar en tu plantilla o escribe la etiqueta correspondiente.</p>
              <div className="space-y-1.5">
                {variables.map((v, i) => (
                  <button 
                    key={i} 
                    type="button"
                    onClick={() => {
                      const suffix = v.tag;
                      if (activeChannel === 'email') {
                        setLocalTemplate({
                          ...localTemplate,
                          body: localTemplate.body + ' ' + suffix
                        });
                      } else {
                        setLocalTemplate({
                          ...localTemplate,
                          whatsappBody: (localTemplate.whatsappBody || '') + ' ' + suffix
                        });
                      }
                    }}
                    className="w-full text-left bg-white border border-slate-200/60 p-2.5 rounded-xl hover:border-slate-800 transition-colors shadow-sm group flex flex-col cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{v.name}</span>
                    <code className="text-[10px] font-mono text-slate-900 font-extrabold mt-0.5">{v.tag}</code>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="flex-1 bg-white p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
              <div className="space-y-5">
                {activeChannel === 'email' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Asunto del Correo</label>
                      <input 
                        type="text" 
                        value={localTemplate.subject}
                        onChange={e => setLocalTemplate({...localTemplate, subject: e.target.value})}
                        placeholder="Ej. ¡Tu cita está confirmada! ✅"
                        maxLength={255}
                        className="w-full bg-slate-50 border border-slate-200/60 focus:border-slate-900 px-4 py-3 rounded-xl text-sm font-semibold outline-none transition-all focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 flex flex-col">
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Cuerpo del Correo (HTML/Texto)</label>
                      <textarea 
                        value={localTemplate.body}
                        onChange={e => setLocalTemplate({...localTemplate, body: e.target.value})}
                        placeholder="Escribe el cuerpo del correo..."
                        className="w-full bg-slate-50 border border-slate-200/60 focus:border-slate-900 p-4 rounded-xl text-sm font-semibold outline-none transition-all focus:bg-white flex-1 min-h-[250px] resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5 flex-1 flex flex-col">
                      <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Mensaje de WhatsApp</label>
                      <textarea 
                        value={localTemplate.whatsappBody || ''}
                        onChange={e => setLocalTemplate({...localTemplate, whatsappBody: e.target.value})}
                        placeholder="Escribe el mensaje que se enviará por WhatsApp..."
                        className="w-full bg-slate-50 border border-slate-200/60 focus:border-slate-900 p-4 rounded-xl text-sm font-semibold outline-none transition-all focus:bg-white flex-1 min-h-[300px] resize-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {isReminder && activeChannel === 'email' && (
                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-5 mt-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Días antes</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer focus:bg-white focus:border-slate-900"
                      value={localTemplate.days}
                      onChange={e => setLocalTemplate({...localTemplate, days: parseInt(e.target.value)})}
                    >
                      {[0,1,2,3,4,5,6,7].map(num => <option key={num} value={num}>{num}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Horas antes</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer focus:bg-white focus:border-slate-900"
                      value={localTemplate.hours}
                      onChange={e => setLocalTemplate({...localTemplate, hours: parseInt(e.target.value)})}
                    >
                      {Array.from({length: 24}).map((_, num) => <option key={num} value={num}>{num}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Minutos antes</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer focus:bg-white focus:border-slate-900"
                      value={localTemplate.minutes}
                      onChange={e => setLocalTemplate({...localTemplate, minutes: parseInt(e.target.value)})}
                    >
                      {[0,5,10,15,20,30,45].map((num) => <option key={num} value={num}>{num}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Real-time Live Preview mockup */}
          <div className="w-[420px] bg-slate-50 p-6 flex flex-col overflow-y-auto shrink-0">
            <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Vista Previa en Tiempo Real
            </h4>

            {activeChannel === 'email' ? (
              /* Mockup Email inbox view */
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden flex flex-col min-h-[400px]">
                <div className="bg-slate-900 text-white p-4">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="text-[11px] opacity-75 font-semibold">Asunto:</div>
                  <div className="text-sm font-extrabold mt-0.5 truncate">{localTemplate.subject || '(Sin Asunto)'}</div>
                </div>
                <div className="border-b border-slate-100 p-3 flex flex-col gap-1 text-[11px] text-slate-500">
                  <div><span className="font-bold">De:</span> Acryl Calendar &lt;onboarding@resend.dev&gt;</div>
                  <div><span className="font-bold">Para:</span> Juan Pérez &lt;juan@correo.com&gt;</div>
                </div>
                <div className="p-5 flex-1 bg-[#f8fafc] text-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-sans min-h-[250px]">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    {renderPreviewContent(localTemplate.body)}
                  </div>
                </div>
              </div>
            ) : (
              /* Mockup WhatsApp chat bubble view */
              <div className="bg-[#E5DDD5] border border-slate-200 rounded-2xl shadow-md overflow-hidden flex flex-col min-h-[400px] font-sans relative">
                {/* Chat header */}
                <div className="bg-[#075E54] text-white p-4 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase">
                    AC
                  </div>
                  <div>
                    <div className="text-xs font-extrabold">Acryl Calendar Bot</div>
                    <div className="text-[9px] opacity-80">En línea</div>
                  </div>
                </div>
                {/* Chat content background */}
                <div className="p-4 flex-1 flex flex-col justify-end min-h-[300px]">
                  <div className="max-w-[85%] bg-white rounded-2xl p-3 shadow-xs text-xs text-slate-800 relative self-start mb-2 leading-relaxed">
                    <div className="whitespace-pre-wrap">
                      {renderPreviewContent(localTemplate.whatsappBody)}
                    </div>
                    <div className="text-[9px] text-slate-400 text-right mt-1 font-semibold">
                      12:34 PM
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
            Cancelar
          </button>
          <button 
            onClick={() => onSave(localTemplate)} 
            className="px-6 py-2.5 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-md cursor-pointer uppercase tracking-wider"
          >
            Guardar Cambios
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
  const [editingTemplate, setEditingTemplate] = useState<{type: keyof GroupCommunications['templates'] | 'reminder', id?: string, name: string} | null>(null);
  const [showReminderMenu, setShowReminderMenu] = useState(false);

  const [groupsData, setGroupsData] = useState<GroupCommunications[]>(() => {
    const raw = initialData?.groupsData && initialData.groupsData.length > 0 
      ? initialData.groupsData
      : [{ ...defaultGroupComms, id: 'group-1' }];
    
    return raw.map((g: any) => {
      // Ensure all dynamic templates are available on load
      const mergedTemplates = {
        ...defaultGroupComms.templates,
        ...(g.templates || {})
      };
      return {
        ...defaultGroupComms,
        ...g,
        templates: mergedTemplates
      };
    });
  });

  useEffect(() => {
    if (initialData?.groupsData && initialData.groupsData.length > 0) {
      setGroupsData(initialData.groupsData.map((g: any) => {
        const mergedTemplates = {
          ...defaultGroupComms.templates,
          ...(g.templates || {})
        };
        return {
          ...defaultGroupComms,
          ...g,
          templates: mergedTemplates
        };
      }));
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

  // Register section save
  const saveImpl = React.useRef<() => void>(() => {});
  saveImpl.current = () => onSave?.(groupsData);
  useEffect(() => { onRegisterSave?.(() => saveImpl.current()); }, [onRegisterSave]);

  // Helper to render channel details/status badges in lists
  const renderTemplateStatus = (tpl?: NotificationTemplate) => {
    if (!tpl) return <span className="text-[10px] text-slate-400 font-bold">Sin Configurar</span>;
    if (!tpl.active && !tpl.whatsappActive) {
      return <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg font-bold">Desactivado</span>;
    }
    
    return (
      <div className="flex gap-1.5 items-center">
        {tpl.active && (
          <span className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-xs">
            <Mail className="w-2.5 h-2.5" /> Email
          </span>
        )}
        {tpl.whatsappActive && (
          <span className="text-[9px] bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 shadow-xs">
            <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="srf-panel pb-6 rounded-b-3xl">
      
      {/* Service Selector Group Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100/60 rounded-t-3xl flex items-center gap-3">
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest shrink-0">Grupo:</span>
        <select
          value={activeGroupId}
          onChange={(e) => setActiveGroupId(e.target.value)}
          className="flex-1 bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer outline-none transition-all shadow-sm focus:border-slate-800"
        >
          {groupsData.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <div className="p-6 space-y-6">
        
        {/* CATEGORY 1: CONFIRMACIONES */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider font-display">1. Confirmaciones</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Plantillas enviadas al registrar o pagar cita</p>
          </div>

          <div className="space-y-3 max-w-4xl">
            {/* Confirmacion Cita */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Confirmación de Cita (Cliente)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía tras completar el formulario.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.confirm)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'confirm', name: 'Confirmación de Cita' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>

            {/* Confirmacion Pago */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Confirmación de Pago (Cliente)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía si el servicio requiere pago.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.paymentConfirm)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'paymentConfirm', name: 'Confirmación de Pago' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORY 2: RECORDATORIOS */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider font-display">2. Recordatorios</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Alertas de anticipación configurables</p>
          </div>

          <div className="max-w-4xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative">
                <button onClick={() => setShowReminderMenu(!showReminderMenu)} className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center transition-all cursor-pointer whitespace-nowrap gap-1">
                  <Plus className="w-4 h-4" /> AGREGAR RECORDATORIO <ChevronDown className="w-4 h-4" />
                </button>
                {showReminderMenu && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-100 shadow-xl rounded-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button onClick={() => addReminder('prospect')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-800 hover:bg-slate-50 border-b border-slate-100 cursor-pointer">
                      Para el Cliente
                    </button>
                    <button onClick={() => addReminder('host')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer">
                      Para el Anfitrión (Admin)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {activeGroup.reminders.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-slate-400 text-xs font-semibold">
                No hay recordatorios configurados para este grupo.
              </div>
            ) : (
              <div className="border border-slate-200/60 bg-white rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/60">
                      <th className="px-5 py-3.5 font-extrabold text-[11px] text-slate-400 uppercase tracking-wider">Anticipación</th>
                      <th className="px-5 py-3.5 font-extrabold text-[11px] text-slate-400 uppercase tracking-wider">Destinatario</th>
                      <th className="px-5 py-3.5 font-extrabold text-[11px] text-slate-400 uppercase tracking-wider">Canales</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeGroup.reminders.map((reminder) => (
                      <tr key={reminder.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-5 py-4 text-xs font-bold text-slate-800 whitespace-nowrap">
                          {reminder.days > 0 && `${reminder.days}d `}
                          {reminder.hours > 0 && `${reminder.hours}h `}
                          {reminder.minutes > 0 && `${reminder.minutes}m `}
                          {reminder.days === 0 && reminder.hours === 0 && reminder.minutes === 0 ? 'Al mismo tiempo' : 'antes'}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                          {reminder.target === 'prospect' ? 'Cliente' : 'Anfitrión'}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          {renderTemplateStatus(reminder)}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button 
                            onClick={() => setEditingTemplate({ type: 'reminder', id: reminder.id, name: 'Recordatorio' })}
                            className="text-slate-500 hover:text-slate-900 mr-4 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeReminder(reminder.id)} className="text-red-500 hover:text-red-700 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CATEGORY 3: CANCELACIONES */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider font-display">3. Cancelaciones</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Plantillas enviadas al cancelar citas</p>
          </div>

          <div className="space-y-3 max-w-4xl">
            {/* Cancelacion Cliente */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Cancelada por el Cliente (Cliente)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía cuando el cliente solicita la cancelación.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.cancelClient || activeGroup.templates.cancel)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'cancelClient', name: 'Cancelado por Cliente' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>

            {/* Cancelacion Admin */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Cancelada por el Administrador (Cliente)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía si el administrador anula la cita.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.cancelAdmin)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'cancelAdmin', name: 'Cancelado por Admin' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORY 4: REPROGRAMACIONES */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider font-display">4. Reprogramaciones</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Notificaciones de cambio de fecha u horario</p>
          </div>

          <div className="space-y-3 max-w-4xl">
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Reprogramación de Cita (Cliente)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía al modificar fecha/hora de reserva.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.reschedule)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'reschedule', name: 'Cita Reprogramada' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        {/* CATEGORY 5: NOTIFICACIONES INTERNAS */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider font-display">5. Notificaciones Internas</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Alertas enviadas al administrador/anfitrión</p>
          </div>

          <div className="space-y-3 max-w-4xl">
            {/* Nuevo Registro Admin */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Aviso de Nuevo Registro (Anfitrión)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía al crear una cita.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.adminNew)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'adminNew', name: 'Nuevo Registro (Admin)' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>

            {/* Nuevo Pago Admin */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Aviso de Nuevo Pago (Anfitrión)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía al confirmarse el pago.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.adminNewPayment)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'adminNewPayment', name: 'Nuevo Pago (Admin)' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>

            {/* Cita Cancelada Admin */}
            <div className="bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:border-slate-800 transition-colors flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Aviso de Cancelación (Anfitrión)</h4>
                <p className="text-xs text-slate-400 font-semibold mt-1">Se envía si el cliente cancela.</p>
                <div className="mt-2.5">{renderTemplateStatus(activeGroup.templates.adminNewCancel)}</div>
              </div>
              <button 
                onClick={() => setEditingTemplate({ type: 'adminNewCancel', name: 'Cancelación (Admin)' })}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* REMITENTE EMAIL */}
        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-slate-900 font-extrabold text-sm uppercase tracking-wider font-display">Remitente del correo electrónico</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Configurar dirección y nombre del emisor</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mt-3">
            {/* Sender Options Cards */}
            <button 
              onClick={() => updateActiveGroup({ senderMode: 'default' })}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                activeGroup.senderMode === 'default'
                  ? 'border-slate-900 bg-white ring-4 ring-slate-100 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {activeGroup.senderMode === 'default' && (
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white stroke-[3.5]" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800 shrink-0">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Predeterminado</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Usa el servidor central del sistema. Los correos se envían bajo el remitente del servicio.
              </p>
            </button>

            <button 
              onClick={() => updateActiveGroup({ senderMode: 'custom' })}
              className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                activeGroup.senderMode === 'custom'
                  ? 'border-slate-900 bg-white ring-4 ring-slate-100 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {activeGroup.senderMode === 'custom' && (
                <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white stroke-[3.5]" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm">Personalizado</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Configura un email de remitente y nombre específicos para las comunicaciones de este grupo.
              </p>
            </button>
          </div>

          {activeGroup.senderMode === 'custom' && (
            <div className="space-y-4 max-w-lg bg-slate-50/50 p-5 border border-slate-200/50 rounded-2xl mt-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Email del Remitente</label>
                <input 
                  type="email" 
                  value={activeGroup.senderEmail}
                  onChange={(e) => updateActiveGroup({senderEmail: e.target.value})}
                  placeholder="Ej. citas@tudominio.com"
                  className="w-full bg-white border border-slate-200/60 focus:border-slate-900 px-4 py-2.5 rounded-xl text-xs font-semibold outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Nombre del Remitente</label>
                <input 
                  type="text" 
                  value={activeGroup.senderName} 
                  onChange={(e) => updateActiveGroup({ senderName: e.target.value })}
                  placeholder="Ej. Clínica Acryl"
                  maxLength={40}
                  className="w-full bg-white border border-slate-200/60 focus:border-slate-900 px-4 py-2.5 rounded-xl text-xs font-semibold outline-none transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Responder a (Reply-To)</label>
                <input 
                  type="email" 
                  value={activeGroup.replyTo} 
                  onChange={(e) => updateActiveGroup({ replyTo: e.target.value })}
                  placeholder="Ej. soporte@tudominio.com"
                  className="w-full bg-white border border-slate-200/60 focus:border-slate-900 px-4 py-2.5 rounded-xl text-xs font-semibold outline-none transition-all" 
                />
              </div>
            </div>
          )}
        </section>

        {/* Builder Footer Buttons */}
        <div className="builder-embedded-toolbar mt-8 flex justify-end gap-3 max-w-4xl">
          <button className="px-6 py-3 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
            CANCELAR
          </button>
          <button 
            onClick={() => onSave?.(groupsData)} 
            className="px-6 py-3 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer uppercase tracking-wider"
          >
            <Save className="w-4 h-4" /> GUARDAR COMUNICACIONES
          </button>
        </div>

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
