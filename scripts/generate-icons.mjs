/**
 * Genera los íconos PWA (admin y cliente) a partir de SVG vectoriales.
 * One-off: `npm run icons`. Salida en public/icons/.
 * Usa sharp para rasterizar a PNG. Los glifos son paths (sin depender de fuentes).
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// --- Glifos vectoriales (sobre un lienzo 512x512) ---
const letterA = `
  <path d="M168 384 L256 128 L344 384 M200 300 L312 300"
        fill="none" stroke="#ffffff" stroke-width="46"
        stroke-linecap="round" stroke-linejoin="round"/>`;

const calendarCheck = `
  <g fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <rect x="146" y="172" width="220" height="196" rx="30"/>
    <line x1="146" y1="226" x2="366" y2="226"/>
    <line x1="202" y1="150" x2="202" y2="192"/>
    <line x1="310" y1="150" x2="310" y2="192"/>
  </g>
  <path d="M210 300 L244 334 L312 262" fill="none" stroke="#ffffff"
        stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>`;

/**
 * Construye un SVG 512x512.
 * @param {string} glyph  path/grupo del glifo
 * @param {[string,string]} colors  [stopInicial, stopFinal] del degradado
 * @param {boolean} maskable  si true: fondo full-bleed (rx=0) y glifo reducido a la zona segura
 */
function buildSvg(glyph, [c0, c1], maskable = false) {
  const rx = maskable ? 0 : 112;
  // En maskable reducimos el contenido al ~78% central (zona segura de Android).
  const inner = maskable
    ? `<g transform="translate(256 256) scale(0.78) translate(-256 -256)">${glyph}</g>`
    : glyph;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c0}"/>
        <stop offset="1" stop-color="${c1}"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="${rx}" fill="url(#g)"/>
    ${inner}
  </svg>`;
}

const ADMIN_COLORS = ['#3b82f6', '#2563eb'];   // azul (logo "A")
const CLIENT_COLORS = ['#8b5cf6', '#6366f1'];  // violeta/índigo (app de reservas)

async function render(svg, file, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(resolve(OUT, file));
  console.log('  ✓', file, `(${size}px)`);
}

const targets = [
  // ADMIN
  { svg: buildSvg(letterA, ADMIN_COLORS), file: 'icon-192.png', size: 192 },
  { svg: buildSvg(letterA, ADMIN_COLORS), file: 'icon-512.png', size: 512 },
  { svg: buildSvg(letterA, ADMIN_COLORS, true), file: 'icon-512-maskable.png', size: 512 },
  { svg: buildSvg(letterA, ADMIN_COLORS), file: 'apple-touch-icon.png', size: 180 },
  { svg: buildSvg(letterA, ADMIN_COLORS), file: 'favicon-32.png', size: 32 },
  // CLIENTE
  { svg: buildSvg(calendarCheck, CLIENT_COLORS), file: 'client-192.png', size: 192 },
  { svg: buildSvg(calendarCheck, CLIENT_COLORS), file: 'client-512.png', size: 512 },
  { svg: buildSvg(calendarCheck, CLIENT_COLORS, true), file: 'client-512-maskable.png', size: 512 },
  { svg: buildSvg(calendarCheck, CLIENT_COLORS), file: 'client-apple-touch-icon.png', size: 180 },
];

console.log('Generando íconos PWA en public/icons/ ...');
for (const t of targets) await render(t.svg, t.file, t.size);
console.log('Listo.');
