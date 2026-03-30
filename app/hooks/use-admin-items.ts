import { useState, useEffect, useCallback } from "react";
import type { DFDItem } from "~/lib/firebase/schema";
import {
  getStoreItems,
  createItem,
  updateItem,
  deleteItem,
  setItemAvailable,
} from "~/lib/firebase/services/items.service";

interface CreateItemInput {
  storeId: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  description?: string;
  imageUrl?: string;
}

interface UpdateItemInput {
  name?: string;
  price?: number;
  category?: string;
  description?: string;
  imageUrl?: string;
}

interface UseAdminItemsResult {
  items: DFDItem[];
  loading: boolean;
  error: string | null;
  refresh: (storeId: string) => Promise<void>;
  create: (data: CreateItemInput) => Promise<void>;
  update: (itemId: string, data: UpdateItemInput) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  toggleAvailable: (itemId: string, available: boolean) => Promise<void>;
}

export function useAdminItems(storeId: string | null): UseAdminItemsResult {
  const [items, setItems] = useState<DFDItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (sid: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStoreItems(sid, false);
      setItems(data);
    } catch {
      setError("Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (storeId) refresh(storeId);
    else setItems([]);
  }, [storeId, refresh]);

  const create = useCallback(async (data: CreateItemInput) => {
    await createItem(data);
    await refresh(data.storeId);
  }, [refresh]);

  const update = useCallback(async (itemId: string, data: UpdateItemInput) => {
    await updateItem(itemId, data);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...data } : i))
    );
  }, []);

  const remove = useCallback(async (itemId: string) => {
    await deleteItem(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  const toggleAvailable = useCallback(async (itemId: string, available: boolean) => {
    await setItemAvailable(itemId, available);
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, available } : i))
    );
  }, []);

  return { items, loading, error, refresh, create, update, remove, toggleAvailable };
}
