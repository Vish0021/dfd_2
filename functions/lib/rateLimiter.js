"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceRateLimit = void 0;
/**
 * Per-user rate limiter using Firestore-based sliding window.
 * Prevents abuse / DoS on callable Cloud Functions.
 */
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const db = admin.firestore();
/**
 * Enforce a per-user rate limit.
 * Throws HttpsError("resource-exhausted") if exceeded.
 */
async function enforceRateLimit(uid, fnName, opts) {
    var _a;
    const colName = (_a = opts.collection) !== null && _a !== void 0 ? _a : "rateLimits";
    const docId = `${uid}_${fnName}`;
    const ref = db.collection(colName).doc(docId);
    const now = Date.now();
    const windowMs = opts.windowSeconds * 1000;
    try {
        await db.runTransaction(async (tx) => {
            var _a, _b;
            const snap = await tx.get(ref);
            const data = snap.data();
            if (!data) {
                // First call — init
                tx.set(ref, { calls: [now], uid, fnName });
                return;
            }
            // Filter calls within the sliding window
            const recentCalls = ((_a = data.calls) !== null && _a !== void 0 ? _a : [])
                .filter((t) => now - t < windowMs);
            if (recentCalls.length >= opts.maxCalls) {
                throw new https_1.HttpsError("resource-exhausted", `Rate limit exceeded for ${(_b = opts.actionName) !== null && _b !== void 0 ? _b : fnName}. ` +
                    `Max ${opts.maxCalls} calls per ${opts.windowSeconds}s.`);
            }
            recentCalls.push(now);
            tx.update(ref, { calls: recentCalls });
        });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        // If rate-limit infra fails, log but don't block the user (graceful degradation)
        logger.warn("Rate limiter non-critical failure — allowing request through", {
            functionName: "rateLimiter",
            uid,
            fnName,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
exports.enforceRateLimit = enforceRateLimit;
//# sourceMappingURL=rateLimiter.js.map