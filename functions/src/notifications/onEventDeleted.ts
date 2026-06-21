/**
 * Trigger: al eliminarse una cita (events/{id}), envía correo de CANCELACIÓN al cliente.
 */
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail, RESEND_API_KEY } from "../email/resend";
import { buildAppointmentEmail } from "../email/templates";

export const onEventDeleted = onDocumentDeleted(
  { document: "events/{eventId}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.email) return;

    let calendarName = "Calendario";
    if (data.calendarId) {
      const cal = await admin.firestore().collection("calendars").doc(data.calendarId).get();
      if (cal.exists) calendarName = cal.data()?.title || "Calendario";
    }

    const { subject, html } = buildAppointmentEmail("cancel", {
      client: data.client, service: data.service, calendarName,
      day: data.day, month: data.month, time: data.time,
    });
    await sendEmail({ to: data.email, subject, html });
  },
);
