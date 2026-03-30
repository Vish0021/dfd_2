import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDHOiiiQBqiQpYAFGu0NI1Xl-ADqVZKslk",
  authDomain: "dfd1-1ffa1.firebaseapp.com",
  projectId: "dfd1-1ffa1",
  storageBucket: "dfd1-1ffa1.firebasestorage.app",
  messagingSenderId: "1067684394241",
  appId: "1:1067684394241:web:b22932433d7bee0bf2d700"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rawMenu = {
  "FRIED_RICE": [
    {"name": "Veg Fried Rice", "price": 190},
    {"name": "Jeera Rice", "price": 190},
    {"name": "Lemon Rice", "price": 190},
    {"name": "Kaju Fried Rice", "price": 240},
    {"name": "Paneer Fried Rice", "price": 240},
    {"name": "Ghee Rice", "price": 190},
    {"name": "Schezwan Veg Fried Rice", "price": 190},
    {"name": "Egg Fried Rice", "price": 200},
    {"name": "Chicken Fried Rice", "price": 220},
    {"name": "Mushrooms Fried Rice", "price": 220},
    {"name": "Gobi Fried Rice", "price": 200},
    {"name": "Spl Chicken Fried Rice", "price": 260},
    {"name": "Schezwan Chicken Fried Rice", "price": 230},
    {"name": "Mixed Fried Rice", "price": 290}
  ],
  "RICE": [
    {"name": "White Rice", "price": 90},
    {"name": "Curd Rice", "price": 110},
    {"name": "Spl Curd Rice", "price": 130},
    {"name": "Plain Curd", "price": 70}
  ],
  "DESERTS": [
    {"name": "Water Bottle", "price": 60},
    {"name": "Soft Drink", "price": 65},
    {"name": "Butter Milk", "price": 70},
    {"name": "Lassi", "price": 90}
  ],
  "ICE_CREAM": [
    {"name": "Vanilla", "price": 120},
    {"name": "Strawberry", "price": 120},
    {"name": "Butter Scotch", "price": 130},
    {"name": "Pista", "price": 130},
    {"name": "Mango", "price": 130},
    {"name": "Chocolate Chips", "price": 140},
    {"name": "Anjeera Badam", "price": 150},
    {"name": "Black Current", "price": 150},
    {"name": "Badam Roasted", "price": 150},
    {"name": "Fruit Salad With Ice Cream", "price": 200}
  ],
  "TANDOORI_ROTI_ITEMS": [
    {"name": "Roti", "price": 50},
    {"name": "Pulka", "price": 40},
    {"name": "Plain Naan", "price": 45},
    {"name": "Butter Naan", "price": 60},
    {"name": "Plain Kulcha", "price": 65},
    {"name": "Paneer Kulcha", "price": 80},
    {"name": "Butter/Masala Kulcha", "price": 80},
    {"name": "Garlic Naan", "price": 80},
    {"name": "Masala Papad", "price": 70},
    {"name": "Roasted Papad", "price": 55},
    {"name": "Plain Parata", "price": 65},
    {"name": "Aloo Parata", "price": 80},
    {"name": "Butter Roti", "price": 55}
  ],
  "VEG_CURRIES": [
    {"name": "Capsicum Masala", "price": 170},
    {"name": "Plain Palak", "price": 180},
    {"name": "Tomata Curry", "price": 170},
    {"name": "Kaju Panner", "price": 250},
    {"name": "Kaju Tomata", "price": 250},
    {"name": "Baby Corn Masala", "price": 210},
    {"name": "Mixed Veg Curry", "price": 200},
    {"name": "Kadai Veg", "price": 210},
    {"name": "Veg Keema Masala", "price": 200},
    {"name": "Veg Jaipuri", "price": 210},
    {"name": "Veg Kolhapuri", "price": 200},
    {"name": "Methi Chaman", "price": 230},
    {"name": "Paneer Butter Masala", "price": 230},
    {"name": "Veg Shahi Kurma", "price": 210},
    {"name": "Kadai Paneer", "price": 230},
    {"name": "Mushroom Curry", "price": 230},
    {"name": "Kadai Mushroom", "price": 230},
    {"name": "Paneer Tikka Masala", "price": 240},
    {"name": "Kaju Curry", "price": 250},
    {"name": "Veg Chat Pat", "price": 210},
    {"name": "Paneer Chat Pat", "price": 240},
    {"name": "Punjabi Veg", "price": 210},
    {"name": "Veg (Hyd)", "price": 210}
  ],
  "BIRYANI": [
    {"name": "Biryani Rice", "price": 160},
    {"name": "Veg Biryani", "price": 190},
    {"name": "Paneer Biryani", "price": 240},
    {"name": "Mushroom Biryani", "price": 240},
    {"name": "Kaju Biryani", "price": 250},
    {"name": "Egg Biryani", "price": 220},
    {"name": "Mini Biryani", "price": 160},
    {"name": "Chicken Dum Biryani", "price": 250},
    {"name": "Chicken Fry Piece Biryani", "price": 260},
    {"name": "Spl Chicken Biryani", "price": 270},
    {"name": "Chicken Wings Biryani", "price": 310},
    {"name": "Chicken Lollipop Biryani", "price": 310},
    {"name": "Moghalai Biryani", "price": 290},
    {"name": "Mutton Biryani", "price": 340},
    {"name": "Fish Biryani", "price": 300},
    {"name": "Prawns Biryani", "price": 320},
    {"name": "Mini Fry Biryani", "price": 190},
    {"name": "Mutton Keema Biryani", "price": 350},
    {"name": "Athidhi Spl Biryani", "price": 420}
  ],
  "FAMILY_PACKS": [
    {"name": "Veg Family Pack", "price": 340},
    {"name": "Chicken Dum Family Pack", "price": 490},
    {"name": "Chicken Fry Family Pack", "price": 520},
    {"name": "Spl Family Pack", "price": 540},
    {"name": "Mutton Family Pack", "price": 640}
  ]
};

