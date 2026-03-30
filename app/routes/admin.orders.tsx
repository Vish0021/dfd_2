import { useState } from "react";
import { Check, X, Truck, PackageCheck, ChevronDown, ChevronUp, Wifi } from "lucide-react";
import { useAdminOrders } from "~/hooks/use-admin-orders";
import type { DFDOrder, OrderStatus } from "~/lib/firebase/schema";
import styles from "./admin.orders.module.css";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  rejected: "Rejected",
};

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "accepted",
  "out_for_delivery",
  "delivered",
  "rejected",
];

export default function AdminOrders() {
  const { byStatus, loading, error, accept, reject, dispatch, deliver } = useAdminOrders();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});

  async function handle(orderId: string, fn: (id: string) => Promise<void>) {
    setActing(orderId);
    setActionError((prev) => ({ ...prev, [orderId]: "" }));
    try {
      await fn(orderId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Action failed.";
      setActionError((prev) => ({ ...prev, [orderId]: msg }));
    } finally {
      setActing(null);
    }
  }

  async function handleReject(orderId: string, fn: (id: string) => Promise<void>) {
    if (window.confirm("Are you sure you want to reject this order? This action cannot be undone.")) {
      await handle(orderId, fn);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Orders</h1>
        <div className={styles.liveIndicator}>
          <Wifi size={14} />
          Live
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <p className={styles.info}>Connecting to live orders…</p>}

      {!loading &&
        STATUS_ORDER.map((status) => {
          const list = byStatus[status] ?? [];
          return (
            <section key={status} className={styles.statusSection}>
              <div className={styles.statusHeader}>
                <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className={styles.count}>{list.length}</span>
              </div>

              {list.length === 0 ? (
                <p className={styles.empty}>No {STATUS_LABELS[status].toLowerCase()} orders.</p>
              ) : (
                <div className={styles.orderList}>
                  {list.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      expanded={expanded === order.id}
                      onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                      onAccept={(time) => handle(order.id, (id) => accept(id, time))}
                      onReject={() => handleReject(order.id, reject)}
                      onDispatch={(name) => handle(order.id, (id) => dispatch(id, name))}
                      onDeliver={() => handle(order.id, deliver)}
                      acting={acting === order.id}
                      actionError={actionError[order.id] ?? ""}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
    </div>
  );
}

interface OrderRowProps {
  order: DFDOrder;
  expanded: boolean;
  onToggle: () => void;
  onAccept: (prepTimeMinutes: number) => void;
  onReject: () => void;
  onDispatch: (deliveryPersonName: string) => void;
  onDeliver: () => void;
  acting: boolean;
  actionError: string;
}

function fmt(ts: { toDate?: () => Date } | undefined): string {
  return ts?.toDate?.()?.toLocaleString() ?? "—";
}

function OrderRow({
  order,
  expanded,
  onToggle,
  onAccept,
  onReject,
  onDispatch,
  onDeliver,
  acting,
  actionError,
}: OrderRowProps) {
  const [prepTime, setPrepTime] = useState(30);
  const [riderName, setRiderName] = useState("");

  const isPending = order.status === "pending";
  const isAccepted = order.status === "accepted";
  const isOutForDelivery = order.status === "out_for_delivery";
  const isFinal = order.status === "delivered" || order.status === "rejected";

  return (
    <div className={styles.orderCard}>
      <button className={styles.orderSummary} onClick={onToggle}>
        <div className={styles.orderMeta}>
          <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
          <span className={styles.orderDate}>{fmt(order.createdAt)}</span>
        </div>
        <div className={styles.orderRight}>
          <span className={styles.orderTotal}>₹{order.totalAmount?.toFixed(2)}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className={styles.orderDetail}>
          {/* Items */}
          <div className={styles.itemsTable}>
            <div className={styles.itemsHeader}>
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
            </div>
            {order.items.map((item, i) => (
              <div key={i} className={styles.itemRow}>
                <span>{item.name}</span>
                <span>{item.quantity}</span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className={styles.totalsBlock}>
            <div className={styles.totalLine}>
              <span>Subtotal</span>
              <span>₹{order.subtotal?.toFixed(2)}</span>
            </div>
            <div className={styles.totalLine}>
              <span>Tax</span>
              <span>₹{order.taxAmount?.toFixed(2)}</span>
            </div>
            <div className={styles.totalLine}>
              <span>Delivery</span>
              <span>₹{order.deliveryFee}</span>
            </div>
            <div className={`${styles.totalLine} ${styles.grandLine}`}>
              <span>Total</span>
              <span>₹{order.totalAmount?.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery info */}
          {order.deliveryAddress && (
            <div className={styles.deliveryInfo}>
              <p>
                <strong>Address:</strong> {order.deliveryAddress}
              </p>
              {order.deliveryPhone && (
                <p>
                  <strong>Phone:</strong> {order.deliveryPhone}
                </p>
              )}
              {order.deliveryInstructions && (
                <p>
                  <strong>Instructions:</strong> {order.deliveryInstructions}
                </p>
              )}
            </div>
          )}

          {/* Lifecycle timestamps */}
          <div className={styles.timestamps}>
            <div className={styles.tsRow}>
              <span className={styles.tsLabel}>Placed</span>
              <span className={styles.tsValue}>{fmt(order.createdAt)}</span>
            </div>
            {order.acceptedAt && (
              <div className={styles.tsRow}>
                <span className={styles.tsLabel}>Accepted</span>
                <span className={styles.tsValue}>{fmt(order.acceptedAt)}</span>
              </div>
            )}
            {order.outForDeliveryAt && (
              <div className={styles.tsRow}>
                <span className={styles.tsLabel}>Dispatched</span>
                <span className={styles.tsValue}>{fmt(order.outForDeliveryAt)}</span>
              </div>
            )}
            {order.deliveredAt && (
              <div className={styles.tsRow}>
                <span className={styles.tsLabel}>Delivered</span>
                <span className={styles.tsValue}>{fmt(order.deliveredAt)}</span>
              </div>
            )}
            {order.rejectedAt && (
              <div className={styles.tsRow}>
                <span className={styles.tsLabel}>Rejected</span>
                <span className={styles.tsValue}>{fmt(order.rejectedAt)}</span>
              </div>
            )}
          </div>

          {actionError && <p className={styles.actionError}>{actionError}</p>}

          {/* Dynamic action buttons */}
          {!isFinal && (
            <div className={styles.actions} style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {isPending && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <input 
                    type="number" 
                    value={prepTime} 
                    onChange={e => setPrepTime(Number(e.target.value))}
                    min={5}
                    max={120}
                    style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    title="Prep Time (mins)"
                  />
                  <span>mins prep</span>
                  <button className={styles.acceptBtn} onClick={() => onAccept(prepTime)} disabled={acting}>
                    <Check size={16} />
                    Accept
                  </button>
                  <button className={styles.rejectBtn} onClick={onReject} disabled={acting}>
                    <X size={16} />
                    Reject
                  </button>
                </div>
              )}
              {isAccepted && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                  <input 
                    type="text" 
                    value={riderName} 
                    onChange={e => setRiderName(e.target.value)}
                    placeholder="Rider Name"
                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                  <button className={styles.dispatchBtn} onClick={() => onDispatch(riderName)} disabled={acting || !riderName.trim()}>
                    <Truck size={16} />
                    Dispatch
                  </button>
                </div>
              )}
              {isOutForDelivery && (
                <button className={styles.deliverBtn} onClick={onDeliver} disabled={acting}>
                  <PackageCheck size={16} />
                  Mark Delivered
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
