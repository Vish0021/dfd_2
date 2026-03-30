import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Collection name constants — single source of truth
// ---------------------------------------------------------------------------

export const COLLECTIONS = {
  USERS: "users",
  STORES: "stores",
  ITEMS: "items",
  ORDERS: "orders",
  NOTIFICATIONS: "notifications",
} as const;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** All Firestore documents share a server-generated id field. */
export interface FirestoreDoc {
  id: string;
}

// ---------------------------------------------------------------------------
// users collection
// ---------------------------------------------------------------------------

export type UserRole = "user" | "admin";

export interface Address {
  id: string;
  label: "Home" | "Work" | "Other";
  house: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
  isDefault?: boolean;
}

/**
 * Stored under /users/{uid}
 * - uid  matches Firebase Auth UID (document ID === uid)
 * - role drives which app interface the user sees
 */
export interface DFDUser extends FirestoreDoc {
  uid: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  addresses?: Address[];
  location?: { label: string; address: string; lat?: number; lng?: number };
  /** FCM device token for push notifications */
  fcmToken?: string;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// stores collection
// ---------------------------------------------------------------------------

export type StoreType = "restaurant" | "grocery";

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Stored under /stores/{storeId}
 * - taxPercentage applied to subtotal (e.g. 8 = 8 %)
 * - active flag lets admins soft-disable a store without deleting it
 */
export interface DFDStore extends FirestoreDoc {
  name: string;
  type: StoreType;
  active: boolean;
  taxPercentage: number;
  logo?: string;
  address?: string;
  coordinates?: Coordinates;
  businessHours?: string;
  /** Optional: supports future multi-town scaling */
  townId?: string;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// items collection
// ---------------------------------------------------------------------------

/**
 * Stored under /items/{itemId}
 * Flat collection — storeId acts as a foreign key.
 * Query pattern: where("storeId", "==", storeId).where("available", "==", true)
 */
export interface DFDItem extends FirestoreDoc {
  storeId: string;
  name: string;
  price: number;
  category: string;
  itemType?: "veg" | "non-veg";
  available: boolean;
  imageUrl?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// orders collection
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "accepted"
  | "out_for_delivery"
  | "delivered"
  | "rejected";

/** Line item snapshot captured at the time of order */
export interface OrderLineItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

/** Fixed delivery fee in INR (paise would need different type; kept as number) */
export const DELIVERY_FEE = 39;

/**
 * Stored under /orders/{orderId}
 *
 * Pricing formula:
 *   subtotal      = sum(item.price * item.quantity)
 *   taxAmount     = subtotal * (store.taxPercentage / 100)
 *   deliveryFee   = DELIVERY_FEE (fixed ₹39)
 *   totalAmount   = subtotal + taxAmount + deliveryFee
 *
 * Lifecycle timestamps:
 *   createdAt        → order placed
 *   acceptedAt       → store accepts order
 *   outForDeliveryAt → rider picks up
 *   deliveredAt      → order delivered
 */
export interface DFDOrder extends FirestoreDoc {
  userId: string;
  storeId: string;
  items: OrderLineItem[];

  subtotal: number;
  taxAmount: number;
  deliveryFee: typeof DELIVERY_FEE;
  totalAmount: number;

  status: OrderStatus;

  /** Delivery details captured at checkout */
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryInstructions?: string;
  
  paymentMethod?: string;
  paymentStatus?: string;

  /** Optional extensions for admin UX */
  deliveryPersonName?: string;
  prepTimeMinutes?: number;

  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  rejectedAt?: Timestamp;
  outForDeliveryAt?: Timestamp;
  deliveredAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Utility: compute order totals
// ---------------------------------------------------------------------------

export interface OrderTotalsInput {
  items: OrderLineItem[];
  taxPercentage: number;
}

export interface OrderTotals {
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
}

/**
 * Pure function — compute all monetary fields from line items + tax rate.
 * Call this before writing a new order document.
 */
export function computeOrderTotals({ items, taxPercentage }: OrderTotalsInput): OrderTotals {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxAmount = parseFloat(((subtotal * taxPercentage) / 100).toFixed(2));
  const deliveryFee = DELIVERY_FEE;
  const totalAmount = parseFloat((subtotal + taxAmount + deliveryFee).toFixed(2));
  return { subtotal, taxAmount, deliveryFee, totalAmount };
}

// ---------------------------------------------------------------------------
// notifications collection
// ---------------------------------------------------------------------------

export type NotificationType = "NEW_ORDER" | "ORDER_STATUS_UPDATE" | "GENERAL_ALERT";

export interface DFDNotification extends FirestoreDoc {
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  
  /** If targeted at a specific user */
  userId?: string;
  /** If targeted at global admins */
  forAdmin?: boolean;

  /** Contextual data */
  orderId?: string;
  storeId?: string;
}
