export interface Store {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  deliveryTime: string;
  description: string;
  isOpen: boolean;
}

export const STORE_CATEGORIES = [
  { id: "all", name: "All", icon: "🏪" },
  { id: "food", name: "Food", icon: "🍛" },
  { id: "grocery", name: "Grocery", icon: "🛒" },
  { id: "bakery", name: "Sweets & Bakery", icon: "🥨" },
  { id: "pharmacy", name: "Pharmacy", icon: "💊" },
  { id: "beverages", name: "Beverages", icon: "🥤" },
];

export const STORES: Store[] = [
  {
    id: "1",
    name: "Sharmaji Ki Rasoi",
    category: "food",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
    rating: 4.8,
    deliveryTime: "20-30 min",
    description: "Authentic North Indian thalis and curries",
    isOpen: true,
  },
  {
    id: "2",
    name: "Apna Kirana Store",
    category: "grocery",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    rating: 4.6,
    deliveryTime: "30-40 min",
    description: "Your neighborhood grocery store for daily needs",
    isOpen: true,
  },
  {
    id: "3",
    name: "Bikaner Sweets & Bakery",
    category: "bakery",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=80",
    rating: 4.9,
    deliveryTime: "15-25 min",
    description: "Freshly made standard Indian sweets and cookies",
    isOpen: true,
  },
  {
    id: "4",
    name: "Chatpata Chaat Corner",
    category: "food",
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80",
    rating: 4.5,
    deliveryTime: "25-35 min",
    description: "Spicy chaat, pani puri, and standard snacks",
    isOpen: true,
  },
  {
    id: "5",
    name: "Kisan Sabzi Mandi",
    category: "grocery",
    image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&q=80",
    rating: 4.7,
    deliveryTime: "35-45 min",
    description: "Fresh organic vegetables directly from farms",
    isOpen: true,
  },
  {
    id: "6",
    name: "Sanjeevani Medicals",
    category: "pharmacy",
    image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80",
    rating: 4.8,
    deliveryTime: "20-30 min",
    description: "Your trusted local medical store",
    isOpen: true,
  },
  {
    id: "7",
    name: "South Indian Express",
    category: "food",
    image: "https://images.unsplash.com/photo-1615486171448-4fd32420f8ab?w=800&q=80",
    rating: 4.6,
    deliveryTime: "20-30 min",
    description: "Authentic dosas, idlis and more",
    isOpen: false,
  },
  {
    id: "8",
    name: "Lassi & Juice Shop",
    category: "beverages",
    image: "https://images.unsplash.com/photo-1609840131109-7d046c86e00e?w=800&q=80",
    rating: 4.7,
    deliveryTime: "15-20 min",
    description: "Fresh fruit juices and thick lassis",
    isOpen: true,
  },
];
