import { useEffect, useState } from 'react';
import { isMobileDevice } from '../lib/device';

/**
 * Hook reactivo a media queries. SSR-safe.
 * Ej: const isMobile = useMediaQuery('(max-width: 1023px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** Atajo: true en viewports < lg (1024px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}

/**
 * true SOLO en dispositivos móviles/tablets (no en escritorio, aunque achiquen
 * la ventana). Es el criterio para mostrar la UI tipo app nativa (menú inferior,
 * bottom sheets, header de título grande). En escritorio siempre es false → se
 * ve el diseño completo de escritorio.
 */
export function useIsMobileApp(): boolean {
  const [v] = useState(() => {
    // Solo en desarrollo: permite forzar la UI móvil en escritorio para verificarla
    // (localStorage.setItem('forceMobileUI','1')). No afecta producción.
    if (import.meta.env.DEV && typeof localStorage !== 'undefined' && localStorage.getItem('forceMobileUI') === '1') {
      return true;
    }
    return isMobileDevice();
  });
  return v;
}
