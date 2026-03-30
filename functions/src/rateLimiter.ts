/**
 * Per-user rate limiter using Firestore-based sliding window.
 * Prevents abuse / DoS on callable Cloud Functions.
 */
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

export interface RateLimitOptions {
  /** Firestore collection to track calls, e.g. "rateLimits" */
  collection?: string;
  /** Maximum number of calls allowed in the window. */
  maxCalls: number;
  /** Window size in seconds. */
  windowSeconds: number;
  /** Human-readable action name for error messages. */
  actionName?: string;
}

/**
 * Enforce a per-user rate limit.
 * Throws HttpsError("resource-exhausted") if exceeded.
 */
export async function enforceRateLimit(
  uid: string,
  fnName: string,
  opts: RateLimitOptions
): Promise<void> {
  const colName = opts.collection ?? "rateLimits";
  const docId = `${uid}_${fnName}`;
  const ref = db.collection(colName).doc(docId);
  const now = Date.now();
  const windowMs = opts.windowSeconds * 1000;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();

      if (!data) {
        // First call — init
        tx.set(ref, { calls: [now], uid, fnName });
        return;
      }

      // Filter calls within the sliding window
      const recentCalls: number[] = (data.calls as number[] ?? [])
        .filter((t: number) => now - t < windowMs);

      if (recentCalls.length >= opts.maxCalls) {
        throw new HttpsError(
          "resource-exhausted",
          `Rate limit exceeded for ${opts.actionName ?? fnName}. ` +
          `Max ${opts.maxCalls} calls per ${opts.windowSeconds}s.`
        );
      }

      recentCalls.push(now);
      tx.update(ref, { calls: recentCalls });
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    // If rate-limit infra fails, log but don't block the user (graceful degradation)
    logger.warn("Rate limiter non-critical failure — allowing request through", {
      functionName: "rateLimiter",
      uid,
      fnName,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
