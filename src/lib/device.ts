/**
 * Detección de DISPOSITIVO (no del tamaño de ventana).
 * Se usa para habilitar la PWA instalable solo en móviles/tablets,
 * NO en computadoras de escritorio (aunque redimensionen la ventana).
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|PlayBook/i.test(ua);

  const touch = (navigator.maxTouchPoints || 0) > 0;
  // iPadOS Safari se reporta como "Macintosh": lo detectamos por táctil.
  const iPadOS = /Macintosh/.test(ua) && touch;

  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  return uaMobile || iPadOS || (coarse && touch);
}

/**
 * Abre una URL en el navegador externo del sistema.
 * En iOS standalone (PWA instalada), fuerza la apertura en Safari utilizando el esquema x-safari-.
 * En otras plataformas y modos, utiliza el método estándar window.open.
 */
export function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isIOSStandalone = isIOS && (window.navigator as any).standalone;
  if (isIOSStandalone) {
    window.location.href = `x-safari-${url}`;
  } else {
    window.open(url, '_blank');
  }
}

