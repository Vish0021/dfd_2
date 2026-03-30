import { useState, useEffect, useCallback } from "react";
import type { DFDStore, StoreType } from "~/lib/firebase/schema";
import {
  getAllStores,
  createStore,
  updateStore,
  deleteStore,
  setStoreActive,
} from "~/lib/firebase/services/stores.service";

interface CreateStoreInput {
  name: string;
  type: StoreType;
  taxPercentage: number;
}

interface UpdateStoreInput {
  name?: string;
  type?: StoreType;
  taxPercentage?: number;
}

interface UseAdminStoresResult {
  stores: DFDStore[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (data: CreateStoreInput) => Promise<void>;
  update: (storeId: string, data: UpdateStoreInput) => Promise<void>;
  remove: (storeId: string) => Promise<void>;
  toggleActive: (storeId: string, active: boolean) => Promise<void>;
}

export function useAdminStores(): UseAdminStoresResult {
  const [stores, setStores] = useState<DFDStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllStores();
      setStores(data);
    } catch {
      setError("Failed to load stores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (data: CreateStoreInput) => {
    await createStore(data);
    await refresh();
  }, [refresh]);

  const update = useCallback(async (storeId: string, data: UpdateStoreInput) => {
    await updateStore(storeId, data);
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, ...data } : s))
    );
  }, []);

  const remove = useCallback(async (storeId: string) => {
    await deleteStore(storeId);
    setStores((prev) => prev.filter((s) => s.id !== storeId));
  }, []);

  const toggleActive = useCallback(async (storeId: string, active: boolean) => {
    await setStoreActive(storeId, active);
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, active } : s))
    );
  }, []);

  return { stores, loading, error, refresh, create, update, remove, toggleActive };
}
