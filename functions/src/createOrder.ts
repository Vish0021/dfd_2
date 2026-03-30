import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  DELIVERY_FEE,
  DEFAULT_TAX_RATE,
  MIN_ITEM_QUANTITY,
  MAX_ITEM_QUANTITY,
  MAX_ITEMS_PER_ORDER,
} from "./config";
import { enforceRateLimit } from "./rateLimiter";

import "./config"; // ensure global options are applied

const db = admin.firestore();
const FN = "createOrder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrderItemInput {
  itemId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  storeId: string;
  items: OrderItemInput[];
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryInstructions?: string;
  /** Optional idempotency key from the client. */
  clientOrderId?: string;
  /** Optional correlation ID for logs. */
  requestId?: string;
}

// ---------------------------------------------------------------------------
// createOrder — production-hardened callable
// ---------------------------------------------------------------------------

export const createOrder = onCall({ minInstances: 1 }, async (request) => {
  const { auth, data } = request;
  const payload = data as CreateOrderRequest;
  const requestId = payload.requestId || admin.firestore().collection("_").doc().id;

  // ── 1. Authentication ──────────────────────────────────────────────────
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be signed in to create an order.");
  }
  const uid = auth.uid;

  // ── 2. Rate limiting (5 orders / 60 s per user) ────────────────────────
  await enforceRateLimit(uid, "createOrder", {
    maxCalls: 5,
    windowSeconds: 60,
    actionName: "order creation",
  });

  // ── 3. Input validation ────────────────────────────────────────────────

  if (
    !payload.storeId ||
    typeof payload.storeId !== "string" ||
    !payload.items ||
    !Array.isArray(payload.items) ||
    payload.items.length === 0
  ) {
    throw new HttpsError("invalid-argument", "storeId and at least one item are required.");
  }

  if (payload.items.length > MAX_ITEMS_PER_ORDER) {
    throw new HttpsError("invalid-argument", `Maximum ${MAX_ITEMS_PER_ORDER} line items per order.`);
  }

  // Validate each line item's quantity
  for (const item of payload.items) {
    if (typeof item.itemId !== "string" || !item.itemId) {
      throw new HttpsError("invalid-argument", "Each item must have a valid itemId.");
    }
    if (
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < MIN_ITEM_QUANTITY ||
      item.quantity > MAX_ITEM_QUANTITY
    ) {
      throw new HttpsError(
        "invalid-argument",
        `Quantity for item ${item.itemId} must be an integer between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}.`
      );
    }
  }

  // ── 4. Idempotency check ───────────────────────────────────────────────
  if (payload.clientOrderId && typeof payload.clientOrderId === "string") {
    const existing = await db
      .collection("orders")
      .where("clientOrderId", "==", payload.clientOrderId)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      logger.info("Idempotent order hit — returning existing", {
        functionName: FN,
        requestId,
        userId: uid,
        orderId: doc.id,
        clientOrderId: payload.clientOrderId,
      });
      return { orderId: doc.id, totalAmount: doc.data().totalAmount };
    }
  }

  try {
    // ── 5. Validate store ──────────────────────────────────────────────
    const storeSnap = await db.collection("stores").doc(payload.storeId).get();
    if (!storeSnap.exists) {
      throw new HttpsError("not-found", "Store not found.");
    }
    const storeData = storeSnap.data()!;
    if (storeData.active !== true) {
      throw new HttpsError("failed-precondition", "Store is currently inactive.");
    }

    // Tax: use store-level percentage or server default
    const taxRate =
      typeof storeData.taxPercentage === "number"
        ? storeData.taxPercentage / 100
        : DEFAULT_TAX_RATE;

    // ── 6. Validate items & compute subtotal server-side ───────────────
    let subtotal = 0;
    const finalItems: Array<{
      itemId: string;
      name: string;
      price: number;
      quantity: number;
    }> = [];

    for (const reqItem of payload.items) {
      const itemSnap = await db.collection("items").doc(reqItem.itemId).get();
      if (!itemSnap.exists) {
        throw new HttpsError("not-found", `Item ${reqItem.itemId} does not exist.`);
      }

      const itemData = itemSnap.data()!;

      // Must belong to the same store
      if (itemData.storeId !== payload.storeId) {
        throw new HttpsError(
          "failed-precondition",
          `Item ${reqItem.itemId} does not belong to store ${payload.storeId}.`
        );
      }

      // Must be available
      if (itemData.available !== true) {
        throw new HttpsError(
          "failed-precondition",
          `Item "${itemData.name ?? reqItem.itemId}" is currently unavailable.`
        );
      }

      const price = typeof itemData.price === "number" ? itemData.price : 0;
      subtotal += price * reqItem.quantity;

      finalItems.push({
        itemId: itemSnap.id,
        name: itemData.name ?? "Unknown Item",
        price,
        quantity: reqItem.quantity,
      });
    }

    // ── 7. Compute totals (server-authoritative) ───────────────────────
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const totalAmount = parseFloat((subtotal + taxAmount + DELIVERY_FEE).toFixed(2));

    // ── 8. Construct order document ────────────────────────────────────
    const orderDocData: Record<string, unknown> = {
      userId: uid,
      storeId: payload.storeId,
      items: finalItems,
      subtotal,
      taxAmount,
      deliveryFee: DELIVERY_FEE,
      totalAmount,
      status: "pending",

      deliveryAddress: typeof payload.deliveryAddress === "string" ? payload.deliveryAddress.trim() : "",
      deliveryPhone: typeof payload.deliveryPhone === "string" ? payload.deliveryPhone.trim() : "",
      deliveryInstructions: typeof payload.deliveryInstructions === "string" ? payload.deliveryInstructions.trim() : "",

      paymentMethod: "COD",
      paymentStatus: "pending",

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (payload.clientOrderId) {
      orderDocData.clientOrderId = payload.clientOrderId;
    }

    // ── 9. Write order and notification in a batch ──────────────────────
    const batch = db.batch();
    
    // Order doc
    const orderRef = db.collection("orders").doc();
    batch.set(orderRef, orderDocData);

    // Notification doc for Admins
    const notifRef = db.collection("notifications").doc();
    const notifData = {
      type: "NEW_ORDER",
      title: "New Order Received",
      message: `Order of ₹${totalAmount} placed.`,
      read: false,
      forAdmin: true,
      orderId: orderRef.id,
      storeId: payload.storeId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(notifRef, notifData);

    await batch.commit();

    logger.info("Order created successfully", {
      functionName: FN,
      requestId,
      userId: uid,
      orderId: orderRef.id,
      storeId: payload.storeId,
      itemCount: finalItems.length,
      subtotal,
      taxAmount,
      deliveryFee: DELIVERY_FEE,
      totalAmount,
    });

    return { orderId: orderRef.id, totalAmount };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error during order creation", {
      functionName: FN,
      requestId,
      userId: uid,
      storeId: payload.storeId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});
