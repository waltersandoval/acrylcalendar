import * as admin from "firebase-admin";

// Inicializa Firebase Admin SDK globalmente
admin.initializeApp();

// Exporta las funciones por dominio
export * from "./events";
export * from "./calendars";
export * from "./administrators";
export * from "./users";
export * from "./notifications";
export * from "./payments";
