import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { sendEmail, RESEND_API_KEY } from "../email/resend";
import { compileUserTemplate } from "../email/templates";

interface Reminder {
  id: string;
  days: number;
  hours: number;
  minutes: number;
  channels: string[];
  target: "prospect" | "host";
  active: boolean;
  subject: string;
  body: string;
}

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
    const horizon = now + 7 * 24 * 60 * 60 * 1000; // look ahead up to 7 days

    const snap = await db.collection("events")
      .where("fullDate", ">=", new Date(now - 2 * 60 * 60 * 1000).toISOString())
      .where("fullDate", "<=", new Date(horizon).toISOString())
      .get();

    let sent = 0;
    const calNames = new Map<string, any>();

    for (const doc of snap.docs) {
      const data = doc.data();
      const status = String(data.status || "").toLowerCase();
      if (status.includes("cancel")) continue;
      if (!data.email) continue;

      const dt = eventDateTime(data);
      if (!dt) continue;
      const ts = dt.getTime();

      let calendarName = "Calendario";
      let calData: any = null;
      if (data.calendarId) {
        if (calNames.has(data.calendarId)) {
          calData = calNames.get(data.calendarId);
          calendarName = calData?.title || "Calendario";
        } else {
          const cal = await db.collection("calendars").doc(data.calendarId).get();
          if (cal.exists) {
            calData = cal.data();
            calendarName = calData?.title || "Calendario";
            calNames.set(data.calendarId, calData);
          }
        }
      }

      const commsData = calData?.section_COMMS;
      const commGroup = Array.isArray(commsData)
        ? commsData.find((g: any) => g.id === data.groupId) || commsData[0]
        : null;

      if (commGroup && commGroup.remindMode === "no") continue;

      const reminders: Reminder[] = (commGroup && commGroup.reminders) || [
        {
          id: "default-24h",
          active: true,
          days: 1,
          hours: 0,
          minutes: 0,
          channels: ["Email"],
          target: "prospect",
          subject: "Recordatorio de tu próxima cita ⏰",
          body: "Hola, {lead_name}\n\nFalta 1 día para tu cita de {group_title}!\n\nGracias por tu preferencia."
        }
      ];

      const sentRemindersList = data.sentReminders || [];

      for (const rem of reminders) {
        if (!rem.active) continue;
        if (sentRemindersList.includes(rem.id)) continue;

        // Calculate target time in ms
        const anticipationMs = (rem.days * 24 * 60 + rem.hours * 60 + rem.minutes) * 60 * 1000;
        const targetSendTime = ts - anticipationMs;

        // Send if now is past the target send time and within a 3 hour grace window
        if (now >= targetSendTime && now < targetSendTime + 3 * 60 * 60 * 1000) {
          const vars = {
            "{lead_name}": data.client || "Cliente",
            "{lead_email}": data.email || "",
            "{lead_phone}": data.phone || "",
            "{calendar_title}": calendarName,
            "{group_title}": data.groupTitle || (commGroup?.name || "Cita"),
            "{host_name}": calData?.senderName || calData?.ownerName || "",
            "{host_email}": calData?.senderEmail || calData?.ownerEmail || "",
            "{status}": data.status || "Programada",
            "{calendar_dates}": `${data.day || ""} ${data.month || ""} a las ${data.time || ""}`.trim(),
          };

          const compiled = compileUserTemplate(rem.subject, rem.body, vars);

          let fromEmail = "";
          let replyTo = "";
          if (commGroup && commGroup.senderMode === "custom" && commGroup.senderEmail) {
            fromEmail = `${commGroup.senderName || calData?.title || "Calendar"} <${commGroup.senderEmail}>`;
            replyTo = commGroup.replyTo || "";
          }

          const recipient = rem.target === "prospect" 
            ? data.email 
            : (calData?.ownerEmail || commGroup.senderEmail);

          const ok = await sendEmail({
            to: recipient,
            subject: compiled.subject,
            html: compiled.html,
            from: fromEmail || undefined,
            replyTo: replyTo || undefined
          });

          if (ok) {
            await doc.ref.update({
              sentReminders: admin.firestore.FieldValue.arrayUnion(rem.id),
              reminderSent: true
            }).catch(() => {});
            sent++;
          }
        }
      }
    }

    console.log(`sendReminders: ${sent} recordatorio(s) enviado(s).`);
  },
);
