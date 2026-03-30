import React from "react";
import { Link } from "react-router";
import { Store, Search, Edit } from "lucide-react";
import type { Route } from "./+types/merchant.catalog";
import { PRODUCTS } from "~/data/products";
import { toast } from "~/hooks/use-toast";
import styles from "./merchant.catalog.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Catalog Management - DFD" },
    {
      name: "description",
      content: "Manage your product catalog",
    },
  ];
}

export default function MerchantCatalog() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [products, setProducts] = React.useState(PRODUCTS.filter((p) => p.storeId === "1"));

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleStock = (productId: string) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, inStock: !p.inStock } : p)));
    const product = products.find((p) => p.id === productId);
    toast({
      title: product?.inStock ? "Product marked out of stock" : "Product marked in stock",
      description: `${product?.name} availability updated`,
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <Store size={32} />
            <span>DFD Merchant</span>
          </div>
          <div className={styles.merchantBadge}>Sharmaji Ki Rasoi</div>
          <nav className={styles.nav}>
            <Link to="/merchant/dashboard" className={styles.navButton}>
              Dashboard
            </Link>
            <button className={`${styles.navButton} ${styles.navButtonActive}`}>Catalog</button>
          </nav>
        </div>
      </header>

      <main className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Product Catalog</h1>
          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Search products..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.productsList}>
          {filteredProducts.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <img src={product.image} alt={product.name} className={styles.productImage} />
              <div className={styles.productInfo}>
                <h3 className={styles.productName}>{product.name}</h3>
                <div className={styles.productMeta}>
                  <span>{product.category}</span>
                  <span className={styles.productPrice}>₹{product.price.toFixed(2)}</span>
                </div>
              </div>
              <div className={styles.productActions}>
                <label className={`${styles.stockToggle} ${product.inStock ? styles.inStock : styles.outOfStock}`}>
                  <input type="checkbox" checked={product.inStock} onChange={() => handleToggleStock(product.id)} />
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </label>
                <button className={styles.editButton}>
                  <Edit size={16} />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
