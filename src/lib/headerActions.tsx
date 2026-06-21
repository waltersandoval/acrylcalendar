/**
 * SLOT DE ACCIONES DEL HEADER (reutilizable y consistente)
 *
 * Permite que cualquier sección publique sus botones de acción primarios en el
 * header flotante principal (junto al icono de notificaciones), en vez de tener
 * cada sección su propio contenedor/botón en posiciones distintas.
 *
 * Objetivo: una sola ubicación para las acciones (guardar, crear, etc.) que NO
 * cambia de posición al cambiar de sección -> la interfaz se siente uniforme.
 *
 * Uso en una vista:
 *   useHeaderActions([{ label: 'Guardar', onClick: save, variant: 'primary' }], [deps]);
 *
 * El slot se limpia automáticamente al desmontar la vista.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface HeaderAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

interface HeaderActionsCtx {
  actions: HeaderAction[];
  setActions: (a: HeaderAction[]) => void;
}

const Ctx = createContext<HeaderActionsCtx>({ actions: [], setActions: () => {} });

export const HeaderActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<HeaderAction[]>([]);
  return <Ctx.Provider value={{ actions, setActions }}>{children}</Ctx.Provider>;
};

/**
 * Publica las acciones de la sección en el header. `deps` controla cuándo se
 * recalculan (igual que un useEffect). Se limpia al desmontar.
 */
export function useHeaderActions(actions: HeaderAction[], deps: any[] = []) {
  const { setActions } = useContext(Ctx);
  useEffect(() => {
    setActions(actions);
    return () => setActions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Render de las acciones publicadas. Se coloca en el header flotante. */
export const HeaderActionsSlot: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { actions } = useContext(Ctx);
  if (!actions.length) return null;
  return (
    <div className="flex items-center gap-2">
      {actions.map((a, i) => {
        const primary = a.variant !== 'ghost';
        return (
          <button
            key={i}
            onClick={a.onClick}
            disabled={a.disabled || a.loading}
            className={`flex items-center gap-2 rounded-[11px] font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
              compact ? 'h-9 px-3.5 text-[13px]' : 'h-10 px-4 text-[13px]'
            } ${
              primary
                ? 'accent-fill hover:brightness-110 shadow-sm'
                : 'srf-raised ink-1 hover:brightness-95'
            }`}
            style={primary ? undefined : { border: '1px solid var(--hairline)' }}
          >
            {a.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : a.icon}
            {!compact && a.label}
            {compact && a.label && <span className="hidden sm:inline">{a.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
