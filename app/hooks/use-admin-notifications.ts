import { useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, enableNetwork, disableNetwork } from "firebase/firestore";
import { db } from "~/lib/firebase/config";
import { toast } from "sonner";
import type { DFDNotification } from "~/lib/firebase/schema";

const alertedIds = new Set<string>();

export function useAdminNotifications() {
  useEffect(() => {
    if (typeof window === "undefined" || !db) return;
    
    const q = query(
      collection(db, "notifications"),
      where("forAdmin", "==", true),
      where("read", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const docId = change.doc.id;
          const docData = change.doc.data() as DFDNotification;
          
          if (!docData.read && !alertedIds.has(docId)) {
            alertedIds.add(docId);
            
            // Play a sound if available, ignoring auto-play policy failures
            try {
              const audio = new Audio("/sounds/alert.mp3"); // Ensure this file exists in public/sounds
              audio.play().catch(() => {});
            } catch (e) {}

            toast.success(docData.title || "New Activity", {
              description: docData.message,
              duration: 6000,
              // Automatically mark as read when dismissed or after duration
              onAutoClose: () => {
                 updateDoc(doc(db!, "notifications", docId), { read: true }).catch((err) => console.error("AutoClose update failed:", err));
              },
              onDismiss: () => {
                 updateDoc(doc(db!, "notifications", docId), { read: true }).catch((err) => console.error("Dismiss update failed:", err));
              }
            });
          }
        }
      });
    }, (error) => {
       console.error("Firebase admin notifications listener error:", error);
    });

    // Additional fallback to ensure Firebase catches up when the app is brought to Foreground
    const handleVisibility = async () => {
      if (!db) return;
      if (document.visibilityState === "visible" && navigator.onLine) {
         try {
           await disableNetwork(db);
           await enableNetwork(db);
           console.debug("[useAdminNotifications] Tab visible, forced network resync.");
         } catch (e) {
           console.error("[useAdminNotifications] Resync failed", e);
         }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleVisibility);
    };
  }, []);
}
