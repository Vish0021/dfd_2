import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDHOiiiQBqiQpYAFGu0NI1Xl-ADqVZKslk",
  authDomain: "dfd1-1ffa1.firebaseapp.com",
  projectId: "dfd1-1ffa1",
  storageBucket: "dfd1-1ffa1.firebasestorage.app",
  messagingSenderId: "1067684394241",
  appId: "1:1067684394241:web:b22932433d7bee0bf2d700"
};

admin.initializeApp({
  projectId: "dfd1-1ffa1"
});

const adminDb = admin.firestore();

const clientApp = initializeApp(firebaseConfig);
const auth = getAuth(clientApp);
const db = getFirestore(clientApp);

async function runTests() {
  function log(msg) {
    console.log(msg);
  }

  const userEmail = `user${Date.now()}@example.com`;
  const adminEmail = `admin${Date.now()}@example.com`;
  const password = 'password123';
  let userId = null;
  let adminId = null;
  let orderId = null;

  try {
    log("=== ADMIN SETUP ===");
    const adminCred = await createUserWithEmailAndPassword(auth, adminEmail, password);
    adminId = adminCred.user.uid;
    
    await adminDb.collection('users').doc(adminId).set({
      uid: adminId,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    log(`[SUCCESS] Admin user created natively: ${adminId}`);

    await new Promise(r => setTimeout(r, 2000));

    await auth.signOut();
    await signInWithEmailAndPassword(auth, adminEmail, password);
    log(`[SUCCESS] Logged in as Admin`);

    const storeRef = doc(collection(db, 'stores'));
    await setDoc(storeRef, {
      name: "Admin Sushi",
      active: true,
      createdAt: new Date().toISOString()
    });
    log(`[SUCCESS] Admin created store: ${storeRef.id}`);

    await updateDoc(storeRef, {
      active: false
    });
    log(`[SUCCESS] Admin toggled store active state: ${storeRef.id}`);

    const itemRef = doc(collection(db, 'items'));
    await setDoc(itemRef, {
      name: "Sushi Roll",
      available: true,
      price: 15,
      createdAt: new Date().toISOString()
    });
    log(`[SUCCESS] Admin added item: ${itemRef.id}`);
    
    await updateDoc(itemRef, {
      available: false
    });
    log(`[SUCCESS] Admin toggled item availability: ${itemRef.id}`);

    await auth.signOut();

    log("=== USER SETUP ===");
    const userCred = await createUserWithEmailAndPassword(auth, userEmail, password);
    userId = userCred.user.uid;
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      role: 'user',
      createdAt: new Date().toISOString()
    });

    const orderRef = doc(collection(db, 'orders'));
    orderId = orderRef.id;
    await setDoc(orderRef, {
      userId: userId,
      storeId: storeRef.id,
      items: [{name: 'Sushi Roll', quantity: 1, price: 15}],
      subtotal: 15,
      taxAmount: 2,
      deliveryFee: 39,
      totalAmount: 56,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    log(`[SUCCESS] User created order: ${orderId}`);

    log("=== ADMIN FLOW: ORDER LIFECYCLE ===");
    await auth.signOut();
    await signInWithEmailAndPassword(auth, adminEmail, password);
    log(`[SUCCESS] Logged in as Admin for order lifecycle updates`);

    await updateDoc(doc(db, 'orders', orderId), {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });
    log(`[SUCCESS] Admin updated order status to: accepted`);

    await updateDoc(doc(db, 'orders', orderId), {
      status: 'out_for_delivery',
      outForDeliveryAt: new Date().toISOString()
    });
    log(`[SUCCESS] Admin updated order status to: out_for_delivery`);

    await updateDoc(doc(db, 'orders', orderId), {
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    });
    log(`[SUCCESS] Admin updated order status to: delivered`);
    
    const finalOrder = await getDoc(doc(db, 'orders', orderId));
    const data = finalOrder.data();
    if (data.acceptedAt && data.outForDeliveryAt && data.deliveredAt) {
       log(`[SUCCESS] Verified timestamps appear in Firestore for order: ${orderId}`);
    } else {
       log(`[FAILED] Missing timestamps in Order document.`);
    }

    log("=== VERIFICATION COMPLETE ===");
    process.exit(0);

  } catch (err) {
    console.error("Workflow failed", err);
    process.exit(1);
  }
}

runTests();
