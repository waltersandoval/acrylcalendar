/**
 * Cloud Function: savePaypalConfig
 * Dominio: payments
 *
 * Crea o actualiza una configuración de pagos independiente en la colección `payment_configs`.
 * Valida las credenciales (Client ID y Client Secret) contra la API de PayPal antes de guardarlas.
 *
 * El Client Secret se almacena de forma segura en:
 * `payment_configs/{configId}/private/secrets` (bloqueado para acceso desde el cliente).
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const SECRET_PLACEHOLDER = "••••••••••••••••••••••••";

export const savePaypalConfig = onCall(
  { cors: true },
  async (request: CallableRequest<any>) => {
    // 1. Verificar autenticación
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const {
      configId,
      calendarId,
      groupId,
      price,
      currency,
      description,
      clientId,
      clientSecret,
      sandboxMode,
      buttonColor,
      buttonShape,
      cardCountry,
      altCurrency,
      exchangeRate,
      enabled,
    } = request.data || {};

    // Validar parámetros mínimos obligatorios
    if (!calendarId || typeof enabled === "undefined") {
      throw new HttpsError("invalid-argument", "Faltan parámetros requeridos (calendarId, enabled).");
    }

    const db = admin.firestore();

    // 2. Verificar permisos sobre el calendario asociado
    const calRef = db.collection("calendars").doc(calendarId);
    const calSnap = await calRef.get();
    if (!calSnap.exists) {
      throw new HttpsError("not-found", "El calendario asociado no existe.");
    }

    const calData = calSnap.data() || {};
    const role = calData.roles?.[request.auth.uid];
    if (calData.ownerUid !== request.auth.uid && !["owner", "admin", "editor"].includes(role)) {
      throw new HttpsError("permission-denied", "No tienes permisos para editar el calendario asociado.");
    }

    // 3. Determinar o crear la referencia del documento de configuración de pago
    let configRef;
    let isNew = true;
    if (configId) {
      configRef = db.collection("payment_configs").doc(configId);
      const configSnap = await configRef.get();
      if (configSnap.exists) {
        isNew = false;
        if (configSnap.data()?.ownerUid !== request.auth.uid) {
          throw new HttpsError("permission-denied", "No tienes permisos sobre esta configuración de pagos.");
        }
      } else {
        throw new HttpsError("not-found", "La configuración de pagos a editar no existe.");
      }
    } else {
      configRef = db.collection("payment_configs").doc();
    }

    let finalClientId = clientId || "";
    let finalSecret = clientSecret || "";
    let finalSandboxMode = !!sandboxMode;
    let finalDescription = description || "";

    const privateSecretsRef = configRef.collection("private").doc("secrets");
    const privateSecretsSnap = await privateSecretsRef.get();
    const existingPrivateData = privateSecretsSnap.exists ? privateSecretsSnap.data() || {} : null;

    // 4. Validar credenciales de PayPal si el método de pago está activo
    if (enabled) {
      if (!clientId) {
        throw new HttpsError("invalid-argument", "El Client ID es requerido para habilitar PayPal.");
      }

      // Si el secret es el marcador de posición, reutilizar el existente
      if (finalSecret === SECRET_PLACEHOLDER) {
        if (!existingPrivateData || !existingPrivateData.clientSecret) {
          throw new HttpsError(
            "invalid-argument",
            "Se requiere ingresar la Llave Secreta de PayPal para la primera configuración."
          );
        }
        finalSecret = existingPrivateData.clientSecret;
      } else if (!finalSecret) {
        throw new HttpsError("invalid-argument", "La Llave Secreta de PayPal es requerida.");
      }

      // Validar contra la API de PayPal (Server-to-Server)
      const baseUrl = finalSandboxMode
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

      try {
        const resp = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${Buffer.from(`${finalClientId}:${finalSecret}`).toString("base64")}`,
          },
          body: "grant_type=client_credentials",
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error("PayPal API validation failed:", resp.status, errText);
          throw new HttpsError(
            "invalid-argument",
            "Credenciales de PayPal inválidas. Por favor verifica tu Client ID y Llave Secreta."
          );
        }
      } catch (err: any) {
        console.error("Error connecting to PayPal during validation:", err);
        if (err instanceof HttpsError) throw err;
        throw new HttpsError(
          "internal",
          "Error al validar credenciales con la API de PayPal. Revisa la conexión."
        );
      }

      // Guardar el Client Secret de forma privada
      await privateSecretsRef.set({
        clientSecret: finalSecret,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 5. Guardar los campos públicos y metadatos en la colección principal
    const publicConfigData: any = {
      ownerUid: request.auth.uid,
      calendarId,
      calendarName: calData.title || "Calendario sin título",
      groupId: groupId || "all",
      price: price || "0.00",
      currency: currency || "USD",
      description: finalDescription,
      clientId: finalClientId,
      sandboxMode: finalSandboxMode,
      buttonColor: buttonColor || "gold",
      buttonShape: buttonShape || "rect",
      cardCountry: cardCountry || "HN",
      altCurrency: altCurrency || "",
      exchangeRate: exchangeRate || "1",
      enabled: !!enabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (isNew) {
      publicConfigData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      await configRef.set(publicConfigData);
    } else {
      await configRef.update(publicConfigData);
    }

    console.log(`Configuración de pagos ${configRef.id} guardada de forma segura para el calendario ${calendarId}.`);
    return { success: true, configId: configRef.id };
  }
);
