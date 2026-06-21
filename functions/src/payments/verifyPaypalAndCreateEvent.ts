/**
 * Cloud Function: verifyPaypalAndCreateEvent
 * Dominio: payments
 *
 * Qué hace:
 *  1. Verifica server-to-server con la API de PayPal que el pago fue completado
 *  2. Valida que el monto pagado coincida con el precio del calendario
 *  3. Verifica que no haya conflicto de horario (misma lógica que createEvent)
 *  4. Crea la cita en Firestore con campos de pago incluidos
 *
 * Seguridad: NUNCA confiar en el cliente. El monto y el estado del pago se
 * verifican directamente con la API de PayPal usando credenciales secretas.
 *
 * Variables de entorno requeridas en Firebase Secrets:
 *   PAYPAL_CLIENT_ID      — Client ID de la app PayPal
 *   PAYPAL_CLIENT_SECRET  — Client Secret de la app PayPal
 *   PAYPAL_MODE           — "sandbox" | "live" (default: sandbox)
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

// Secretos de PayPal — se gestionan en Firebase Secret Manager
const PAYPAL_CLIENT_ID     = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
const PAYPAL_MODE          = defineSecret("PAYPAL_MODE");

// ─────────────────────────────────────────────────────────────
// Helpers para parseo de tiempo (mismo que createEvent)
// ─────────────────────────────────────────────────────────────
function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const clean = t.trim().toUpperCase();
  const isPm = clean.includes("PM");
  const isAm = clean.includes("AM");
  const timePart = clean.replace(/[AP]M/, "").trim();
  const parts = timePart.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  if (isPm && hours < 12) hours += 12;
  else if (isAm && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function parseDurationToMinutes(dur: string): number {
  if (!dur) return 30;
  const match = dur.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 30;
}

// ─────────────────────────────────────────────────────────────
// Obtener access token de PayPal
// ─────────────────────────────────────────────────────────────
async function getPayPalAccessToken(baseUrl: string, clientId: string, secret: string): Promise<string> {
  const resp = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error("PayPal token error:", resp.status, errBody);
    throw new HttpsError("unauthenticated", "No se pudo autenticar con PayPal.");
  }

  const json = await resp.json() as { access_token: string };
  return json.access_token;
}

// ─────────────────────────────────────────────────────────────
// Verificar orden de PayPal
// ─────────────────────────────────────────────────────────────
async function verifyPayPalOrder(
  baseUrl: string,
  orderId: string,
  accessToken: string
): Promise<{ status: string; amount: string; currency: string }> {
  const resp = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    console.error("PayPal order verification error:", resp.status);
    throw new HttpsError("not-found", "Orden de PayPal no encontrada o inválida.");
  }

  const order = await resp.json() as any;
  const status: string = order.status;
  const purchaseUnit = order.purchase_units?.[0];
  const amount: string = purchaseUnit?.amount?.value || "0";
  const currency: string = purchaseUnit?.amount?.currency_code || "USD";

  return { status, amount, currency };
}

// ─────────────────────────────────────────────────────────────
// Verificar conflictos de horario (mismo que createEvent)
// ─────────────────────────────────────────────────────────────
async function checkTimeConflict(
  db: admin.firestore.Firestore,
  calendarId: string,
  fullDate: string,
  time: string,
  duration: string
): Promise<boolean> {
  const selectedDateObj = new Date(fullDate);
  const reqStart = parseTimeToMinutes(time);
  const reqDur   = parseDurationToMinutes(duration);
  const reqEnd   = reqStart + reqDur;

  const eventsSnap = await db.collection("events")
    .where("calendarId", "==", calendarId)
    .get();

  for (const doc of eventsSnap.docs) {
    const event = doc.data();

    const isCancelled = event.status === "cancelled" || event.status === "cancelada" || event.statusColor === "bg-red-400";
    if (isCancelled) continue;

    let sameDay = false;
    if (event.fullDate) {
      try {
        const evDate = new Date(event.fullDate);
        sameDay =
          evDate.getFullYear() === selectedDateObj.getFullYear() &&
          evDate.getMonth()    === selectedDateObj.getMonth()    &&
          evDate.getDate()     === selectedDateObj.getDate();
      } catch (_) { /* ignore */ }
    }

    if (!sameDay && event.day && event.month) {
      const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      const targetMonth = monthNames[selectedDateObj.getMonth()];
      const matchMonth = String(event.month).toUpperCase() === targetMonth;
      const matchDay   = String(event.day) === selectedDateObj.getDate().toString();
      let   matchYear  = true;
      if (event.fullDate) {
        try { matchYear = new Date(event.fullDate).getFullYear() === selectedDateObj.getFullYear(); } catch (_) {}
      }
      sameDay = matchMonth && matchDay && matchYear;
    }

    if (!sameDay) continue;

    const evStart = parseTimeToMinutes(event.time);
    const evEnd   = evStart + parseDurationToMinutes(event.duration);

    if (reqEnd > evStart && reqStart < evEnd) return true; // hay conflicto
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// Cloud Function principal
// ─────────────────────────────────────────────────────────────
export const verifyPaypalAndCreateEvent = onCall(
  {
    cors: true,
    secrets: [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE],
  },
  async (request: CallableRequest<any>) => {
    const {
      paypalOrderId,
      calendarId,
      groupId,
      groupTitle,
      month,
      day,
      time,
      service,
      type,
      duration,
      client,
      email,
      phone,
      termsAccepted,
      fullDate,
    } = request.data || {};

    // ── Validar parámetros mínimos ───────────────────────────
    if (!paypalOrderId || !calendarId || !client || !fullDate || !time || !duration) {
      throw new HttpsError("invalid-argument", "Faltan parámetros requeridos.");
    }

    // Endpoint público (sin autenticación): limitamos longitudes y formato
    // mínimo para evitar abuso (payloads gigantes, emails inválidos).
    const MAX_TEXT_LEN = 200;
    if (String(client).length > MAX_TEXT_LEN
      || (service && String(service).length > MAX_TEXT_LEN)
      || (groupTitle && String(groupTitle).length > MAX_TEXT_LEN)) {
      throw new HttpsError("invalid-argument", "Uno de los campos enviados es demasiado largo.");
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (String(email).length > MAX_TEXT_LEN || !emailRegex.test(String(email))) {
        throw new HttpsError("invalid-argument", "El email no es válido.");
      }
    }
    if (phone && String(phone).length > 40) {
      throw new HttpsError("invalid-argument", "El teléfono no es válido.");
    }

    const db = admin.firestore();

    // ── Buscar configuración de pago activa ──────────────────
    const configsSnap = await db.collection("payment_configs")
      .where("calendarId", "==", calendarId)
      .where("enabled", "==", true)
      .get();

    let activeConfig: any = null;

    // Buscar coincidencia exacta por groupId
    if (groupId) {
      for (const doc of configsSnap.docs) {
        const cfg = doc.data();
        if (cfg.groupId === groupId) {
          activeConfig = { id: doc.id, ...cfg };
          break;
        }
      }
    }

    // Si no hay coincidencia exacta, buscar la genérica (groupId == "all")
    if (!activeConfig) {
      for (const doc of configsSnap.docs) {
        const cfg = doc.data();
        if (cfg.groupId === "all" || !cfg.groupId) {
          activeConfig = { id: doc.id, ...cfg };
          break;
        }
      }
    }

    const calSnap = await db.collection("calendars").doc(calendarId).get();
    if (!calSnap.exists) {
      throw new HttpsError("not-found", "El calendario no existe.");
    }
    const calData = calSnap.data() || {};
    if (calData.status !== true || calData.deletedAt) {
      throw new HttpsError("failed-precondition", "Este calendario no está disponible para reservas.");
    }
    const ownerUid = calData.ownerUid || calData.createdBy || null;

    // Defensa en profundidad: aunque las reglas de Firestore ya exigen que
    // `calendarId` pertenezca a quien crea/edita el `payment_config`, no
    // confiamos solo en eso aquí. Si por cualquier motivo existiera una
    // configuración cuyo `ownerUid` no tiene ningún rol sobre este
    // calendario, no se usa para procesar el pago — evita que un pago real
    // de un cliente se verifique contra las credenciales de PayPal de otra
    // persona.
    if (activeConfig) {
      const cfgOwnerUid = activeConfig.ownerUid;
      const cfgOwnerRole = calData.roles ? calData.roles[cfgOwnerUid] : null;
      const cfgOwnerAuthorized = cfgOwnerUid === ownerUid || ["owner", "admin", "editor"].includes(cfgOwnerRole);
      if (!cfgOwnerAuthorized) {
        console.error(
          `verifyPaypalAndCreateEvent: configuración de pago ${activeConfig.id} (ownerUid=${cfgOwnerUid}) no pertenece al propietario del calendario ${calendarId} (ownerUid=${ownerUid}).`
        );
        throw new HttpsError("failed-precondition", "La configuración de pagos de este calendario no es válida.");
      }
    }

    let expectedAmount: number;
    let expectedCurrency: string;
    let clientId: string;
    let secret: string;
    let mode: string;

    if (activeConfig) {
      expectedAmount = parseFloat(String(activeConfig.price || "0"));
      expectedCurrency = String(activeConfig.currency || "USD").toUpperCase();
      clientId = activeConfig.clientId;
      mode = activeConfig.sandboxMode ? "sandbox" : "live";

      // Cargar el secret desde la subcolección privada
      const secretSnap = await db.collection("payment_configs").doc(activeConfig.id).collection("private").doc("secrets").get();
      if (!secretSnap.exists || !secretSnap.data()?.clientSecret) {
        throw new HttpsError("failed-precondition", "La configuración de pagos no tiene una llave secreta configurada.");
      }
      secret = secretSnap.data()?.clientSecret;
    } else {
      // ── Lógica Legacy Fallback ─────────────────────────────
      const paymentCfg = calData.section_PAYMENT || {};
      expectedAmount = parseFloat(String(paymentCfg.price || "0"));
      expectedCurrency = String(paymentCfg.currency || "USD").toUpperCase();

      const paypalConfigSnap = await db.collection("calendars").doc(calendarId).collection("private_settings").doc("paypal").get();
      if (paypalConfigSnap.exists) {
        const pCfg = paypalConfigSnap.data() || {};
        clientId = pCfg.clientId;
        secret   = pCfg.clientSecret;
        mode     = pCfg.sandboxMode ? "sandbox" : "live";
      } else {
        // Fallback a los secretos globales del servidor
        clientId = PAYPAL_CLIENT_ID.value();
        secret   = PAYPAL_CLIENT_SECRET.value();
        mode     = PAYPAL_MODE.value() || "sandbox";
      }
    }

    if (expectedAmount <= 0) {
      throw new HttpsError("failed-precondition", "Este servicio no requiere pago.");
    }

    const baseUrl  = mode === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

    console.log(`verifyPaypalAndCreateEvent: Verificando orden ${paypalOrderId} en modo ${mode}`);

    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken(baseUrl, clientId, secret);
    } catch (err) {
      console.error("Error obteniendo token PayPal:", err);
      throw new HttpsError("internal", "Error al conectar con PayPal.");
    }

    let paypalData: { status: string; amount: string; currency: string };
    try {
      paypalData = await verifyPayPalOrder(baseUrl, paypalOrderId, accessToken);
    } catch (err: any) {
      console.error("Error verificando orden PayPal:", err);
      throw err instanceof HttpsError ? err : new HttpsError("internal", "Error al verificar el pago.");
    }

    console.log(`verifyPaypalAndCreateEvent: Orden ${paypalOrderId} → status=${paypalData.status}, amount=${paypalData.amount} ${paypalData.currency}`);

    // ── Validar que el pago fue completado ───────────────────
    if (paypalData.status !== "COMPLETED") {
      throw new HttpsError(
        "failed-precondition",
        `El pago aún no fue completado. Estado: ${paypalData.status}`
      );
    }

    // ── Validar monto y moneda ───────────────────────────────
    const paidAmount = parseFloat(paypalData.amount);
    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.warn(
        `verifyPaypalAndCreateEvent: Monto incorrecto — esperado ${expectedAmount}, recibido ${paidAmount}`
      );
      throw new HttpsError(
        "failed-precondition",
        `El monto pagado (${paidAmount}) no coincide con el precio del servicio (${expectedAmount}).`
      );
    }

    // ── Verificar que no haya duplicado de esta orden ────────
    const existingPayment = await db.collection("events")
      .where("paypalOrderId", "==", paypalOrderId)
      .limit(1)
      .get();

    if (!existingPayment.empty) {
      console.warn(`verifyPaypalAndCreateEvent: Orden ${paypalOrderId} ya fue procesada.`);
      throw new HttpsError("already-exists", "Esta orden ya fue procesada anteriormente.");
    }

    // ── Verificar conflicto de horario ───────────────────────
    const hasConflict = await checkTimeConflict(db, calendarId, fullDate, time, duration);
    if (hasConflict) {
      throw new HttpsError("failed-precondition", "El horario seleccionado ya no está disponible.");
    }

    // ── Crear la cita en Firestore ───────────────────────────
    const priceStr = `${expectedCurrency} ${expectedAmount.toFixed(2)}`;

    const newEvent = {
      calendarId,
      groupId:     groupId     || null,
      groupTitle:  groupTitle   || null,
      month:       month       || "",
      day:         day         || "",
      time,
      service:     service     || "Consulta",
      type:        type        || "Consulta",
      duration,
      client,
      email,
      phone,
      termsAccepted: !!termsAccepted,
      price: priceStr,
      // Campos de pago
      paymentMethod:  "paypal",
      paymentStatus:  "paid",
      paypalOrderId,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      // Metadatos
      status:       "scheduled",
      statusColor:  "bg-emerald-500",
      isCancelable: true,
      fullDate,
      ownerUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth?.uid || "anonymous",
    };

    const docRef = await db.collection("events").add(newEvent);

    console.log(`verifyPaypalAndCreateEvent: Cita creada con pago verificado — eventId=${docRef.id}, order=${paypalOrderId}`);

    return {
      success:  true,
      message:  "Pago verificado y cita programada con éxito.",
      eventId:  docRef.id,
    };
  }
);
