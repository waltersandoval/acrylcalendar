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
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#f5f5f7] border-r border-slate-200/50 flex flex-col justify-between h-full pt-4 transition-all duration-300`}>
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
        <div className={`px-4 py-4 flex items-center mb-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center text-white font-bold shadow-sm shadow-black/10">A</div>
              <span className="font-bold text-[19px] tracking-tight text-slate-900">Acryl Calendar</span>
            </div>
          )}
          {onToggleCollapse && !isCollapsed && (
            <button onClick={onToggleCollapse} className="text-slate-400 hover:text-slate-700 bg-transparent hover:bg-slate-200/50 p-1.5 rounded-lg transition-colors cursor-pointer" title="Cerrar barra lateral">
               <Menu className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {onToggleCollapse && isCollapsed && (
          <div 
            className="px-4 mb-4 mt-2 flex justify-center group relative cursor-pointer" 
            onClick={onToggleCollapse}
            title="Expandir barra lateral"
          >
            <div className="w-9 h-9 absolute bg-black rounded-xl flex items-center justify-center text-white font-bold shadow-sm shadow-black/10 transition-opacity duration-200 group-hover:opacity-0">A</div>
            <div className="w-9 h-9 absolute text-slate-500 bg-transparent rounded-lg flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:bg-slate-200/60">
              <Menu className="w-5 h-5" />
            </div>
            {/* invisible spacer: */}
            <div className="w-9 h-9"></div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = activeSidebarItem === item.name;
            return (
              <button
                key={item.name}
                title={isCollapsed ? item.name : undefined}
                onClick={() => setActiveSidebarItem(item.name)}
                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-xl transition-all duration-200 cursor-pointer ${isCollapsed ? 'justify-center' : 'gap-3'} ${
                  isActive
                    ? 'bg-white shadow-sm border border-slate-200/60 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 font-medium border border-transparent'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-slate-900 font-bold' : 'text-slate-400'}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-200/50 bg-[#f5f5f7] flex flex-col gap-2">
        <button 
          title={isCollapsed ? 'Ayuda' : undefined}
          className={`flex items-center text-sm font-medium text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 rounded-xl cursor-pointer transition-all duration-200 w-full border border-transparent ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}`}
        >
          <HelpCircle className="w-5 h-5 text-slate-400" />
          {!isCollapsed && <span>Ayuda y Soporte</span>}
        </button>

        {/* User Profile / Ajustes toggle */}
        <div className={`mt-2 flex items-center rounded-xl p-2 border transition-all duration-200 ${
          profileActive
            ? 'bg-white shadow-sm border-slate-200/60'
            : 'bg-slate-200/30 border-slate-200/60 hover:bg-slate-200/50'
        } ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-3'}`}>
          <button
          type="button"
          title={isCollapsed ? 'Perfil' : undefined}
          onClick={() => setActiveSidebarItem('Perfil')}
          className={`flex items-center min-w-0 flex-1 rounded-lg cursor-pointer ${isCollapsed ? 'justify-center' : 'gap-3 text-left'}`}
        >
             {user?.photoURL ? (
               <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
             ) : (
               <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                 profileActive ? 'bg-black text-white' : 'bg-slate-200 text-slate-700'
               }`}>
                 {initial}
               </div>
             )}
             {!isCollapsed && (
               <div className="flex flex-col text-left min-w-0">
                 <span className={`text-sm font-bold tracking-tight leading-tight truncate ${profileActive ? 'text-black' : 'text-slate-800'}`}>{displayName}</span>
                 <span className="text-[11px] font-medium text-slate-500 truncate">{displayEmail}</span>
               </div>
             )}
           </button>
           
           <button 
             onClick={(event) => {
               event.stopPropagation();
               setActiveSidebarItem('Ajustes');
             }}
             title="Ajustes"
             className={`shrink-0 hover:bg-slate-300/50 rounded-lg transition-colors cursor-pointer text-slate-500 hover:text-slate-800 ${isCollapsed ? 'p-1.5' : 'p-2'}`}
           >
             <SettingsIcon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
           </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
