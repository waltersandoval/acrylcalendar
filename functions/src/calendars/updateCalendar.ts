/**
 * Cloud Function para Actualizar Calendario
 * Dominio: Calendarios
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const updateCalendar = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const { calendarId, data } = request.data;
  
  if (!calendarId || !data) {
    throw new HttpsError("invalid-argument", "Faltan parámetros.");
  }

  const db = admin.firestore();
  
  try {
    const calRef = db.collection("calendars").doc(calendarId);
    const calSnap = await calRef.get();
    const safeData: Record<string, any> = { ...data };
    if (calSnap.exists) {
      const cal = calSnap.data() || {};
      const role = cal.roles?.[request.auth.uid];
      const isOwner = cal.ownerUid === request.auth.uid;
      if (!isOwner && !["owner", "admin", "editor"].includes(role)) {
        throw new HttpsError("permission-denied", "No tienes permisos para editar este calendario.");
      }
      // Solo el dueño real puede cambiar quién tiene acceso al calendario o
      // con qué rol (`roles`/`memberUids`). Un admin/editor podría intentar
      // enviar estos campos dentro de `data` para auto-asignarse más
      // permisos; los descartamos salvo que el llamante sea el dueño.
      if (!isOwner) {
        delete safeData.roles;
        delete safeData.memberUids;
        delete safeData.createdBy;
      }
    }
    await calRef.update({
      ...safeData,
      ownerUid: calSnap.exists ? calSnap.data()?.ownerUid : request.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Calendario ${calendarId} actualizado.`);
    return { success: true };
  } catch (error: any) {
    console.error("Error actualizando el calendario:", error);
    if (error instanceof HttpsError) throw error;
    // Fallback if not exists
    if (error.code === 5) {
       await db.collection("calendars").doc(calendarId).set({
         ...data,
         ownerUid: request.auth.uid,
         createdBy: request.auth.uid,
         memberUids: [request.auth.uid],
         roles: { [request.auth.uid]: "owner" },
         createdAt: admin.firestore.FieldValue.serverTimestamp(),
       }, { merge: true });
       return { success: true };
    }
    throw new HttpsError("internal", "No se pudo actualizar el calendario.");
  }
});
