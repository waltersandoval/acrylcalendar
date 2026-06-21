import { useEffect } from 'react';
import { isMobileDevice } from '../lib/device';

/**
 * En rutas /booking/* sustituye el <link rel="manifest"> (el que inyecta
 * vite-plugin-pwa para el admin) por un manifest generado en memoria para la
 * PWA del CLIENTE ("Reservar cita"), con su propio nombre, íconos y start_url
 * apuntando a la reserva actual. Así admin y cliente se instalan como dos apps
 * separadas desde el mismo origen.
 *
 * En rutas admin no hace nada: deja el manifest estático.
 *
 * CORRECCIÓN: start_url y scope DEBEN ser URLs absolutas (con origin completo)
 * para que el navegador las valide correctamente. Las URLs relativas causan el
 * warning "property 'start_url'/'scope' ignored, URL is invalid".
 */
export function useDynamicManifest(): void {
  useEffect(() => {
    // En escritorio no se instala como app (lo gestiona gatePwaForDevice).
    if (!isMobileDevice()) return;

    const path = window.location.pathname;
    if (!path.startsWith('/booking/')) return;

    // origin incluye protocolo + dominio + puerto: ej. "https://mi-app.vercel.app"
    const origin = window.location.origin;

    // start_url y scope DEBEN ser URLs absolutas para pasar la validación del navegador.
    const startUrl = `${origin}${path}${window.location.search}`;
    const scopeUrl = `${origin}/booking/`;

    const manifest = {
      id: `${origin}/booking?app=cliente`,
      name: 'Reservar cita',
      short_name: 'Reservar',
      description: 'Agenda tu cita en línea.',
      start_url: startUrl,
      scope: scopeUrl,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#6366f1',
      lang: 'es',
      icons: [
        { src: `${origin}/icons/client-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${origin}/icons/client-512.png`, sizes: '512x512', type: 'image/png' },
        {
          src: `${origin}/icons/client-512-maskable.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    const blobUrl = URL.createObjectURL(blob);

    // Reutiliza el <link rel="manifest"> existente o crea uno.
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousHref = link?.getAttribute('href') ?? null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.setAttribute('href', blobUrl);

    // theme-color y apple-touch-icon específicos del cliente.
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute('content') ?? null;
    themeMeta?.setAttribute('content', '#6366f1');

    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const previousApple = appleIcon?.getAttribute('href') ?? null;
    appleIcon?.setAttribute('href', '/icons/client-apple-touch-icon.png');

    const appleTitle = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-title"]',
    );
    const previousAppleTitle = appleTitle?.getAttribute('content') ?? null;
    appleTitle?.setAttribute('content', 'Reservar cita');

    return () => {
      URL.revokeObjectURL(blobUrl);
      if (previousHref) link?.setAttribute('href', previousHref);
      if (previousTheme) themeMeta?.setAttribute('content', previousTheme);
      if (previousApple) appleIcon?.setAttribute('href', previousApple);
      if (previousAppleTitle) appleTitle?.setAttribute('content', previousAppleTitle);
    };
  }, []);
}
