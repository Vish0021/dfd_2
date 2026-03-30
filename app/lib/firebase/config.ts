import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const isBrowser = typeof window !== "undefined";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
  if (!isBrowser) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

// Exported as functions so SSR code that imports this module won't crash.
// Call them only in browser (useEffect, event handlers, loaders that run client-side).
export function getAuthInstance(): Auth | null {
  if (!app) return null;
  return getAuth(app);
}

export function getDbInstance(): Firestore | null {
  if (!app) return null;
  return getFirestore(app);
}

export function getFunctionsInstance(): Functions | null {
  if (!app) return null;
  return getFunctions(app);
}

/**
 * Returns Firebase Messaging only in environments that support it.
 * Service workers are not available in SSR.
 */
export async function getMessagingInstance() {
  if (!app) return null;
  const { getMessaging, isSupported } = await import("firebase/messaging");
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
}

// Convenience singletons — undefined on SSR, valid instances on client.
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app) : null;

export default app;

