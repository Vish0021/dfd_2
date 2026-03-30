import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";
import { COLLECTIONS, type DFDStore, type StoreType } from "../schema";

const col = COLLECTIONS.STORES;

function requireDb() {
  if (!db) throw new Error("Firebase is only available in the browser.");
  return db;
}

/**
 * Create a new store document.
 * Returns the auto-generated Firestore document ID.
 */
export async function createStore(data: {
  name: string;
  type: StoreType;
  taxPercentage: number;
  townId?: string;
}): Promise<string> {
  const database = requireDb();
  const ref = await addDoc(collection(database, col), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetch a single store by ID.
 */
export async function getStore(storeId: string): Promise<DFDStore | null> {
  const database = requireDb();
  const snap = await getDoc(doc(database, col, storeId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DFDStore;
}

/**
 * Fetch all active stores, optionally filtered by town.
 */
export async function getActiveStores(townId?: string): Promise<DFDStore[]> {
  const database = requireDb();
  const constraints = [where("active", "==", true), orderBy("createdAt", "desc")] as const;
  const base = townId
    ? query(collection(database, col), where("townId", "==", townId), ...constraints)
    : query(collection(database, col), ...constraints);

  const snap = await getDocs(base);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDStore);
}

/**
 * Toggle a store's active status (soft enable / disable).
 */
export async function setStoreActive(storeId: string, active: boolean): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, col, storeId), { active });
}

/**
 * Update mutable store fields.
 */
export async function updateStore(
  storeId: string,
  data: Partial<Pick<DFDStore, "name" | "type" | "taxPercentage" | "townId">>
): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, col, storeId), data);
}

/**
 * Fetch ALL stores (active + inactive) for the admin view.
 */
export async function getAllStores(): Promise<DFDStore[]> {
  const database = requireDb();
  const snap = await getDocs(
    query(
      collection(database, col),
      where("active", "==", true),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDStore);
}

/**
 * Permanently delete a store document.
 */
export async function deleteStore(storeId: string): Promise<void> {
  const database = requireDb();
  await deleteDoc(doc(database, col, storeId));
}
