/**
 * Bloqueo biométrico local (WebAuthn / passkey de plataforma).
 *
 * Permite registrar la huella/Face ID del dispositivo y exigirla para desbloquear
 * la app cuando ya hay una sesión de Firebase activa. Es un bloqueo del dispositivo
 * (la verificación criptográfica server-side queda como mejora futura).
 */
const FLAG_KEY = 'biometricLockEnabled';
const CRED_KEY = 'biometricCredentialId';

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBuf(b64: string): ArrayBuffer {
  const pad = b64.replace(/-/g, '+').replace(/_/g, '/');
  const str = atob(pad + '==='.slice((pad.length + 3) % 4));
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}
function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return false;
  try {
    return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(FLAG_KEY) === '1' && !!localStorage.getItem(CRED_KEY);
}

export async function registerBiometric(userId: string, userName: string): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'Acryl Calendar', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId).slice(0, 64),
        name: userName || 'usuario',
        displayName: userName || 'Usuario',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error('No se pudo registrar la biometría.');
  localStorage.setItem(CRED_KEY, bufToB64url(cred.rawId));
  localStorage.setItem(FLAG_KEY, '1');
}

export async function verifyBiometric(): Promise<boolean> {
  const credId = localStorage.getItem(CRED_KEY);
  if (!credId) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: window.location.hostname,
        allowCredentials: [{ type: 'public-key', id: b64urlToBuf(credId) }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export function disableBiometric(): void {
  localStorage.removeItem(FLAG_KEY);
  localStorage.removeItem(CRED_KEY);
}
