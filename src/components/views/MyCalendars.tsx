/**
 * VISTA: MIS CALENDARIOS
 * Lista y gestión de los calendarios creados por el usuario.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Edit, Eye, MoreHorizontal, Trash2, AlertTriangle, Plus, Calendar as CalendarIcon, Code, Copy, ArrowRightLeft, ExternalLink, Palette, Users, X, RefreshCw, CalendarPlus, ListFilter, Lightbulb, Sparkles } from 'lucide-react';
import { db, functions } from '../../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, addDoc, deleteDoc, where, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Loader2 } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { useIsMobileApp } from '../../hooks/useMediaQuery';
import { useAuth } from '../../lib/auth';
import { openExternalUrl } from '../../lib/device';

const MyCalendars: React.FC<{ onViewSubscribers?: (id: string) => void, onEdit?: (id: string, title: string) => void, onNewCalendar?: () => void }> = ({ onViewSubscribers, onEdit, onNewCalendar }) => {
  const isMobileApp = useIsMobileApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Mis calendarios');
  const [calendars, setCalendars] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Modals state
  const [showInsertModal, setShowInsertModal] = useState<string | null>(null);
  const [previewCalendar, setPreviewCalendar] = useState<any | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Transferencia
  const [transferTarget, setTransferTarget] = useState<any | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Toast simple
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    let unsubscribeCalendars: () => void;
    let unsubscribeShared: () => void;
    let unsubscribeEvents: () => void;

    if (!user?.uid) {
      setCalendars([]);
      setEvents([]);
      setLoading(false);
      return;
    }

    const mergeCalendars = (own: any[], shared: any[]) => {
      const byId = new Map<string, any>();
      [...own, ...shared].forEach((cal) => byId.set(cal.id, cal));
      setCalendars(Array.from(byId.values()));
    };

    try {
      let ownCalendars: any[] = [];
      let sharedCalendars: any[] = [];
      const q = query(collection(db, 'calendars'), where('ownerUid', '==', user.uid));
      unsubscribeCalendars = onSnapshot(q, (snapshot) => {
        ownCalendars = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        mergeCalendars(ownCalendars, sharedCalendars);
        setLoading(false);
      }, (error) => {
        console.warn("Firestore error:", error);
        setCalendars([]);
        setLoading(false);
      });

      const qShared = query(collection(db, 'calendars'), where('memberUids', 'array-contains', user.uid));
      unsubscribeShared = onSnapshot(qShared, (snapshot) => {
        sharedCalendars = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((cal: any) => cal.ownerUid !== user.uid);
        mergeCalendars(ownCalendars, sharedCalendars);
      }, (error) => console.warn("Firestore shared calendars error:", error));

      const qEvents = query(collection(db, 'events'), where('ownerUid', '==', user.uid));
      unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
        const firestoreEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(firestoreEvents);
      });

    } catch (e) {
      console.warn("No Firebase config detected.");
      setCalendars([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribeCalendars) unsubscribeCalendars();
      if (unsubscribeShared) unsubscribeShared();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [user?.uid]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const calRef = doc(db, 'calendars', id);
      await updateDoc(calRef, { status: !currentStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres mover este calendario a la basura?")) {
      try {
        await updateDoc(doc(db, 'calendars', id), { deletedAt: new Date().toISOString() });
      } catch (error) {
        console.error("Error deleting calendar:", error);
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'calendars', id), { deletedAt: null });
    } catch (error) {
      console.error("Error restoring calendar:", error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar definitivamente este calendario? Esta acción no se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, 'calendars', id));
      } catch (error) {
        console.error("Error permanently deleting calendar:", error);
      }
    }
  };

  const handleInsert = (id: string) => {
    setShowInsertModal(id);
    setOpenMenuId(null);
  };

  const handleDuplicate = async (cal: any) => {
    try {
      const { id, ...data } = cal;
      const originalTitle = data.title || "Calendario";
      // Removing logic suffix and replacing with suffix
      const titleWithoutCopy = originalTitle.replace(/ \(Copia\)$/, '');
      await addDoc(collection(db, 'calendars'), {
        ...data,
        title: `${titleWithoutCopy} (Copia)`,
        ownerUid: user?.uid || null,
        ownerEmail: user?.email || '',
        memberUids: user?.uid ? [user.uid] : [],
        roles: user?.uid ? { [user.uid]: 'owner' } : {},
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      showToast('Calendario duplicado con éxito.');
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error duplicating calendar:", error);
      showToast('No se pudo duplicar el calendario.');
    }
  };

  const handleTransfer = (cal: any) => {
    setTransferTarget(cal);
    setTransferEmail('');
    setTransferError(null);
    setOpenMenuId(null);
  };

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(transferEmail)) {
      setTransferError('Introduce un email válido.');
      return;
    }
    setTransferring(true);
    setTransferError(null);
    try {
      // Acción sensible: siempre vía Cloud Function (verifica que el
      // destinatario ya tenga cuenta y revoca el acceso del dueño anterior).
      // Sin fallback de escritura directa: una escritura directa no puede
      // revocar `ownerUid`/`roles` de forma segura y dejaría al dueño
      // original con acceso total pese a que la app diga "transferido".
      const fn = httpsCallable(functions, 'transferCalendar');
      await fn({ calendarId: transferTarget.id, toEmail: transferEmail });
      setTransferTarget(null);
      showToast(`Calendario transferido a ${transferEmail}.`);
    } catch (err: any) {
      console.error('Error transfiriendo:', err);
      setTransferError(err?.message || 'No se pudo transferir el calendario.');
    } finally {
      setTransferring(false);
    }
  };

  const handleSubscribers = (id: string) => {
    if (onViewSubscribers) onViewSubscribers(id);
    setOpenMenuId(null);
  };

  const handlePreview = (cal: any) => {
    setPreviewCalendar(cal);
    setOpenMenuId(null);
  };

  const getBookingUrl = (id: string) => `${window.location.origin}/booking/${id}`;

  const getCalendarSchedulesCount = (calendarId: string) => {
    return events.filter(e => e.calendarId === calendarId).length;
  };

  const filteredCalendars = calendars.filter(cal => {
    if (activeTab === 'Compartido conmigo') {
      if (cal.ownerUid === user?.uid) return false;
    } else if (activeTab !== 'Basura') {
      if (cal.ownerUid !== user?.uid) return false;
    }
    // Pestaña (basura vs activos)
    if (activeTab === 'Basura') {
      if (!cal.deletedAt) return false;
    } else {
      if (cal.deletedAt) return false;
    }
    // Búsqueda por título
    const t = search.trim().toLowerCase();
    if (t && !String(cal.title || '').toLowerCase().includes(t)) return false;
    // Filtro de estado
    if (statusFilter === 'active' && !cal.status) return false;
    if (statusFilter === 'inactive' && cal.status) return false;
    return true;
  });

  const tabConfig = [
    { name: 'Mis calendarios', icon: null },
    { name: 'Compartido conmigo', icon: Users },
    { name: 'Basura', icon: Trash2 },
  ];

  return (
    <div className={`flex flex-col flex-1 h-full w-full ${isMobileApp ? 'pt-3' : 'max-w-6xl mx-auto'}`}>
      {/* Header */}
      {isMobileApp ? (
      <div className="flex items-start justify-between gap-3 mb-5 pr-12">
          <div className="min-w-0">
            <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-tight ink-1 font-display">Calendarios</h1>
            <p className="ink-3 font-medium text-[14px] mt-0.5">Administra todos tus calendarios y preferencias</p>
          </div>
          <button onClick={onNewCalendar} className="shrink-0 w-10 h-10 rounded-2xl srf-panel border hairline shadow-sm flex items-center justify-center ink-1 hover:text-black active:scale-95 transition-transform" aria-label="Nuevo calendario">
            <CalendarPlus className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          <div>
             <h2 className="text-[22px] font-bold tracking-tight ink-1">Calendarios</h2>
             <p className="text-[13px] ink-3 font-medium mt-0.5">{filteredCalendars.length} {filteredCalendars.length === 1 ? 'calendario' : 'calendarios'}</p>
          </div>
          <button onClick={onNewCalendar} className="accent-fill hover:brightness-110 px-5 py-2.5 rounded-[11px] text-[13px] font-bold flex items-center gap-2 shadow-sm active:scale-[0.98] transition-all">
            <CalendarPlus className="w-4 h-4" /> Nuevo calendario
          </button>
        </div>
      )}

      {/* Búsqueda + filtro (móvil) */}
      {isMobileApp && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 ink-3 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título..." className="w-full srf-panel border hairline ink-1 text-[14px] rounded-2xl pl-11 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black shadow-sm" />
          </div>
          <div className="relative">
            <ListFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 ink-3 pointer-events-none" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none w-full srf-panel border hairline ink-1 text-[14px] font-medium rounded-2xl pl-11 pr-9 py-3 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black shadow-sm cursor-pointer">
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ink-3 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex border-b hairline mb-6 ${isMobileApp ? 'gap-5 srf-panel rounded-t-2xl px-4 pt-3 -mb-0.5' : 'space-x-6 px-2'}`}>
        {tabConfig.map(tab => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`pb-3 font-semibold text-sm transition-colors relative flex items-center gap-1.5 ${activeTab === tab.name ? 'ink-1 font-bold' : 'ink-3 hover:ink-1'}`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.name === 'Compartido conmigo' && isMobileApp ? 'Compartido' : tab.name}
            {activeTab === tab.name && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 accent-bg rounded-t-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar de filtros unificada (solo escritorio) */}
      {!isMobileApp && (
        <div className="srf-sunken rounded-[14px] p-2 flex flex-wrap items-center gap-2 mb-5" style={{ border: '1px solid var(--hairline)' }}>
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ink-3 pointer-events-none" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título..." className="w-full srf-panel ink-1 text-[13px] font-medium rounded-[10px] pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10" style={{ border: '1px solid var(--hairline)' }} />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none srf-panel ink-1 text-[13px] font-medium rounded-[10px] px-4 pr-9 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/10" style={{ border: '1px solid var(--hairline)' }}>
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 ink-3 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Tarjetas (solo dispositivos móviles) */}
      {isMobileApp && (
      <div className="space-y-4 flex-1">
        {filteredCalendars.length === 0 && !loading && (
          <>
            <div className="srf-panel rounded-3xl border hairline shadow-sm px-6 py-12 text-center">
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 rounded-full srf-sunken/60 flex items-center justify-center mb-5">
                  <CalendarIcon className="w-12 h-12 ink-3" strokeWidth={1.5} />
                  <Sparkles className="w-5 h-5 text-slate-300 absolute top-2 right-3" />
                  <Sparkles className="w-4 h-4 ink-3 absolute bottom-3 right-1" />
                  <Sparkles className="w-3.5 h-3.5 text-slate-200 absolute top-6 left-2" />
                </div>
                <h3 className="text-[19px] font-bold ink-1 mb-1.5">No tienes calendarios en esta sección.</h3>
                {activeTab !== 'Basura' && <p className="text-[14px] ink-3 mb-6">Crea tu primer calendario para empezar.</p>}
                {activeTab !== 'Basura' && (
                  <button onClick={onNewCalendar} className="inline-flex items-center gap-2 accent-bg hover:brightness-110 text-white font-bold text-[15px] px-6 py-3.5 rounded-2xl shadow-lg shadow-slate-950/20 active:scale-95 transition-transform">
                    <Plus className="w-5 h-5" /> Crear calendario
                  </button>
                )}
              </div>
            </div>
            {activeTab !== 'Basura' && (
              <div className="srf-sunken border hairline/80 rounded-2xl p-4 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 ink-3 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold ink-1 text-[14px]">Consejo</p>
                  <p className="text-[13px] ink-3 mt-0.5">Puedes crear calendarios para diferentes servicios, equipos o tipos de citas.</p>
                </div>
              </div>
            )}
          </>
        )}
        {filteredCalendars.map((cal, i) => (
          <div key={cal.id || i} className="srf-panel rounded-2xl border hairline shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold ink-1 text-sm uppercase tracking-tight break-words">{cal.title}</p>
                <p className="text-xs ink-3 font-semibold mt-0.5">{cal.type}</p>
              </div>
              <div
                onClick={() => toggleStatus(cal.id, cal.status)}
                className={`shrink-0 w-11 h-6 rounded-full relative cursor-pointer transition-colors ${cal.status ? 'accent-bg' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-0.5 srf-panel w-5 h-5 rounded-full transition-all ${cal.status ? 'left-[22px]' : 'left-0.5'}`}></div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[11px] font-semibold ink-2 srf-sunken rounded-lg px-2.5 py-1">
                Grupos: {cal.serviceIds?.length || cal.groups || 0}
              </span>
              <span className="text-[11px] font-semibold ink-2 srf-sunken rounded-lg px-2.5 py-1">
                Horarios: {getCalendarSchedulesCount(cal.id)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t hairline">
              <button onClick={() => onEdit?.(cal.id, cal.title)} className="flex-1 min-h-[40px] srf-sunken ink-1 hover:bg-slate-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:bg-slate-200">
                <Edit className="h-4 w-4" /> Editar
              </button>
              <button onClick={() => handlePreview(cal)} className="flex-1 min-h-[40px] srf-sunken ink-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:bg-slate-200">
                <Eye className="h-4 w-4" /> Ver
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(getBookingUrl(cal.id));
                  showToast('Enlace copiado al portapapeles');
                }} 
                className="min-h-[40px] w-10 srf-sunken ink-3 rounded-xl flex items-center justify-center active:bg-slate-200 cursor-pointer" 
                title="Copiar enlace"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={() => handleInsert(cal.id)} className="min-h-[40px] w-10 srf-sunken ink-3 rounded-xl flex items-center justify-center active:bg-slate-200" title="Insertar">
                <Code className="h-4 w-4" />
              </button>
              {activeTab === 'Basura' ? (
                <>
                  <button onClick={() => handleRestore(cal.id)} className="min-h-[40px] w-10 srf-sunken text-emerald-600 rounded-xl flex items-center justify-center active:bg-emerald-50" title="Restaurar">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button onClick={() => handlePermanentDelete(cal.id)} className="min-h-[40px] w-10 srf-sunken text-red-600 rounded-xl flex items-center justify-center active:bg-red-50" title="Eliminar">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button onClick={() => handleDelete(cal.id)} className="min-h-[40px] w-10 srf-sunken text-red-500 rounded-xl flex items-center justify-center active:bg-red-50" title="Mover a basura">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Tabla (solo escritorio) — plana, sin contenedor propio */}
      {!isMobileApp && (
      <div className="flex flex-1 flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="srf-sunken border-b hairline">
                <th className="px-6 py-4 text-xs font-bold ink-3 uppercase tracking-wider">Título del Calendario</th>
                <th className="px-6 py-4 text-xs font-bold ink-3 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold ink-3 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold ink-3 uppercase tracking-wider">Grupos</th>
                <th className="px-6 py-4 text-xs font-bold ink-3 uppercase tracking-wider">Horarios</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalendars.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center ink-3">
                    <div className="flex flex-col items-center">
                      <CalendarIcon className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="font-medium ink-2">No tienes calendarios en esta sección.</p>
                      {activeTab !== 'Basura' && <p className="text-sm">Crea tu primer calendario para empezar.</p>}
                    </div>
                  </td>
                </tr>
              )}
              {filteredCalendars.map((cal, i) => (
                <tr key={cal.id || i} className="hover:srf-sunken transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold ink-1 text-sm uppercase tracking-tight">{cal.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => toggleStatus(cal.id, cal.status)}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${cal.status ? 'accent-bg' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 srf-panel w-4 h-4 rounded-full transition-all ${cal.status ? 'left-[22px]' : 'left-0.5'}`}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold ink-3 border-l hairline">{cal.type}</td>
                  <td className="px-6 py-4 text-sm font-bold ink-1 border-l hairline">
                    {cal.serviceIds?.length || cal.groups || 0}
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold border-l hairline ${cal.highlight ? 'text-amber-500' : 'ink-1'}`}>
                    {getCalendarSchedulesCount(cal.id)}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end items-center space-x-2 relative">
                      {cal.alert && (
                        <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      )}
                      <button onClick={() => onEdit?.(cal.id, cal.title)} className="p-1.5 srf-sunken ink-3 hover:text-black hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handlePreview(cal)} className="p-1.5 srf-sunken ink-3 hover:text-black hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer">
                        <Eye className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === cal.id ? null : cal.id);
                          }}
                          className="p-1.5 srf-sunken ink-3 hover:text-black hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenuId === cal.id && (
                          <div ref={menuRef} className="absolute right-0 top-10 mt-1 w-48 srf-panel rounded-xl shadow-lg border hairline py-2 z-50 animate-in fade-in slide-in-from-top-2">
                            <button onClick={() => handleInsert(cal.id)} className="w-full text-left px-4 py-2 text-sm ink-2 hover:srf-sunken hover:text-black flex items-center transition-colors cursor-pointer">
                              <Code className="h-4 w-4 mr-3 ink-3" /> Insertar
                            </button>
                            <button onClick={() => handleDuplicate(cal)} className="w-full text-left px-4 py-2 text-sm ink-2 hover:srf-sunken hover:text-black flex items-center transition-colors cursor-pointer">
                              <Copy className="h-4 w-4 mr-3 ink-3" /> Duplicado
                            </button>
                            <button onClick={() => handleTransfer(cal)} className="w-full text-left px-4 py-2 text-sm ink-2 hover:srf-sunken hover:text-black flex items-center transition-colors cursor-pointer">
                              <ArrowRightLeft className="h-4 w-4 mr-3 ink-3" /> Transferir
                            </button>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(getBookingUrl(cal.id));
                                showToast('Enlace copiado al portapapeles');
                                setOpenMenuId(null);
                              }} 
                              className="w-full text-left px-4 py-2 text-sm ink-2 hover:srf-sunken hover:text-black flex items-center transition-colors cursor-pointer"
                            >
                              <Copy className="h-4 w-4 mr-3 ink-3" /> Copiar enlace
                            </button>
                            <button onClick={() => openExternalUrl(getBookingUrl(cal.id))} className="w-full text-left px-4 py-2 text-sm ink-2 hover:srf-sunken hover:text-black flex items-center transition-colors cursor-pointer">
                              <ExternalLink className="h-4 w-4 mr-3 ink-3" /> Compartir horario
                            </button>
                            <button onClick={() => { setOpenMenuId(null); onEdit?.(cal.id, cal.title); }} className="w-full text-left px-4 py-2 text-sm ink-2 hover:srf-sunken hover:text-black flex items-center transition-colors border-t hairline mt-1 pt-2 cursor-pointer">
                              <Palette className="h-4 w-4 mr-3 ink-3" /> Personalizar
                            </button>
                            <button onClick={() => handleSubscribers(cal.id)} className="w-full text-left px-4 py-2 text-sm ink-2 hover:srf-sunken hover:text-black flex items-center transition-colors cursor-pointer">
                              <Users className="h-4 w-4 mr-3 ink-3" /> ver suscriptores
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {activeTab === 'Basura' ? (
                        <>
                          <button onClick={() => handleRestore(cal.id)} className="p-1.5 srf-sunken ink-3 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer" title="Restaurar calendario">
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button onClick={() => handlePermanentDelete(cal.id)} className="p-1.5 srf-sunken ink-3 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer" title="Eliminar definitivamente">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleDelete(cal.id)} className="p-1.5 srf-sunken ink-3 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <Sheet isOpen={!!previewCalendar} onClose={() => setPreviewCalendar(null)} maxWidthClass="max-w-5xl" zIndex={70}>
        <div className="srf-panel flex flex-col h-[88vh] lg:h-[82vh]">
          <div className="shrink-0 px-4 sm:px-5 py-3 border-b hairline flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] ink-3">Vista previa</p>
              <h3 className="text-base sm:text-lg font-bold ink-1 truncate">
                {previewCalendar?.title || 'Calendario'}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {previewCalendar?.id && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getBookingUrl(previewCalendar.id));
                      showToast('Enlace copiado al portapapeles');
                    }}
                    className="h-10 w-10 rounded-full srf-sunken ink-3 hover:bg-slate-200/60 hover:text-black transition-colors flex items-center justify-center cursor-pointer"
                    title="Copiar enlace"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openExternalUrl(getBookingUrl(previewCalendar.id))}
                    className="h-10 w-10 rounded-full srf-sunken ink-3 hover:bg-slate-200/60 hover:text-black transition-colors flex items-center justify-center cursor-pointer"
                    title="Abrir en el navegador"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setPreviewCalendar(null)}
                className="h-10 w-10 rounded-full srf-sunken ink-3 hover:bg-slate-200 hover:ink-1 transition-colors flex items-center justify-center"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {previewCalendar?.id && (
            <iframe
              title={`Vista previa de ${previewCalendar.title || 'calendario'}`}
              src={getBookingUrl(previewCalendar.id)}
              className="flex-1 w-full srf-sunken"
              frameBorder="0"
            />
          )}
        </div>
      </Sheet>

      <Sheet isOpen={!!showInsertModal} onClose={() => setShowInsertModal(null)} maxWidthClass="max-w-lg" zIndex={50}>
          <div className="srf-panel flex flex-col">
            <div className="p-5 sm:p-6 border-b hairline flex items-center justify-between">
              <h3 className="text-lg font-bold ink-1 flex items-center">
                <Code className="w-5 h-5 mr-2 ink-1" />
                Insertar en sitio web
              </h3>
              <button
                onClick={() => setShowInsertModal(null)}
                className="ink-3 hover:ink-2 p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6 srf-sunken flex-1">
              <p className="text-sm ink-2 mb-4">Copia este código iframe e insértalo en el HTML de tu sitio web para permitir reservas directas.</p>
              <div className="bg-slate-900 p-4 rounded-xl relative group">
                <code className="text-sm font-mono text-emerald-400 break-all select-all">
                  &lt;iframe src="{window.location.origin}/booking/{showInsertModal}" width="100%" height="800" frameBorder="0"&gt;&lt;/iframe&gt;
                </code>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`<iframe src="${window.location.origin}/booking/${showInsertModal}" width="100%" height="800" frameBorder="0"></iframe>`);
                    showToast('Código copiado al portapapeles');
                  }}
                  className="absolute top-3 right-3 srf-panel/10 hover:srf-panel/20 text-white p-1.5 rounded disabled opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Copiar"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
      </Sheet>

      {/* Sheet: transferir calendario */}
      <Sheet isOpen={!!transferTarget} onClose={() => setTransferTarget(null)} maxWidthClass="max-w-md" zIndex={60}>
        <form onSubmit={submitTransfer} className="srf-panel p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl srf-sunken ink-1 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold ink-1 leading-tight">Transferir calendario</h3>
              <p className="text-xs ink-3">{transferTarget?.title}</p>
            </div>
          </div>
          <p className="text-sm ink-3">Introduce el email de la persona que recibirá la propiedad de este calendario.</p>
          <div>
            <label className="block text-[13px] font-semibold ink-3 mb-1.5">Email del destinatario</label>
            <input
              type="email"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              required
              placeholder="correo@ejemplo.com"
              className="w-full srf-panel border hairline rounded-lg px-3 py-2.5 text-sm ink-1 outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          {transferError && <p className="text-rose-500 text-xs font-medium">{transferError}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
            <button type="button" onClick={() => setTransferTarget(null)} className="px-4 py-2.5 ink-2 font-medium hover:srf-sunken rounded-lg text-sm transition-colors">Cancelar</button>
            <button type="submit" disabled={transferring} className="px-5 py-2.5 accent-bg hover:brightness-110 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
              {transferring && <Loader2 className="w-4 h-4 animate-spin" />}
              Transferir
            </button>
          </div>
        </form>
      </Sheet>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-3">
          {toast}
        </div>
      )}

    </div>
  );
};

export default MyCalendars;
