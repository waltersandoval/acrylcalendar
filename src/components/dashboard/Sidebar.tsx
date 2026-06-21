/**
 * COMPONENTE SIDEBAR
 * Navegación lateral principal que se utiliza para moverse entre las diferentes
 * secciones administrativas del sistema de citas y calendarios.
 */

import React from 'react';
import { HelpCircle, Settings as SettingsIcon, Menu } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { sidebarItems } from './data';

interface SidebarProps {
  activeSidebarItem: string;
  setActiveSidebarItem: (item: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSidebarItem, setActiveSidebarItem, isCollapsed = false, onToggleCollapse }) => {
  const { user } = useAuth();
  const profileActive = activeSidebarItem === 'Perfil';
  const displayName = user?.displayName || 'Usuario';
  const displayEmail = user?.email || 'Perfil';
  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} srf-window flex flex-col justify-between h-full pt-3 transition-all duration-300 ease-spring relative`} style={{ borderRight: '1px solid var(--hairline)' }}>
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
        {/* Marca / "semáforo" macOS */}
        <div className={`px-4 py-3.5 flex items-center mb-1 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[11px] flex items-center justify-center accent-fill font-extrabold shadow-md shadow-black/15">A</div>
              <span className="font-bold text-[18px] tracking-tight ink-1 font-display">Acryl Calendar</span>
            </div>
          )}
          {onToggleCollapse && !isCollapsed && (
            <button onClick={onToggleCollapse} className="ink-3 hover:ink-1 p-1.5 rounded-lg transition-colors cursor-pointer" style={{ background: 'transparent' }} title="Cerrar barra lateral">
               <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {onToggleCollapse && isCollapsed && (
          <div
            className="px-4 mb-3 mt-1 flex justify-center group relative cursor-pointer"
            onClick={onToggleCollapse}
            title="Expandir barra lateral"
          >
            <div className="w-9 h-9 absolute rounded-[11px] flex items-center justify-center text-white font-extrabold shadow-md shadow-black/15 transition-opacity duration-200 group-hover:opacity-0" style={{ background: 'linear-gradient(140deg, var(--accent), var(--accent-strong))' }}>A</div>
            <div className="w-9 h-9 absolute ink-3 rounded-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100" style={{ background: 'color-mix(in srgb, rgb(var(--glass-hairline)) 8%, transparent)' }}>
              <Menu className="w-5 h-5" />
            </div>
            {/* invisible spacer: */}
            <div className="w-9 h-9"></div>
          </div>
        )}

        {!isCollapsed && (
          <p className="px-5 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.13em] ink-3">Menú</p>
        )}
        <nav className="flex-1 px-3 space-y-0.5">
          {sidebarItems.map((item) => {
            const isActive = activeSidebarItem === item.name;
            return (
              <button
                key={item.name}
                title={isCollapsed ? item.name : undefined}
                onClick={() => setActiveSidebarItem(item.name)}
                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-[11px] transition-all duration-200 ease-spring cursor-pointer ${isCollapsed ? 'justify-center' : 'gap-3'} ${
                  isActive
                    ? 'glass-card ink-1 font-semibold'
                    : 'ink-2 font-medium border border-transparent hover:bg-[color-mix(in_srgb,rgb(var(--glass-hairline))_6%,transparent)]'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'ink-1' : 'ink-3'}`} strokeWidth={isActive ? 2.4 : 2} />
                {!isCollapsed && <span>{item.name}</span>}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="p-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--hairline)' }}>
        <button
          title={isCollapsed ? 'Ayuda' : undefined}
          className={`flex items-center text-sm font-medium ink-2 rounded-[11px] cursor-pointer transition-all duration-200 w-full border border-transparent hover:bg-[color-mix(in_srgb,rgb(var(--glass-hairline))_6%,transparent)] ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}`}
        >
          <HelpCircle className="w-5 h-5 ink-3" />
          {!isCollapsed && <span>Ayuda y Soporte</span>}
        </button>

        {/* User Profile / Ajustes toggle */}
        <div className={`mt-1 flex items-center rounded-[13px] p-2 transition-all duration-200 ${
          profileActive ? 'glass-card' : 'srf-raised border border-[color-mix(in_srgb,rgb(var(--glass-hairline))_9%,transparent)] hover:brightness-[0.99]'
        } ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-3'}`}>
          <button
          type="button"
          title={isCollapsed ? 'Perfil' : undefined}
          onClick={() => setActiveSidebarItem('Perfil')}
          className={`flex items-center min-w-0 flex-1 rounded-lg cursor-pointer ${isCollapsed ? 'justify-center' : 'gap-3 text-left'}`}
        >
             {user?.photoURL ? (
               <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: '1px solid var(--hairline)' }} />
             ) : (
               <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: profileActive ? 'var(--btn-bg)' : 'color-mix(in srgb, rgb(var(--glass-hairline)) 22%, transparent)', color: profileActive ? 'var(--btn-fg)' : 'var(--ink-1)' }}>
                 {initial}
               </div>
             )}
             {!isCollapsed && (
               <div className="flex flex-col text-left min-w-0">
                 <span className="text-sm font-bold tracking-tight leading-tight truncate ink-1">{displayName}</span>
                 <span className="text-[11px] font-medium ink-3 truncate">{displayEmail}</span>
               </div>
             )}
           </button>

           <button
             onClick={(event) => {
               event.stopPropagation();
               setActiveSidebarItem('Ajustes');
             }}
             title="Ajustes"
             className={`shrink-0 rounded-lg transition-colors cursor-pointer ink-3 hover:ink-1 hover:bg-[color-mix(in_srgb,rgb(var(--glass-hairline))_8%,transparent)] ${isCollapsed ? 'p-1.5' : 'p-2'}`}
           >
             <SettingsIcon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
           </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
