/**
 * Función programada: cada hora revisa las citas dentro de las próximas 24 h que
 * aún no recibieron recordatorio y envía un correo de RECORDATORIO al cliente,
 * marcando `reminderSent: true` para no repetir.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { sendEmail, RESEND_API_KEY } from "../email/resend";
import { buildAppointmentEmail } from "../email/templates";

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

export const sendReminders = onSchedule(
  { schedule: "every 60 minutes", secrets: [RESEND_API_KEY], timeZone: "America/Guatemala" },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;

    // Trae citas no canceladas sin recordatorio enviado (filtro fino en código).
    const snap = await db.collection("events").where("reminderSent", "in", [false, null]).get().catch(async () => {
      // Si el índice/valor no existe, cae a traer todas y filtrar en memoria.
      return db.collection("events").get();
    });

    let sent = 0;
    const calNames = new Map<string, string>();

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.reminderSent) continue;
      if (!data.email) continue;
      const status = String(data.status || "").toLowerCase();
      if (status.includes("cancel")) continue;

      const dt = eventDateTime(data);
      if (!dt) continue;
      const ts = dt.getTime();
      if (ts <= now || ts > horizon) continue; // solo dentro de las próximas 24 h

      let calendarName = "Calendario";
      if (data.calendarId) {
        if (calNames.has(data.calendarId)) {
          calendarName = calNames.get(data.calendarId)!;
        } else {
          const cal = await db.collection("calendars").doc(data.calendarId).get();
          calendarName = (cal.exists && cal.data()?.title) || "Calendario";
          calNames.set(data.calendarId, calendarName);
        }
      }

      const { subject, html } = buildAppointmentEmail("reminder", {
        client: data.client, service: data.service, calendarName,
        day: data.day, month: data.month, time: data.time,
      });
      const ok = await sendEmail({ to: data.email, subject, html });
      if (ok) {
        await doc.ref.update({ reminderSent: true }).catch(() => {});
        sent++;
      }
    }

    console.log(`sendReminders: ${sent} recordatorio(s) enviado(s).`);
  },
);
