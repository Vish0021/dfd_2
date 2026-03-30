import { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, limit, startAfter, getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "~/lib/firebase/config";
import type { DFDOrder } from "~/lib/firebase/schema";

interface UseUserOrdersResult {
  orders: DFDOrder[];
  loading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useUserOrders(userId: string | undefined, pageSize = 10): UseUserOrdersResult {
  const [orders, setOrders] = useState<DFDOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitial = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DFDOrder));
      
      setOrders(data);
      if (snap.docs.length > 0) {
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError("Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [userId, pageSize]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const loadMore = async () => {
    if (!userId || !lastDoc || !hasMore || loading) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );
      const snap = await getDocs(q);
      const newData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DFDOrder));

      setOrders((prev) => [...prev, ...newData]);
      if (snap.docs.length > 0) {
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError("Could not load more orders.");
    } finally {
      setLoading(false);
    }
  };

  return { orders, loading, error, loadMore, hasMore };
}
