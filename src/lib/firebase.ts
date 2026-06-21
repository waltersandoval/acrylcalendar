import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Las variables de entorno de Vite se exponen de forma segura
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export let app: any;
export let auth: any;
export let db: any;
export let functions: any;

if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);

  // App Check certifica ante Firebase que las peticiones salen de esta app
  // real, no de un script/bot llamando directo a las Cloud Functions
  // públicas (reservas, disponibilidad, pagos) o a Firestore. En desarrollo
  // local usa un token de depuración en vez de reCAPTCHA real (ver consola
  // del navegador para registrarlo en Firebase Console).
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (recaptchaSiteKey) {
    if (import.meta.env.DEV) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.warn("⚠️ VITE_RECAPTCHA_SITE_KEY no configurada: App Check deshabilitado.");
  }

  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
} else {
  console.warn("⚠️ Firebase credentials not configured. Application will run in offline/mock mode.");
  app = null;
  auth = null;
  db = null;
  functions = null;
}

