import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ShoppingBag, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "~/hooks/use-auth";
import { subscribeToUserOrders } from "~/lib/firebase/services/orders.service";
import type { DFDOrder, OrderStatus } from "~/lib/firebase/schema";
import styles from "./user.orders.module.css";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  rejected: "Rejected",
};

export default function UserOrders() {
  const { firebaseUser } = useAuth();
  const [orders, setOrders] = useState<DFDOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToUserOrders(
      firebaseUser.uid,
      (data) => {
        setOrders(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [firebaseUser?.uid]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Orders</h1>
      </header>

      {loading && (
        <div className={styles.emptyState}>
          <Loader2 size={32} className={styles.spinner} />
          <p className={styles.emptySubtitle}>Loading orders…</p>
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className={styles.emptyState}>
          <ShoppingBag size={56} className={styles.emptyIcon} strokeWidth={1.2} />
          <p className={styles.emptyTitle}>No orders yet</p>
          <span className={styles.emptySubtitle}>Your order history will appear here</span>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className={styles.orderList}>
          {orders.map((order) => (
            <Link key={order.id} to={`/order/${order.id}`} className={styles.orderCard}>
              <div className={styles.orderTop}>
                <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
                <span className={`${styles.statusBadge} ${styles[`status_${order.status}`]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className={styles.orderBottom}>
                <span className={styles.orderDate}>
                  {order.createdAt?.toDate?.()?.toLocaleDateString() ?? "—"}
                </span>
                <div className={styles.orderRight}>
                  <span className={styles.orderTotal}>₹{order.totalAmount?.toFixed(2)}</span>
                  <ChevronRight size={16} className={styles.chevron} />
                </div>
              </div>
              <p className={styles.itemCount}>
                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
