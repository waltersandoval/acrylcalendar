/**
 * SHEET — Contenedor de modal adaptable.
 * - Móvil (< lg): "bottom sheet" que sube desde abajo, con grab handle,
 *   arrastrar-para-cerrar, esquinas superiores redondeadas y safe-area.
 * - Desktop (>= lg): diálogo centrado con scale/fade.
 *
 * El panel ya aporta el fondo blanco y el redondeo: el contenido hijo solo
 * debe traer su propio padding/secciones (cabecera, cuerpo, footer).
 */
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useIsMobileApp } from '../../hooks/useMediaQuery';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Ancho máx. del diálogo en desktop. Default: max-w-lg */
  maxWidthClass?: string;
  /** z-index base (backdrop). El panel usa este +1. Default: 60 */
  zIndex?: number;
}

const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-lg',
  zIndex = 100,
}) => {
  // Por DISPOSITIVO: en escritorio siempre diálogo centrado (no bottom sheet).
  const isMobile = useIsMobileApp();

  // Elevate default/passed zIndex to ensure modals display above all layout elements,
  // while preserving stacked sheet order (e.g. nested confirmation sheets).
  const resolvedZIndex = zIndex < 100 ? zIndex + 100 : zIndex;

  // Bloqueo de scroll del body mientras está abierto (compatible con iOS/Safari y otros navegadores).
  useEffect(() => {
    if (!isOpen) return;
    
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    // Bloqueo estándar para desktop/android
    document.body.style.overflow = 'hidden';

    // Bloqueo específico para dispositivos con touch (iOS / Android) para evitar scroll chaining
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (isTouch) {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      if (isTouch) {
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        // Restaurar la posición original de scroll
        window.scrollTo(0, scrollY);
      }
    };
  }, [isOpen]);

  // Cerrar con Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const panelVariants = isMobile
    ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }
    : { initial: { opacity: 0, scale: 0.96, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 8 } };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0" style={{ zIndex: resolvedZIndex }} aria-modal="true" role="dialog">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Centrado: abajo en móvil, centro en desktop */}
          <div
            className={`absolute inset-0 flex justify-center pointer-events-none ${
              isMobile ? 'items-end' : 'items-center p-4'
            }`}
            style={{ zIndex: resolvedZIndex + 1 }}
          >
            <motion.div
              className={`pointer-events-auto w-full ${maxWidthClass} bg-white shadow-2xl flex flex-col overflow-hidden ${
                isMobile ? 'max-h-[92vh] rounded-t-[1.75rem]' : 'max-h-[88vh] rounded-3xl'
              }`}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              drag={isMobile ? 'y' : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 120 || info.velocity.y > 600) onClose();
              }}
            >
              {/* Grab handle (solo móvil) */}
              {isMobile && (
                <div className="pt-2.5 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing">
                  <div className="w-10 h-1.5 rounded-full bg-slate-300" />
                </div>
              )}

              {/* Cuerpo desplazable */}
              <div className="flex-1 overflow-y-auto no-scrollbar overscroll-contain pb-safe">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Sheet;
