/**
 * Cloud Function para Transferir un Calendario
 * Dominio: Calendarios
 * Transfiere la propiedad de un calendario a otro usuario (por email). Acción
 * sensible: se hace en el servidor con Admin SDK. Si el destinatario ya tiene
 * cuenta de Firebase Auth, se enlaza su uid como nuevo propietario.
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const transferCalendar = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const { calendarId, toEmail } = request.data || {};

  if (!calendarId || !toEmail) {
    throw new HttpsError("invalid-argument", "Se requieren calendarId y toEmail.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(toEmail))) {
    throw new HttpsError("invalid-argument", "El email del destinatario no es válido.");
  }

  const db = admin.firestore();

  try {
    const calRef = db.collection("calendars").doc(calendarId);
    const calSnap = await calRef.get();
    if (!calSnap.exists) {
      throw new HttpsError("not-found", "El calendario no existe.");
    }
    const calData = calSnap.data() || {};
    if (calData.ownerUid !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Solo el propietario puede transferir este calendario.");
    }

    // Resolver el uid del destinatario. Si todavía no tiene cuenta de Firebase
    // Auth, no hay nada a lo que enlazar la propiedad: no existe ningún
    // trigger que complete la transferencia más tarde cuando se registre, así
    // que continuar dejaría el calendario sin `ownerUid`/`roles` — huérfano
    // para siempre, sin que ni el dueño original ni nadie más pueda volver a
    // administrarlo. Mejor rechazar y pedir que el destinatario se registre primero.
    let targetUid: string;
    try {
      const userRecord = await admin.auth().getUserByEmail(toEmail);
      targetUid = userRecord.uid;
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "El destinatario todavía no tiene una cuenta. Pídele que se registre primero y vuelve a intentar la transferencia."
      );
    }

    const fromUid = request.auth.uid;

    await calRef.update({
      ownerEmail: toEmail,
      ownerUid: targetUid,
      createdBy: targetUid,
      memberUids: [targetUid],
      roles: { [targetUid]: "owner" },
      transferredAt: admin.firestore.FieldValue.serverTimestamp(),
      transferredFrom: fromUid,
    });

    // Registro de auditoría de la transferencia.
    await calRef.collection("transfers").add({
      toEmail,
      toUid: targetUid,
      fromUid,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Calendario ${calendarId} transferido a ${toEmail} (uid: ${targetUid}).`);

    return {
      success: true,
      message: "Calendario transferido con éxito.",
    };
  } catch (error: any) {
    console.error("Error transfiriendo el calendario:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "No se pudo transferir el calendario.");
  }
});
