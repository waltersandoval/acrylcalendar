import React from 'react';
import {
  Bell, Bot, Calendar, CalendarClock, ChevronLeft, CircleDollarSign, Clock, FileText,
  FolderKanban, Globe2, HelpCircle, Image, Info, Menu, Send,
  Settings as SettingsIcon, Shapes, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { sidebarItems } from './data';

interface SidebarProps {
  activeSidebarItem: string;
  setActiveSidebarItem: (item: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  editorMode?: boolean;
  editorSection?: string;
  onEditorSectionChange?: (section: string) => void;
  onEditorBack?: () => void;
}

const editorItems = [
  { id: 'BASIC', name: 'Información general', icon: Info },
  { id: 'DESIGN', name: 'Diseño visual', icon: Image },
  { id: 'SCHEDULING', name: 'Horarios', icon: Clock },
  { id: 'AVAILABILITY', name: 'Meses y disponibilidad', icon: Calendar },
  { id: 'SERVICES', name: 'Servicios', icon: Shapes },
  { id: 'GROUPS', name: 'Grupos', icon: FolderKanban },
  { id: 'FORMS', name: 'Formularios', icon: FileText },
  { id: 'COMMS', name: 'Comunicaciones', icon: Bell },
  { id: 'AUTO', name: 'Automatizaciones', icon: Bot },
  { id: 'MARKETING', name: 'Marketing y Listas', icon: Send },
  { id: 'SOCIAL_PROOF', name: 'Prueba social', icon: Sparkles },
  { id: 'PAYMENT', name: 'Pagos', icon: CircleDollarSign },
  { id: 'DOMAIN', name: 'Dominio y URL', icon: Globe2 },
] as const;

const Sidebar: React.FC<SidebarProps> = ({
  activeSidebarItem,
  setActiveSidebarItem,
  isCollapsed = false,
  onToggleCollapse,
  editorMode = false,
  editorSection = 'BASIC',
  onEditorSectionChange,
  onEditorBack,
}) => {
  const { user } = useAuth();
  const profileActive = activeSidebarItem === 'Perfil';
  const displayName = user?.displayName || 'Usuario';
  const displayEmail = user?.email || 'Perfil';
  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  const navigationItems = editorMode ? editorItems : sidebarItems;

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} srf-window flex flex-col justify-between h-full pt-3 transition-all duration-300 ease-spring relative`} style={{ borderRight: '1px solid var(--hairline)' }}>
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
        <div className={`px-4 py-3.5 flex items-center mb-1 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[11px] flex items-center justify-center accent-fill font-extrabold shadow-md shadow-black/15">A</div>
              <div className="min-w-0">
                <span className="block font-bold text-[18px] tracking-tight ink-1 font-display truncate">Acryl Calendar</span>
                {editorMode && <span className="block text-[10px] font-bold uppercase tracking-[0.12em] ink-3">Editor visual</span>}
              </div>
            </div>
          )}
          {onToggleCollapse && !isCollapsed && !editorMode && (
            <button type="button" onClick={onToggleCollapse} className="ink-3 hover:ink-1 p-1.5 rounded-lg transition-colors cursor-pointer" title="Cerrar barra lateral"><Menu className="w-5 h-5" /></button>
          )}
        </div>

        {onToggleCollapse && isCollapsed && !editorMode && (
          <button type="button" className="px-4 mb-3 mt-1 flex justify-center group cursor-pointer" onClick={onToggleCollapse} title="Expandir barra lateral">
            <span className="w-9 h-9 rounded-[11px] flex items-center justify-center accent-fill font-extrabold shadow-md">A</span>
          </button>
        )}

        {editorMode && !isCollapsed && onEditorBack && (
          <button
            type="button"
            onClick={onEditorBack}
            className="mx-3 mb-2 flex items-center gap-2 px-3 py-2.5 rounded-[11px] srf-raised border hairline ink-1 font-bold text-sm hover:brightness-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Volver
          </button>
        )}
        {!isCollapsed && <p className="px-5 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.13em] ink-3">{editorMode ? 'Configuración' : 'Menú'}</p>}
        <nav className="flex-1 px-3 space-y-0.5" aria-label={editorMode ? 'Configuración del calendario' : 'Menú principal'}>
          {navigationItems.map((item) => {
            const itemId = 'id' in item ? item.id : item.name;
            const isActive = editorMode ? editorSection === itemId : activeSidebarItem === item.name;
            return (
              <button
                type="button"
                key={itemId}
                title={isCollapsed ? item.name : undefined}
                onClick={() => editorMode ? onEditorSectionChange?.(itemId) : setActiveSidebarItem(item.name)}
                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-[11px] transition-all duration-200 cursor-pointer ${isCollapsed ? 'justify-center' : 'gap-3'} ${isActive ? 'glass-card ink-1 font-semibold' : 'ink-2 font-medium border border-transparent hover:bg-slate-200/60'}`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'ink-1' : 'ink-3'}`} strokeWidth={isActive ? 2.4 : 2} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {!editorMode && (
        <div className="p-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--hairline)' }}>
          <button type="button" title={isCollapsed ? 'Ayuda' : undefined} className={`flex items-center text-sm font-medium ink-2 rounded-[11px] cursor-pointer transition-all w-full hover:bg-slate-200/60 ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}`}>
            <HelpCircle className="w-5 h-5 ink-3" />{!isCollapsed && <span>Ayuda y soporte</span>}
          </button>
          <div className={`mt-1 flex items-center rounded-[13px] p-2 ${profileActive ? 'glass-card' : 'srf-raised border hairline'} ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-3'}`}>
            <button type="button" title={isCollapsed ? 'Perfil' : undefined} onClick={() => setActiveSidebarItem('Perfil')} className={`flex items-center min-w-0 flex-1 rounded-lg cursor-pointer ${isCollapsed ? 'justify-center' : 'gap-3 text-left'}`}>
              {user?.photoURL ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" /> : <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 srf-sunken ink-1">{initial}</span>}
              {!isCollapsed && <span className="flex flex-col min-w-0"><span className="text-sm font-bold truncate ink-1">{displayName}</span><span className="text-[11px] ink-3 truncate">{displayEmail}</span></span>}
            </button>
            <button type="button" onClick={() => setActiveSidebarItem('Ajustes')} title="Ajustes" className="shrink-0 rounded-lg cursor-pointer ink-3 hover:ink-1 p-2"><SettingsIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
