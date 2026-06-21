/**
 * COMPONENTE DASHBOARD (PRINCIPAL)
 * Orquesta la vista principal: sidebar en escritorio, bottom tab bar en móvil.
 */

import React, { useState, useEffect } from 'react';
import { listenForegroundPush } from '../../lib/push';
import Sidebar from './Sidebar';
import AppointmentsView from './AppointmentsView';
import Escritorio from '../views/Escritorio';
import NewCalendar from '../views/NewCalendar';
import MyCalendars from '../views/MyCalendars';
import Administrators from '../views/Administrators';
import Integrations from '../views/Integrations';
import Ajustes from '../views/Ajustes';
import ProfileView from '../views/ProfileView';
import CalendarEditor from '../views/calendar-editor/CalendarEditor';
import PaymentConfigsView from '../views/PaymentConfigsView';
import MobileTabBar from './MobileTabBar';
import { useIsMobileApp } from '../../hooks/useMediaQuery';
import { Calendar as CalendarIcon, ChevronRight, Bell, Trash2, Inbox, CheckCheck, Clock, User, Calendar } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import Sheet from '../ui/Sheet';

const Dashboard: React.FC = () => {
  const [activeSidebarItem, setActiveSidebarItem] = useState('Escritorio');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState('All time');
  const [activeCalendarView, setActiveCalendarView] = useState('Mes');
  const [mainView, setMainView] = useState('list');
  const [editingCalendarTitle, setEditingCalendarTitle] = useState('Nuevo Calendario');
  const [editingCalendarId, setEditingCalendarId] = useState('');
  const [selectedCalendarIdForList, setSelectedCalendarIdForList] = useState<string | null>(null);
  const isMobileApp = useIsMobileApp();

  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => { listenForegroundPush(); }, []);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, 'notifications'), where('ownerUid', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setNotifications(list);
    }, (error) => {
      console.error("Error subscribiendo a notificaciones:", error);
    });
    return unsub;
  }, [user?.uid]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          batch.update(doc(db, 'notifications', n.id), { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Error al marcar todas como leidas:", err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error("Error al eliminar notificacion:", err);
    }
  };

  const handleMarkRead = async (id: string, currentRead: boolean) => {
    if (currentRead) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Error al marcar notificacion como leida:", err);
    }
  };

  const isDetailView = ['Editor de calendario', 'Nuevo calendario'].includes(activeSidebarItem);

  const renderTopBar = () => {
    if (isMobileApp) return null;

    let breadcrumbTitle = activeSidebarItem;
    let breadcrumbCategory = 'Calendarios';

    if (activeSidebarItem === 'Lista de Citas') {
       breadcrumbCategory = 'Programación';
    } else if (activeSidebarItem === 'Ajustes') {
       breadcrumbTitle = 'Ajustes del sistema';
    } else if (activeSidebarItem === 'Perfil') {
       breadcrumbCategory = 'Cuenta';
       breadcrumbTitle = 'Perfil';
    } else if (activeSidebarItem === 'Escritorio') {
       breadcrumbCategory = 'Panel';
       breadcrumbTitle = 'Inicio';
    } else if (activeSidebarItem === 'Configuración de Pagos') {
       breadcrumbCategory = 'Configuración';
       breadcrumbTitle = 'Métodos de Pago';
    }

    return (
      <div className="flex bg-white/90 backdrop-blur-md border border-slate-200/60 mx-4 md:mx-6 mt-4 md:mt-6 rounded-t-3xl px-6 py-4 items-center justify-between shadow-sm flex-shrink-0 z-10">
         <div className="flex items-center text-sm font-medium text-slate-600">
            <span className="flex items-center p-1.5 bg-[#f5f5f7] text-slate-500 rounded-lg border border-slate-200/50 mr-3 shadow-sm">
              <CalendarIcon className="w-4 h-4" />
            </span>
            {activeSidebarItem !== 'Ajustes' ? (
                <>
                   <span className="hover:text-slate-800 cursor-pointer transition-colors duration-200">{breadcrumbCategory}</span>
                   <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
                </>
            ) : null}
            <span className="text-slate-900 font-semibold">{breadcrumbTitle}</span>
         </div>

         <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNotifications(true)}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm relative active:scale-95 transition-all cursor-pointer"
              title="Notificaciones"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
         </div>
      </div>
    );
  };

  // Mobile bell button — floats top-right but respects page-level icon buttons.
  // Pages like MyCalendars render their own right-side action icons inside the
  // scroll area. We keep the bell in a fixed overlay but use a smaller footprint
  // so it never visually sits on top of in-page icons.
  const renderMobileHeader = () => {
    if (isDetailView) return null;
    return (
      <div
        className="fixed z-40 pointer-events-none"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 0.6rem)',
          right: '1rem',
        }}
      >
        <button
          onClick={() => setShowNotifications(true)}
          className="pointer-events-auto w-9 h-9 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/50 text-slate-600 flex items-center justify-center shadow-sm relative active:scale-95 transition-all cursor-pointer"
          title="Notificaciones"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-extrabold px-1 rounded-full border-2 border-white flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (activeSidebarItem === 'Lista de Citas') {
       return (
          <AppointmentsView
            calendarFilter={selectedCalendarIdForList}
            setCalendarFilter={setSelectedCalendarIdForList}
          />
       );
    }
    
    if (activeSidebarItem === 'Ajustes') {
        return (
           <div className="flex-1 pb-6 mx-4 md:mx-6">
              <Ajustes />
           </div>
        );
    }

    if (activeSidebarItem === 'Perfil') {
        return (
           <div className="flex-1 pb-6 mx-4 md:mx-6 max-w-5xl">
              <ProfileView />
           </div>
        );
    }

    if (activeSidebarItem === 'Configuración de Pagos') {
        return (
           <div className="flex-1 pb-6 mx-4 md:mx-6">
              <PaymentConfigsView />
           </div>
        );
    }

    return (
       <div className={`flex-1 p-4 md:p-6 flex flex-col no-scrollbar ${activeSidebarItem !== 'Escritorio' ? 'bg-white mx-4 md:mx-6 mb-6 rounded-b-3xl border-x border-b border-t-0 border-slate-200/60 shadow-sm' : ''}`}>
          <div className="flex-1 w-full mx-auto flex flex-col">
            {activeSidebarItem === 'Escritorio' && <Escritorio activeActivityTab={activeActivityTab} setActiveActivityTab={setActiveActivityTab} onViewAll={() => setActiveSidebarItem('Lista de Citas')} />}
            {activeSidebarItem === 'Nuevo calendario' && <NewCalendar onCreate={(title, type, id) => {
              setEditingCalendarTitle(title);
              setEditingCalendarId(id);
              setActiveSidebarItem('Editor de calendario');
            }} />}
            {activeSidebarItem === 'Mis calendarios' && <MyCalendars onViewSubscribers={(calId) => { setSelectedCalendarIdForList(calId); setActiveSidebarItem('Lista de Citas'); }} onEdit={(id, title) => { setEditingCalendarId(id); setEditingCalendarTitle(title); setActiveSidebarItem('Editor de calendario'); }} onNewCalendar={() => setActiveSidebarItem('Nuevo calendario')} />}
            {activeSidebarItem === 'Editor de calendario' && <CalendarEditor calendarId={editingCalendarId} calendarTitle={editingCalendarTitle} onBack={() => setActiveSidebarItem('Mis calendarios')} />}
          </div>
       </div>
    );
  };

  // Mobile content — each view has its own large title header
  const renderMobileContent = () => (
    <div
      className="px-4"
      style={{
        paddingTop: isDetailView
          ? 0
          : 'calc(env(safe-area-inset-top, 0px) + 0.75rem)',
      }}
    >
      {activeSidebarItem === 'Escritorio' && (
        <Escritorio activeActivityTab={activeActivityTab} setActiveActivityTab={setActiveActivityTab} onViewAll={() => setActiveSidebarItem('Lista de Citas')} />
      )}
      {activeSidebarItem === 'Nuevo calendario' && (
        <NewCalendar onBack={() => setActiveSidebarItem('Escritorio')} onCreate={(title, type, id) => {
          setEditingCalendarTitle(title);
          setEditingCalendarId(id);
          setActiveSidebarItem('Editor de calendario');
        }} />
      )}
      {activeSidebarItem === 'Mis calendarios' && (
        <MyCalendars
          onViewSubscribers={(calId) => { setSelectedCalendarIdForList(calId); setActiveSidebarItem('Lista de Citas'); }}
          onEdit={(id, title) => { setEditingCalendarId(id); setEditingCalendarTitle(title); setActiveSidebarItem('Editor de calendario'); }}
          onNewCalendar={() => setActiveSidebarItem('Nuevo calendario')}
        />
      )}
      {activeSidebarItem === 'Editor de calendario' && (
        <CalendarEditor calendarId={editingCalendarId} calendarTitle={editingCalendarTitle} onBack={() => setActiveSidebarItem('Mis calendarios')} />
      )}
      {activeSidebarItem === 'Lista de Citas' && (
        <AppointmentsView calendarFilter={selectedCalendarIdForList} setCalendarFilter={setSelectedCalendarIdForList} />
      )}
      {activeSidebarItem === 'Ajustes' && <Ajustes />}
      {activeSidebarItem === 'Perfil' && <ProfileView />}
      {activeSidebarItem === 'Configuración de Pagos' && <PaymentConfigsView />}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f5f5f7] text-slate-800 font-sans overflow-hidden selection:bg-slate-200 selection:text-black">
      {/* Sidebar (desktop only) */}
      {!isMobileApp && (
        <div className="h-full">
           <Sidebar
             activeSidebarItem={activeSidebarItem}
             setActiveSidebarItem={setActiveSidebarItem}
             isCollapsed={isSidebarCollapsed}
             onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
           />
        </div>
      )}

      {/* Main content */}
      <main className={`flex-1 flex flex-col overflow-y-auto w-full no-scrollbar ${isMobileApp && !isDetailView ? 'pb-safe-nav' : isMobileApp ? 'pb-6' : ''}`}>
         {isMobileApp ? (
           <>
             {renderMobileHeader()}
             {renderMobileContent()}
           </>
         ) : (
           <>
             {renderTopBar()}
             {renderContent()}
           </>
         )}
      </main>

      {/* Bottom tab bar (mobile only, hidden on detail views) */}
      {isMobileApp && !isDetailView && (
        <MobileTabBar
          activeSidebarItem={activeSidebarItem}
          setActiveSidebarItem={setActiveSidebarItem}
        />
      )}

      {/* Notifications Sheet */}
      <Sheet isOpen={showNotifications} onClose={() => setShowNotifications(false)} maxWidthClass="max-w-md" zIndex={80}>
        <div className="bg-white flex flex-col h-[85vh] lg:h-[80vh]">
          {/* Header */}
          <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4.5 h-4.5 text-slate-900" />
                Centro de Notificaciones
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {unreadCount === 0 ? 'Sin notificaciones nuevas' : `${unreadCount} sin leer`}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-slate-700 font-bold hover:text-black cursor-pointer flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todo leído
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {notifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4 border border-slate-200/50">
                  <Inbox className="w-7 h-7" />
                </div>
                <h4 className="text-slate-800 font-bold text-[15px]">No tienes notificaciones</h4>
                <p className="text-slate-400 text-xs mt-1 max-w-[200px] leading-relaxed">Las citas reservadas por tus clientes aparecerán aquí.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id, notif.read)}
                  className={`p-4 rounded-2xl border transition-all relative flex gap-3 cursor-pointer group ${
                    notif.read
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/50 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute left-2.5 top-5.5 w-2 h-2 rounded-full bg-black animate-pulse" />
                  )}

                  <div className="flex-1 min-w-0 pl-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-[13px] text-slate-800 truncate">
                        {notif.client}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/30 uppercase tracking-wider">
                        Nueva Cita
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-bold mt-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {notif.calendarName}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-[11px] font-semibold text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {notif.day} {notif.month} - {notif.time}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notif.id);
                      }}
                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center shadow-sm cursor-pointer opacity-80 lg:opacity-0 lg:group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white flex justify-end">
            <button
              onClick={() => setShowNotifications(false)}
              className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};

export default Dashboard;
