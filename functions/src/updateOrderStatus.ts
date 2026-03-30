import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logAdminActivity } from "./adminLogger";
import { enforceRateLimit } from "./rateLimiter";
import "./config"; // ensure global options are applied

const db = admin.firestore();
const FN = "updateOrderStatus";

// ---------------------------------------------------------------------------
// Valid lifecycle transitions
// ---------------------------------------------------------------------------

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["out_for_delivery", "rejected"],
  out_for_delivery: ["delivered", "rejected"],
  delivered: [],
  rejected: [],
};

/** Terminal states — once here, the order is immutable. */
const TERMINAL_STATES = new Set(["delivered", "rejected"]);

const TIMESTAMP_FIELDS: Record<string, string> = {
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

// ---------------------------------------------------------------------------
// updateOrderStatus — production-hardened callable
// ---------------------------------------------------------------------------

export interface UpdateOrderStatusRequest {
  orderId: string;
  newStatus: string;
  prepTimeMinutes?: number;
  deliveryPersonName?: string;
  /** Optional correlation ID for logs. */
  requestId?: string;
}

export const updateOrderStatus = onCall({ minInstances: 1 }, async (request) => {
  const { auth, data } = request;
  const payload = data as UpdateOrderStatusRequest;
  const requestId = payload.requestId || admin.firestore().collection("_").doc().id;

  // ── 1. Authentication ──────────────────────────────────────────────────
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be signed in.");
  }

  // ── 2. Admin role check ────────────────────────────────────────────────
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can update order statuses.");
  }

  // ── 3. Rate limiting (30 actions / 60 s per admin) ─────────────────────
  await enforceRateLimit(auth.uid, "adminActions", {
    maxCalls: 30,
    windowSeconds: 60,
    actionName: "admin actions",
  });

  // ── 4. Input validation ────────────────────────────────────────────────
  const { orderId, newStatus } = data as UpdateOrderStatusRequest;

  if (!orderId || typeof orderId !== "string") {
    throw new HttpsError("invalid-argument", "orderId is required and must be a string.");
  }
  if (!newStatus || typeof newStatus !== "string") {
    throw new HttpsError("invalid-argument", "newStatus is required and must be a string.");
  }

  // Reject if newStatus isn't a known status value
  const allStatuses = new Set([
    ...Object.keys(STATUS_TRANSITIONS),
    ...Object.values(STATUS_TRANSITIONS).flat(),
  ]);
  if (!allStatuses.has(newStatus)) {
    throw new HttpsError("invalid-argument", `"${newStatus}" is not a valid order status.`);
  }

  try {
    let fromStatus = "";

    // ── 5. Transaction: validate lifecycle & update ───────────────────
    const orderRef = db.collection("orders").doc(orderId);

    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new HttpsError("not-found", `Order ${orderId} not found.`);
      }

      const orderData = orderDoc.data()!;
      fromStatus = (orderData.status as string) ?? "pending";

      // Terminal guard — immutable orders
      if (TERMINAL_STATES.has(fromStatus)) {
        throw new HttpsError(
          "failed-precondition",
          `Order ${orderId} is in terminal state "${fromStatus}" and cannot be modified.`
        );
      }

      // Validate transition
      const validNextStates = STATUS_TRANSITIONS[fromStatus];
      if (!validNextStates || !validNextStates.includes(newStatus)) {
        throw new HttpsError(
          "failed-precondition",
          `Invalid transition: "${fromStatus}" → "${newStatus}".`
        );
      }

      // Build the update payload — ONLY status + lifecycle timestamp + allowed extras
      const updatePayload: { [key: string]: any } = {
        status: newStatus,
      };

      if (newStatus === "accepted" && typeof request.data.prepTimeMinutes === "number") {
        updatePayload.prepTimeMinutes = request.data.prepTimeMinutes;
      }
      
      if (newStatus === "out_for_delivery" && typeof request.data.deliveryPersonName === "string") {
        updatePayload.deliveryPersonName = request.data.deliveryPersonName.trim();
      }

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
    await logAdminActivity({
      adminId: auth.uid,
      action: "update_order_status",
      entity: "order",
      entityId: orderId,
      details: { fromStatus, toStatus: newStatus },
    });

    return { success: true, orderId, status: newStatus };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error updating order status", {
      functionName: FN,
      requestId,
      orderId,
      adminId: auth.uid,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});
