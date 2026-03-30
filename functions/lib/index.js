"use strict";
// ---------------------------------------------------------------------------
// Cloud Functions — barrel export
// Each export becomes a deployed Cloud Function endpoint.
//
// Global runtime settings (region: asia-south1, memory: 512MiB, timeout: 60s)
// are applied via ./config.ts which calls setGlobalOptions().
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAthidhyam = exports.healthCheck = exports.backupFirestore = exports.cleanupAdminLogs = exports.sendOrderStatusNotification = exports.sendNotification = exports.adminDeleteItem = exports.adminUpdateItem = exports.adminCreateItem = exports.adminToggleStoreActive = exports.adminUpdateStore = exports.adminCreateStore = exports.updateOrderStatus = exports.createOrder = void 0;
// Ensure admin SDK is initialised ONCE before any module uses it
const admin = require("firebase-admin");
if (admin.apps.length === 0)
    admin.initializeApp();
// Import config first so setGlobalOptions() runs before function registration
require("./config");
// Callable functions
var createOrder_1 = require("./createOrder");
Object.defineProperty(exports, "createOrder", { enumerable: true, get: function () { return createOrder_1.createOrder; } });
var updateOrderStatus_1 = require("./updateOrderStatus");
Object.defineProperty(exports, "updateOrderStatus", { enumerable: true, get: function () { return updateOrderStatus_1.updateOrderStatus; } });
var adminOperations_1 = require("./adminOperations");
Object.defineProperty(exports, "adminCreateStore", { enumerable: true, get: function () { return adminOperations_1.adminCreateStore; } });
Object.defineProperty(exports, "adminUpdateStore", { enumerable: true, get: function () { return adminOperations_1.adminUpdateStore; } });
Object.defineProperty(exports, "adminToggleStoreActive", { enumerable: true, get: function () { return adminOperations_1.adminToggleStoreActive; } });
Object.defineProperty(exports, "adminCreateItem", { enumerable: true, get: function () { return adminOperations_1.adminCreateItem; } });
Object.defineProperty(exports, "adminUpdateItem", { enumerable: true, get: function () { return adminOperations_1.adminUpdateItem; } });
Object.defineProperty(exports, "adminDeleteItem", { enumerable: true, get: function () { return adminOperations_1.adminDeleteItem; } });
// Firestore triggers
var sendNotification_1 = require("./sendNotification");
Object.defineProperty(exports, "sendNotification", { enumerable: true, get: function () { return sendNotification_1.sendNotification; } });
var orderNotifications_1 = require("./orderNotifications");
Object.defineProperty(exports, "sendOrderStatusNotification", { enumerable: true, get: function () { return orderNotifications_1.sendOrderStatusNotification; } });
// Scheduled functions
var cleanupAdminLogs_1 = require("./cleanupAdminLogs");
Object.defineProperty(exports, "cleanupAdminLogs", { enumerable: true, get: function () { return cleanupAdminLogs_1.cleanupAdminLogs; } });
var backupAndHealth_1 = require("./backupAndHealth");
Object.defineProperty(exports, "backupFirestore", { enumerable: true, get: function () { return backupAndHealth_1.backupFirestore; } });
// HTTPS endpoints
var backupAndHealth_2 = require("./backupAndHealth");
Object.defineProperty(exports, "healthCheck", { enumerable: true, get: function () { return backupAndHealth_2.healthCheck; } });
var seed_1 = require("./seed");
Object.defineProperty(exports, "seedAthidhyam", { enumerable: true, get: function () { return seed_1.seedAthidhyam; } });
//# sourceMappingURL=index.js.map