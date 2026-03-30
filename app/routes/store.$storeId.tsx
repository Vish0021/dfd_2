import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ShoppingCart, Clock, Star, AlertCircle, Search, SlidersHorizontal } from "lucide-react";
import type { Route } from "./+types/store.$storeId";
import { useStoreItems } from "~/hooks/use-store-items";
import { useCart } from "~/hooks/use-cart";
import { ItemCard } from "~/components/item-card/item-card";
import type { DFDItem } from "~/lib/firebase/schema";
import styles from "./store.$storeId.module.css";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Store — DFD` }];
}

export default function StoreDetail() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { store, items, loading, error } = useStoreItems(storeId);
  const { cartItems, cartStoreId, totalCount, addItem, removeItem, changeQuantity } = useCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "veg" | "non-veg">("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"none" | "price-low" | "price-high">("none");

  useEffect(() => {
    if (!storeId) {
      navigate("/user", { replace: true });
    }
  }, [storeId, navigate]);

  useEffect(() => {
    if (!loading && !error && !store) {
      navigate("/user", { replace: true });
    }
  }, [loading, error, store, navigate]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const cartConflict = cartStoreId !== null && cartStoreId !== storeId && totalCount > 0;

  const filteredItems = useMemo(() => {
    let result = items;
    
    if (debouncedSearch) result = result.filter(i => i.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    if (filterType !== "all") result = result.filter(i => i.itemType === filterType);
    if (inStockOnly) result = result.filter(i => i.available);
    
    if (sortBy === "price-low") result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === "price-high") result = [...result].sort((a, b) => b.price - a.price);

    return result;
  }, [items, debouncedSearch, filterType, inStockOnly, sortBy]);

  const itemsByCategory = useMemo(() => {
    return filteredItems.reduce(
    (acc, item) => {
      const cat = item.category || "Other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, DFDItem[]>
    );
  }, [filteredItems]);

  const getQty = (itemId: string) =>
    cartItems.find((c) => c.item.id === itemId)?.quantity ?? 0;

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>

          <h1 className={styles.headerTitle}>{store?.name ?? "Store"}</h1>

          {totalCount > 0 && cartStoreId === storeId && (
            <button
              className={styles.cartButton}
              onClick={() => navigate("/checkout")}
            >
              <ShoppingCart size={17} />
              <span>
                {totalCount} item{totalCount !== 1 ? "s" : ""}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Store banner */}
      {store && (
        <div className={styles.banner}>
          <div className={styles.bannerOverlay}>
            <div className={styles.bannerInfo}>
              <span className={styles.storeType}>{store.type}</span>
              <div className={styles.storeStats}>
                <span className={styles.statItem}>
                  <Star size={13} fill="currentColor" />
                  4.5
                </span>
                <span className={styles.statItem}>
                  <Clock size={13} />
                  30–45 min
                </span>
                <span className={styles.openBadge}>
                  {store.active ? "🟢 Open" : "🔴 Closed"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart conflict notice */}
      {cartConflict && (
        <div className={styles.conflictBanner}>
          <AlertCircle size={16} />
          <span>Your cart has items from another store. Adding here will clear it.</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      {!loading && !error && items.length > 0 && (
        <div className={styles.filterSection}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text"
              placeholder="Search in menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.pillsWrap} style={{ overflowX: "auto", display: "flex", gap: "8px", paddingBottom: "4px" }}>
            <button 
              className={`${styles.filterPill} ${filterType === 'veg' ? styles.activePill : ''}`} 
              onClick={() => setFilterType(f => f === 'veg' ? 'all' : 'veg')}
            >
              <span className={styles.dietSpec} style={{ borderColor: "green" }}><span style={{ backgroundColor: "green" }} /></span> Veg
            </button>
            <button 
              className={`${styles.filterPill} ${filterType === 'non-veg' ? styles.activePill : ''}`}
              onClick={() => setFilterType(f => f === 'non-veg' ? 'all' : 'non-veg')}
            >
              <span className={styles.dietSpec} style={{ borderColor: "red" }}><span style={{ backgroundColor: "red" }} /></span> Non-Veg
            </button>
            <button 
              className={`${styles.filterPill} ${inStockOnly ? styles.activePill : ''}`}
              onClick={() => setInStockOnly(v => !v)}
            >
              In Stock
            </button>
            <button 
              className={`${styles.filterPill} ${sortBy !== 'none' ? styles.activePill : ''}`}
              onClick={() => setSortBy(s => s === 'none' ? 'price-low' : s === 'price-low' ? 'price-high' : 'none')}
            >
              <SlidersHorizontal size={14} /> 
              {sortBy === 'none' ? 'Sort' : sortBy === 'price-low' ? 'Low to High' : 'High to Low'}
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={styles.container}>
        {loading && (
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <AlertCircle size={32} />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className={styles.emptyState}>
            <ShoppingCart size={40} className={styles.emptyIcon} />
            <h3>No items yet</h3>
            <p>This store hasn't added any items to their menu.</p>
          </div>
        )}

        {!loading &&
          !error &&
          Object.entries(itemsByCategory).map(([category, catItems]) => (
            <section key={category} className={styles.menuSection}>
              <h2 className={styles.menuTitle}>{category}</h2>
              <div className={styles.itemList}>
                {catItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    quantity={getQty(item.id)}
                    onAdd={addItem}
                    onRemove={removeItem}
                    onChangeQty={changeQuantity}
                  />
                ))}
              </div>
            </section>
          ))}
      </main>

      {/* Floating checkout bar */}
      {totalCount > 0 && cartStoreId === storeId && (
        <div className={styles.checkoutBar}>
          <div className={styles.checkoutBarContent}>
            <span className={styles.checkoutCount}>
              {totalCount} item{totalCount !== 1 ? "s" : ""} in cart
            </span>
            <button
              className={styles.checkoutBtn}
              onClick={() => navigate("/checkout")}
            >
              Checkout
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
