import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Store, DollarSign, Package, Clock, LogOut } from "lucide-react";
import type { Route } from "./+types/merchant.dashboard";
import { MOCK_ORDERS } from "~/data/orders";
import { toast } from "~/hooks/use-toast";
import { useAuth } from "~/hooks/use-auth";
import styles from "./merchant.dashboard.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Merchant Dashboard - DFD" },
    {
      name: "description",
      content: "Manage your orders and inventory",
    },
  ];
}

export default function MerchantDashboard() {
  const { firebaseUser, profile, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      navigate("/login", { replace: true });
    }
    if (!loading && firebaseUser && profile && profile.role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [loading, firebaseUser, profile, navigate]);

  const [orders, setOrders] = React.useState(MOCK_ORDERS);

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const activeOrders = orders.filter((o) => o.status === "preparing" || o.status === "accepted");

  const todayRevenue = orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0);

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "preparing" as const } : o)));
    toast({
      title: "Order accepted",
      description: "The order has been accepted and is now being prepared",
    });
  };

  const handleMarkReady = (orderId: string) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "ready" as const } : o)));
    toast({
      title: "Order ready",
      description: "The order has been marked as ready for delivery",
    });
  };

  const handleRejectOrder = (orderId: string) => {
    if (window.confirm("Are you sure you want to reject this order? This action cannot be undone.")) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as const } : o)));
      toast({
        title: "Order rejected",
        description: "The order has been cancelled",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Store size={32} />
            <span>DFD Merchant</span>
          </div>
          <div className={styles.merchantBadge}>{profile?.name ?? "Merchant"}</div>
          <nav className={styles.nav}>
            <button className={`${styles.navButton} ${styles.navButtonActive}`}>Dashboard</button>
            <Link to="/merchant/catalog" className={styles.navButton}>
              Catalog
            </Link>
          </nav>
          <button
            className={styles.logoutButton}
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
            title="Sign Out"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </header>

      <main className={styles.container}>
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIcon}>
                <DollarSign size={24} />
              </div>
              <p className={styles.statLabel}>Today's Revenue</p>
            </div>
            <p className={styles.statValue}>₹{todayRevenue.toFixed(2)}</p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIcon}>
                <Package size={24} />
              </div>
              <p className={styles.statLabel}>Total Orders</p>
            </div>
            <p className={styles.statValue}>{orders.length}</p>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={styles.statIcon}>
                <Clock size={24} />
              </div>
              <p className={styles.statLabel}>Pending Orders</p>
            </div>
            <p className={styles.statValue}>{pendingOrders.length}</p>
          </div>
        </div>

        {pendingOrders.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Incoming Orders</h2>
            </div>
            <div className={styles.ordersList}>
              {pendingOrders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderCardHeader}>
                    <div>
                      <div className={styles.orderNumber}>{order.id}</div>
                      <div className={styles.orderTime}>{order.createdAt.toLocaleTimeString()}</div>
                    </div>
                    <div className={`${styles.statusBadge} ${styles.statusPending}`}>New Order</div>
                  </div>
                  <div className={styles.orderItems}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className={styles.orderItem}>
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.orderFooter}>
                    <div className={styles.orderTotal}>Total: ₹{order.total.toFixed(2)}</div>
                    <div className={styles.orderActions}>
                      <button
                        className={`${styles.actionButton} ${styles.acceptButton}`}
                        onClick={() => handleAcceptOrder(order.id)}
                      >
                        Accept Order
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.rejectButton}`}
                        onClick={() => handleRejectOrder(order.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Orders</h2>
          </div>
          {activeOrders.length > 0 ? (
            <div className={styles.ordersList}>
              {activeOrders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderCardHeader}>
                    <div>
                      <div className={styles.orderNumber}>{order.id}</div>
                      <div className={styles.orderTime}>{order.createdAt.toLocaleTimeString()}</div>
                    </div>
                    <div className={`${styles.statusBadge} ${styles.statusPreparing}`}>Preparing</div>
                  </div>
                  <div className={styles.orderItems}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className={styles.orderItem}>
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.orderFooter}>
                    <div className={styles.orderTotal}>Total: ₹{order.total.toFixed(2)}</div>
                    <div className={styles.orderActions}>
                      <button
                        className={`${styles.actionButton} ${styles.readyButton}`}
                        onClick={() => handleMarkReady(order.id)}
                      >
                        Mark Ready
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <h3>No active orders</h3>
              <p>Orders being prepared will appear here</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
