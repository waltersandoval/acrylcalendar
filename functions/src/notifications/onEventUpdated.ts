/**
 * Trigger: al actualizarse una cita (events/{id}).
 * - Si pasó a estado cancelado → correo de CANCELACIÓN.
 * - Si cambió fecha/hora o pasó a reprogramada → correo de REPROGRAMACIÓN.
 */
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail, RESEND_API_KEY } from "../email/resend";
import { buildAppointmentEmail } from "../email/templates";

const isCancelled = (s: any) => {
  const v = String(s || "").toLowerCase();
  return v.includes("cancel");
};

export const onEventUpdated = onDocumentUpdated(
  { document: "events/{eventId}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || !after.email) return;

    let calendarName = "Calendario";
    if (after.calendarId) {
      const cal = await admin.firestore().collection("calendars").doc(after.calendarId).get();
      if (cal.exists) calendarName = cal.data()?.title || "Calendario";
    }

    const base = {
      client: after.client, service: after.service, calendarName,
      day: after.day, month: after.month, time: after.time,
    };

    // Cancelación por cambio de estado.
    if (!isCancelled(before.status) && isCancelled(after.status)) {
      const { subject, html } = buildAppointmentEmail("cancel", base);
      await sendEmail({ to: after.email, subject, html });
      return;
    }

    // Reprogramación: cambió la fecha/hora o el estado pasó a "reprogramada".
    const dateTimeChanged =
      before.fullDate !== after.fullDate ||
      before.day !== after.day ||
      before.month !== after.month ||
      before.time !== after.time;
    const becameRescheduled =
      String(after.status || "").toLowerCase().includes("reprogram") &&
      !String(before.status || "").toLowerCase().includes("reprogram");

    if (dateTimeChanged || becameRescheduled) {
      const { subject, html } = buildAppointmentEmail("reschedule", base);
      await sendEmail({ to: after.email, subject, html });
    }
  },
);
