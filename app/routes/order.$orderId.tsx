import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, MapPin, Phone, CreditCard, Loader2 } from "lucide-react";
import type { Route } from "./+types/order.$orderId";
import type { DFDOrder } from "~/lib/firebase/schema";
import { subscribeToOrder } from "~/lib/firebase/services/orders.service";
import { OrderTracker } from "~/components/order-tracker";
import styles from "./order.$orderId.module.css";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Order Tracking - DFD" },
    { name: "description", content: "Track your order status in real time" },
  ];
}

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<DFDOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeToOrder(
      orderId,
      (data) => {
        setOrder(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [orderId]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h1 className={styles.headerTitle}>Order Tracking</h1>
          <div className={styles.liveDot} title="Live updates" />
        </div>
      </header>

      <main className={styles.container}>
        {loading && (
          <div className={styles.centered}>
            <Loader2 size={32} className={styles.spinner} />
            <p>Loading order…</p>
          </div>
        )}

        {error && (
          <div className={styles.centered}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {!loading && !error && !order && (
          <div className={styles.centered}>
            <h2>Order not found</h2>
            <p>The order you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        )}

        {order && (
          <>
            <OrderTracker order={order} />

            <div className={styles.orderDetails}>
              <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                  <h2>Order Summary</h2>
                  <p className={styles.orderMeta}>
                    Placed {order.createdAt?.toDate?.()?.toLocaleString() ?? "—"}
                  </p>
                </div>
                <div className={styles.orderNumber}>#{order.id.slice(0, 8)}</div>
              </div>

              <div className={styles.itemsList}>
                <h3 className={styles.itemsTitle}>Items</h3>
                {order.items.map((item, index) => (
                  <div key={index} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.name}</p>
                      <p className={styles.itemQuantity}>Qty: {item.quantity}</p>
                    </div>
                    <div className={styles.itemPrice}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.totals}>
                <div className={styles.totalRow}>
                  <span>Subtotal</span>
                  <span>₹{order.subtotal?.toFixed(2)}</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Tax</span>
                  <span>₹{order.taxAmount?.toFixed(2)}</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Delivery Fee</span>
                  <span>₹{order.deliveryFee}</span>
                </div>
                <div className={`${styles.totalRow} ${styles.final}`}>
                  <span>Total</span>
                  <span>₹{order.totalAmount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className={styles.deliveryInfo}>
              <h3>Delivery Information</h3>
              {order.deliveryAddress && (
                <div className={styles.infoRow}>
                  <MapPin size={20} />
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>Delivery Address</p>
                    <p className={styles.infoValue}>{order.deliveryAddress}</p>
                  </div>
                </div>
              )}
              {order.deliveryPhone && (
                <div className={styles.infoRow}>
                  <Phone size={20} />
                  <div className={styles.infoContent}>
                    <p className={styles.infoLabel}>Contact Number</p>
                    <p className={styles.infoValue}>{order.deliveryPhone}</p>
                  </div>
                </div>
              )}
              <div className={styles.infoRow}>
                <CreditCard size={20} />
                <div className={styles.infoContent}>
                  <p className={styles.infoLabel}>Payment Method</p>
                  <p className={styles.infoValue}>Cash on Delivery</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
