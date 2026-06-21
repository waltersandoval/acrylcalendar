/**
 * Cloud Function: Eliminar cuenta + todos los datos del usuario.
 * Acción sensible e irreversible: borra en Firestore lo que pertenece al uid
 * (calendarios y sus citas, citas creadas por él, administradores creados,
 * doc de usuario) y finalmente elimina el usuario de Firebase Auth.
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

async function deleteQueryBatch(query: FirebaseFirestore.Query): Promise<string[]> {
  const ids: string[] = [];
  const snap = await query.get();
  if (snap.empty) return ids;
  const db = admin.firestore();
  // Firestore limita a 500 escrituras por batch.
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    ids.push(doc.id);
    batch.delete(doc.ref);
    count++;
    if (count === 450) { await batch.commit(); batch = db.batch(); count = 0; }
  }
  if (count > 0) await batch.commit();
  return ids;
}

export const deleteAccount = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();

  try {
    // Calendarios del usuario (por createdBy y por ownerUid).
    const calIds = new Set<string>();
    (await deleteQueryBatch(db.collection("calendars").where("createdBy", "==", uid))).forEach((id) => calIds.add(id));
    (await deleteQueryBatch(db.collection("calendars").where("ownerUid", "==", uid))).forEach((id) => calIds.add(id));

    // Citas de esos calendarios.
    for (const cid of calIds) {
      await deleteQueryBatch(db.collection("events").where("calendarId", "==", cid));
    }

    // Configuraciones de pago de esos calendarios, incluyendo el Client
    // Secret de PayPal guardado en la subcolección privada — si no se borra
    // aquí, queda en la base de datos para siempre tras eliminar la cuenta.
    for (const cid of calIds) {
      const configIds = await deleteQueryBatch(db.collection("payment_configs").where("calendarId", "==", cid));
      for (const configId of configIds) {
        await db.collection("payment_configs").doc(configId).collection("private").doc("secrets").delete().catch(() => {});
      }
    }

    // Citas y administradores creados por el usuario.
    await deleteQueryBatch(db.collection("events").where("createdBy", "==", uid));
    await deleteQueryBatch(db.collection("administrators").where("createdBy", "==", uid));

    // Integraciones y notificaciones propias.
    await deleteQueryBatch(db.collection("integrations").where("ownerUid", "==", uid));
    await deleteQueryBatch(db.collection("notifications").where("ownerUid", "==", uid));

    // Documento de usuario (tokens, prefs).
    await db.collection("users").doc(uid).delete().catch(() => {});

    // Finalmente, eliminar el usuario de Auth.
    await admin.auth().deleteUser(uid);

    console.log(`Cuenta ${uid} y sus datos eliminados.`);
    return { success: true };
  } catch (error: any) {
    console.error("Error eliminando la cuenta:", error);
    throw new HttpsError("internal", "No se pudo eliminar la cuenta por completo.");
  }
});
