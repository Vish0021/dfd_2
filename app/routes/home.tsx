import React from "react";
import { Link, useNavigate } from "react-router";
import { MapPin, Search, ShoppingCart, User, ChevronRight, Bike, LogOut } from "lucide-react";
import { useAuth } from "~/hooks/use-auth";
import type { Route } from "./+types/home";
import { STORES, STORE_CATEGORIES } from "~/data/stores";
import { MOCK_ORDERS } from "~/data/orders";
import { StoreCard } from "~/components/store-card";
import styles from "./home.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "DFD - Direct Fast Delivery" },
    {
      name: "description",
      content: "Fast delivery from your favorite local stores",
    },
  ];
}

function AuthButton() {
  const { firebaseUser, profile, logout } = useAuth();
  const navigate = useNavigate();

  if (!firebaseUser) {
    return (
      <Link to="/login" className={styles.iconButton} title="Sign In">
        <User size={20} />
      </Link>
    );
  }

  return (
    <div className={styles.userMenu}>
      <span className={styles.userName}>{profile?.name ?? firebaseUser.email ?? "User"}</span>
      <button
        className={styles.iconButton}
        title="Sign Out"
        onClick={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
      >
        <LogOut size={20} />
      </button>
    </div>
  );
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredStores = STORES.filter((store) => {
    const matchesCategory = selectedCategory === "all" || store.category === selectedCategory;
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const recentOrders = MOCK_ORDERS.slice(0, 2);

  return (
    <div className={styles.home}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <Bike size={32} />
            <span>DFD</span>
          </Link>

          <div className={styles.locationSelector}>
            <MapPin size={16} />
            <span>Manipal, Karnataka</span>
          </div>

          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Search for stores..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.navButtons}>
            <Link to="/checkout" className={styles.iconButton}>
              <ShoppingCart size={20} />
              <span className={styles.badge}>2</span>
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>

      <main className={styles.container}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Fast Delivery from Local Stores</h1>
          <p className={styles.heroSubtitle}>Supporting your community, one delivery at a time</p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Categories</h2>
          </div>
          <div className={styles.categories}>
            {STORE_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className={`${styles.categoryCard} ${selectedCategory === category.id ? styles.categoryCardActive : ""}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <div className={styles.categoryIcon}>{category.icon}</div>
                <div className={styles.categoryName}>{category.name}</div>
              </div>
            ))}
          </div>
        </section>

        {recentOrders.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Orders</h2>
              <Link to="/orders" className={styles.viewAll}>
                View All
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className={styles.recentOrders}>
              {recentOrders.map((order) => {
                const store = STORES.find((s) => s.id === order.storeId);
                return (
                  <Link key={order.id} to={`/order/${order.id}`} className={styles.orderCard}>
                    <img src={store?.image} alt={order.storeName} className={styles.orderImage} />
                    <div className={styles.orderInfo}>
                      <h3 className={styles.orderStoreName}>{order.storeName}</h3>
                      <p className={styles.orderItems}>
                        {order.items.length} items • ₹{order.total.toFixed(2)}
                      </p>
                    </div>
                    <button className={styles.reorderButton}>Reorder</button>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {selectedCategory === "all"
                ? "All Stores"
                : `${STORE_CATEGORIES.find((c) => c.id === selectedCategory)?.name} Stores`}
            </h2>
          </div>
          <div className={styles.storeGrid}>
            {filteredStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
