import { isMobileDevice } from './device';

/**
 * Restringe la PWA a dispositivos móviles/tablets.
 *
 * En computadoras de escritorio: elimina el <link rel="manifest"> (el que
 * inyecta vite-plugin-pwa) e impide el prompt de instalación, de modo que el
 * navegador NO ofrezca "instalar la app" — se comporta como un sitio web normal.
 *
 * En móviles: no hace nada (la app sigue siendo instalable; el manifest del
 * cliente para /booking se gestiona en useDynamicManifest).
 *
 * Debe llamarse lo antes posible (en main.tsx, antes de renderizar).
 */
export function gatePwaForDevice(): void {
  if (typeof document === 'undefined') return;
  if (isMobileDevice()) return;

  // Escritorio: quitar manifest(s) para que no sea instalable.
  document.querySelectorAll('link[rel="manifest"]').forEach((l) => l.remove());

  // Bloquear el prompt de instalación por si el navegador lo dispara.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
  });
}
