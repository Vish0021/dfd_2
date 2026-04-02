import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config";
import { COLLECTIONS, type DFDUser, type UserRole } from "../schema";

const col = COLLECTIONS.USERS;

function requireDb() {
  if (!db) throw new Error("Firebase is only available in the browser.");
  return db;
}

/**
 * Create or overwrite a user document.
 * Should be called right after Firebase Auth sign-up.
 */
export async function createUser(
  uid: string,
  data: { name: string; phone: string; email?: string; address?: string; role: UserRole }
): Promise<void> {
  const database = requireDb();
  await setDoc(doc(database, col, uid), {
    uid,
    name: data.name,
    phone: data.phone,
    email: data.email || "",
    role: data.role,
    location: data.address ? { label: "Home", address: data.address } : null,
    createdAt: serverTimestamp(),
  });
}

/**
 * Fetch a user document by UID.
 * Returns null if the document doesn't exist.
 */
export async function getUser(uid: string): Promise<DFDUser | null> {
  const database = requireDb();
  const snap = await getDoc(doc(database, col, uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DFDUser;
}

/**
 * Update mutable user fields (name, phone, fcmToken).
 */
export async function updateUser(
  uid: string,
  data: Partial<Pick<DFDUser, "name" | "phone" | "fcmToken" | "addresses" | "location">>
): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, col, uid), data);
}

/**
 * Store the FCM device token so the backend can send push notifications.
 */
export async function saveFcmToken(uid: string, fcmToken: string): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, col, uid), { fcmToken });
}
