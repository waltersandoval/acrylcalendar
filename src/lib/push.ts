/**
 * Push notifications (Firebase Cloud Messaging / Web Push).
 * Pide permiso, obtiene el token FCM y lo guarda en users/{uid}.fcmTokens.
 * Requiere VITE_FIREBASE_VAPID_KEY (Web Push certificate del proyecto Firebase).
 * 
 * FLUJO COMPLETO:
 *  1. El usuario activa push desde Perfil → togglePush()
 *  2. enablePush() solicita permiso al navegador
 *  3. Registra el SW de FCM (firebase-messaging-sw.js) con scope propio
 *  4. Obtiene el token FCM del dispositivo
 *  5. Guarda el token en Firestore → users/{uid}.fcmTokens
 *  6. El trigger onEventCreated (Cloud Function) lee esos tokens y envía la push
 */
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, db, auth } from './firebase';
import { doc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';

// La VAPID key se obtiene en Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

// Config completa necesaria para el Service Worker (que no puede leer import.meta.env)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Verifica que estén todas las variables de entorno necesarias para push. */
export function isPushConfigured(): boolean {
  const ok = !!VAPID_KEY &&
    VAPID_KEY !== 'REEMPLAZAR_vapidKey' &&
    VAPID_KEY.length > 10 &&
    !!app &&
    !!firebaseConfig.messagingSenderId;

  if (!ok) {
    console.warn('[push] isPushConfigured=false. VAPID_KEY:', VAPID_KEY ? 'presente' : 'ausente',
      '| messagingSenderId:', firebaseConfig.messagingSenderId ? 'presente' : 'ausente');
  }
  return ok;
}

/**
 * Registra el SW de FCM con scope propio para no colisionar con el SW de Workbox/PWA.
 * La config se pasa por query string porque el SW no puede leer import.meta.env.
 */
async function registerMessagingSW(): Promise<ServiceWorkerRegistration> {
  // Construimos la URL con la config completa para que el SW pueda inicializar Firebase.
  const qs = new URLSearchParams(firebaseConfig as Record<string, string>).toString();
  const swUrl = `/firebase-messaging-sw.js?${qs}`;

  console.log('[push] Registrando SW de FCM en:', swUrl.substring(0, 80) + '...');

  // Verificar si ya existe un registro con este scope y reutilizarlo.
  const existingRegs = await navigator.serviceWorker.getRegistrations();
  const existing = existingRegs.find(r => r.scope.includes('firebase-cloud-messaging-push-scope'));
  if (existing) {
    console.log('[push] Reutilizando SW de FCM ya registrado:', existing.scope);
    return existing;
  }

  const reg = await navigator.serviceWorker.register(swUrl, {
    scope: '/firebase-cloud-messaging-push-scope',
  });

  // Esperar a que el SW esté activo antes de continuar.
  await new Promise<void>((resolve) => {
    if (reg.active) { resolve(); return; }
    const sw = reg.installing || reg.waiting;
    if (!sw) { resolve(); return; }
    sw.addEventListener('statechange', function handler() {
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', handler);
        resolve();
      }
    });
  });

  console.log('[push] SW de FCM registrado y activo.');
  return reg;
}

export type EnablePushResult = {
  ok: boolean;
  reason?: 'no-config' | 'unsupported' | 'denied' | 'no-token' | 'error';
  token?: string;
};

/**
 * Activa las push notifications:
 *  - Verifica configuración y soporte del navegador
 *  - Solicita permiso al usuario
 *  - Registra el SW de FCM
 *  - Obtiene el token FCM y lo persiste en Firestore
 */
