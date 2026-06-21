/**
 * Plantillas HTML de correos para clientes (estilo limpio, responsive básico).
 */
type Variant = "confirm" | "cancel" | "reschedule" | "reminder";

interface AppointmentEmailData {
  client?: string;
  service?: string;
  calendarName?: string;
  day?: string;
  month?: string;
  time?: string;
}

const COPY: Record<Variant, { subject: string; heading: string; intro: string; accent: string }> = {
  confirm: {
    subject: "Tu cita está confirmada ✅",
    heading: "¡Cita confirmada!",
    intro: "Hemos registrado tu cita con los siguientes detalles:",
    accent: "#16a34a",
  },
  cancel: {
    subject: "Tu cita ha sido cancelada",
    heading: "Cita cancelada",
    intro: "Te confirmamos que la siguiente cita fue cancelada:",
    accent: "#dc2626",
  },
  reschedule: {
    subject: "Tu cita fue reprogramada",
    heading: "Cita reprogramada",
    intro: "Tu cita cambió de fecha/hora. Estos son los nuevos detalles:",
    accent: "#2563eb",
  },
  reminder: {
    subject: "Recordatorio de tu próxima cita ⏰",
    heading: "Recordatorio de cita",
    intro: "Te recordamos que tienes una cita próximamente:",
    accent: "#2563eb",
  },
};

// Estos correos se envían siempre a `data.email` (la dirección indicada en
// el formulario público de reserva), pero quien la indica puede escribir
// CUALQUIER cosa en `client`/`service`/`calendarName` — incluyendo otra
// persona como destinatario. Sin escapar, alguien podría inyectar HTML/links
// dentro de un correo enviado desde nuestro dominio (suplantación/phishing).
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAppointmentEmail(variant: Variant, data: AppointmentEmailData): { subject: string; html: string } {
  const c = COPY[variant];
  const fecha = escapeHtml(`${data.day || ""} ${data.month || ""}`.trim() || "—");
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#64748b;font-size:13px;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;">${escapeHtml(value) || "—"}</td>
    </tr>`;

  const html = `
  <div style="background:#f5f5f7;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
      <div style="height:6px;background:${c.accent};"></div>
      <div style="padding:28px 28px 8px;">
        <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">${c.heading}</h1>
        <p style="margin:0 0 18px;color:#475569;font-size:14px;line-height:1.5;">
          Hola ${escapeHtml(data.client)}, ${c.intro}
        </p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #f1f5f9;">
          ${row("Servicio", data.service || "")}
          ${row("Calendario", data.calendarName || "")}
          ${row("Fecha", fecha)}
          ${row("Hora", data.time || "")}
        </table>
      </div>
      <div style="padding:18px 28px 28px;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
          Este es un correo automático de Acryl Calendar. Si tienes dudas, responde a este mensaje.
        </p>
      </div>
    </div>
  </div>`;

  return { subject: c.subject, html };
}
