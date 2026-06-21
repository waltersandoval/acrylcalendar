'use strict';

const SEVERITY_ORDER = ['critica', 'alta', 'media', 'baja', 'info'];
const SEVERITY_LABEL = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
  info: 'Info',
};

const auditBtn = document.getElementById('auditBtn');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const findingsEl = document.getElementById('findings');
const actionsEl = document.getElementById('actions');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

let lastReport = null;

auditBtn.addEventListener('click', runAudit);
copyBtn.addEventListener('click', copyReport);
downloadBtn.addEventListener('click', downloadReport);

async function runAudit() {
  auditBtn.disabled = true;
  statusEl.textContent = 'Auditando la pestaña activa…';
  findingsEl.innerHTML = '';
  summaryEl.innerHTML = '';
  actionsEl.style.display = 'none';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !/^https?:\/\//i.test(tab.url)) {
      statusEl.textContent = 'Esta pestaña no es una página http(s) — no hay nada que auditar.';
      auditBtn.disabled = false;
      return;
    }

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageAuditFunction,
    });
    const pageFindings = (injection && injection.result) || [];

    let cookieFindings = [];
    try {
      cookieFindings = await auditCookies(tab.url);
    } catch (err) {
      cookieFindings = [{
        severity: 'info',
        title: 'No se pudieron leer las cookies de esta pestaña',
        detail: String((err && err.message) || err),
      }];
    }

    lastReport = {
      url: tab.url,
      timestamp: new Date().toISOString(),
      findings: [...pageFindings, ...cookieFindings],
    };

    renderReport(lastReport);
    statusEl.textContent = `Auditoría completa — ${lastReport.findings.length} hallazgo(s).`;
    actionsEl.style.display = lastReport.findings.length ? 'flex' : 'none';
  } catch (err) {
    statusEl.textContent = 'Error al auditar: ' + String((err && err.message) || err);
  } finally {
    auditBtn.disabled = false;
  }
}

// Usa chrome.cookies porque document.cookie nunca muestra cookies httpOnly —
// y esa es justo la propiedad que necesitamos poder verificar.
async function auditCookies(url) {
  const findings = [];
  const cookies = await chrome.cookies.getAll({ url });
  const isHttps = url.startsWith('https://');
  const sensitiveNamePattern = /session|token|auth|sid|jwt|login/i;

  for (const cookie of cookies) {
    const label = `Cookie "${cookie.name}" (dominio ${cookie.domain})`;

    if (sensitiveNamePattern.test(cookie.name) && !cookie.httpOnly) {
      findings.push({
        severity: 'alta',
        title: `${label} sin httpOnly`,
        detail: 'Esta cookie parece guardar una sesión o token, pero JavaScript puede leerla (document.cookie). Si el sitio tuviera alguna vulnerabilidad XSS, un atacante podría robar la sesión directamente. Marcala como HttpOnly al crearla en el servidor.',
      });
    }
    if (isHttps && !cookie.secure) {
      findings.push({
        severity: 'alta',
        title: `${label} sin atributo Secure`,
        detail: 'El sitio usa HTTPS pero esta cookie no tiene el atributo Secure, por lo que el navegador la enviaría también por HTTP si existiera esa versión del sitio. Agregá Secure al crearla.',
      });
    }
    if (cookie.sameSite === 'no_restriction' && !cookie.secure) {
      findings.push({
        severity: 'alta',
        title: `${label}: SameSite=None sin Secure`,
        detail: 'Los navegadores modernos bloquean las cookies SameSite=None que no son Secure. Esta combinación puede hacer que la cookie ni siquiera funcione, o que falle de forma inconsistente entre navegadores.',
      });
    } else if (cookie.sameSite === 'unspecified' || cookie.sameSite === 'no_restriction') {
      findings.push({
        severity: 'baja',
        title: `${label}: SameSite débil o sin definir`,
        detail: 'Sin un SameSite estricto (Lax o Strict), esta cookie se envía también en peticiones iniciadas desde otros sitios, lo que facilita ataques CSRF. Si no necesitás que viaje entre sitios, usá SameSite=Lax o Strict.',
      });
    }
  }
  return findings;
}

