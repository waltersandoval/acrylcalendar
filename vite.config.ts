import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Habilitamos la PWA también en `npm run dev` para poder probar instalación.
        devOptions: {enabled: true},
        includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon.png'],
        // Manifest del ADMIN (estático). El manifest del CLIENTE se inyecta en
        // runtime en rutas /booking/* (ver src/hooks/useDynamicManifest.ts).
        manifest: {
          id: '/?app=admin',
          name: 'Acryl Calendar',
          short_name: 'Acryl',
          description: 'Panel de administración de calendarios y citas.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f5f5f7',
          theme_color: '#2563eb',
          lang: 'es',
          icons: [
            {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png'},
            {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png'},
            {
              src: '/icons/icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          // OJO: NO precacheamos `**/*.html`. Workbox guardaba la respuesta de
          // `index.html` junto con sus headers HTTP (incluido el CSP). Como el
          // CSP se define en `vercel.json` y no cambia el contenido del HTML, el
          // service worker servía indefinidamente una copia vieja con un CSP
          // desactualizado (rompía el iframe de vista previa). Sirviendo las
          // navegaciones con NetworkFirst, el documento (y sus headers) se
          // traen siempre frescos del servidor; la caché es solo respaldo offline.
          globPatterns: ['**/*.{js,css,png,svg,woff2}'],
          // Sin `navigateFallback`: como el `index.html` ya no está precacheado,
          // un fallback de navegación a 'index.html' lanzaba `non-precached-url`.
          // Las navegaciones se resuelven con la ruta NetworkFirst de abajo
          // (online → red fresca; offline → caché de respaldo).
          navigateFallback: null as any,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Documento principal siempre fresco desde la red para que los
              // headers de seguridad (CSP, X-Frame-Options) no se queden viejos.
              // `/booking/*` se excluye (lo sirve la red directamente, como antes
              // con el navigateFallbackDenylist).
              urlPattern: ({request, url}) =>
                request.mode === 'navigate' && !url.pathname.startsWith('/booking/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-shell',
                expiration: {maxEntries: 10, maxAgeSeconds: 60 * 60 * 24},
                cacheableResponse: {statuses: [200]},
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      // Evita "Invalid hook call" por copias duplicadas de React.
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['motion/react'],
    },
    server: {
      // Permite desactivar HMR en entornos donde el watcher consume demasiados recursos.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
