/**
 * Firebase Cloud Messaging service.
 *
 * Responsibilities:
 *  - Request notification permission from the user.
 *  - Obtain and persist the FCM registration token.
 *  - Set up foreground message handler (shows toasts).
 *  - Enqueue notification documents for async dispatch via Cloud Functions.
 */

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, getMessagingInstance } from "../config";
import { saveFcmToken } from "./users.service";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    // Send Firebase config to the SW so it can initialize Firebase
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    const sw = reg.installing ?? reg.waiting ?? reg.active;
    sw?.postMessage({ type: "FIREBASE_CONFIG", config: firebaseConfig });
    return reg;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Request notification permission and, if granted, obtain the FCM token.
 * The token is persisted to the user's Firestore document.
 *
 * @returns The FCM token string or null when unavailable / denied.
 */
export async function initFcm(uid: string): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const swReg = await registerServiceWorker();
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const { getToken } = await import("firebase/messaging");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg ?? undefined,
    });

    if (token && uid) {
      await saveFcmToken(uid, token);
    }

    return token ?? null;
  } catch {
    // Silently fail — FCM is a best-effort feature
    return null;
  }
}

/**
 * Listen for foreground FCM messages.
 * Returns an unsubscribe function.
 *
 * @param onMessage Callback receiving { title, body, data }
 */
export async function onForegroundMessage(
  onMessage: (payload: { title: string; body: string; data: Record<string, string> }) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => undefined;

  const { onMessage: fbOnMessage } = await import("firebase/messaging");
  const unsubscribe = fbOnMessage(messaging, (payload) => {
    onMessage({
      title: payload.notification?.title ?? "DFD",
      body: payload.notification?.body ?? "",
      data: (payload.data as Record<string, string>) ?? {},
    });
  });

  return unsubscribe;
}

// ---------------------------------------------------------------------------
// Notification queue (for Cloud Functions to deliver push messages)
// ---------------------------------------------------------------------------

export type NotificationTarget = "user" | "admins";

export interface NotificationPayload {
  target: NotificationTarget;
  /** Target user UID (used when target === "user") */
  userId?: string;
  title: string;
  body: string;
  /** Arbitrary key-value data forwarded to the device */
  data?: Record<string, string>;
}

/**
 * Enqueue a notification document.
 * A Cloud Function (or background job) is responsible for picking this up
 * and dispatching the push message to FCM.
 *
 * This is a fire-and-forget operation — errors are swallowed so they never
 * block the primary order flow.
 */
export async function enqueueNotification(payload: NotificationPayload): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, "notifications"), {
      ...payload,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch {
    // Best-effort only — do not propagate
  }
}
