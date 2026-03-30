import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import "./config"; // ensure global options applied

const db = admin.firestore();
const FN = "cleanupAdminLogs";

/** Maximum days to retain admin log entries. */
const RETENTION_DAYS = 90;

/** Batch size for Firestore delete operations. */
const BATCH_SIZE = 500;

/**
 * Scheduled Cloud Function: runs daily at 02:00 IST.
 * Deletes adminLogs entries older than RETENTION_DAYS to prevent
 * unbounded database growth.
 */
export const cleanupAdminLogs = onSchedule(
  {
    schedule: "0 2 * * *",       // Every day at 02:00
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    memory: "512MiB",
    timeoutSeconds: 120,         // Allow extra time for large cleanups
  },
  async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    logger.info("Starting admin log cleanup", {
      functionName: FN,
      retentionDays: RETENTION_DAYS,
      cutoffDate: cutoff.toISOString(),
    });

    let totalDeleted = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        const snapshot = await db
          .collection("adminLogs")
          .where("timestamp", "<", admin.firestore.Timestamp.fromDate(cutoff))
          .limit(BATCH_SIZE)
          .get();

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += snapshot.size;

        if (snapshot.size < BATCH_SIZE) {
          hasMore = false;
        }
      }

      logger.info("Admin log cleanup completed", {
        functionName: FN,
        totalDeleted,
        retentionDays: RETENTION_DAYS,
      });
    } catch (error) {
      logger.error("Admin log cleanup failed", {
        functionName: FN,
        totalDeletedBeforeError: totalDeleted,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
