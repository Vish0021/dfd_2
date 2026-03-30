import * as logger from "firebase-functions/logger";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import "./config"; // ensure global options are applied

const db = admin.firestore();
const FN = "sendOrderStatusNotification";

// ---------------------------------------------------------------------------
// Human-friendly status labels for push notifications
// ---------------------------------------------------------------------------

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  accepted: {
    title: "Order Accepted ✅",
    body: "Your order has been accepted and is being prepared.",
  },
  out_for_delivery: {
    title: "Out for Delivery 🛵",
    body: "Your order is on its way! Stay nearby.",
  },
  delivered: {
    title: "Order Delivered 🎉",
    body: "Your order has been delivered. Enjoy your meal!",
  },
  rejected: {
    title: "Order Update ❌",
    body: "Unfortunately, your order could not be accepted at this time.",
  },
};

// ---------------------------------------------------------------------------
// sendOrderStatusNotification — Firestore trigger (hardened)
// ---------------------------------------------------------------------------

export const sendOrderStatusNotification = onDocumentUpdated(
  { document: "orders/{orderId}", region: "asia-south1" },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    // Guard: both snapshots must exist
    if (!beforeData || !afterData) return;

    // ── CRITICAL: Only fire when status ACTUALLY changed ─────────────
    const oldStatus = beforeData.status as string | undefined;
    const newStatus = afterData.status as string | undefined;

    if (!newStatus || oldStatus === newStatus) {
      return; // No status change — skip entirely
    }

    const userId = afterData.userId as string;
    const orderId = event.params.orderId;

    if (!userId) {
      logger.warn("Order has no userId — skipping notification", {
        functionName: FN,
        orderId,
      });
      return;
    }

    const msgConfig = STATUS_MESSAGES[newStatus];
    if (!msgConfig) {
      logger.info("No notification configured for status", {
        functionName: FN,
        orderId,
        status: newStatus,
      });
      return;
    }

    try {
      // ── 1. Collect device tokens from multiple sources ──────────────
      const tokenSet = new Set<string>();

      // Source A: deviceTokens collection
      const tokensSnap = await db
        .collection("deviceTokens")
        .where("userId", "==", userId)
        .get();

      tokensSnap.docs.forEach((d) => {
        const t = d.data().token;
        if (t && typeof t === "string") tokenSet.add(t);
      });

      // Source B: user document fcmToken field (legacy fallback)
      const userDoc = await db.collection("users").doc(userId).get();
      const fcmToken = userDoc.data()?.fcmToken;
      if (fcmToken && typeof fcmToken === "string") tokenSet.add(fcmToken);

      const tokens = Array.from(tokenSet);

      if (tokens.length === 0) {
        logger.info("No FCM tokens found — skipping push", {
          functionName: FN,
          orderId,
          userId,
        });
        return;
      }

      // ── 2. Send push notification ──────────────────────────────────
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: msgConfig.title,
          body: msgConfig.body,
        },
        data: {
          orderId,
          status: newStatus,
          url: `/order/${orderId}`,
        },
      });

      logger.info("Push notification dispatched", {
        functionName: FN,
        orderId,
        userId,
        oldStatus,
        newStatus,
        tokenCount: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      // ── 3. Clean up stale / invalid tokens ─────────────────────────
      if (response.failureCount > 0) {
        const batch = db.batch();
        let cleanupCount = 0;

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const code = resp.error?.code;
            if (
              code === "messaging/invalid-registration-token" ||
              code === "messaging/registration-token-not-registered"
            ) {
              const invalidToken = tokens[idx];

              // Remove from deviceTokens collection
              tokensSnap.docs.forEach((d) => {
                if (d.data().token === invalidToken) {
                  batch.delete(d.ref);
                  cleanupCount++;
                }
              });

              // Clear from user doc if it matches
              if (fcmToken === invalidToken) {
                batch.update(userDoc.ref, {
                  fcmToken: admin.firestore.FieldValue.delete(),
                });
                cleanupCount++;
              }
            }
          }
        });

        if (cleanupCount > 0) {
          await batch.commit();
          logger.info("Cleaned up invalid FCM tokens", {
            functionName: FN,
            orderId,
            userId,
            cleanupCount,
          });
        }
      }
    } catch (error) {
      logger.error("Error sending push notification", {
        functionName: FN,
        orderId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Do NOT rethrow — push failure should never block the update
    }
  }
);
