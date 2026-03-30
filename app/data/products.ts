export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  customizable?: boolean;
}

export const PRODUCTS: Product[] = [
  // Sharmaji Ki Rasoi
  {
    id: "p1",
    storeId: "1",
    name: "Paneer Butter Masala",
    description: "Rich and creamy curry made with paneer, spices, onions, and tomatoes",
    price: 180,
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=600&q=80",
    category: "Main Course",
    inStock: true,
    customizable: true,
  },
  {
    id: "p2",
    storeId: "1",
    name: "Dal Makhani",
    description: "Slow-cooked black lentils and kidney beans with butter and cream",
    price: 120,
    image: "https://images.unsplash.com/photo-1546833999-b14144412a83?w=600&q=80",
    category: "Main Course",
    inStock: true,
    customizable: false,
  },
  {
    id: "p3",
    storeId: "1",
    name: "Garlic Naan",
    description: "Tandoori flatbread flavored with garlic and cilantro",
    price: 40,
    image: "https://images.unsplash.com/photo-1606497334759-97300f8624de?w=600&q=80",
    category: "Breads",
    inStock: true,
  },
  {
    id: "p4",
    storeId: "1",
    name: "Boondi Raita",
    description: "Yogurt mixed with crispy gram flour pearls and spices",
    price: 60,
    image: "https://images.unsplash.com/photo-1627344154784-0a35db4058d4?w=600&q=80",
    category: "Sides",
    inStock: true,
  },

  // Apna Kirana Store
  {
    id: "p5",
    storeId: "2",
    name: "Ashirvaad Atta (5kg)",
    description: "Whole wheat flour for soft rotis",
    price: 250,
    image: "https://images.unsplash.com/photo-1586202488887-19af725d2ade?w=600&q=80",
    category: "Staples",
    inStock: true,
  },
  {
    id: "p6",
    storeId: "2",
    name: "Amul Taaza Milk",
    description: "Toned milk (1 Liter)",
    price: 54,
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&q=80",
    category: "Dairy",
    inStock: true,
  },
  {
    id: "p7",
    storeId: "2",
    name: "Tata Salt",
    description: "Iodized vacuum evaporated salt (1 kg)",
    price: 28,
    image: "https://images.unsplash.com/photo-1520626880026-6218cefd0f74?w=600&q=80",
    category: "Staples",
    inStock: true,
  },
  {
    id: "p8",
    storeId: "2",
    name: "Harvest Gold White Bread",
    description: "Fresh white bread",
    price: 40,
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80",
    category: "Bakery",
    inStock: true,
  },

  // Bikaner Sweets & Bakery
  {
    id: "p9",
    storeId: "3",
    name: "Kaju Katli (250g)",
    description: "Premium cashew fudge sweet",
    price: 260,
    image: "https://images.unsplash.com/photo-1628170889987-195c80e722bb?w=600&q=80",
    category: "Sweets",
    inStock: true,
  },
  {
    id: "p10",
    storeId: "3",
    name: "Motichoor Ladoo (250g)",
    description: "Sweet boondi balls fried in pure ghee",
    price: 150,
    image: "https://images.unsplash.com/photo-1605663738010-092dfec0ed32?w=600&q=80",
    category: "Sweets",
    inStock: true,
  },
  {
    id: "p11",
    storeId: "3",
    name: "Rasgulla (2 pcs)",
    description: "Spongy cottage cheese balls dipped in sugar syrup",
    price: 40,
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80",
    category: "Sweets",
    inStock: true,
  },
  {
    id: "p12",
    storeId: "3",
    name: "Milk Rusk Packet",
    description: "Crispy tea-time rusk toast",
    price: 50,
    image: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600&q=80",
    category: "Bakery",
    inStock: true,
  },

  // Chatpata Chaat Corner
  {
    id: "p13",
    storeId: "4",
    name: "Pani Puri (10 pcs)",
    description: "Crispy puris with spicy mint water and potato filling",
    price: 40,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80",
    category: "Chaat",
    inStock: true,
    customizable: true,
  },
  {
    id: "p14",
    storeId: "4",
    name: "Aloo Tikki Chaat",
    description: "Potato patties topped with yogurt, chutneys, and spices",
    price: 50,
    image: "https://images.unsplash.com/photo-1626804475297-a7ea64fb47c4?w=600&q=80",
    category: "Chaat",
    inStock: true,
    customizable: true,
  },
  {
    id: "p15",
    storeId: "4",
    name: "Samosa (2 pcs)",
    description: "Deep-fried pastry filled with spiced potatoes",
    price: 25,
    image: "https://images.unsplash.com/photo-1601050690117-94f5f6af8bdh?w=600&q=80",
    category: "Snacks",
    inStock: true,
  },
  {
    id: "p16",
    storeId: "4",
    name: "Pav Bhaji",
    description: "Spicy vegetable mash served with butter-toasted bread rolls",
    price: 80,
    image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80",
    category: "Snacks",
    inStock: true,
  },
];
