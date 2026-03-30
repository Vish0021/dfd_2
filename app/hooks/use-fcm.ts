/**
 * useFcm — request notification permission and set up FCM for the logged-in user.
 *
 * - Initialises FCM once per session (guarded by a ref).
 * - Shows foreground messages as browser toasts via Sonner / the toast system.
 */

import { useEffect, useRef } from "react";
import { initFcm, onForegroundMessage } from "~/lib/firebase/services/fcm.service";

export function useFcm(uid: string | null | undefined): void {
  const initialized = useRef(false);

  useEffect(() => {
    if (!uid || initialized.current) return;
    initialized.current = true;

    let stopListening: (() => void) | null = null;

    (async () => {
      await initFcm(uid);

      stopListening = await onForegroundMessage(({ title, body }) => {
        // Show a native browser notification for foreground messages
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/favicon.svg" });
        }
      });
    })();

    return () => {
      stopListening?.();
    };
  }, [uid]);
}
