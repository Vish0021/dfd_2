"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = void 0;
const logger = require("firebase-functions/logger");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
require("./config"); // ensure global options are applied
const db = admin.firestore();
const messaging = admin.messaging();
const FN = "sendNotification";
exports.sendNotification = (0, firestore_1.onDocumentCreated)({ document: "notifications/{notificationId}", region: "asia-south1" }, async (event) => {
    var _a;
    const snapshot = event.data;
    if (!snapshot) {
        logger.warn("No data associated with the notification event", {
            functionName: FN,
            notificationId: event.params.notificationId,
        });
        return;
    }
    const notification = snapshot.data();
    const target = notification.target; // "user" or "admins"
    const notificationId = event.params.notificationId;
    try {
        let tokens = [];
        // 1. Resolve Target Tokens
        if (target === "user" && notification.userId) {
            // Fetch from deviceTokens collection
            const tokensSnap = await db
                .collection("deviceTokens")
                .where("userId", "==", notification.userId)
                .get();
            tokensSnap.docs.forEach((doc) => {
                const t = doc.data().token;
                if (t && typeof t === "string")
                    tokens.push(t);
            });
            // Fallback: user doc fcmToken
            const userDoc = await db.collection("users").doc(notification.userId).get();
            if (userDoc.exists) {
                const token = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
                if (token && typeof token === "string" && !tokens.includes(token)) {
                    tokens.push(token);
                }
            }
        }
        else if (target === "admins") {
            const adminDocs = await db.collection("users").where("role", "==", "admin").get();
            adminDocs.forEach((doc) => {
                var _a;
                const token = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
                if (token && typeof token === "string")
                    tokens.push(token);
            });
        }
        if (tokens.length === 0) {
            logger.info("No valid FCM tokens found for target", {
                functionName: FN,
                notificationId,
                target,
            });
            await snapshot.ref.update({
                status: "failed",
                error: "No tokens found",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }
        // 2. Construct Message
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: notification.data || {},
            tokens,
        };
        // 3. Dispatch using Admin SDK
        const response = await messaging.sendEachForMulticast(message);
        logger.info("Notification dispatched", {
            functionName: FN,
            notificationId,
            target,
            tokenCount: tokens.length,
            successCount: response.successCount,
            failureCount: response.failureCount,
        });
        await snapshot.ref.update({
            status: "sent",
            dispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
            successCount: response.successCount,
            failureCount: response.failureCount,
        });
        // 4. Cleanup invalid tokens
        if (response.failureCount > 0) {
            const invalidTokens = [];
            response.responses.forEach((resp, idx) => {
                var _a, _b;
                if (!resp.success &&
                    (((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) === "messaging/invalid-registration-token" ||
                        ((_b = resp.error) === null || _b === void 0 ? void 0 : _b.code) === "messaging/registration-token-not-registered")) {
                    invalidTokens.push(tokens[idx]);
                }
            });
            if (invalidTokens.length > 0) {
                // Remove invalid tokens from deviceTokens collection
                const batch = db.batch();
                for (const badToken of invalidTokens) {
                    const tokenDocs = await db
                        .collection("deviceTokens")
                        .where("token", "==", badToken)
                        .get();
                    tokenDocs.docs.forEach((d) => batch.delete(d.ref));
                }
                await batch.commit();
                logger.info("Cleaned up invalid FCM tokens", {
                    functionName: FN,
                    notificationId,
                    cleanedCount: invalidTokens.length,
                });
            }
        }
    }
    catch (error) {
        logger.error("Error dispatching FCM notification", {
            functionName: FN,
            notificationId,
            target,
            error: error instanceof Error ? error.message : String(error),
        });
        await snapshot.ref.update({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});
//# sourceMappingURL=sendNotification.js.map