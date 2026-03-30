import { Link } from "react-router";
import { Clock, Star } from "lucide-react";
import type { Store } from "~/data/stores";
import styles from "./store-card.module.css";

interface StoreCardProps {
  /**
   * Store data to display
   * @important
   */
  store: Store;
  className?: string;
}

/**
 * Card component displaying store information with image, rating, and delivery time
 */
export function StoreCard({ store, className }: StoreCardProps) {
  return (
    <Link to={`/store/${store.id}`} className={className}>
      <div className={styles.card}>
        <div className={styles.imageWrapper}>
          <img src={store.image} alt={store.name} className={styles.image} />
          {!store.isOpen && <div className={`${styles.badge} ${styles.closedBadge}`}>Closed</div>}
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <h3 className={styles.name}>{store.name}</h3>
            <div className={styles.rating}>
              <Star className={styles.icon} size={16} fill="currentColor" />
              {store.rating}
            </div>
          </div>
          <p className={styles.description}>{store.description}</p>
          <div className={styles.footer}>
            <div className={styles.deliveryTime}>
              <Clock size={16} />
              {store.deliveryTime}
            </div>
            <span className={styles.category}>{store.category}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
