export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  customizations?: string[];
}

export interface Order {
  id: string;
  storeId: string;
  storeName: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  estimatedDelivery: string;
  paymentMethod: string;
}

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-001",
    storeId: "1",
    storeName: "Sharmaji Ki Rasoi",
    customerId: "user1",
    customerName: "Priya Sharma",
    customerAddress: "Flat 4B, Gokuldham Society, MG Road",
    customerPhone: "+91 98765 43210",
    items: [
      {
        productId: "p1",
        productName: "Paneer Butter Masala",
        quantity: 2,
        price: 180,
      },
      {
        productId: "p3",
        productName: "Garlic Naan",
        quantity: 1,
        price: 40,
      },
    ],
    subtotal: 400,
    deliveryFee: 40,
    total: 440,
    status: "preparing",
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
    estimatedDelivery: "20-30 min",
    paymentMethod: "UPI",
  },
  {
    id: "ORD-002",
    storeId: "3",
    storeName: "Bikaner Sweets & Bakery",
    customerId: "user2",
    customerName: "Rahul Verma",
    customerAddress: "456 Station Road, Near SBI Bank",
    customerPhone: "+91 91234 56789",
    items: [
      {
        productId: "p9",
        productName: "Kaju Katli (250g)",
        quantity: 1,
        price: 260,
      },
      {
        productId: "p10",
        productName: "Motichoor Ladoo (250g)",
        quantity: 2,
        price: 150,
      },
    ],
    subtotal: 560,
    deliveryFee: 30,
    total: 590,
    status: "delivered",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    estimatedDelivery: "15-25 min",
    paymentMethod: "Cash on Delivery",
  },
  {
    id: "ORD-003",
    storeId: "4",
    storeName: "Chatpata Chaat Corner",
    customerId: "user1",
    customerName: "Priya Sharma",
    customerAddress: "Flat 4B, Gokuldham Society, MG Road",
    customerPhone: "+91 98765 43210",
    items: [
      {
        productId: "p13",
        productName: "Pani Puri (10 pcs)",
        quantity: 2,
        price: 40,
        customizations: ["Extra spicy water", "No sweet chutney"],
      },
      {
        productId: "p15",
        productName: "Samosa (2 pcs)",
        quantity: 1,
        price: 25,
      },
    ],
    subtotal: 105,
    deliveryFee: 20,
    total: 125,
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
    estimatedDelivery: "25-35 min",
    paymentMethod: "UPI",
  },
];
