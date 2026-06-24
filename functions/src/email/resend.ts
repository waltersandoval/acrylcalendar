/**
 * Envío de correos vía Resend (https://resend.com) usando fetch (sin dependencias).
 * La API key se guarda como secret: firebase functions:secrets:set RESEND_API_KEY
 * El remitente se puede configurar con el secret EMAIL_FROM (debe ser de un dominio
 * verificado en Resend; por defecto usa el remitente de pruebas de Resend).
 */
import { defineSecret } from "firebase-functions/params";

export const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const DEFAULT_FROM = "Acryl Calendar <onboarding@resend.dev>";

export async function sendEmail(opts: { to: string; subject: string; html: string; from?: string; replyTo?: string }): Promise<boolean> {
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    console.warn("RESEND_API_KEY no configurada; se omite el envío de correo.");
    return false;
  }
  if (!opts.to) return false;

  // Remitente configurable por env var EMAIL_FROM (debe ser de un dominio verificado en Resend).
  const defaultFrom = process.env.EMAIL_FROM || DEFAULT_FROM;
  const from = opts.from || defaultFrom;

  const fetchFn: any = (globalThis as any).fetch;
  try {
    const payload: any = {
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    };
    if (opts.replyTo) {
      payload.reply_to = opts.replyTo;
    }

    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Resend respondió ${res.status}: ${text}`);
      return false;
    }
    console.log(`Correo enviado a ${opts.to}: "${opts.subject}"`);
    return true;
  } catch (e) {
    console.error("Error enviando correo con Resend:", e);
    return false;
  }
}
