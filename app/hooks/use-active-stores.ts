import { useState, useEffect, useCallback } from "react";
import { collection, query, where, orderBy, limit, startAfter, getDocs, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "~/lib/firebase/config";
import type { DFDStore } from "~/lib/firebase/schema";

interface UseActiveStoresResult {
  stores: DFDStore[];
  loading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useActiveStores(pageSize = 10): UseActiveStoresResult {
  const [stores, setStores] = useState<DFDStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, "stores"),
        where("active", "==", true),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DFDStore));
      
      setStores(data);
      if (snap.docs.length > 0) {
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError("Could not load stores.");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const loadMore = async () => {
    if (!lastDoc || !hasMore || loading) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, "stores"),
        where("active", "==", true),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );
      const snap = await getDocs(q);
      const newData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DFDStore));

      setStores((prev) => [...prev, ...newData]);
      if (snap.docs.length > 0) {
        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError("Could not load more stores.");
    } finally {
      setLoading(false);
    }
  };

  return { stores, loading, error, loadMore, hasMore };
}
