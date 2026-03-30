"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
const logger = require("firebase-functions/logger");
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const config_1 = require("./config");
const rateLimiter_1 = require("./rateLimiter");
require("./config"); // ensure global options are applied
const db = admin.firestore();
const FN = "createOrder";
// ---------------------------------------------------------------------------
// createOrder — production-hardened callable
// ---------------------------------------------------------------------------
exports.createOrder = (0, https_1.onCall)({ minInstances: 1 }, async (request) => {
    var _a, _b;
    const { auth, data } = request;
    const payload = data;
    const requestId = payload.requestId || admin.firestore().collection("_").doc().id;
    // ── 1. Authentication ──────────────────────────────────────────────────
    if (!auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be signed in to create an order.");
    }
    const uid = auth.uid;
    // ── 2. Rate limiting (5 orders / 60 s per user) ────────────────────────
    await (0, rateLimiter_1.enforceRateLimit)(uid, "createOrder", {
        maxCalls: 5,
        windowSeconds: 60,
        actionName: "order creation",
    });
    // ── 3. Input validation ────────────────────────────────────────────────
    if (!payload.storeId ||
        typeof payload.storeId !== "string" ||
        !payload.items ||
        !Array.isArray(payload.items) ||
        payload.items.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "storeId and at least one item are required.");
    }
    if (payload.items.length > config_1.MAX_ITEMS_PER_ORDER) {
        throw new https_1.HttpsError("invalid-argument", `Maximum ${config_1.MAX_ITEMS_PER_ORDER} line items per order.`);
    }
    // Validate each line item's quantity
    for (const item of payload.items) {
        if (typeof item.itemId !== "string" || !item.itemId) {
            throw new https_1.HttpsError("invalid-argument", "Each item must have a valid itemId.");
        }
        if (typeof item.quantity !== "number" ||
            !Number.isInteger(item.quantity) ||
            item.quantity < config_1.MIN_ITEM_QUANTITY ||
            item.quantity > config_1.MAX_ITEM_QUANTITY) {
            throw new https_1.HttpsError("invalid-argument", `Quantity for item ${item.itemId} must be an integer between ${config_1.MIN_ITEM_QUANTITY} and ${config_1.MAX_ITEM_QUANTITY}.`);
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
            throw new https_1.HttpsError("not-found", "Store not found.");
        }
        const storeData = storeSnap.data();
        if (storeData.active !== true) {
            throw new https_1.HttpsError("failed-precondition", "Store is currently inactive.");
        }
        // Tax: use store-level percentage or server default
        const taxRate = typeof storeData.taxPercentage === "number"
            ? storeData.taxPercentage / 100
            : config_1.DEFAULT_TAX_RATE;
        // ── 6. Validate items & compute subtotal server-side ───────────────
        let subtotal = 0;
        const finalItems = [];
        for (const reqItem of payload.items) {
            const itemSnap = await db.collection("items").doc(reqItem.itemId).get();
            if (!itemSnap.exists) {
                throw new https_1.HttpsError("not-found", `Item ${reqItem.itemId} does not exist.`);
            }
            const itemData = itemSnap.data();
            // Must belong to the same store
            if (itemData.storeId !== payload.storeId) {
                throw new https_1.HttpsError("failed-precondition", `Item ${reqItem.itemId} does not belong to store ${payload.storeId}.`);
            }
            // Must be available
            if (itemData.available !== true) {
                throw new https_1.HttpsError("failed-precondition", `Item "${(_a = itemData.name) !== null && _a !== void 0 ? _a : reqItem.itemId}" is currently unavailable.`);
            }
            const price = typeof itemData.price === "number" ? itemData.price : 0;
            subtotal += price * reqItem.quantity;
            finalItems.push({
                itemId: itemSnap.id,
                name: (_b = itemData.name) !== null && _b !== void 0 ? _b : "Unknown Item",
                price,
                quantity: reqItem.quantity,
            });
        }
        // ── 7. Compute totals (server-authoritative) ───────────────────────
        const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
        const totalAmount = parseFloat((subtotal + taxAmount + config_1.DELIVERY_FEE).toFixed(2));
        // ── 8. Construct order document ────────────────────────────────────
        const orderDocData = {
            userId: uid,
            storeId: payload.storeId,
            items: finalItems,
            subtotal,
            taxAmount,
            deliveryFee: config_1.DELIVERY_FEE,
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
        // ── 9. Write order ─────────────────────────────────────────────────
        const orderRef = await db.collection("orders").add(orderDocData);
        logger.info("Order created successfully", {
            functionName: FN,
            requestId,
            userId: uid,
            orderId: orderRef.id,
            storeId: payload.storeId,
            itemCount: finalItems.length,
            subtotal,
            taxAmount,
            deliveryFee: config_1.DELIVERY_FEE,
            totalAmount,
        });
        return { orderId: orderRef.id, totalAmount };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error during order creation", {
            functionName: FN,
            requestId,
            userId: uid,
            storeId: payload.storeId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
//# sourceMappingURL=createOrder.js.map