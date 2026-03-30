import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminAction =
  | "create_store"
  | "update_store"
  | "toggle_store_active"
  | "delete_store"
  | "create_item"
  | "update_item"
  | "delete_item"
  | "update_order_status";

export type AdminEntity = "store" | "item" | "order";

export interface AdminLogEntry {
  adminId: string;
  action: AdminAction;
  entity: AdminEntity;
  entityId: string;
  /** Optional: snapshot of meaningful changed data */
  details?: Record<string, unknown>;
  timestamp: FirebaseFirestore.FieldValue;
}

// ---------------------------------------------------------------------------
// Logger function
// ---------------------------------------------------------------------------

/**
 * Write an entry to the `adminLogs` collection.
 * Fire-and-forget — errors are logged but never thrown upstream.
 */
export async function logAdminActivity(
  entry: Omit<AdminLogEntry, "timestamp">
): Promise<void> {
  try {
    await db.collection("adminLogs").add({
      ...entry,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info("Admin activity logged", {
      functionName: "adminLogger",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      adminId: entry.adminId,
    });
  } catch (error) {
    logger.error("Failed to write admin audit log", {
      functionName: "adminLogger",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      adminId: entry.adminId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
