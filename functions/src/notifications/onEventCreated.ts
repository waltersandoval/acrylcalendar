/**
 * Trigger Firestore: al crearse una cita en events/{eventId}
 * Componente: Notificaciones / Booking público
 * Dominio: notifications
 *
 * Qué hace:
 *  1. Envía correo de CONFIRMACIÓN al cliente (email del evento)
 *  2. Guarda una notificación en la colección 'notifications' de Firestore
 *  3. Envía push notification (FCM) al dueño del calendario y a sus miembros
 *
 * Datos procesados: events/{eventId} → calendarId, client, service, email, day, month, time
 * Lógica sensible: SÍ — lee tokens FCM de usuarios y envía mensajes vía Admin SDK.
 *
 * REQUISITO: El usuario administrador debe haber activado las push desde Perfil → Notificaciones
 * para que su fcmToken esté registrado en users/{uid}.fcmTokens.
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendEmail, RESEND_API_KEY } from "../email/resend";
import { buildAppointmentEmail } from "../email/templates";

export const onEventCreated = onDocumentCreated(
  { document: "events/{eventId}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      console.warn("onEventCreated: evento sin datos, ignorando.");
      return;
    }

    const db = admin.firestore();
    const eventId = event.params.eventId;

    // ─────────────────────────────────────────────────────────────
    // 1. Resolver el calendario y su dueño
    // ─────────────────────────────────────────────────────────────
    let ownerUid: string | undefined;
    let calendarName = "Calendario";
    let calData: FirebaseFirestore.DocumentData | undefined;

    if (data.calendarId) {
      const cal = await db.collection("calendars").doc(data.calendarId).get();
      if (cal.exists) {
        calData = cal.data();
        ownerUid = calData?.ownerUid || calData?.createdBy;
        calendarName = calData?.title || "Calendario";
        console.log(`onEventCreated [${eventId}]: Calendario '${calendarName}', ownerUid=${ownerUid}`);
      } else {
        console.warn(`onEventCreated [${eventId}]: Calendario ${data.calendarId} no encontrado.`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Correo de CONFIRMACIÓN al cliente (independiente del push)
    // ─────────────────────────────────────────────────────────────
    if (data.email) {
      try {
        const { subject, html } = buildAppointmentEmail("confirm", {
          client: data.client,
          service: data.service,
          calendarName,
          day: data.day,
          month: data.month,
          time: data.time,
        });
        await sendEmail({ to: data.email, subject, html });
        console.log(`onEventCreated [${eventId}]: Correo de confirmación enviado a ${data.email}`);
      } catch (emailErr) {
        console.error(`onEventCreated [${eventId}]: Error enviando correo de confirmación:`, emailErr);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Validar ownerUid antes de continuar con push y notificación
    // ─────────────────────────────────────────────────────────────
    if (!ownerUid || ownerUid === "anonymous" || ownerUid === "anonymous-fallback") {
      console.warn(
        `onEventCreated [${eventId}]: ownerUid inválido (${ownerUid}) para calendarId=${data.calendarId}. No se envía push ni notificación.`
      );
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Guardar notificación en Firestore (campana en el dashboard)
    // ─────────────────────────────────────────────────────────────
    try {
      await db.collection("notifications").add({
        ownerUid,
        calendarId:   data.calendarId || "",
        calendarName,
        eventId,
        client:  data.client  || "Cliente",
        service: data.service || "Servicio",
        day:     data.day     || "",
        month:   data.month   || "",
        time:    data.time    || "",
        read:    false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`onEventCreated [${eventId}]: Notificación guardada en Firestore.`);
    } catch (err) {
      console.error(`onEventCreated [${eventId}]: Error guardando notificación en Firestore:`, err);
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Reunir todos los UIDs que deben recibir la push
    //    (dueño + miembros del calendario con acceso)
    // ─────────────────────────────────────────────────────────────
    const uids = new Set<string>([ownerUid]);
    const members: string[] = (calData && Array.isArray(calData.memberUids)) ? calData.memberUids : [];
    members.forEach((m) => { if (m && m !== "anonymous") uids.add(m); });

    console.log(`onEventCreated [${eventId}]: UIDs a notificar: ${[...uids].join(", ")}`);

    // ─────────────────────────────────────────────────────────────
    // 6. Recopilar los tokens FCM de todos los UIDs
    // ─────────────────────────────────────────────────────────────
    const tokenToUid = new Map<string, string>(); // token → uid (para limpiar tokens inválidos por uid)
    await Promise.all(
      [...uids].map(async (uid) => {
        try {
          const uDoc = await db.collection("users").doc(uid).get();
          const list: string[] = (uDoc.exists && uDoc.data()?.fcmTokens) || [];
          list.forEach((t) => { if (t) tokenToUid.set(t, uid); });
          console.log(`onEventCreated [${eventId}]: uid=${uid} tiene ${list.length} token(s).`);
        } catch (e) {
          console.warn(`onEventCreated [${eventId}]: Error leyendo tokens de uid=${uid}:`, e);
        }
      })
    );

    const tokens = [...tokenToUid.keys()];

    if (!tokens.length) {
      console.warn(
        `onEventCreated [${eventId}]: Ningún usuario tiene fcmTokens registrados. ` +
        `El administrador debe activar las notificaciones push en Perfil → Notificaciones push.`
      );
      return;
    }

    console.log(`onEventCreated [${eventId}]: Enviando push a ${tokens.length} token(s)...`);

    // ─────────────────────────────────────────────────────────────
    // 7. Enviar la push notification vía FCM
    // ─────────────────────────────────────────────────────────────
    const title = "Acryl Calendar";
    const clientName = data.client || "Cliente";
    const groupName = data.groupTitle || data.service || "Servicio";
    const appointmentDate = `${data.day || ""} ${data.month || ""}`.trim();
    const appointmentTime = data.time || "";

    let needsApproval = false;
    if (calData && calData.section_SCHEDULING && Array.isArray(calData.section_SCHEDULING.groups)) {
      const group = calData.section_SCHEDULING.groups.find((g: any) => g.id === data.groupId);
      if (group) {
        needsApproval = group.approvalType === "Aprobación manual";
      }
    }
    if (!needsApproval && calData && calData.section_SCHEDULING && calData.section_SCHEDULING.approvalType === "Aprobación manual") {
      needsApproval = true;
    }

    const paymentStatusText = needsApproval ? "Pago Pendiente" : "Pago Confirmado";

    const body = `📅 Nueva cita agendada\n${clientName} — ${groupName}\n📅 ${appointmentDate} a las ${appointmentTime}\n💳 ${paymentStatusText}`;

    try {
      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          eventId,
          calendarId:  data.calendarId || "",
          calendarName,
          link: "/",
        },
        webpush: {
          notification: {
            title,
            body,
            icon:  "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            // Pasa el eventId para deduplicación en el SW (tag único por cita)
            tag: `event-${eventId}`,
          },
          fcmOptions: { link: "/" },
        },
      });

      console.log(
        `onEventCreated [${eventId}]: Push enviada — éxito: ${res.successCount}/${tokens.length}, ` +
        `fallos: ${res.failureCount}`
      );

      // ─────────────────────────────────────────────────────────
      // 8. Limpiar tokens inválidos de Firestore
      // ─────────────────────────────────────────────────────────
      const invalidTokens: string[] = [];
      res.responses.forEach((r, i) => {
        if (!r.success) {
          console.warn(`onEventCreated [${eventId}]: Token[${i}] inválido — ${r.error?.message}`);
          invalidTokens.push(tokens[i]);
        }
      });

      if (invalidTokens.length) {
        // Agrupar tokens inválidos por uid para hacer una sola actualización por usuario.
        const invalidByUid = new Map<string, string[]>();
        invalidTokens.forEach((t) => {
          const uid = tokenToUid.get(t);
          if (uid) {
            if (!invalidByUid.has(uid)) invalidByUid.set(uid, []);
            invalidByUid.get(uid)!.push(t);
          }
        });

        await Promise.all(
          [...invalidByUid.entries()].map(([uid, badTokens]) =>
            db.collection("users").doc(uid).update({
              fcmTokens: admin.firestore.FieldValue.arrayRemove(...badTokens),
            }).catch((e) => console.warn(`onEventCreated: Error limpiando tokens de uid=${uid}:`, e))
          )
        );
        console.log(`onEventCreated [${eventId}]: ${invalidTokens.length} token(s) inválido(s) eliminado(s).`);
      }
    } catch (e) {
      console.error(`onEventCreated [${eventId}]: Error enviando push vía FCM:`, e);
    }
  }
);
