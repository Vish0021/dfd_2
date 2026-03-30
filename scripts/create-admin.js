import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
  credential: applicationDefault()
});

const db = getFirestore();

async function promoteUser(uid) {
  try {
    await db.collection("users").doc(uid).update({
      role: "admin"
    });
    console.log("User promoted to admin:", uid);
  } catch (err) {
    console.error("Error promoting user:", err);
  }
}

// Replace with target UID
promoteUser("TEST_ADMIN_UID");
