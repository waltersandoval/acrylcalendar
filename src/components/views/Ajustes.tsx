import React, { useState } from 'react';
import { Users, Blocks, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import Administrators from './Administrators';
import Integrations from './Integrations';
import Settings from './Settings';
import { useIsMobileApp } from '../../hooks/useMediaQuery';

type TabKey = 'configuraciones' | 'administradores' | 'integraciones';

const Ajustes: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
  const isMobileApp = useIsMobileApp();
  const [activeTab, setActiveTab] = useState<TabKey>('configuraciones');

  const tabs: { key: TabKey; label: string; icon: any; description: string }[] = [
    { key: 'configuraciones', label: 'Configuraciones', icon: SettingsIcon, description: 'Preferencias generales' },
    { key: 'administradores', label: 'Administradores', icon: Users, description: 'Gestión de accesos' },
    { key: 'integraciones', label: 'Integraciones', icon: Blocks, description: 'Servicios externos' },
  ];

  const content = (
    <>
      {activeTab === 'configuraciones' && <Settings embedded={embedded} />}
      {activeTab === 'administradores' && <Administrators />}
      {activeTab === 'integraciones' && <Integrations />}
    </>
  );

  // ─── MÓVIL ────────────────────────────────────────────────────────────────
  if (isMobileApp) {
    return (
      <div className={`flex flex-col ${embedded ? '' : 'pt-1 pb-4'}`}>
        {/* Header (hidden when embedded in Profile) */}
        {!embedded && (
          <div className="mb-5">
            <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-tight ink-1 font-display">Ajustes</h1>
            <p className="ink-3 font-medium text-[14px] mt-0.5">Preferencias, integraciones y accesos</p>
          </div>
        )}

        {/* iOS-style grouped navigation list (when no active detail) OR back to main sections */}
        {/* Tab selector as grouped list rows */}
        {!embedded && (
          <div className="srf-panel rounded-2xl border hairline shadow-sm divide-y divide-slate-100 overflow-hidden mb-5">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${active ? 'srf-sunken' : 'srf-panel active:srf-sunken'}`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? 'accent-bg text-white' : 'srf-sunken ink-2'}`}>
                    <t.icon className="w-[18px] h-[18px]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-[15px] ${active ? 'ink-1' : 'ink-1'}`}>{t.label}</p>
                    <p className="text-[12px] ink-3 font-medium">{t.description}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${active ? 'text-black' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* Tabs en tarjeta (solo cuando va embebido en el Perfil) */}
        {embedded && (
          <div className="srf-panel rounded-2xl border hairline shadow-sm p-1.5 flex items-center mb-4 overflow-x-auto no-scrollbar">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 min-w-max flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[13px] font-bold transition-all duration-200 ${active ? 'srf-sunken text-black' : 'ink-3'}`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        <div>{content}</div>
      </div>
    );
  }

  // ─── ESCRITORIO ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full srf-panel r-window border hairline shadow-sm overflow-hidden">
      <div className="border-b hairline px-6 py-4 glass-strong">
        <h2 className="text-2xl font-bold ink-1 tracking-tight">Ajustes del Sistema</h2>
        <p className="ink-3 text-sm mt-1">Configura preferencias, integraciones y accesos</p>
      </div>

      <div className="flex border-b hairline px-6 gap-6 srf-sunken">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 py-4 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === t.key ? 'border-black text-black' : 'border-transparent ink-3 hover:ink-1'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-6 relative min-h-[500px]">
        {content}
      </div>
    </div>
  );
};

export default Ajustes;
