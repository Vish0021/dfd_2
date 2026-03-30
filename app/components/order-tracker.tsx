import { ShoppingBag, Check, Truck, PackageCheck, X } from "lucide-react";
import type { DFDOrder, OrderStatus } from "~/lib/firebase/schema";
import styles from "./order-tracker.module.css";

interface OrderTrackerProps {
  order: DFDOrder;
  className?: string;
}

interface Step {
  id: OrderStatus | "placed";
  title: string;
  description: string;
  Icon: React.ElementType;
  getTimestamp: (o: DFDOrder) => { toDate?: () => Date } | undefined;
}

const DELIVERY_STEPS: Step[] = [
  {
    id: "placed",
    title: "Order Placed",
    description: "Your order has been received",
    Icon: ShoppingBag,
    getTimestamp: (o) => o.createdAt,
  },
  {
    id: "accepted",
    title: "Accepted",
    description: "The store accepted your order",
    Icon: Check,
    getTimestamp: (o) => o.acceptedAt,
  },
  {
    id: "out_for_delivery",
    title: "Out for Delivery",
    description: "Your order is on the way",
    Icon: Truck,
    getTimestamp: (o) => o.outForDeliveryAt,
  },
  {
    id: "delivered",
    title: "Delivered",
    description: "Enjoy your order!",
    Icon: PackageCheck,
    getTimestamp: (o) => o.deliveredAt,
  },
];

/** Maps live DFD status to a progress index in the delivery steps array. */
function statusToIndex(status: OrderStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "accepted":
      return 1;
    case "out_for_delivery":
      return 2;
    case "delivered":
      return 3;
    default:
      return -1; // rejected — handled separately
  }
}

function formatTs(ts: { toDate?: () => Date } | undefined): string | null {
  if (!ts?.toDate) return null;
  return ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Real-time order progress tracker.
 * Shows a vertical step-by-step timeline with timestamps for each completed stage.
 */
export function OrderTracker({ order, className }: OrderTrackerProps) {
  const isRejected = order.status === "rejected";
  const currentIndex = statusToIndex(order.status);

  if (isRejected) {
    return (
      <div className={`${styles.tracker} ${className ?? ""}`}>
        <h2 className={styles.title}>Order Status</h2>
        <div className={styles.rejectedBanner}>
          <div className={styles.rejectedIcon}>
            <X size={28} />
          </div>
          <div>
            <p className={styles.rejectedTitle}>Order Rejected</p>
            <p className={styles.rejectedSub}>
              Your order was not accepted.
              {order.rejectedAt
                ? ` Rejected at ${formatTs(order.rejectedAt)}.`
                : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.tracker} ${className ?? ""}`}>
      <h2 className={styles.title}>Order Status</h2>
      <div className={styles.timeline}>
        {DELIVERY_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const ts = formatTs(step.getTimestamp(order));
          const { Icon } = step;

          return (
            <div
              key={step.id}
              className={[
                styles.step,
                isActive ? styles.stepActive : "",
                isCompleted ? styles.stepCompleted : "",
              ].join(" ")}
            >
              <div className={styles.iconWrapper}>
                <Icon size={20} />
              </div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
                {ts && <p className={styles.stepTime}>{ts}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
