"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.backupFirestore = void 0;
const logger = require("firebase-functions/logger");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
require("./config"); // ensure global options applied
const db = admin.firestore();
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
/** GCS bucket for backups. Defaults to <project>-firestore-backups. */
const BACKUP_BUCKET = `gs://${PROJECT_ID}-firestore-backups`;
/** Collections to export. Empty array = export ALL. */
const COLLECTIONS_TO_EXPORT = []; // all collections
/** Retention policy. */
const DAILY_RETENTION = 7; // keep last 7 daily backups
const WEEKLY_RETENTION = 4; // keep last 4 weekly backups (Sundays)
// ---------------------------------------------------------------------------
// backupFirestore — Daily scheduled export
// ---------------------------------------------------------------------------
exports.backupFirestore = (0, scheduler_1.onSchedule)({
    schedule: "0 3 * * *",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    memory: "512MiB",
    timeoutSeconds: 300, // Exports can take a while
}, async () => {
    const FN = "backupFirestore";
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // e.g. "2026-03-12"
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const isWeekly = dayOfWeek === 0;
    const prefix = isWeekly
        ? `weekly/${dateStr}`
        : `daily/${dateStr}`;
    const outputUri = `${BACKUP_BUCKET}/${prefix}`;
    logger.info("Starting Firestore backup", {
        functionName: FN,
        projectId: PROJECT_ID,
        outputUri,
        backupType: isWeekly ? "weekly" : "daily",
    });
    try {
        // Use the Firestore Admin REST API to initiate an export
        const client = new admin.firestore.v1.FirestoreAdminClient();
        const databaseName = client.databasePath(PROJECT_ID, "(default)");
        const [response] = await client.exportDocuments({
            name: databaseName,
            outputUriPrefix: outputUri,
            collectionIds: COLLECTIONS_TO_EXPORT.length > 0 ? COLLECTIONS_TO_EXPORT : undefined,
        });
        logger.info("Firestore export initiated", {
            functionName: FN,
            operationName: response.name,
            outputUri,
            backupType: isWeekly ? "weekly" : "daily",
        });
        // ── Retention cleanup ─────────────────────────────────────────────
        await cleanupOldBackups(FN);
    }
    catch (error) {
        logger.error("Firestore backup failed", {
            functionName: FN,
            projectId: PROJECT_ID,
            outputUri,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
/**
 * Delete backup metadata entries older than retention policy.
 * We track backups in a Firestore `_backupRegistry` collection so the
 * cleanup function knows what to prune.
 *
 * Note: Actual GCS cleanup requires Storage Admin permissions.
 * This function records & prunes the registry; GCS lifecycle rules
 * or manual cleanup handle the actual files.
 */
async function cleanupOldBackups(fn) {
    const now = new Date();
    // Record this backup
    await db.collection("_backupRegistry").add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        date: now.toISOString().split("T")[0],
        type: now.getDay() === 0 ? "weekly" : "daily",
        status: "initiated",
    });
    // Prune old daily entries
    const dailyCutoff = new Date(now);
    dailyCutoff.setDate(dailyCutoff.getDate() - DAILY_RETENTION);
    const oldDailySnap = await db
        .collection("_backupRegistry")
        .where("type", "==", "daily")
        .where("timestamp", "<", admin.firestore.Timestamp.fromDate(dailyCutoff))
        .get();
    if (!oldDailySnap.empty) {
        const batch = db.batch();
        oldDailySnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        logger.info("Pruned old daily backup registry entries", {
            functionName: fn,
            pruned: oldDailySnap.size,
        });
    }
    // Prune old weekly entries
    const weeklyCutoff = new Date(now);
    weeklyCutoff.setDate(weeklyCutoff.getDate() - WEEKLY_RETENTION * 7);
    const oldWeeklySnap = await db
        .collection("_backupRegistry")
        .where("type", "==", "weekly")
        .where("timestamp", "<", admin.firestore.Timestamp.fromDate(weeklyCutoff))
        .get();
    if (!oldWeeklySnap.empty) {
        const batch = db.batch();
        oldWeeklySnap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        logger.info("Pruned old weekly backup registry entries", {
            functionName: fn,
            pruned: oldWeeklySnap.size,
        });
    }
}
// ---------------------------------------------------------------------------
// healthCheck — lightweight HTTPS endpoint for uptime monitors
// ---------------------------------------------------------------------------
exports.healthCheck = (0, https_1.onRequest)({ region: "asia-south1", memory: "256MiB", timeoutSeconds: 10 }, async (_req, res) => {
    const FN = "healthCheck";
    try {
        // Verify Firestore connectivity by reading a lightweight document
        const startMs = Date.now();
        await db.collection("_healthCheck").doc("ping").set({ lastPing: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        const latencyMs = Date.now() - startMs;
        const payload = {
            status: "ok",
            timestamp: new Date().toISOString(),
            firestoreLatencyMs: latencyMs,
            region: "asia-south1",
        };
        logger.info("Health check passed", Object.assign({ functionName: FN }, payload));
        res.status(200).json(payload);
    }
    catch (error) {
        logger.error("Health check failed", {
            functionName: FN,
            error: error instanceof Error ? error.message : String(error),
        });
        res.status(503).json({
            status: "error",
            timestamp: new Date().toISOString(),
            error: "Firestore connectivity check failed",
        });
    }
});
//# sourceMappingURL=backupAndHealth.js.map