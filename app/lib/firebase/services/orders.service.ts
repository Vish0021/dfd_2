import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config";
import {
  COLLECTIONS,
  type DFDOrder,
  type OrderStatus,
  type OrderLineItem,
} from "../schema";

const col = COLLECTIONS.ORDERS;

function requireDb() {
  if (!db) throw new Error("Firebase is only available in the browser.");
  return db;
}

function requireFunctions() {
  if (!functions) throw new Error("Firebase Functions is only available in the browser.");
  return functions;
}

// ---------------------------------------------------------------------------
// Write operations — all routed through Cloud Functions
// ---------------------------------------------------------------------------

export interface PlaceOrderInput {
  userId: string;
  storeId: string;
  items: OrderLineItem[];
  taxPercentage: number;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryInstructions?: string;
}

/**
 * Place a new order via the `createOrder` Cloud Function.
 * All financial calculations (subtotal, tax, total) happen securely on the server.
 * A `clientOrderId` is generated for idempotency — duplicate submissions return
 * the same order.
 * Returns the new order document ID.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const fns = requireFunctions();
  const createOrderFn = httpsCallable<
    {
      storeId: string;
      items: { itemId: string; quantity: number }[];
      deliveryAddress?: string;
      deliveryPhone?: string;
      deliveryInstructions?: string;
      clientOrderId?: string;
      requestId?: string;
    },
    { orderId: string; totalAmount: number }
  >(fns, "createOrder");

  // Generate a unique client-side idempotency key
  const clientOrderId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const requestId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `req-${Date.now()}`;

  const result = await createOrderFn({
    storeId: input.storeId,
    items: input.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
    deliveryAddress: input.deliveryAddress,
    deliveryPhone: input.deliveryPhone,
    deliveryInstructions: input.deliveryInstructions,
    clientOrderId,
    requestId,
  });

  return result.data.orderId;
}

// ---------------------------------------------------------------------------
// Status transitions — routed through Cloud Function for security + audit
// ---------------------------------------------------------------------------

/**
 * Transition helper: calls the `updateOrderStatus` Cloud Function.
 * All validation, timestamp assignment, notifications, and audit logging
 * happen server-side.
 */
async function transitionOrderStatus(
  orderId: string, 
  newStatus: string,
  extra?: { prepTimeMinutes?: number; deliveryPersonName?: string }
): Promise<void> {
  const fns = requireFunctions();
  const updateStatusFn = httpsCallable<
    { orderId: string; newStatus: string; requestId?: string; prepTimeMinutes?: number; deliveryPersonName?: string; },
    { success: boolean }
  >(fns, "updateOrderStatus");

  const requestId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `req-${Date.now()}`;

  await updateStatusFn({ orderId, newStatus, requestId, ...extra });
}

/** Accept a pending order. */
export async function acceptOrder(orderId: string, prepTimeMinutes?: number): Promise<void> {
  await transitionOrderStatus(orderId, "accepted", { prepTimeMinutes });
}

/** Reject a pending order. */
export async function rejectOrder(orderId: string): Promise<void> {
  await transitionOrderStatus(orderId, "rejected");
}

/** Mark order as out for delivery. */
export async function markOutForDelivery(orderId: string, deliveryPersonName?: string): Promise<void> {
  await transitionOrderStatus(orderId, "out_for_delivery", { deliveryPersonName });
}

/** Mark order as delivered. */
export async function markDelivered(orderId: string): Promise<void> {
  await transitionOrderStatus(orderId, "delivered");
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/** Fetch a single order document. */
export async function getOrder(orderId: string): Promise<DFDOrder | null> {
  const database = requireDb();
  const snap = await getDoc(doc(database, col, orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DFDOrder;
}

/** Fetch all orders for a customer, newest first. */
export async function getUserOrders(userId: string): Promise<DFDOrder[]> {
  const database = requireDb();
  const snap = await getDocs(
    query(collection(database, col), where("userId", "==", userId), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDOrder);
}

/** Fetch all orders for a store, newest first. */
export async function getStoreOrders(
  storeId: string,
  status?: OrderStatus
): Promise<DFDOrder[]> {
  const database = requireDb();
  const constraints = status
    ? [where("storeId", "==", storeId), where("status", "==", status), orderBy("createdAt", "desc")]
    : [where("storeId", "==", storeId), orderBy("createdAt", "desc")];

  const snap = await getDocs(query(collection(database, col), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDOrder);
}

// ---------------------------------------------------------------------------
// Real-time listeners
// ---------------------------------------------------------------------------

/**
 * Subscribe to live order status updates for a customer.
 * Returns an unsubscribe function.
 */
export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: DFDOrder) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const database = requireDb();
  return onSnapshot(
    doc(database, col, orderId),
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as DFDOrder);
      }
    },
    (err) => onError?.(err)
  );
}

/**
 * Subscribe to ALL orders across all stores (admin dashboard).
 * Ordered newest first. Returns an unsubscribe function.
 */
export function subscribeToAllOrders(
  onUpdate: (orders: DFDOrder[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const database = requireDb();
  return onSnapshot(
    query(collection(database, col), orderBy("createdAt", "desc")),
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDOrder));
    },
    (err) => onError?.(err)
  );
}

/**
 * Subscribe to all pending + accepted + out_for_delivery orders for a store (merchant dashboard).
 * Returns an unsubscribe function.
 */
export function subscribeToActiveStoreOrders(
  storeId: string,
  onUpdate: (orders: DFDOrder[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const database = requireDb();
  return onSnapshot(
    query(
      collection(database, col),
      where("storeId", "==", storeId),
      where("status", "in", ["pending", "accepted", "out_for_delivery"]),
      orderBy("createdAt", "desc")
    ),
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDOrder));
    },
    (err) => onError?.(err)
  );
}

/** Subscribe to all orders for a user (order history, live updates). */
export function subscribeToUserOrders(
  userId: string,
  onUpdate: (orders: DFDOrder[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const database = requireDb();
  return onSnapshot(
    query(
      collection(database, col),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    ),
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDOrder));
    },
    (err) => onError?.(err)
  );
}
