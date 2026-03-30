import { useState, useEffect } from "react";
import { getStoreItems } from "~/lib/firebase/services/items.service";
import { getStore } from "~/lib/firebase/services/stores.service";
import type { DFDItem, DFDStore } from "~/lib/firebase/schema";

interface UseStoreItemsResult {
  store: DFDStore | null;
  items: DFDItem[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches store details and all items (available + unavailable) for a store.
 */
export function useStoreItems(storeId: string | undefined): UseStoreItemsResult {
  const [store, setStore] = useState<DFDStore | null>(null);
  const [items, setItems] = useState<DFDItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        setError(null);
        const [storeData, itemsData] = await Promise.all([
          getStore(storeId!),
          getStoreItems(storeId!, false), // include unavailable so we can show disabled state
        ]);
        if (!cancelled) {
          setStore(storeData);
          setItems(itemsData);
        }
      } catch {
        if (!cancelled) setError("Could not load store items. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  return { store, items, loading, error };
}