// Esta función se serializa y se ejecuta DENTRO de la pestaña auditada
// (chrome.scripting.executeScript), no en el contexto del popup. Por eso no
// puede usar nada del scope externo (SEVERITY_*, etc.) — todo lo que
// necesita lo define adentro.
async function pageAuditFunction() {
  const findings = [];
  const push = (severity, title, detail) => findings.push({ severity, title, detail });

  try {
    const origin = location.origin;
    const isHttps = location.protocol === 'https:';
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

    if (!isHttps && !isLocal) {
      push(
        'critica',
        'El sitio no usa HTTPS',
        'Esta página se sirve por HTTP plano. Cualquiera en la misma red (wifi pública, proxy, ISP) puede leer o modificar el tráfico, incluyendo contraseñas y cookies. Hay que servir el sitio solo por HTTPS y redirigir HTTP → HTTPS.'
      );
    }

    // --- Cabeceras de seguridad ---
    try {
      const res = await fetch(location.href, { cache: 'no-store', credentials: 'same-origin' });
      const h = res.headers;
      const metaCsp = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"], meta[http-equiv="content-security-policy"]'
      );
      const cspContent = h.get('content-security-policy') || (metaCsp && metaCsp.getAttribute('content')) || '';

      if (!cspContent) {
        push(
          'alta',
          'Sin Content-Security-Policy',
          'No se encontró la cabecera (ni meta tag) de CSP. Es la principal defensa contra XSS: limita desde dónde se puede cargar y ejecutar código. Agregala en la configuración del hosting (en Vercel, dentro de "headers" en vercel.json).'
        );
      }
      if (!h.has('x-frame-options') && !/frame-ancestors/i.test(cspContent)) {
        push(
          'media',
          'Sin protección contra clickjacking (X-Frame-Options / frame-ancestors)',
          'Sin esta cabecera (o frame-ancestors en la CSP), el sitio se puede embeber en un iframe ajeno, habilitando ataques de clickjacking (engañar al usuario para que haga clic en algo que no ve).'
        );
      }
      if (!h.has('x-content-type-options')) {
        push(
          'baja',
          'Sin X-Content-Type-Options',
          'Sin "nosniff", algunos navegadores intentan adivinar el tipo de contenido, lo que en ciertos casos puede ser abusado para ejecutar contenido no esperado.'
        );
      }
      if (!h.has('referrer-policy')) {
        push(
          'baja',
          'Sin Referrer-Policy',
          'Sin esta cabecera, la URL completa de esta página (que puede incluir tokens o datos en la query) puede filtrarse al sitio de destino cuando alguien hace clic en un link saliente.'
        );
      }
      if (!h.has('permissions-policy')) {
        push(
          'info',
          'Sin Permissions-Policy',
          'Esta cabecera permite bloquear explícitamente el acceso a cámara, micrófono, geolocalización, etc. desde este origen y los que se embeban. No es crítica, pero suma defensa en profundidad.'
        );
      }
      if (isHttps && !h.has('strict-transport-security')) {
        push(
          'media',
          'Sin Strict-Transport-Security (HSTS)',
          'Sin HSTS, alguien que escribe el sitio sin "https://" (o sigue un link http://) puede quedar expuesto a un intento de downgrade a HTTP antes del primer redirect. HSTS le dice al navegador que use siempre HTTPS para este dominio.'
        );
      }
    } catch (err) {
      push('info', 'No se pudieron leer las cabeceras HTTP', String((err && err.message) || err));
    }

    // --- Contenido mixto ---
    if (isHttps) {
      const resourceSelector =
        'img[src], script[src], link[rel="stylesheet"][href], iframe[src], source[src], video[src], audio[src]';
      const insecureEls = Array.from(document.querySelectorAll(resourceSelector)).filter((el) =>
        /^http:\/\//i.test(el.src || el.href || '')
      );
      if (insecureEls.length) {
        const examples = insecureEls.slice(0, 3).map((el) => el.src || el.href).join(', ');
        push(
          'alta',
          'Contenido mixto (recursos http:// en página https)',
          `${insecureEls.length} elemento(s) cargan recursos por HTTP en una página HTTPS, por ejemplo: ${examples}. El navegador puede bloquearlos, y un atacante en la red podría modificarlos antes de que lleguen al usuario.`
        );
      }
    }

    // --- Secretos expuestos en el HTML / scripts ---
    const secretPatterns = [
      {
        name: 'Google API Key',
        re: /AIza[0-9A-Za-z_-]{30,}/g,
        severity: 'media',
        note:
          'Si es la API Key pública de Firebase (la misma app web), no es un secreto — Firebase está diseñado para eso y la seguridad real depende de las reglas de Firestore/App Check. Si es de Google Maps u otra API de pago por uso y no tiene restricciones de referer/dominio en Google Cloud Console, sí es un riesgo de abuso o costo.',
      },
      {
        name: 'Stripe Secret Key',
        re: /sk_(live|test)_[0-9A-Za-z]{16,}/g,
        severity: 'critica',
        note:
          'Una clave secreta de Stripe nunca debe estar en código que llega al navegador. Hay que revocarla y regenerarla, y mover los cargos al backend.',
      },
      {
        name: 'AWS Access Key',
        re: /AKIA[0-9A-Z]{12,}/g,
        severity: 'critica',
        note: 'Una access key de AWS expuesta permite a cualquiera usar tu cuenta de AWS. Revocala de inmediato desde IAM.',
      },
      {
        name: 'Llave privada PEM',
        re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g,
        severity: 'critica',
        note: 'Una llave privada nunca debe llegar al navegador. Si esto es real, hay que rotarla de inmediato.',
      },
      {
        name: 'client_secret en código',
        re: /client_secret["']?\s*[:=]\s*["'][^"']{8,}["']/gi,
        severity: 'critica',
        note:
          'Un "client_secret" de OAuth/PayPal/etc. expuesto en el frontend permite a cualquiera hacerse pasar por tu aplicación ante ese proveedor.',
      },
    ];

    const html = document.documentElement.outerHTML;
    for (const pattern of secretPatterns) {
      const matches = html.match(pattern.re);
      if (matches && matches.length) {
        const sample = matches[0].slice(0, 12) + '…';
        push(
          pattern.severity,
          `Posible ${pattern.name} en el HTML/JS de la página`,
          `Se encontró un patrón que coincide con ${pattern.name} (ejemplo: ${sample}). ${pattern.note}`
        );
      }
    }

    // Solo scripts del mismo origen: los de otros dominios no se pueden leer
    // por CORS, y tampoco son código tuyo.
    const sameOriginScripts = Array.from(document.querySelectorAll('script[src]'))
      .map((el) => el.src)
      .filter((src) => {
        try {
          return new URL(src).origin === origin;
        } catch {
          return false;
        }
      });

    for (const src of sameOriginScripts.slice(0, 25)) {
      try {
        const text = await (await fetch(src, { cache: 'no-store' })).text();
        for (const pattern of secretPatterns) {
          const matches = text.match(pattern.re);
          if (matches && matches.length) {
            const sample = matches[0].slice(0, 12) + '…';
            push(
              pattern.severity,
              `Posible ${pattern.name} en ${src.replace(origin, '')}`,
              `${pattern.note} (ejemplo encontrado: ${sample})`
            );
          }
        }
      } catch {
        // archivo no accesible o bloqueado — no es algo que podamos evaluar desde aquí
      }
    }

    // --- localStorage / sessionStorage ---
    const sensitiveKeyPattern = /pass|secret|token|auth|key|jwt|session/i;
    for (const [storeName, store] of [
      ['localStorage', localStorage],
      ['sessionStorage', sessionStorage],
    ]) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (sensitiveKeyPattern.test(key)) {
          const value = store.getItem(key) || '';
          push(
            'baja',
            `${storeName} guarda algo llamado "${key}"`,
            `Cualquier script que corra en esta página (incluido uno inyectado por XSS) puede leer ${storeName} directamente. Si esto guarda un token de sesión de larga duración, considerá usar cookies HttpOnly en su lugar, o tokens de corta vida.${
              value.length > 200 ? ' (el valor es largo, parece un token/JWT)' : ''
            }`
          );
        }
      }
    }

    // --- Formularios ---
    for (const form of document.querySelectorAll('form')) {
      const action = form.getAttribute('action') || '';
      if (/^http:\/\//i.test(action)) {
        push(
          'alta',
          'Formulario envía datos por HTTP',
          `El formulario envía su contenido a ${action}, sin cifrar. Si incluye contraseñas, datos de pago o datos personales, viajan en texto plano.`
        );
      }
      const pwdInputs = form.querySelectorAll('input[type="password"]');
      if (pwdInputs.length && !isHttps && !isLocal) {
        push(
          'critica',
          'Campo de contraseña en página sin HTTPS',
          'Hay un campo de contraseña en una página servida por HTTP. La contraseña viaja sin cifrar mientras el usuario escribe y envía el formulario.'
        );
      }
    }

    // --- target=_blank sin rel=noopener (reverse tabnabbing) ---
    const blankLinks = Array.from(document.querySelectorAll('a[target="_blank"]')).filter(
      (a) => !/noopener|noreferrer/i.test(a.getAttribute('rel') || '')
    );
    if (blankLinks.length) {
      push(
        'baja',
        'Links target="_blank" sin rel="noopener"',
        `${blankLinks.length} link(s) abren en una pestaña nueva sin rel="noopener". La página destino podría acceder a window.opener y redirigir esta pestaña original (reverse tabnabbing).`
      );
    }

    // --- Archivos sensibles accesibles ---
    // Comparamos contra una ruta inexistente al azar primero: muchas SPA
    // (incluida esta misma app) devuelven 200 con index.html para cualquier
    // ruta no reconocida, así que sin esa base cualquier chequeo de "/.env"
    // daría siempre falso positivo.
    const sensitivePaths = [
      '/.env',
      '/.env.local',
      '/.git/config',
      '/.git/HEAD',
      '/config.json',
      '/wp-config.php.bak',
      '/backup.sql',
      '/.aws/credentials',
    ];
    try {
      const probePath = `/__audit_probe_${Math.random().toString(36).slice(2)}__`;
      const baselineRes = await fetch(origin + probePath, { cache: 'no-store' });
      const baselineText = await baselineRes.text();

      for (const path of sensitivePaths) {
        try {
          const res = await fetch(origin + path, { cache: 'no-store' });
          if (!res.ok) continue;
          const text = await res.text();
          const looksLikeFallback =
            res.status === baselineRes.status && Math.abs(text.length - baselineText.length) < 5;
          if (!looksLikeFallback) {
            push(
              'critica',
              `Archivo posiblemente expuesto: ${path}`,
              `${origin}${path} respondió ${res.status} con contenido distinto al de una ruta inexistente (no parece ser el index.html de la SPA). Revisalo manualmente — si expone secretos, rotalos y bloqueá el acceso a esa ruta en el hosting.`
            );
          }
        } catch {
          // sin red o bloqueado — no es señal de nada
        }
      }
    } catch {
      // no se pudo establecer la línea base — omitimos esta verificación
    }

    return findings;
  } catch (err) {
    findings.push({
      severity: 'info',
      title: 'La auditoría no pudo completarse del todo',
      detail: String((err && err.message) || err),
    });
    return findings;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function renderReport(report) {
  const counts = {};
  for (const f of report.findings) counts[f.severity] = (counts[f.severity] || 0) + 1;

  summaryEl.innerHTML = SEVERITY_ORDER.filter((sev) => counts[sev])
    .map((sev) => `<span class="badge" style="background:var(--${sev})">${SEVERITY_LABEL[sev]}: ${counts[sev]}</span>`)
    .join('');

  const sorted = [...report.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  if (!sorted.length) {
    findingsEl.innerHTML =
      '<div id="empty">No se encontraron problemas con las verificaciones disponibles. Esto no garantiza que el sitio sea 100% seguro — solo cubre lo que el navegador puede ver desde esta pestaña.</div>';
    return;
  }

  findingsEl.innerHTML = sorted
    .map(
      (f) => `
    <div class="finding ${f.severity}">
      <div class="sev">${SEVERITY_LABEL[f.severity]}</div>
      <div class="title">${escapeHtml(f.title)}</div>
      <div class="detail">${escapeHtml(f.detail)}</div>
    </div>
  `
    )
    .join('');
}

function buildMarkdown(report) {
  const lines = [
    '# Auditoría de seguridad frontend',
    '',
    `- URL: ${report.url}`,
    `- Fecha: ${report.timestamp}`,
    `- Hallazgos: ${report.findings.length}`,
    '',
  ];
  for (const sev of SEVERITY_ORDER) {
    const items = report.findings.filter((f) => f.severity === sev);
    if (!items.length) continue;
    lines.push(`## ${SEVERITY_LABEL[sev]}`, '');
    for (const f of items) {
      lines.push(`### ${f.title}`, '', f.detail, '');
    }
  }
  lines.push(
    '---',
    '_Generado por la extensión "Auditor de Seguridad Frontend". Solo cubre lo visible desde el navegador en esta pestaña; no reemplaza una auditoría de backend/base de datos._'
  );
  return lines.join('\n');
}

async function copyReport() {
  if (!lastReport) return;
  try {
    await navigator.clipboard.writeText(buildMarkdown(lastReport));
    statusEl.textContent = 'Reporte copiado al portapapeles.';
  } catch (err) {
    statusEl.textContent = 'No se pudo copiar: ' + String((err && err.message) || err);
  }
}

function downloadReport() {
  if (!lastReport) return;
  const blob = new Blob([buildMarkdown(lastReport)], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const stamp = lastReport.timestamp.replace(/[:.]/g, '-');
  chrome.downloads.download({ url, filename: `auditoria-seguridad-${stamp}.md`, saveAs: true }, () =>
    URL.revokeObjectURL(url)
  );
}
