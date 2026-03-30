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
} from "firebase/firestore";
import { db } from "../config";
import { COLLECTIONS, type DFDItem } from "../schema";

const col = COLLECTIONS.ITEMS;

function requireDb() {
  if (!db) throw new Error("Firebase is only available in the browser.");
  return db;
}

/**
 * Add a new menu / catalog item for a store.
 * Returns the auto-generated document ID.
 */
export async function createItem(
  data: Omit<DFDItem, "id">
): Promise<string> {
  const database = requireDb();
  const ref = await addDoc(collection(database, col), {
    ...data,
    available: data.available ?? true,
  });
  return ref.id;
}

/**
 * Fetch a single item by ID.
 */
export async function getItem(itemId: string): Promise<DFDItem | null> {
  const database = requireDb();
  const snap = await getDoc(doc(database, col, itemId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DFDItem;
}

/**
 * Fetch all available items for a store, grouped ready to display.
 * Pass available=false to also fetch unavailable items (merchant view).
 */
export async function getStoreItems(
  storeId: string,
  onlyAvailable = true
): Promise<DFDItem[]> {
  const database = requireDb();
  const constraints = onlyAvailable
    ? [where("storeId", "==", storeId), where("available", "==", true), orderBy("category")]
    : [where("storeId", "==", storeId), orderBy("category")];

  const snap = await getDocs(query(collection(database, col), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DFDItem);
}

/**
 * Update mutable item fields (name, price, category, availability, image).
 */
export async function updateItem(
  itemId: string,
  data: Partial<Omit<DFDItem, "id" | "storeId">>
): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, col, itemId), data);
}

/**
 * Toggle item availability without deleting the document.
 */
export async function setItemAvailable(itemId: string, available: boolean): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, col, itemId), { available });
}

/**
 * Permanently delete an item from the catalog.
 */
export async function deleteItem(itemId: string): Promise<void> {
  const database = requireDb();
  await deleteDoc(doc(database, col, itemId));
}
