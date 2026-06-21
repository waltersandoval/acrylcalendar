/**
 * Cloud Function para Reprogramar Citas
 * Dominio: Calendario / Eventos
 * Procesa la reprogramación de una cita, de manera segura desde el servidor
 * y usando Firebase Admin SDK para validar permisos y evitar colisiones if needed.
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { canManageEvent } from "./authz";

export const rescheduleEvent = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  // Asegurar que el usuario está autenticado
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const { eventId, newDate, newStartTime, newEndTime } = request.data;

  if (!eventId || !newDate || !newStartTime) {
    throw new HttpsError("invalid-argument", "Faltan parámetros requeridos.");
  }

  const db = admin.firestore();

  try {
    const eventRef = db.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      throw new HttpsError("not-found", "La cita no existe.");
    }

    const eventData = eventSnap.data() || {};
    if (!(await canManageEvent(db, request.auth.uid, eventData))) {
      throw new HttpsError("permission-denied", "No tienes permisos para reprogramar esta cita.");
    }

    // Actualizar el documento en Firestore
    await eventRef.update({
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'reprogramada',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid
    });

    // Logging estructurado
    console.log(`Cita ${eventId} reprogramada por ${request.auth.uid}`);

    // Si notifySubscriber o notifyHost son verdaderos, se añadiría la lógica para enviar correos aquí

    return {
      success: true,
      message: "Cita reprogramada con éxito"
    };

  } catch (error) {
    console.error("Error reprogramando la cita:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "No se pudo reprogramar la cita.");
  }
});
