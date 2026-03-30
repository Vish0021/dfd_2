import { Settings } from "lucide-react";
import type { Product } from "~/data/products";
import styles from "./product-card.module.css";

interface ProductCardProps {
  /**
   * Product data to display
   * @important
   */
  product: Product;
  /**
   * Callback when add to cart button is clicked
   */
  onAddToCart?: (product: Product) => void;
  className?: string;
}

/**
 * Card component displaying product information with image, price, and add to cart button
 */
export function ProductCard({ product, onAddToCart, className }: ProductCardProps) {
  return (
    <div className={`${styles.card} ${className || ""}`}>
      <div className={styles.imageWrapper}>
        <img src={product.image} alt={product.name} className={styles.image} />
        {!product.inStock && <div className={styles.outOfStock}>Out of Stock</div>}
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{product.name}</h3>
          <span className={styles.price}>₹{product.price.toFixed(2)}</span>
        </div>
        <p className={styles.description}>{product.description}</p>
        <div className={styles.footer}>
          <div>
            <span className={styles.category}>{product.category}</span>
            {product.customizable && (
              <div className={styles.customizable}>
                <Settings size={12} />
                Customizable
              </div>
            )}
          </div>
          <button className={styles.addButton} onClick={() => onAddToCart?.(product)} disabled={!product.inStock}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
