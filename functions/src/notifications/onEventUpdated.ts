import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail, RESEND_API_KEY } from "../email/resend";
import { buildAppointmentEmail, compileUserTemplate } from "../email/templates";

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
    let calData: any = null;
    if (after.calendarId) {
      const cal = await admin.firestore().collection("calendars").doc(after.calendarId).get();
      if (cal.exists) {
        calData = cal.data();
        calendarName = calData?.title || "Calendario";
      }
    }

    const commsData = calData?.section_COMMS;
    const commGroup = Array.isArray(commsData)
      ? commsData.find((g: any) => g.id === after.groupId) || commsData[0]
      : null;

    const vars = {
      "{lead_name}": after.client || "Cliente",
      "{lead_email}": after.email || "",
      "{lead_phone}": after.phone || "",
      "{calendar_title}": calendarName,
      "{group_title}": after.groupTitle || (commGroup?.name || "Cita"),
      "{host_name}": calData?.senderName || calData?.ownerName || "",
      "{host_email}": calData?.senderEmail || calData?.ownerEmail || "",
      "{status}": after.status || "Programada",
      "{calendar_dates}": `${after.day || ""} ${after.month || ""} a las ${after.time || ""}`.trim(),
    };

    let fromEmail = "";
    let replyTo = "";
    if (commGroup && commGroup.senderMode === "custom" && commGroup.senderEmail) {
      fromEmail = `${commGroup.senderName || calData?.title || "Calendar"} <${commGroup.senderEmail}>`;
      replyTo = commGroup.replyTo || "";
    }

    // Cancelación por cambio de estado.
    if (!isCancelled(before.status) && isCancelled(after.status)) {
      const cancelMode = commGroup ? commGroup.cancelMode : "yes";
      if (cancelMode !== "no") {
        let emailSubject = "";
        let emailHtml = "";

        if (commGroup && commGroup.templates?.cancel?.active !== false) {
          const cancelTpl = commGroup.templates.cancel;
          const compiled = compileUserTemplate(cancelTpl.subject, cancelTpl.body, vars);
          emailSubject = compiled.subject;
          emailHtml = compiled.html;
        } else {
          const { subject, html } = buildAppointmentEmail("cancel", {
            client: after.client, service: after.service, calendarName,
            day: after.day, month: after.month, time: after.time,
          });
          emailSubject = subject;
          emailHtml = html;
        }

        await sendEmail({
          to: after.email,
          subject: emailSubject,
          html: emailHtml,
          from: fromEmail || undefined,
          replyTo: replyTo || undefined
        });
      }

      if (calData) {
        try {
          const { deleteGoogleEvent } = require("../calendars/googleSync");
          await deleteGoogleEvent(after, calData);
        } catch (syncErr) {
          console.error("onEventUpdated: Error eliminando evento de Google Calendar:", syncErr);
        }
      }
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
      let emailSubject = "";
      let emailHtml = "";

      if (commGroup && commGroup.templates?.reschedule?.active !== false) {
        const rescheduleTpl = commGroup.templates.reschedule || {
          active: true,
          subject: "Tu cita fue reprogramada 📅",
          body: "Hola {lead_name},\n\nTu cita de {group_title} fue reprogramada. Nuevos detalles:\n\n📅 Fecha: {calendar_dates}\n⏰ Hora: {time}"
        };
        const compiled = compileUserTemplate(
          rescheduleTpl.subject,
          rescheduleTpl.body,
          {
            ...vars,
            "{time}": after.time || ""
          }
        );
        emailSubject = compiled.subject;
        emailHtml = compiled.html;
      } else {
        const { subject, html } = buildAppointmentEmail("reschedule", {
          client: after.client, service: after.service, calendarName,
          day: after.day, month: after.month, time: after.time,
        });
        emailSubject = subject;
        emailHtml = html;
      }

      await sendEmail({
        to: after.email,
        subject: emailSubject,
        html: emailHtml,
        from: fromEmail || undefined,
        replyTo: replyTo || undefined
      });
    }

    // Sincronizar Google Calendar: actualizar detalles o crear si pasa a aprobado
    if (calData) {
      try {
        const { updateGoogleEvent } = require("../calendars/googleSync");
        await updateGoogleEvent(event.params.eventId, after, calData);
      } catch (syncErr) {
        console.error("onEventUpdated: Error actualizando evento de Google Calendar:", syncErr);
      }
    }

    // Sincronizar Prueba Social
    if (calData) {
      try {
        const { syncSocialProofEvent } = require("./socialProof");
        await syncSocialProofEvent(event.params.eventId, after, calData);
      } catch (spErr) {
        console.error("onEventUpdated: Error en sincronización de prueba social:", spErr);
      }
    }
  },
);
