"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteItem = exports.adminUpdateItem = exports.adminCreateItem = exports.adminToggleStoreActive = exports.adminUpdateStore = exports.adminCreateStore = void 0;
const logger = require("firebase-functions/logger");
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const adminLogger_1 = require("./adminLogger");
const rateLimiter_1 = require("./rateLimiter");
require("./config"); // ensure global options are applied
const db = admin.firestore();
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function requireAdmin(uid) {
    var _a;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists || ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can perform this action.");
    }
}
async function adminRateGate(uid) {
    await (0, rateLimiter_1.enforceRateLimit)(uid, "adminActions", {
        maxCalls: 30,
        windowSeconds: 60,
        actionName: "admin actions",
    });
}
// ---------------------------------------------------------------------------
// Store management
// ---------------------------------------------------------------------------
exports.adminCreateStore = (0, https_1.onCall)(async (request) => {
    const FN = "adminCreateStore";
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    await requireAdmin(auth.uid);
    await adminRateGate(auth.uid);
    try {
        const { name, type, taxPercentage, townId } = data;
        if (!name || typeof name !== "string") {
            throw new https_1.HttpsError("invalid-argument", "name is required and must be a string.");
        }
        if (!type || typeof type !== "string") {
            throw new https_1.HttpsError("invalid-argument", "type is required and must be a string.");
        }
        if (taxPercentage !== undefined && (typeof taxPercentage !== "number" || taxPercentage < 0 || taxPercentage > 100)) {
            throw new https_1.HttpsError("invalid-argument", "taxPercentage must be a number between 0 and 100.");
        }
        const ref = await db.collection("stores").add({
            name: name.trim(),
            type: type.trim(),
            taxPercentage: taxPercentage !== null && taxPercentage !== void 0 ? taxPercentage : 5,
            townId: typeof townId === "string" ? townId.trim() : "",
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await (0, adminLogger_1.logAdminActivity)({
            adminId: auth.uid,
            action: "create_store",
            entity: "store",
            entityId: ref.id,
            details: { name, type },
        });
        logger.info("Store created", { functionName: FN, storeId: ref.id, adminId: auth.uid });
        return { storeId: ref.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
exports.adminUpdateStore = (0, https_1.onCall)(async (request) => {
    const FN = "adminUpdateStore";
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    await requireAdmin(auth.uid);
    await adminRateGate(auth.uid);
    try {
        const _a = data, { storeId } = _a, updates = __rest(_a, ["storeId"]);
        if (!storeId || typeof storeId !== "string") {
            throw new https_1.HttpsError("invalid-argument", "storeId is required.");
        }
        const storeSnap = await db.collection("stores").doc(storeId).get();
        if (!storeSnap.exists) {
            throw new https_1.HttpsError("not-found", `Store ${storeId} not found.`);
        }
        const safeUpdates = {};
        if (typeof updates.name === "string")
            safeUpdates.name = updates.name.trim();
        if (typeof updates.type === "string")
            safeUpdates.type = updates.type.trim();
        if (typeof updates.taxPercentage === "number" && updates.taxPercentage >= 0 && updates.taxPercentage <= 100) {
            safeUpdates.taxPercentage = updates.taxPercentage;
        }
        if (typeof updates.townId === "string")
            safeUpdates.townId = updates.townId.trim();
        if (Object.keys(safeUpdates).length === 0) {
            throw new https_1.HttpsError("invalid-argument", "No valid fields to update.");
        }
        await db.collection("stores").doc(storeId).update(safeUpdates);
        await (0, adminLogger_1.logAdminActivity)({
            adminId: auth.uid,
            action: "update_store",
            entity: "store",
            entityId: storeId,
            details: safeUpdates,
        });
        logger.info("Store updated", { functionName: FN, storeId, adminId: auth.uid });
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
exports.adminToggleStoreActive = (0, https_1.onCall)(async (request) => {
    const FN = "adminToggleStoreActive";
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    await requireAdmin(auth.uid);
    await adminRateGate(auth.uid);
    try {
        const { storeId, active } = data;
        if (!storeId || typeof storeId !== "string") {
            throw new https_1.HttpsError("invalid-argument", "storeId is required.");
        }
        if (typeof active !== "boolean") {
            throw new https_1.HttpsError("invalid-argument", "active must be a boolean.");
        }
        const storeSnap = await db.collection("stores").doc(storeId).get();
        if (!storeSnap.exists) {
            throw new https_1.HttpsError("not-found", `Store ${storeId} not found.`);
        }
        await db.collection("stores").doc(storeId).update({ active });
        await (0, adminLogger_1.logAdminActivity)({
            adminId: auth.uid,
            action: "toggle_store_active",
            entity: "store",
            entityId: storeId,
            details: { active },
        });
        logger.info("Store active toggled", { functionName: FN, storeId, active, adminId: auth.uid });
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
// ---------------------------------------------------------------------------
// Item / menu management
// ---------------------------------------------------------------------------
exports.adminCreateItem = (0, https_1.onCall)(async (request) => {
    const FN = "adminCreateItem";
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    await requireAdmin(auth.uid);
    await adminRateGate(auth.uid);
    try {
        const { storeId, name, price, category, description, imageUrl } = data;
        if (!storeId || typeof storeId !== "string")
            throw new https_1.HttpsError("invalid-argument", "storeId is required.");
        if (!name || typeof name !== "string")
            throw new https_1.HttpsError("invalid-argument", "name is required.");
        if (typeof price !== "number" || price < 0)
            throw new https_1.HttpsError("invalid-argument", "price must be a non-negative number.");
        if (!category || typeof category !== "string")
            throw new https_1.HttpsError("invalid-argument", "category is required.");
        const storeSnap = await db.collection("stores").doc(storeId).get();
        if (!storeSnap.exists) {
            throw new https_1.HttpsError("not-found", `Store ${storeId} not found.`);
        }
        const ref = await db.collection("items").add({
            storeId,
            name: name.trim(),
            price,
            category: category.trim(),
            description: typeof description === "string" ? description.trim() : "",
            imageUrl: typeof imageUrl === "string" ? imageUrl.trim() : "",
            available: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await (0, adminLogger_1.logAdminActivity)({
            adminId: auth.uid,
            action: "create_item",
            entity: "item",
            entityId: ref.id,
            details: { storeId, name, price, category },
        });
        logger.info("Item created", { functionName: FN, itemId: ref.id, storeId, adminId: auth.uid });
        return { itemId: ref.id };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
exports.adminUpdateItem = (0, https_1.onCall)(async (request) => {
    const FN = "adminUpdateItem";
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    await requireAdmin(auth.uid);
    await adminRateGate(auth.uid);
    try {
        const _a = data, { itemId } = _a, updates = __rest(_a, ["itemId"]);
        if (!itemId || typeof itemId !== "string") {
            throw new https_1.HttpsError("invalid-argument", "itemId is required.");
        }
        const itemSnap = await db.collection("items").doc(itemId).get();
        if (!itemSnap.exists) {
            throw new https_1.HttpsError("not-found", `Item ${itemId} not found.`);
        }
        const safeUpdates = {};
        if (typeof updates.name === "string")
            safeUpdates.name = updates.name.trim();
        if (typeof updates.price === "number" && updates.price >= 0)
            safeUpdates.price = updates.price;
        if (typeof updates.category === "string")
            safeUpdates.category = updates.category.trim();
        if (typeof updates.description === "string")
            safeUpdates.description = updates.description.trim();
        if (typeof updates.imageUrl === "string")
            safeUpdates.imageUrl = updates.imageUrl.trim();
        if (typeof updates.available === "boolean")
            safeUpdates.available = updates.available;
        if (Object.keys(safeUpdates).length === 0) {
            throw new https_1.HttpsError("invalid-argument", "No valid fields to update.");
        }
        await db.collection("items").doc(itemId).update(safeUpdates);
        await (0, adminLogger_1.logAdminActivity)({
            adminId: auth.uid,
            action: "update_item",
            entity: "item",
            entityId: itemId,
            details: safeUpdates,
        });
        logger.info("Item updated", { functionName: FN, itemId, adminId: auth.uid });
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
exports.adminDeleteItem = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    const FN = "adminDeleteItem";
    const { auth, data } = request;
    if (!auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    await requireAdmin(auth.uid);
    await adminRateGate(auth.uid);
    try {
        const { itemId } = data;
        if (!itemId || typeof itemId !== "string") {
            throw new https_1.HttpsError("invalid-argument", "itemId is required.");
        }
        const itemSnap = await db.collection("items").doc(itemId).get();
        if (!itemSnap.exists) {
            throw new https_1.HttpsError("not-found", `Item ${itemId} not found.`);
        }
        const itemName = (_b = (_a = itemSnap.data()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Unknown";
        await db.collection("items").doc(itemId).delete();
        await (0, adminLogger_1.logAdminActivity)({
            adminId: auth.uid,
            action: "delete_item",
            entity: "item",
            entityId: itemId,
            details: { name: itemName },
        });
        logger.info("Item deleted", { functionName: FN, itemId, itemName, adminId: auth.uid });
        return { success: true };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "Unexpected server error.");
    }
});
//# sourceMappingURL=adminOperations.js.map