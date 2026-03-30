"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderStatusNotification = void 0;
const logger = require("firebase-functions/logger");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
require("./config"); // ensure global options are applied
const db = admin.firestore();
const FN = "sendOrderStatusNotification";
// ---------------------------------------------------------------------------
// Human-friendly status labels for push notifications
// ---------------------------------------------------------------------------
const STATUS_MESSAGES = {
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
exports.sendOrderStatusNotification = (0, firestore_1.onDocumentUpdated)({ document: "orders/{orderId}", region: "asia-south1" }, async (event) => {
    var _a, _b, _c;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    // Guard: both snapshots must exist
    if (!beforeData || !afterData)
        return;
    // ── CRITICAL: Only fire when status ACTUALLY changed ─────────────
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    if (!newStatus || oldStatus === newStatus) {
        return; // No status change — skip entirely
    }
    const userId = afterData.userId;
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
        const tokenSet = new Set();
        // Source A: deviceTokens collection
        const tokensSnap = await db
            .collection("deviceTokens")
            .where("userId", "==", userId)
            .get();
        tokensSnap.docs.forEach((d) => {
            const t = d.data().token;
            if (t && typeof t === "string")
                tokenSet.add(t);
        });
        // Source B: user document fcmToken field (legacy fallback)
        const userDoc = await db.collection("users").doc(userId).get();
        const fcmToken = (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.fcmToken;
        if (fcmToken && typeof fcmToken === "string")
            tokenSet.add(fcmToken);
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
                var _a;
                if (!resp.success) {
                    const code = (_a = resp.error) === null || _a === void 0 ? void 0 : _a.code;
                    if (code === "messaging/invalid-registration-token" ||
                        code === "messaging/registration-token-not-registered") {
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
    }
    catch (error) {
        logger.error("Error sending push notification", {
            functionName: FN,
            orderId,
            userId,
            error: error instanceof Error ? error.message : String(error),
        });
        // Do NOT rethrow — push failure should never block the update
    }
});
//# sourceMappingURL=orderNotifications.js.map