import React, { useState } from 'react';
import { X, Calendar, Clock, DollarSign, User, Mail, Phone, MessageCircle, Globe, FileText, XCircle } from 'lucide-react';
import RescheduleModal from './RescheduleModal';
import Sheet from '../ui/Sheet';

interface EventDetailsModalProps {
  onClose: () => void;
  event: any;
  onDelete?: (eventId: string) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ onClose, event, onDelete }) => {
  const [note, setNote] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const formattedDate = event.fullDate 
    ? new Date(event.fullDate).toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })
    : 'Fecha no disponible';

  const cleanPhone = event.phone ? event.phone.replace(/[^0-9]/g, '') : '';
  const priceDisplay = event.price && event.price !== '' ? `${event.price} (Pendiente)` : 'Gratis';
  const statusDisplay = event.status === 'scheduled' ? 'Programado' : (event.status || 'Desconocido');

  return (
    <>
    <Sheet isOpen onClose={onClose} maxWidthClass="max-w-lg" zIndex={50}>
      <div className="bg-white">
        <div className="flex justify-between items-center p-4 bg-[#f1f3f6] border-b border-slate-200 sticky top-0 z-10">
          <h2 className="text-[16px] sm:text-[17px] font-bold text-[#374151] truncate pr-4">{event.client} - {event.service}</h2>
          <button onClick={onClose} className="p-1 rounded-full bg-[#e2e8f0] hover:bg-[#cbd5e1] text-slate-500 cursor-pointer flex-shrink-0 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 bg-white">
          
          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-slate-800">Programación</h3>
            <div className="flex items-center text-[13px] text-slate-600 gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${event.statusColor || 'bg-[#13CE9C]'} ml-0.5`}></span>
              {statusDisplay}
            </div>
            <div className="flex items-center text-[13px] text-slate-500 gap-3">
              <Calendar className="w-4 h-4 text-[#aec0d5]" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center text-[13px] text-slate-500 gap-3 pb-4 border-b border-slate-100">
              <Clock className="w-4 h-4 text-[#aec0d5]" />
              {event.duration || '30m'} Duración
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-slate-800">Pago</h3>
            <div className="flex items-center text-[13px] text-slate-600 gap-3 pb-4 border-b border-slate-100">
              <div className="w-4 h-4 rounded-full bg-[#eef2f6] text-[#aec0d5] flex justify-center items-center font-bold text-[10px]">$</div>
              {priceDisplay}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-slate-800">Calendario</h3>
            <div className="flex items-center text-[13px] text-slate-500 gap-3">
              <Calendar className="w-4 h-4 text-[#aec0d5]" />
              {event.service || 'Sin servicio'}
            </div>
            <div className="flex items-center text-[13px] text-slate-500 gap-3 pb-4 border-b border-slate-100">
              <User className="w-4 h-4 text-[#aec0d5]" />
              {event.type || 'Consulta'}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[15px] font-bold text-slate-800">Suscriptores</h3>
            <div className="flex items-center text-[13px] text-slate-500 gap-3">
              <User className="w-4 h-4 text-[#334155]" />
              {event.client}
            </div>
            {event.email && (
              <div className="flex items-center text-[13px] text-slate-500 gap-3">
                <Mail className="w-4 h-4 text-[#aec0d5]" />
                {event.email}
              </div>
            )}
            {event.phone && (
              <div className="flex items-center text-[13px] text-slate-500 gap-3">
                <Phone className="w-4 h-4 text-[#aec0d5]" />
                {event.phone}
              </div>
            )}
            {cleanPhone && (
              <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noreferrer" className="flex items-center text-[13px] text-[#10b981] hover:text-[#059669] gap-3 transition-colors">
                <MessageCircle className="w-4 h-4" />
                Chatea con en Whatsapp
              </a>
            )}
            <div className="flex items-center text-[13px] text-slate-500 gap-3">
              <Globe className="w-4 h-4 text-[#aec0d5]" />
              Localización de Usuario
            </div>
            <div className="flex items-start text-[13px] text-slate-500 gap-3 pb-4 border-b border-slate-100">
              <div className="w-4 h-4 rounded bg-[#e2e8f0] text-[#94a3b8] flex justify-center items-center font-bold text-[10px] mt-0.5">
                {event.termsAccepted ? '✓' : ''}
              </div>
              <span className="leading-tight"><strong className="text-slate-600 font-semibold">¿Aceptas los términos y condiciones y la política de privacidad?</strong> {event.termsAccepted ? 'Aceptar' : 'Rechazado'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[15px] font-bold text-slate-800">Notas internas</h3>
            <div className="flex items-center text-[13px] text-slate-500 gap-3">
              <FileText className="w-4 h-4 text-[#aec0d5]" />
              <input 
                 type="text"
                 placeholder="Agregar una nota"
                 value={note}
                 onChange={e => setNote(e.target.value)}
                 className="bg-transparent border-none outline-none flex-1 text-slate-600 placeholder:text-slate-400"
              />
            </div>
          </div>

        </div>

        <div className="border-t border-slate-200 bg-[#f8f9fa] p-4 sm:p-5 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3">
           <button onClick={() => setShowReschedule(true)} className="w-full sm:w-auto bg-black hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-lg flex justify-center items-center gap-2 cursor-pointer transition-colors text-[13px] tracking-wide">
             <Clock className="w-4 h-4" /> REPROGRAMAR
           </button>
           <button onClick={() => setShowConfirmDelete(true)} className="w-full sm:w-auto justify-center text-rose-500 hover:text-rose-600 font-medium px-4 py-2 flex items-center gap-2 text-[13px] cursor-pointer transition-colors">
             <XCircle className="w-4 h-4" />
             Cancelar cita
           </button>
        </div>
      </div>
    </Sheet>

    <RescheduleModal
      isOpen={showReschedule}
      onClose={() => setShowReschedule(false)}
      event={event}
    />

    <Sheet isOpen={showConfirmDelete} onClose={() => setShowConfirmDelete(false)} maxWidthClass="max-w-sm" zIndex={70}>
      <div className="bg-white p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Cancelar Cita</h3>
        <p className="text-slate-600 mb-6 text-sm">¿Estás seguro de que deseas cancelar esta cita? El espacio volverá a estar disponible.</p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={() => setShowConfirmDelete(false)}
            className="px-4 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg cursor-pointer transition-colors text-sm"
          >
            Atrás
          </button>
          <button
            onClick={() => {
              if (onDelete && event.id) {
                onDelete(event.id);
              }
            }}
            className="px-4 py-2.5 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg cursor-pointer transition-colors text-sm"
          >
            Cancelar Cita
          </button>
        </div>
      </div>
    </Sheet>
    </>
  );
};

export default EventDetailsModal;
