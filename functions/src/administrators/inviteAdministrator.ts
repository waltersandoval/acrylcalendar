/**
 * Cloud Function para Invitar/Crear un Administrador
 * Dominio: Administradores
 * Acción sensible (crea usuario y asigna rol): se ejecuta en el servidor con
 * Admin SDK. Sin proveedor de email todavía: devuelve un enlace de invitación
 * (password reset link de Firebase Auth) que la UI muestra para compartir.
 */
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const inviteAdministrator = onCall({ cors: true }, async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "El usuario debe estar autenticado.");
  }

  const { name, email, phone, role } = request.data || {};

  if (!name || !email) {
    throw new HttpsError("invalid-argument", "Se requieren nombre y email.");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email))) {
    throw new HttpsError("invalid-argument", "El email no es válido.");
  }

  const db = admin.firestore();
  const assignedRole = role || "admin";

  try {
    // Crear o reutilizar el usuario de Firebase Auth.
    let uid: string;
    let isNewAccount: boolean;
    try {
      const existing = await admin.auth().getUserByEmail(email);
      uid = existing.uid;
      isNewAccount = false;
    } catch {
      const created = await admin.auth().createUser({
        email,
        displayName: name,
        emailVerified: false,
      });
      uid = created.uid;
      isNewAccount = true;
    }

    // Solo tocamos custom claims y emitimos un enlace de acceso para cuentas
    // NUEVAS creadas por esta invitación. Si la cuenta ya existía, cualquier
    // usuario autenticado podría escribir el email de otra persona aquí y
    // (a) pisar sus custom claims o (b) recibir un link para resetear su
    // contraseña, lo que equivale a un robo de cuenta ajena. Por eso, para
    // cuentas preexistentes no generamos enlace ni modificamos sus claims.
    let inviteLink: string | null = null;
    if (isNewAccount) {
      await admin.auth().setCustomUserClaims(uid, { role: assignedRole });
      try {
        inviteLink = await admin.auth().generatePasswordResetLink(email);
      } catch (e) {
        console.warn("No se pudo generar el enlace de invitación:", e);
      }
    }

    // Persistir el administrador.
    const adminDoc = {
      name,
      email,
      phone: phone || "",
      role: assignedRole,
      uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ownerUid: request.auth.uid,
      createdBy: request.auth.uid,
      status: isNewAccount ? "pending" : "linked",
    };
    const ref = await db.collection("administrators").add(adminDoc);

    console.log(`Administrador invitado: ${email} (uid ${uid}, rol ${assignedRole}, nuevo: ${isNewAccount}).`);

    return {
      success: true,
      adminId: ref.id,
      uid,
      inviteLink,
      alreadyHadAccount: !isNewAccount,
      message: isNewAccount
        ? "Administrador invitado con éxito."
        : "Ya existía una cuenta con este correo; se vinculó como administrador. Esa persona debe ingresar con su contraseña actual.",
    };
  } catch (error: any) {
    console.error("Error invitando administrador:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "No se pudo invitar al administrador.");
  }
});
