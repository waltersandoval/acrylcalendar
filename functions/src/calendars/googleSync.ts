import * as admin from "firebase-admin";
import { getValidGoogleAccessToken } from "./googleAuth";

function parseTimeToParts(t: string): { h: number; m: number } {
  if (!t) return { h: 9, m: 0 };
  const clean = t.toLowerCase().replace(/\s|\./g, "");
  const isPm = clean.includes("pm");
  const isAm = clean.includes("am");
  const match = clean.match(/(\d{1,2}):?(\d{2})?/);
  let h = match ? parseInt(match[1], 10) : 9;
  const m = match && match[2] ? parseInt(match[2], 10) : 0;
  if (isPm && h < 12) h += 12;
  if (isAm && h === 12) h = 0;
  return { h, m };
}

function eventDateTime(data: any): Date | null {
  if (!data?.fullDate) return null;
  const d = new Date(data.fullDate);
  if (isNaN(d.getTime())) return null;
  const { h, m } = parseTimeToParts(data.time || "");
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Crea un evento en el Google Calendar principal del propietario del calendario.
 */
export async function createGoogleEvent(eventId: string, eventData: any, calData: any): Promise<string | null> {
  const ownerUid = calData?.ownerUid || calData?.createdBy;
  if (!ownerUid) return null;

  // Verificar si la sincronización está activa para este grupo en section_AUTO
  const autoData = calData?.section_AUTO;
  const autoGroup = Array.isArray(autoData)
    ? autoData.find((g: any) => g.id === eventData.groupId) || autoData[0]
    : null;
  const syncActive = autoGroup ? autoGroup.syncMode === "yes" : false;

  if (!syncActive) {
    console.log(`Sincronización desactivada para el grupo ${eventData.groupId}.`);
    return null;
  }

  const accessToken = await getValidGoogleAccessToken(ownerUid);
  if (!accessToken) {
    console.warn(`No se pudo obtener un token de Google válido para el usuario ${ownerUid}.`);
    return null;
  }

  const start = eventDateTime(eventData);
  if (!start) return null;

  let durationMins = 30;
  if (eventData.duration) {
    const match = eventData.duration.match(/(\d+)/);
    if (match) durationMins = parseInt(match[1], 10);
  }
  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  const fetchFn: any = (globalThis as any).fetch;
  try {
    const res = await fetchFn("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `Reserva: ${eventData.service || "Cita"} - ${eventData.client}`,
        description: `Cita programada vía Acryl Calendar.\nCliente: ${eventData.client}\nEmail: ${eventData.email}\nTeléfono: ${eventData.phone || "No provisto"}`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      }),
    });

    if (!res.ok) {
      console.error("Error al crear evento en Google Calendar:", await res.text());
      return null;
    }

    const created = await res.json();
    if (created.id) {
      console.log(`Evento de Google Calendar creado con éxito: ${created.id}`);
      await admin.firestore().collection("events").doc(eventId).update({
        googleEventId: created.id,
      });
      return created.id;
    }
    return null;
  } catch (err) {
    console.error("Error realizando petición a Google Calendar:", err);
    return null;
  }
}

/**
 * Actualiza un evento existente en Google Calendar.
 */
export async function updateGoogleEvent(eventId: string, eventData: any, calData: any): Promise<boolean> {
  const googleEventId = eventData.googleEventId;
  if (!googleEventId) {
    // Si no existe, tal vez deba crearse si es aprobado ahora
    const status = String(eventData.status || "").toLowerCase();
    const isApproved = status === "scheduled" || status === "programada" || status === "aprobada";
    if (isApproved) {
      const newId = await createGoogleEvent(eventId, eventData, calData);
      return !!newId;
    }
    return false;
  }

  const ownerUid = calData?.ownerUid || calData?.createdBy;
  if (!ownerUid) return false;

  const accessToken = await getValidGoogleAccessToken(ownerUid);
  if (!accessToken) return false;

  const start = eventDateTime(eventData);
  if (!start) return false;

  let durationMins = 30;
  if (eventData.duration) {
    const match = eventData.duration.match(/(\d+)/);
    if (match) durationMins = parseInt(match[1], 10);
  }
  const end = new Date(start.getTime() + durationMins * 60 * 1000);

  const fetchFn: any = (globalThis as any).fetch;
  try {
    const res = await fetchFn(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `Reserva: ${eventData.service || "Cita"} - ${eventData.client}`,
        description: `Cita programada vía Acryl Calendar.\nCliente: ${eventData.client}\nEmail: ${eventData.email}\nTeléfono: ${eventData.phone || "No provisto"}`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      }),
    });

    if (!res.ok) {
      console.error("Error al actualizar evento en Google Calendar:", await res.text());
      return false;
    }

    console.log(`Evento de Google Calendar actualizado con éxito: ${googleEventId}`);
    return true;
  } catch (err) {
    console.error("Error realizando petición de actualización a Google Calendar:", err);
    return false;
  }
}

/**
 * Elimina un evento en Google Calendar.
 */
export async function deleteGoogleEvent(eventData: any, calData: any): Promise<boolean> {
  const googleEventId = eventData.googleEventId;
  if (!googleEventId) return false;

  const ownerUid = calData?.ownerUid || calData?.createdBy;
  if (!ownerUid) return false;

  const accessToken = await getValidGoogleAccessToken(ownerUid);
  if (!accessToken) return false;

  const fetchFn: any = (globalThis as any).fetch;
  try {
    const res = await fetchFn(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      // Si el evento fue eliminado manualmente en Google Calendar, devolvemos success igualmente
      if (res.status === 410 || res.status === 404) {
        console.log(`Evento de Google Calendar ya estaba eliminado: ${googleEventId}`);
        return true;
      }
      console.error("Error al eliminar evento en Google Calendar:", await res.text());
      return false;
    }

    console.log(`Evento de Google Calendar eliminado con éxito: ${googleEventId}`);
    return true;
  } catch (err) {
    console.error("Error realizando petición de eliminación a Google Calendar:", err);
    return false;
  }
}
