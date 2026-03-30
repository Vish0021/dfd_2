"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderStatus = void 0;
const logger = require("firebase-functions/logger");
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const adminLogger_1 = require("./adminLogger");
const rateLimiter_1 = require("./rateLimiter");
require("./config"); // ensure global options are applied
const db = admin.firestore();
const FN = "updateOrderStatus";
// ---------------------------------------------------------------------------
// Valid lifecycle transitions
// ---------------------------------------------------------------------------
const STATUS_TRANSITIONS = {
    pending: ["accepted", "rejected"],
    accepted: ["out_for_delivery", "rejected"],
    out_for_delivery: ["delivered", "rejected"],
    delivered: [],
    rejected: [],
};
/** Terminal states — once here, the order is immutable. */
const TERMINAL_STATES = new Set(["delivered", "rejected"]);
const TIMESTAMP_FIELDS = {
    accepted: "acceptedAt",
    out_for_delivery: "outForDeliveryAt",
    delivered: "deliveredAt",
    rejected: "rejectedAt",
};
// Fields that must NEVER be touched by this function
const PROTECTED_FINANCIAL_FIELDS = [
    "subtotal",
    "taxAmount",
    "deliveryFee",
    "totalAmount",
];
exports.updateOrderStatus = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    var _a;
    const { auth, data } = request;
    const payload = data;
    const requestId = payload.requestId || admin.firestore().collection("_").doc().id;
    // ── 1. Authentication ──────────────────────────────────────────────────
    if (!auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be signed in.");
    }
    // ── 2. Admin role check ────────────────────────────────────────────────
    const userDoc = await db.collection("users").doc(auth.uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can update order statuses.");
    }
    // ── 3. Rate limiting (30 actions / 60 s per admin) ─────────────────────
    await (0, rateLimiter_1.enforceRateLimit)(auth.uid, "adminActions", {
        maxCalls: 30,
        windowSeconds: 60,
        actionName: "admin actions",
    });
    // ── 4. Input validation ────────────────────────────────────────────────
    const { orderId, newStatus } = data;
    if (!orderId || typeof orderId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "orderId is required and must be a string.");
    }
    if (!newStatus || typeof newStatus !== "string") {
        throw new https_1.HttpsError("invalid-argument", "newStatus is required and must be a string.");
    }
    // Reject if newStatus isn't a known status value
    const allStatuses = new Set([
        ...Object.keys(STATUS_TRANSITIONS),
        ...Object.values(STATUS_TRANSITIONS).flat(),
    ]);
    if (!allStatuses.has(newStatus)) {
        throw new https_1.HttpsError("invalid-argument", `"${newStatus}" is not a valid order status.`);
    }
    try {
        let fromStatus = "";
        // ── 5. Transaction: validate lifecycle & update ───────────────────
        const orderRef = db.collection("orders").doc(orderId);
        await db.runTransaction(async (transaction) => {
            var _a;
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) {
                throw new https_1.HttpsError("not-found", `Order ${orderId} not found.`);
            }
            const orderData = orderDoc.data();
            fromStatus = (_a = orderData.status) !== null && _a !== void 0 ? _a : "pending";
            // Terminal guard — immutable orders
            if (TERMINAL_STATES.has(fromStatus)) {
                throw new https_1.HttpsError("failed-precondition", `Order ${orderId} is in terminal state "${fromStatus}" and cannot be modified.`);
            }
            // Validate transition
            const validNextStates = STATUS_TRANSITIONS[fromStatus];
            if (!validNextStates || !validNextStates.includes(newStatus)) {
                throw new https_1.HttpsError("failed-precondition", `Invalid transition: "${fromStatus}" → "${newStatus}".`);
            }
            // Build the update payload — ONLY status + lifecycle timestamp
            const updatePayload = {
                status: newStatus,
            };
            const tsField = TIMESTAMP_FIELDS[newStatus];
            if (tsField) {
                updatePayload[tsField] = admin.firestore.FieldValue.serverTimestamp();
            }
            // Sanity guard: never write financial fields
            for (const f of PROTECTED_FINANCIAL_FIELDS) {
                delete updatePayload[f];
            }
            transaction.update(orderRef, updatePayload);
        });
        logger.info("Order status updated", {
            functionName: FN,
            requestId,
            orderId,
            fromStatus,
            toStatus: newStatus,
            adminId: auth.uid,
        });
        // ── 6. Audit log ─────────────────────────────────────────────────
        await (0, adminLogger_1.logAdminActivity)({
            adminId: auth.uid,
            action: "update_order_status",
            entity: "order",
            entityId: orderId,
            details: { fromStatus, toStatus: newStatus },
        });
        return { success: true, orderId, status: newStatus };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error updating order status", {
            functionName: FN,
            requestId,
            orderId,
            adminId: auth.uid,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
//# sourceMappingURL=updateOrderStatus.js.map