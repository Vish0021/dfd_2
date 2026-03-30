"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ITEM_QUANTITY = exports.MIN_ITEM_QUANTITY = exports.MAX_ITEMS_PER_ORDER = exports.DEFAULT_TAX_RATE = exports.DELIVERY_FEE = exports.GLOBAL_RUNTIME = void 0;
/**
 * Shared runtime configuration and utilities for all Cloud Functions.
 */
const options_1 = require("firebase-functions/v2/options");
// ---------------------------------------------------------------------------
// Global runtime settings — applied to ALL Cloud Functions
// ---------------------------------------------------------------------------
exports.GLOBAL_RUNTIME = {
    region: "asia-south1",
    memory: "512MiB",
    timeoutSeconds: 60,
};
(0, options_1.setGlobalOptions)(exports.GLOBAL_RUNTIME);
// ---------------------------------------------------------------------------
// Environment constants (server-authoritative)
// ---------------------------------------------------------------------------
/** Fixed delivery fee in INR. */
exports.DELIVERY_FEE = 39;
/** Default tax rate (fraction, e.g. 0.05 = 5%). */
exports.DEFAULT_TAX_RATE = 0.05;
/** Maximum items per order. */
exports.MAX_ITEMS_PER_ORDER = 50;
/** Min / max quantity per line item. */
exports.MIN_ITEM_QUANTITY = 1;
exports.MAX_ITEM_QUANTITY = 20;
//# sourceMappingURL=config.js.map