async function seedData() {
  try {
    console.log("Creating store...");
    const storeRef = doc(db, 'stores', 'athidhyam-store');
    
    await setDoc(storeRef, {
      name: "Athidhyam",
      description: "Authentic Multi-cuisine Restaurant",
      active: true,
      address: "Main Road",
      bannerImage: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=1000",
      logoImage: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=200",
      category: "Multi-Cuisine",
      rating: 4.8,
      deliveryTimeMs: 45 * 60 * 1000,
      createdAt: serverTimestamp()
    });
    console.log("Store 'Athidhyam' created successfully.");

    let itemsCreated = 0;
    const batch = writeBatch(db);

    console.log("Creating menu items...");
    for (const [categoryName, items] of Object.entries(rawMenu)) {
      const niceCategoryName = categoryName.replace(/_/g, " ");

      const catRef = doc(db, 'categories', `athidhyam-${categoryName.toLowerCase()}`);
      batch.set(catRef, {
        storeId: 'athidhyam-store',
        name: niceCategoryName,
        order: itemsCreated,
        active: true
      });

      for (const item of items) {
        const itemRef = doc(collection(db, 'items'));
        batch.set(itemRef, {
          storeId: 'athidhyam-store',
          categoryId: catRef.id,
          name: item.name,
          description: `Delicious ${item.name} from Athidhyam`,
          price: item.price,
          available: true,
          imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400",
          itemType: categoryName === 'DESERTS' || categoryName === 'ICE_CREAM' ? 'veg' : item.name.toLowerCase().includes('chicken') || item.name.toLowerCase().includes('mutton') || item.name.toLowerCase().includes('fish') || item.name.toLowerCase().includes('prawns') || item.name.toLowerCase().includes('egg') || categoryName === 'BIRYANI' ? 'non-veg' : 'veg',
          createdAt: serverTimestamp()
        });
        itemsCreated++;
      }
    }

    console.log(`Committing ${itemsCreated} items to Firestore...`);
    await batch.commit();
    console.log("Successfully seeded Athidhyam menu!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
}

seedData();
