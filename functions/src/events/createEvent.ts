/**
 * Cloud Function para Crear Citas
 * Dominio: Calendario / Eventos
 * Procesa la creación y validación de una nueva cita para evitar doble agendamiento.
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const clean = t.trim().toUpperCase();
  const isPm = clean.includes("PM");
  const isAm = clean.includes("AM");
  
  const timePart = clean.replace(/[AP]M/, "").trim();
  const parts = timePart.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  
  if (isPm && hours < 12) {
    hours += 12;
  } else if (isAm && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function parseDurationToMinutes(dur: string): number {
  if (!dur) return 30;
  const match = dur.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 30;
}

export const createEvent = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  const { 
    calendarId, 
    groupId, 
    groupTitle, 
    month, 
    day, 
    time, 
    service, 
    type, 
    duration, 
    client, 
    email, 
    phone, 
    termsAccepted, 
    price,
    fullDate
  } = request.data || {};
  
  if (!calendarId || !client || !fullDate || !time || !duration) {
    throw new HttpsError("invalid-argument", "Faltan parámetros requeridos para validar y crear la cita.");
  }

  // Validación básica: este endpoint es público (sin autenticación), así que
  // cualquiera puede enviarle datos. Limitamos longitudes y formato mínimo
  // para evitar abuso (payloads gigantes, emails inválidos usados para spam).
  const MAX_TEXT_LEN = 200;
  if (String(client).length > MAX_TEXT_LEN
    || (service && String(service).length > MAX_TEXT_LEN)
    || (groupTitle && String(groupTitle).length > MAX_TEXT_LEN)) {
    throw new HttpsError("invalid-argument", "Uno de los campos enviados es demasiado largo.");
  }
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (String(email).length > MAX_TEXT_LEN || !emailRegex.test(String(email))) {
      throw new HttpsError("invalid-argument", "El email no es válido.");
    }
  }
  if (phone && String(phone).length > 40) {
    throw new HttpsError("invalid-argument", "El teléfono no es válido.");
  }

  const db = admin.firestore();

  try {
    const calSnap = await db.collection("calendars").doc(calendarId).get();
    if (!calSnap.exists) {
      throw new HttpsError("not-found", "El calendario no existe.");
    }
    const calData = calSnap.data() || {};
    if (calData.status !== true || calData.deletedAt) {
      throw new HttpsError("failed-precondition", "Este calendario no está disponible para reservas.");
    }
    const ownerUid = calData.ownerUid || calData.createdBy || null;

    const selectedDateObj = new Date(fullDate);
    const reqStart = parseTimeToMinutes(time);
    const reqDur = parseDurationToMinutes(duration);
    const reqEnd = reqStart + reqDur;

    // Obtener todas las citas para este calendario
    const eventsSnapshot = await db.collection("events")
      .where("calendarId", "==", calendarId)
      .get();

    let conflict = false;

    for (const doc of eventsSnapshot.docs) {
      const event = doc.data();
      
      // Saltar cancelados
      const isCancelled = event.status === 'cancelled' || event.status === 'cancelada' || event.statusColor === 'bg-red-400';
      if (isCancelled) continue;
      
      // Verificar si es el mismo dia
      let sameDay = false;
      if (event.fullDate) {
        try {
          const eventDateObj = new Date(event.fullDate);
          if (
            eventDateObj.getFullYear() === selectedDateObj.getFullYear() &&
            eventDateObj.getMonth() === selectedDateObj.getMonth() &&
            eventDateObj.getDate() === selectedDateObj.getDate()
          ) {
            sameDay = true;
          }
        } catch (e) {
          // ignore
        }
      }
      
      // Fallback a comparación de día y mes si fullDate no coincide/no parseó bien
      if (!sameDay && event.day && event.month) {
        const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
        const targetMonth = monthNames[selectedDateObj.getMonth()];
        const matchMonth = String(event.month).toUpperCase() === targetMonth;
        const matchDay = String(event.day) === selectedDateObj.getDate().toString();
        
        let matchYear = true;
        if (event.fullDate) {
          try {
            const eventDate = new Date(event.fullDate);
            matchYear = eventDate.getFullYear() === selectedDateObj.getFullYear();
          } catch (e) {}
        }
        if (matchMonth && matchDay && matchYear) {
          sameDay = true;
        }
      }
      
      if (!sameDay) continue;
      
      // Validar solapamiento de horarios
      const eventStart = parseTimeToMinutes(event.time);
      const eventDur = parseDurationToMinutes(event.duration);
      const eventEnd = eventStart + eventDur;
      
      const overlaps = reqEnd > eventStart && reqStart < eventEnd;
      if (overlaps) {
        conflict = true;
        break;
      }
    }

    if (conflict) {
      throw new HttpsError("failed-precondition", "El horario seleccionado ya no está disponible.");
    }

    // Límite de citas activas por correo electrónico (por grupo).
    // La config vive en section_SCHEDULING.groups[].emailLimit, con valores como
    // "Sin límite", "1 cita", "2 citas"… (o formatos antiguos "1 Programación").
    // Se extrae el primer número; sin número => sin límite.
    if (email && groupId) {
      const schedGroups = (calData.section_SCHEDULING && calData.section_SCHEDULING.groups) || [];
      const grp = schedGroups.find((g: any) => g && g.id === groupId);
      const rawLimit = grp ? grp.emailLimit : null;
      const limitMatch = rawLimit ? String(rawLimit).match(/\d+/) : null;
      const emailLimit = limitMatch ? parseInt(limitMatch[0], 10) : 0;

      if (emailLimit > 0) {
        const emailLower = String(email).toLowerCase();
        let activeForEmail = 0;
        for (const doc of eventsSnapshot.docs) {
          const ev = doc.data();
          const cancelled = ev.status === "cancelled" || ev.status === "cancelada" || ev.statusColor === "bg-red-400";
          if (cancelled) continue;
          if (ev.groupId !== groupId) continue;
          if (String(ev.email || "").toLowerCase() === emailLower) {
            activeForEmail++;
          }
        }
        if (activeForEmail >= emailLimit) {
          throw new HttpsError(
            "failed-precondition",
            `Este calendario permite un máximo de ${emailLimit} cita(s) activa(s) por correo electrónico. Ya alcanzaste ese límite.`
          );
        }
      }
    }

    // Si pasa la validación sin conflicto, procedemos a guardar la cita real en la BD
    const newEvent = {
      calendarId,
      groupId: groupId || null,
      groupTitle: groupTitle || null,
      month: month || '',
      day: day || '',
      time,
      service: service || 'Consulta',
      type: type || 'Consulta',
      duration,
      client,
      email,
      phone,
      termsAccepted: !!termsAccepted,
      price: price || '',
      status: 'scheduled',
      statusColor: 'bg-blue-500',
      isCancelable: true,
      fullDate,
      ownerUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth?.uid || 'anonymous'
    };

    const docRef = await db.collection("events").add(newEvent);

    console.log(`Cita validada y creada de manera segura con ID: ${docRef.id}`);

    return { 
      success: true, 
      message: "Cita programada con éxito",
      eventId: docRef.id
    };

  } catch (error: any) {
    console.error("Error en validación/creación desde Cloud Function:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "No se pudo procesar la reservación.");
  }
});
