/**
 * Cloud Function para Crear Calendarios
 * Dominio: Calendarios
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const createCalendar = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const { title, type } = request.data;

  if (!title) {
    throw new HttpsError("invalid-argument", "El título es requerido.");
  }
  const MAX_TEXT_LEN = 200;
  if (String(title).length > MAX_TEXT_LEN || (type && String(type).length > MAX_TEXT_LEN)) {
    throw new HttpsError("invalid-argument", "Uno de los campos enviados es demasiado largo.");
  }

  const db = admin.firestore();
  
  try {
    const newCalendar = {
      title,
      type: type || 'Consulta',
      status: true,
      groups: 0,
      schedules: '0',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      ownerUid: request.auth.uid,
      ownerEmail: request.auth.token.email || "",
      memberUids: [request.auth.uid],
      roles: { [request.auth.uid]: "owner" },
    };

    const docRef = await db.collection("calendars").add(newCalendar);

    console.log(`Calendario ${docRef.id} creado.`);

    return { 
      success: true, 
      message: "Calendario creado con éxito",
      calendarId: docRef.id
    };

  } catch (error) {
    console.error("Error creando el calendario:", error);
    throw new HttpsError("internal", "No se pudo crear el calendario.");
  }
});
