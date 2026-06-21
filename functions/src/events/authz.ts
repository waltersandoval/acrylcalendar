import * as admin from "firebase-admin";

/**
 * Determina si `uid` puede modificar/cancelar el evento `eventData`: o bien
 * es quien lo creó/posee, o bien tiene rol owner/admin/editor en el
 * calendario al que pertenece.
 */
export async function canManageEvent(
  db: admin.firestore.Firestore,
  uid: string,
  eventData: FirebaseFirestore.DocumentData
): Promise<boolean> {
  if (eventData.ownerUid === uid || eventData.createdBy === uid) {
    return true;
  }
  if (!eventData.calendarId) return false;

  const calSnap = await db.collection("calendars").doc(eventData.calendarId).get();
  if (!calSnap.exists) return false;

  const cal = calSnap.data() || {};
  const role = cal.roles?.[uid];
  return cal.ownerUid === uid || ["owner", "admin", "editor"].includes(role);
}
