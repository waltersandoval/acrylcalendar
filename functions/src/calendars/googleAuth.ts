import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

const GOOGLE_CLIENT_ID = defineSecret("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = defineSecret("GOOGLE_CLIENT_SECRET");

export const exchangeGoogleCode = onCall(
  { secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] },
  async (request) => {
    const { uid } = request.auth || {};
    if (!uid) {
      throw new HttpsError("unauthenticated", "Debe iniciar sesión para realizar esta operación.");
    }

    const { code, redirectUri } = request.data || {};
    if (!code || !redirectUri) {
      throw new HttpsError("invalid-argument", "Faltan los parámetros 'code' o 'redirectUri'.");
    }

    const clientId = GOOGLE_CLIENT_ID.value();
    const clientSecret = GOOGLE_CLIENT_SECRET.value();

    if (!clientId || !clientSecret) {
      console.warn("GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados.");
      throw new HttpsError("failed-precondition", "La integración de Google Calendar no está configurada en el servidor.");
    }

    const fetchFn: any = (globalThis as any).fetch;
    try {
      // 1. Intercambiar el código por tokens
      const tokenRes = await fetchFn("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Error al intercambiar token de Google:", errText);
        throw new HttpsError("invalid-argument", "Google rechazó el código de autorización.");
      }

      const tokens = await tokenRes.json();
      const { access_token, refresh_token, expires_in } = tokens;

      // 2. Obtener el correo de la cuenta vinculada
      const profileRes = await fetchFn("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      let email = "google-calendar-account";
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.email) {
          email = profile.email;
        }
      }

      const db = admin.firestore();

      // 3. Guardar las credenciales en user_credentials/{uid} (denegado a lectura del cliente)
      const credData: any = {
        email,
        access_token,
        expires_at: Date.now() + (expires_in || 3600) * 1000,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (refresh_token) {
        credData.refresh_token = refresh_token;
      }

      await db.collection("user_credentials").doc(uid).set(credData, { merge: true });

      // 4. Crear o actualizar registro en la colección de integrations
      const integrationsRef = db.collection("integrations");
      const existingQuery = await integrationsRef
        .where("ownerUid", "==", uid)
        .where("service", "==", "Calendario de Google")
        .get();

      if (!existingQuery.empty) {
        await existingQuery.docs[0].ref.update({
          account: email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await integrationsRef.add({
          account: email,
          service: "Calendario de Google",
          type: "custom",
          ownerUid: uid,
          createdBy: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true, email };
    } catch (e: any) {
      console.error("Error en exchangeGoogleCode:", e);
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("internal", "Error interno al vincular la cuenta de Google.");
    }
  }
);

/**
 * Helper para triggers del backend: obtiene un access_token válido renovándolo si es necesario.
 */
export async function getValidGoogleAccessToken(ownerUid: string): Promise<string | null> {
  const db = admin.firestore();
  const credDoc = await db.collection("user_credentials").doc(ownerUid).get();
  if (!credDoc.exists) return null;

  const data = credDoc.data();
  if (!data || !data.access_token) return null;

  // Si expira en menos de 5 minutos, refrescar
  const isExpired = Date.now() >= (data.expires_at || 0) - 5 * 60 * 1000;
  if (!isExpired) {
    return data.access_token;
  }

  if (!data.refresh_token) {
    console.warn(`No hay refresh_token para el usuario ${ownerUid}. No se puede renovar access_token.`);
    return null;
  }

  const clientId = GOOGLE_CLIENT_ID.value();
  const clientSecret = GOOGLE_CLIENT_SECRET.value();
  if (!clientId || !clientSecret) {
    console.warn("GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados en variables de entorno.");
    return null;
  }

  const fetchFn: any = (globalThis as any).fetch;
  try {
    const res = await fetchFn("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: data.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) {
      console.error(`Google rechazó la renovación del token para ${ownerUid}:`, await res.text());
      return null;
    }

    const tokens = await res.json();
    const newAccessToken = tokens.access_token;
    const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

    await credDoc.ref.update({
      access_token: newAccessToken,
      expires_at: expiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return newAccessToken;
  } catch (err) {
    console.error(`Error renovando token de Google para ${ownerUid}:`, err);
    return null;
  }
}
