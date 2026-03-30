import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logAdminActivity } from "./adminLogger";
import { enforceRateLimit } from "./rateLimiter";
import "./config"; // ensure global options are applied

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireAdmin(uid: string): Promise<void> {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can perform this action.");
  }
}

async function adminRateGate(uid: string): Promise<void> {
  await enforceRateLimit(uid, "adminActions", {
    maxCalls: 30,
    windowSeconds: 60,
    actionName: "admin actions",
  });
}

// ---------------------------------------------------------------------------
// Store management
// ---------------------------------------------------------------------------

export const adminCreateStore = onCall(async (request) => {
  const FN = "adminCreateStore";
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  await requireAdmin(auth.uid);
  await adminRateGate(auth.uid);

  try {
    const { name, type, taxPercentage, townId } = data as {
      name: string;
      type: string;
      taxPercentage?: number;
      townId?: string;
    };

    if (!name || typeof name !== "string") {
      throw new HttpsError("invalid-argument", "name is required and must be a string.");
    }
    if (!type || typeof type !== "string") {
      throw new HttpsError("invalid-argument", "type is required and must be a string.");
    }
    if (taxPercentage !== undefined && (typeof taxPercentage !== "number" || taxPercentage < 0 || taxPercentage > 100)) {
      throw new HttpsError("invalid-argument", "taxPercentage must be a number between 0 and 100.");
    }

    const ref = await db.collection("stores").add({
      name: name.trim(),
      type: type.trim(),
      taxPercentage: taxPercentage ?? 5,
      townId: typeof townId === "string" ? townId.trim() : "",
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await logAdminActivity({
      adminId: auth.uid,
      action: "create_store",
      entity: "store",
      entityId: ref.id,
      details: { name, type },
    });

    logger.info("Store created", { functionName: FN, storeId: ref.id, adminId: auth.uid });
    return { storeId: ref.id };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});

export const adminUpdateStore = onCall(async (request) => {
  const FN = "adminUpdateStore";
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  await requireAdmin(auth.uid);
  await adminRateGate(auth.uid);

  try {
    const { storeId, ...updates } = data as {
      storeId: string;
      name?: string;
      type?: string;
      taxPercentage?: number;
      townId?: string;
    };

    if (!storeId || typeof storeId !== "string") {
      throw new HttpsError("invalid-argument", "storeId is required.");
    }

    const storeSnap = await db.collection("stores").doc(storeId).get();
    if (!storeSnap.exists) {
      throw new HttpsError("not-found", `Store ${storeId} not found.`);
    }

    const safeUpdates: Record<string, unknown> = {};
    if (typeof updates.name === "string") safeUpdates.name = updates.name.trim();
    if (typeof updates.type === "string") safeUpdates.type = updates.type.trim();
    if (typeof updates.taxPercentage === "number" && updates.taxPercentage >= 0 && updates.taxPercentage <= 100) {
      safeUpdates.taxPercentage = updates.taxPercentage;
    }
    if (typeof updates.townId === "string") safeUpdates.townId = updates.townId.trim();

    if (Object.keys(safeUpdates).length === 0) {
      throw new HttpsError("invalid-argument", "No valid fields to update.");
    }

    await db.collection("stores").doc(storeId).update(safeUpdates);

    await logAdminActivity({
      adminId: auth.uid,
      action: "update_store",
      entity: "store",
      entityId: storeId,
      details: safeUpdates,
    });

    logger.info("Store updated", { functionName: FN, storeId, adminId: auth.uid });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});

export const adminToggleStoreActive = onCall(async (request) => {
  const FN = "adminToggleStoreActive";
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  await requireAdmin(auth.uid);
  await adminRateGate(auth.uid);

  try {
    const { storeId, active } = data as { storeId: string; active: boolean };

    if (!storeId || typeof storeId !== "string") {
      throw new HttpsError("invalid-argument", "storeId is required.");
    }
    if (typeof active !== "boolean") {
      throw new HttpsError("invalid-argument", "active must be a boolean.");
    }

    const storeSnap = await db.collection("stores").doc(storeId).get();
    if (!storeSnap.exists) {
      throw new HttpsError("not-found", `Store ${storeId} not found.`);
    }

    await db.collection("stores").doc(storeId).update({ active });

    await logAdminActivity({
      adminId: auth.uid,
      action: "toggle_store_active",
      entity: "store",
      entityId: storeId,
      details: { active },
    });

    logger.info("Store active toggled", { functionName: FN, storeId, active, adminId: auth.uid });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});

// ---------------------------------------------------------------------------
// Item / menu management
// ---------------------------------------------------------------------------

export const adminCreateItem = onCall(async (request) => {
  const FN = "adminCreateItem";
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  await requireAdmin(auth.uid);
  await adminRateGate(auth.uid);

  try {
    const { storeId, name, price, category, description, imageUrl } = data as {
      storeId: string;
      name: string;
      price: number;
      category: string;
      description?: string;
      imageUrl?: string;
    };

    if (!storeId || typeof storeId !== "string") throw new HttpsError("invalid-argument", "storeId is required.");
    if (!name || typeof name !== "string") throw new HttpsError("invalid-argument", "name is required.");
    if (typeof price !== "number" || price < 0) throw new HttpsError("invalid-argument", "price must be a non-negative number.");
    if (!category || typeof category !== "string") throw new HttpsError("invalid-argument", "category is required.");

    const storeSnap = await db.collection("stores").doc(storeId).get();
    if (!storeSnap.exists) {
      throw new HttpsError("not-found", `Store ${storeId} not found.`);
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

    await logAdminActivity({
      adminId: auth.uid,
      action: "create_item",
      entity: "item",
      entityId: ref.id,
      details: { storeId, name, price, category },
    });

    logger.info("Item created", { functionName: FN, itemId: ref.id, storeId, adminId: auth.uid });
    return { itemId: ref.id };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});

export const adminUpdateItem = onCall(async (request) => {
  const FN = "adminUpdateItem";
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  await requireAdmin(auth.uid);
  await adminRateGate(auth.uid);

  try {
    const { itemId, ...updates } = data as {
      itemId: string;
      name?: string;
      price?: number;
      category?: string;
      description?: string;
      imageUrl?: string;
      available?: boolean;
    };

    if (!itemId || typeof itemId !== "string") {
      throw new HttpsError("invalid-argument", "itemId is required.");
    }

    const itemSnap = await db.collection("items").doc(itemId).get();
    if (!itemSnap.exists) {
      throw new HttpsError("not-found", `Item ${itemId} not found.`);
    }

    const safeUpdates: Record<string, unknown> = {};
    if (typeof updates.name === "string") safeUpdates.name = updates.name.trim();
    if (typeof updates.price === "number" && updates.price >= 0) safeUpdates.price = updates.price;
    if (typeof updates.category === "string") safeUpdates.category = updates.category.trim();
    if (typeof updates.description === "string") safeUpdates.description = updates.description.trim();
    if (typeof updates.imageUrl === "string") safeUpdates.imageUrl = updates.imageUrl.trim();
    if (typeof updates.available === "boolean") safeUpdates.available = updates.available;

    if (Object.keys(safeUpdates).length === 0) {
      throw new HttpsError("invalid-argument", "No valid fields to update.");
    }

    await db.collection("items").doc(itemId).update(safeUpdates);

    await logAdminActivity({
      adminId: auth.uid,
      action: "update_item",
      entity: "item",
      entityId: itemId,
      details: safeUpdates,
    });

    logger.info("Item updated", { functionName: FN, itemId, adminId: auth.uid });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});

export const adminDeleteItem = onCall(async (request) => {
  const FN = "adminDeleteItem";
  const { auth, data } = request;
  if (!auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  await requireAdmin(auth.uid);
  await adminRateGate(auth.uid);

  try {
    const { itemId } = data as { itemId: string };
    if (!itemId || typeof itemId !== "string") {
      throw new HttpsError("invalid-argument", "itemId is required.");
    }

    const itemSnap = await db.collection("items").doc(itemId).get();
    if (!itemSnap.exists) {
      throw new HttpsError("not-found", `Item ${itemId} not found.`);
    }

    const itemName = itemSnap.data()?.name ?? "Unknown";

    await db.collection("items").doc(itemId).delete();

    await logAdminActivity({
      adminId: auth.uid,
      action: "delete_item",
      entity: "item",
      entityId: itemId,
      details: { name: itemName },
    });

    logger.info("Item deleted", { functionName: FN, itemId, itemName, adminId: auth.uid });
    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Unexpected error", { functionName: FN, adminId: auth.uid, error: error instanceof Error ? error.message : String(error) });
    throw new HttpsError("internal", "Unexpected server error.");
  }
});
