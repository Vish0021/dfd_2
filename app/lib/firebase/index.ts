// Core config & SDK instances
export { auth, db, getMessagingInstance } from "./config";

// Schema: types, constants, utilities
export {
  COLLECTIONS,
  DELIVERY_FEE,
  computeOrderTotals,
  type DFDUser,
  type DFDStore,
  type DFDItem,
  type DFDOrder,
  type UserRole,
  type StoreType,
  type OrderStatus,
  type OrderLineItem,
  type OrderTotals,
} from "./schema";

// Users service
export {
  createUser,
  getUser,
  updateUser,
  saveFcmToken,
} from "./services/users.service";

// Stores service
export {
  createStore,
  getStore,
  getActiveStores,
  setStoreActive,
  updateStore,
} from "./services/stores.service";

// Items service
export {
  createItem,
  getItem,
  getStoreItems,
  updateItem,
  setItemAvailable,
  deleteItem,
} from "./services/items.service";

// Orders service
export {
  placeOrder,
  acceptOrder,
  markOutForDelivery,
  markDelivered,
  rejectOrder,
  getOrder,
  getUserOrders,
  getStoreOrders,
  subscribeToOrder,
  subscribeToActiveStoreOrders,
  type PlaceOrderInput,
} from "./services/orders.service";

// FCM service
export {
  initFcm,
  onForegroundMessage,
  enqueueNotification,
  type NotificationPayload,
  type NotificationTarget,
} from "./services/fcm.service";
