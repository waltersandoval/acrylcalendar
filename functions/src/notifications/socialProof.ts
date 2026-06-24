/**
 * Helper para Sincronización de Prueba Social (Social Proof)
 * Colección: social_proof_events
 */
import * as admin from "firebase-admin";

export async function syncSocialProofEvent(eventId: string, eventData: any, calData: any) {
  const db = admin.firestore();

  // Si no hay datos de calendario o la prueba social no está configurada, salir
  const spConfig = calData?.section_SOCIAL_PROOF;
  if (!spConfig || !spConfig.enabled) {
    // Si el widget se desactivó, nos aseguramos de limpiar cualquier rastro anterior
    await db.collection("social_proof_events").doc(eventId).delete().catch(() => {});
    return;
  }

  const isCancelled = eventData.status === "cancelled" || eventData.status === "cancelada" || eventData.statusColor === "bg-red-400";
  if (isCancelled) {
    await db.collection("social_proof_events").doc(eventId).delete().catch(() => {});
    return;
  }

  // Verificar si requiere aprobación manual
  let needsApproval = false;
  if (calData && calData.section_SCHEDULING && Array.isArray(calData.section_SCHEDULING.groups)) {
    const group = calData.section_SCHEDULING.groups.find((g: any) => g.id === eventData.groupId);
    if (group) {
      needsApproval = group.approvalType === "Aprobación manual";
    }
  }
  if (!needsApproval && calData && calData.section_SCHEDULING && calData.section_SCHEDULING.approvalType === "Aprobación manual") {
    needsApproval = true;
  }

  // Si requiere aprobación y el evento no está en estado programado/activo, no mostrar
  if (needsApproval && eventData.status !== "scheduled") {
    await db.collection("social_proof_events").doc(eventId).delete().catch(() => {});
    return;
  }

  // Extraer ciudad/ubicación de los campos personalizados del formulario
  let city = "";
  if (eventData.customFields) {
    const formsData = calData.section_FORMS;
    let cityFieldId: string | null = null;
    if (formsData && Array.isArray(formsData.groupsData)) {
      for (const group of formsData.groupsData) {
        if (group.fields && Array.isArray(group.fields)) {
          const found = group.fields.find((f: any) => {
            const label = String(f.label).toLowerCase();
            return label.includes("ciudad") || label.includes("city") || label.includes("provincia") || label.includes("pais") || label.includes("país") || label.includes("location") || label.includes("ubicación") || label.includes("ubicacion");
          });
          if (found) {
            cityFieldId = found.id;
            break;
          }
        }
      }
    }

    if (cityFieldId && eventData.customFields[cityFieldId]) {
      city = eventData.customFields[cityFieldId];
    }
  }

  // Guardar en la colección global de prueba social
  await db.collection("social_proof_events").doc(eventId).set({
    calendarId: eventData.calendarId,
    client: eventData.client || "Cliente",
    service: eventData.service || "Servicio",
    city: city || "",
    timestamp: eventData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
    status: eventData.status || "scheduled",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`Prueba social sincronizada para el evento ${eventId} (Ciudad: ${city || "N/A"}).`);
}
