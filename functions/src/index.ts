// ---------------------------------------------------------------------------
// Cloud Functions — barrel export
// Each export becomes a deployed Cloud Function endpoint.
//
// Global runtime settings (region: asia-south1, memory: 512MiB, timeout: 60s)
// are applied via ./config.ts which calls setGlobalOptions().
// ---------------------------------------------------------------------------

// Ensure admin SDK is initialised ONCE before any module uses it
import * as admin from "firebase-admin";
if (admin.apps.length === 0) admin.initializeApp();

// Import config first so setGlobalOptions() runs before function registration
import "./config";

// Callable functions
export { createOrder } from "./createOrder";
export { updateOrderStatus } from "./updateOrderStatus";
export {
  adminCreateStore,
  adminUpdateStore,
  adminToggleStoreActive,
  adminCreateItem,
  adminUpdateItem,
  adminDeleteItem,
} from "./adminOperations";

// Firestore triggers
export { sendNotification } from "./sendNotification";
export { sendOrderStatusNotification } from "./orderNotifications";

// Scheduled functions
export { cleanupAdminLogs } from "./cleanupAdminLogs";
export { backupFirestore } from "./backupAndHealth";

// HTTPS endpoints
export { healthCheck } from "./backupAndHealth";
export { seedAthidhyam } from "./seed";
