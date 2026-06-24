/**
 * Cloud Function: saveSendfoxConfig
 * Dominio: calendars / marketing
 *
 * Guarda la configuración de SendFox para un calendario de forma segura.
 * El API Key se guarda en `calendars/{calendarId}/private_settings/marketing`
 * que está bloqueado desde las reglas de Firestore (no accesible desde el cliente).
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const SECRET_PLACEHOLDER = "••••••••••••••••••••••••";

export const saveSendfoxConfig = onCall(
  { cors: true },
  async (request: CallableRequest<any>) => {
    // 1. Verificar autenticación
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
    }

    const {
      calendarId,
      enabled,
      apiKey,
      listId,
      tags,
      customFieldsMapping,
    } = request.data || {};

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
    const isOwner = calData.ownerUid === request.auth.uid;
    if (!isOwner && !["owner", "admin", "editor"].includes(role)) {
      throw new HttpsError("permission-denied", "No tienes permisos para editar el calendario asociado.");
    }

    let finalApiKey = apiKey || "";
    const privateSettingsRef = calRef.collection("private_settings").doc("marketing");
    const privateSnap = await privateSettingsRef.get();
    const existingPrivateData = privateSnap.exists ? privateSnap.data() || {} : null;

    // 3. Validar credenciales de SendFox si la integración está activa
    if (enabled) {
      if (!apiKey) {
        throw new HttpsError("invalid-argument", "El API Key de SendFox es requerido para habilitar la integración.");
      }

      // Si es el placeholder, reutilizar la llave existente
      if (finalApiKey === SECRET_PLACEHOLDER) {
        if (!existingPrivateData || !existingPrivateData.apiKey) {
          throw new HttpsError(
            "invalid-argument",
            "Se requiere ingresar la API Key de SendFox para la primera configuración."
          );
        }
        finalApiKey = existingPrivateData.apiKey;
      }

      // Validar contra la API de SendFox (Server-to-Server) listando listas de contactos
      try {
        const resp = await fetch("https://api.sendfox.com/lists", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${finalApiKey}`,
          },
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error("SendFox API validation failed:", resp.status, errText);
          throw new HttpsError(
            "invalid-argument",
            "La API Key de SendFox no es válida. Verifica e intenta de nuevo."
          );
        }
      } catch (err: any) {
        console.error("Error connecting to SendFox during validation:", err);
        if (err instanceof HttpsError) throw err;
        throw new HttpsError(
          "internal",
          "Error al conectar con la API de SendFox para validar la API Key."
        );
      }

      // Guardar la API Key de forma privada
      await privateSettingsRef.set({
        apiKey: finalApiKey,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 4. Guardar la configuración en section_MARKETING del documento del calendario
    const marketingConfig = {
      enabled: !!enabled,
      listId: listId || "",
      tags: tags || "",
      customFieldsMapping: customFieldsMapping || {},
      sendfoxConfigured: enabled ? true : (calData.section_MARKETING?.sendfoxConfigured || false),
      updatedAt: new Date().toISOString(),
    };

    await calRef.update({
      section_MARKETING: marketingConfig,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Configuración de marketing de SendFox guardada para el calendario ${calendarId}.`);
    return { success: true };
  }
);
