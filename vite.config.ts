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
          globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
          navigateFallbackDenylist: [/^\/booking\//],
          cleanupOutdatedCaches: true,
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