export async function enablePush(): Promise<EnablePushResult> {
  try {
    console.log('[push] Iniciando enablePush...');

    if (!isPushConfigured()) {
      console.error('[push] Configuración incompleta. Verifica VITE_FIREBASE_VAPID_KEY en .env.local');
      return { ok: false, reason: 'no-config' };
    }

    const supported = await isSupported().catch(() => false);
    if (!supported) {
      console.warn('[push] Firebase Messaging no está soportado en este navegador.');
      return { ok: false, reason: 'unsupported' };
    }

    // Solicitar permiso de notificaciones al sistema operativo/navegador.
    const currentPerm = Notification.permission;
    console.log('[push] Permiso actual:', currentPerm);

    let perm: NotificationPermission;
    if (currentPerm === 'denied') {
      console.warn('[push] Permiso previamente denegado. El usuario debe habilitarlo manualmente en el navegador.');
      return { ok: false, reason: 'denied' };
    }
    perm = await Notification.requestPermission();
    console.log('[push] Permiso tras solicitud:', perm);

    if (perm !== 'granted') return { ok: false, reason: 'denied' };

    // Registrar el Service Worker de FCM.
    const reg = await registerMessagingSW();

    // Obtener el token FCM del dispositivo.
    const messaging = getMessaging(app);
    console.log('[push] Obteniendo token FCM con VAPID key...');
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });

    if (!token) {
      console.error('[push] getToken() retornó null/undefined. Verifica la VAPID key en Firebase Console.');
      return { ok: false, reason: 'no-token' };
    }

    console.log('[push] Token FCM obtenido:', token.substring(0, 20) + '...');

    // Persistir el token en Firestore para que las Cloud Functions puedan usarlo.
    const uid = auth?.currentUser?.uid;
    if (uid) {
      await setDoc(
        doc(db, 'users', uid),
        { fcmTokens: arrayUnion(token), updatedAt: serverTimestamp() },
        { merge: true }
      );
      console.log('[push] Token guardado en Firestore para uid:', uid);
    } else {
      console.warn('[push] No hay usuario autenticado. El token NO se guardó en Firestore.');
    }

    localStorage.setItem('pushEnabled', '1');
    localStorage.setItem('pushToken', token);

    return { ok: true, token };
  } catch (e) {
    console.error('[push] enablePush error:', e);
    return { ok: false, reason: 'error' };
  }
}

/** Desactiva las push notifications y elimina el token de Firestore. */
export async function disablePush(): Promise<void> {
  const token = localStorage.getItem('pushToken');
  const uid = auth?.currentUser?.uid;
  if (token && uid) {
    try {
      await setDoc(
        doc(db, 'users', uid),
        { fcmTokens: arrayRemove(token) },
        { merge: true }
      );
      console.log('[push] Token eliminado de Firestore para uid:', uid);
    } catch (e) {
      console.warn('[push] disablePush error al eliminar token:', e);
    }
  }
  localStorage.removeItem('pushEnabled');
  localStorage.removeItem('pushToken');
}

/** Retorna true si el usuario activó push en este dispositivo. */
export function isPushEnabled(): boolean {
  return localStorage.getItem('pushEnabled') === '1';
}

/**
 * Escucha notificaciones cuando la app está en PRIMER PLANO (foreground).
 * Debe llamarse UNA SOLA VEZ al iniciar la app (desde App.tsx o main.tsx).
 * Si la app está en segundo plano, el SW de FCM maneja la notificación directamente.
 */
export function listenForegroundPush(): void {
  if (!isPushConfigured()) {
    console.log('[push] listenForegroundPush: sin configuración, no se registra listener.');
    return;
  }

  isSupported().then((ok) => {
    if (!ok) return;
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log('[push] Mensaje recibido en foreground:', payload);

      const title = payload.notification?.title || 'Acryl Calendar';
      const body  = payload.notification?.body  || '';
      const icon  = payload.notification?.icon  || '/icons/icon-192.png';

      if (Notification.permission === 'granted') {
        // En foreground el SW no muestra la notificación automáticamente,
        // por eso la mostramos manualmente desde el cliente.
        try {
          new Notification(title, { body, icon });
        } catch (e) {
          // Fallback: algunos navegadores móviles no permiten new Notification() desde el contexto de la página.
          console.warn('[push] No se pudo mostrar Notification en foreground:', e);
        }
      }
    });
    console.log('[push] Listener de foreground registrado.');
  });
}
