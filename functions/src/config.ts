/**
 * Shared runtime configuration and utilities for all Cloud Functions.
 */
import { setGlobalOptions } from "firebase-functions/v2/options";
import type { GlobalOptions } from "firebase-functions/v2/options";

// ---------------------------------------------------------------------------
// Global runtime settings — applied to ALL Cloud Functions
// ---------------------------------------------------------------------------

export const GLOBAL_RUNTIME: GlobalOptions = {
  region: "asia-south1",
  memory: "512MiB",
  timeoutSeconds: 60,
};

setGlobalOptions(GLOBAL_RUNTIME);

// ---------------------------------------------------------------------------
// Environment constants (server-authoritative)
// ---------------------------------------------------------------------------

/** Fixed delivery fee in INR. */
export const DELIVERY_FEE = 39;

/** Default tax rate (fraction, e.g. 0.05 = 5%). */
export const DEFAULT_TAX_RATE = 0.05;

/** Maximum items per order. */
export const MAX_ITEMS_PER_ORDER = 50;

/** Min / max quantity per line item. */
export const MIN_ITEM_QUANTITY = 1;
export const MAX_ITEM_QUANTITY = 20;
