/**
 * MOBILE TAB BAR — iOS-style bottom navigation
 * 5 destinos: Inicio · Calendarios · Nuevo (FAB central) · Citas · Perfil
 * Diseño Liquid Glass con indicador de pestaña activa animado.
 */
import React from 'react';
import { motion } from 'motion/react';
import { Home, Calendar as CalendarIcon, Plus, List, User as UserIcon } from 'lucide-react';

interface MobileTabBarProps {
  activeSidebarItem: string;
  setActiveSidebarItem: (item: string) => void;
}

const sideTabs = [
  { name: 'Escritorio',    label: 'Inicio',      icon: Home },
  { name: 'Mis calendarios', label: 'Calendarios', icon: CalendarIcon },
];
const sideTabsRight = [
  { name: 'Lista de Citas', label: 'Citas',   icon: List },
  { name: 'Perfil',         label: 'Perfil',  icon: UserIcon },
];

const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeSidebarItem, setActiveSidebarItem }) => {
  const effectiveActive =
    activeSidebarItem === 'Editor de calendario' ? 'Mis calendarios' : activeSidebarItem;

  const renderTab = (tab: { name: string; label: string; icon: any }) => {
    const isActive = effectiveActive === tab.name;
    return (
      <li key={tab.name} className="flex-1">
        <button
          type="button"
          onClick={() => setActiveSidebarItem(tab.name)}
          aria-current={isActive ? 'page' : undefined}
          className="relative w-full flex flex-col items-center gap-0.5 py-2 select-none"
        >
          {isActive && (
            <motion.span
              layoutId="tabbar-pill"
              className="absolute inset-x-1 inset-y-0.5 bg-slate-950/8 rounded-2xl"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <tab.icon
            className={`relative w-[23px] h-[23px] transition-all duration-200 ${isActive ? 'text-slate-950' : 'ink-3'}`}
            strokeWidth={isActive ? 2.5 : 1.8}
          />
          <span
            className={`relative text-[10px] font-semibold tracking-tight transition-colors duration-200 ${isActive ? 'text-slate-950' : 'ink-3'}`}
          >
            {tab.label}
          </span>
        </button>
      </li>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 glass-nav pb-safe">
      <ul className="flex items-end justify-around px-2 pt-1.5">
        {sideTabs.map(renderTab)}

        {/* FAB central — Nuevo */}
        <li className="flex-1">
          <div className="flex flex-col items-center -mt-5">
            <motion.button
              type="button"
              onClick={() => setActiveSidebarItem('Nuevo calendario')}
              whileTap={{ scale: 0.9 }}
              className="w-[52px] h-[52px] rounded-full accent-bg text-white flex items-center justify-center shadow-xl shadow-black/20 border-[3px] border-[#f5f5f7] active:opacity-80"
              aria-label="Nuevo calendario"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </motion.button>
            <span className="text-[10px] font-semibold tracking-tight ink-3 mt-1">Nuevo</span>
          </div>
        </li>

        {sideTabsRight.map(renderTab)}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
