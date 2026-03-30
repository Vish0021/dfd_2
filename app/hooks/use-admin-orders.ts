import { useState, useEffect, useCallback } from "react";
import { enableNetwork, disableNetwork } from "firebase/firestore";
import { db } from "~/lib/firebase/config";
import type { DFDOrder, OrderStatus } from "~/lib/firebase/schema";
import {
  subscribeToAllOrders,
  acceptOrder,
  rejectOrder,
  markOutForDelivery,
  markDelivered,
} from "~/lib/firebase/services/orders.service";

interface UseAdminOrdersResult {
  orders: DFDOrder[];
  loading: boolean;
  error: string | null;
  accept: (orderId: string, prepTimeMinutes?: number) => Promise<void>;
  reject: (orderId: string) => Promise<void>;
  dispatch: (orderId: string, deliveryPersonName?: string) => Promise<void>;
  deliver: (orderId: string) => Promise<void>;
  byStatus: Record<OrderStatus, DFDOrder[]>;
}

const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "out_for_delivery",
  "delivered",
  "rejected",
];

export function useAdminOrders(): UseAdminOrdersResult {
  const [orders, setOrders] = useState<DFDOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Real-time listener — auto-updates on any order change in Firestore
    const unsub = subscribeToAllOrders(
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const handleResync = async () => {
      if (!db) return;
      if (document.visibilityState === "visible" && navigator.onLine) {
        try {
          // Force Firebase to drop and recreate its internal socket connections
          await disableNetwork(db);
          await enableNetwork(db);
          console.debug("[useAdminOrders] Forced network resync completed.");
        } catch (e) {
          console.error("[useAdminOrders] Network resync failed", e);
        }
      }
    };

    document.addEventListener("visibilitychange", handleResync);
    window.addEventListener("online", handleResync);

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", handleResync);
      window.removeEventListener("online", handleResync);
    };
  }, []);

  const accept = useCallback(async (orderId: string, prepTimeMinutes?: number) => {
    await acceptOrder(orderId, prepTimeMinutes);
    // Firestore listener will auto-update state
  }, []);

  const reject = useCallback(async (orderId: string) => {
    await rejectOrder(orderId);
  }, []);

  const dispatch = useCallback(async (orderId: string, deliveryPersonName?: string) => {
    await markOutForDelivery(orderId, deliveryPersonName);
  }, []);

  const deliver = useCallback(async (orderId: string) => {
    await markDelivered(orderId);
  }, []);

  const byStatus = ALL_STATUSES.reduce(
    (acc, s) => {
      acc[s] = orders.filter((o) => o.status === s);
      return acc;
    },
    {} as Record<OrderStatus, DFDOrder[]>
  );

  return { orders, loading, error, accept, reject, dispatch, deliver, byStatus };
}
