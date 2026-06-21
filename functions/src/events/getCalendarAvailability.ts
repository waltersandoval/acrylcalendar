/**
 * Cloud Function pública (sin autenticación) para consultar disponibilidad.
 * Devuelve únicamente fecha/hora/duración/estado de las citas de un
 * calendario — nunca el nombre, email o teléfono del cliente — para que la
 * página de reserva pública pueda calcular qué horarios están ocupados sin
 * exponer los datos personales de otros clientes a cualquier visitante.
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const getCalendarAvailability = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  const { calendarId } = request.data || {};
  if (!calendarId || typeof calendarId !== "string") {
    throw new HttpsError("invalid-argument", "Falta el ID del calendario.");
  }

  const db = admin.firestore();

  const calSnap = await db.collection("calendars").doc(calendarId).get();
  if (!calSnap.exists) {
    throw new HttpsError("not-found", "El calendario no existe.");
  }
  const calData = calSnap.data() || {};
  if (calData.status !== true || calData.deletedAt) {
    throw new HttpsError("failed-precondition", "Este calendario no está disponible.");
  }

  const eventsSnapshot = await db.collection("events")
    .where("calendarId", "==", calendarId)
    .get();

  const events = eventsSnapshot.docs.map((doc) => {
    const e = doc.data();
    return {
      id: doc.id,
      fullDate: e.fullDate || null,
      day: e.day || null,
      month: e.month || null,
      time: e.time || null,
      duration: e.duration || null,
      status: e.status || null,
      statusColor: e.statusColor || null,
    };
  });

  return { success: true, events };
});
