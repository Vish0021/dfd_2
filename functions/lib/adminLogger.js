"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAdminActivity = void 0;
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const db = admin.firestore();
// ---------------------------------------------------------------------------
// Logger function
// ---------------------------------------------------------------------------
/**
 * Write an entry to the `adminLogs` collection.
 * Fire-and-forget — errors are logged but never thrown upstream.
 */
async function logAdminActivity(entry) {
    try {
        await db.collection("adminLogs").add(Object.assign(Object.assign({}, entry), { timestamp: admin.firestore.FieldValue.serverTimestamp() }));
        logger.info("Admin activity logged", {
            functionName: "adminLogger",
            action: entry.action,
            entity: entry.entity,
            entityId: entry.entityId,
            adminId: entry.adminId,
        });
    }
    catch (error) {
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
exports.logAdminActivity = logAdminActivity;
//# sourceMappingURL=adminLogger.js.map