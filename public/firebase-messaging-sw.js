/* Service Worker de Firebase Cloud Messaging (push en segundo plano).
 * La config del proyecto se recibe por query string desde el cliente
 * (ver src/lib/push.ts → registerMessagingSW).
 * IMPORTANTE: usa la versión compat del SDK que coincida con firebase@12.x del cliente. */
/* eslint-disable no-undef */

// Firebase 10.x compat funciona con tokens generados por Firebase JS SDK v9+/v10+/v12+.
// Usamos la última versión compat estable disponible en el CDN de Google.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;

const apiKey        = params.get('apiKey');
const authDomain    = params.get('authDomain');
const projectId     = params.get('projectId');
const messagingSenderId = params.get('messagingSenderId');
const appId         = params.get('appId');

if (apiKey && messagingSenderId) {
  try {
    firebase.initializeApp({
      apiKey,
      authDomain,
      projectId,
      messagingSenderId,
      appId,
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw] Mensaje recibido en background:', payload);
      // Nota: No llamamos a self.registration.showNotification aquí porque el payload
      // ya contiene la sección 'notification', lo cual hace que el SDK de Firebase
      // la muestre automáticamente en segundo plano, evitando la duplicidad.
    });

    console.log('[firebase-messaging-sw] Inicializado correctamente. Proyecto:', projectId);
  } catch (err) {
    console.error('[firebase-messaging-sw] Error al inicializar Firebase:', err);
  }
} else {
  console.warn('[firebase-messaging-sw] Config incompleta. apiKey:', apiKey, '| senderId:', messagingSenderId);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
