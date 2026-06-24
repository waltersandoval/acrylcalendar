import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail, RESEND_API_KEY } from "../email/resend";
import { buildAppointmentEmail, compileUserTemplate } from "../email/templates";

export const onEventDeleted = onDocumentDeleted(
  { document: "events/{eventId}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.email) return;

    let calendarName = "Calendario";
    let calData: any = null;
    if (data.calendarId) {
      const cal = await admin.firestore().collection("calendars").doc(data.calendarId).get();
      if (cal.exists) {
        calData = cal.data();
        calendarName = calData?.title || "Calendario";
      }
    }

    const commsData = calData?.section_COMMS;
    const commGroup = Array.isArray(commsData)
      ? commsData.find((g: any) => g.id === data.groupId) || commsData[0]
      : null;

    const cancelMode = commGroup ? commGroup.cancelMode : "yes";
    if (cancelMode === "no") {
      console.log("onEventDeleted: cancelMode === 'no', no se envía correo.");
      return;
    }

    const vars = {
      "{lead_name}": data.client || "Cliente",
      "{lead_email}": data.email || "",
      "{lead_phone}": data.phone || "",
      "{calendar_title}": calendarName,
      "{group_title}": data.groupTitle || (commGroup?.name || "Cita"),
      "{host_name}": calData?.senderName || calData?.ownerName || "",
      "{host_email}": calData?.senderEmail || calData?.ownerEmail || "",
      "{status}": data.status || "Cancelada",
      "{calendar_dates}": `${data.day || ""} ${data.month || ""} a las ${data.time || ""}`.trim(),
    };

    let fromEmail = "";
    let replyTo = "";
    if (commGroup && commGroup.senderMode === "custom" && commGroup.senderEmail) {
      fromEmail = `${commGroup.senderName || calData?.title || "Calendar"} <${commGroup.senderEmail}>`;
      replyTo = commGroup.replyTo || "";
    }

    let emailSubject = "";
    let emailHtml = "";

    if (commGroup && commGroup.templates?.cancel?.active !== false) {
      const cancelTpl = commGroup.templates.cancel;
      const compiled = compileUserTemplate(cancelTpl.subject, cancelTpl.body, vars);
      emailSubject = compiled.subject;
      emailHtml = compiled.html;
    } else {
      const { subject, html } = buildAppointmentEmail("cancel", {
        client: data.client, service: data.service, calendarName,
        day: data.day, month: data.month, time: data.time,
      });
      emailSubject = subject;
      emailHtml = html;
    }

    await sendEmail({
      to: data.email,
      subject: emailSubject,
      html: emailHtml,
      from: fromEmail || undefined,
      replyTo: replyTo || undefined
    });

    if (calData) {
      try {
        const { deleteGoogleEvent } = require("../calendars/googleSync");
        await deleteGoogleEvent(data, calData);
      } catch (syncErr) {
        console.error("onEventDeleted: Error deleting event from Google Calendar:", syncErr);
      }
    }
  },
);
