/**
 * Cloud Function para Eliminar Citas
 * Dominio: Calendario / Eventos
 * Procesa la eliminación/cancelación de una cita y emite reembolsos o notificaciones si aplica.
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { canManageEvent } from "./authz";

export const deleteEvent = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const { eventId } = request.data;
  if (!eventId) {
    throw new HttpsError("invalid-argument", "Falta el ID del evento.");
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
      throw new HttpsError("permission-denied", "No tienes permisos para cancelar esta cita.");
    }

    // Actualizar a estado cancelado o eliminar el doc (generalmente es mejor soft delete)
    await eventRef.update({
      status: 'cancelada',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: request.auth.uid
    });

    console.log(`Cita ${eventId} cancelada por ${request.auth.uid}`);

    return {
      success: true,
      message: "Cita cancelada con éxito"
    };

  } catch (error) {
    console.error("Error cancelando la cita:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "No se pudo cancelar la cita.");
  }
});
