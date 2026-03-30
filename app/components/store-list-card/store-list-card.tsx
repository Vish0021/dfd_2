import { Link } from "react-router";
import { ChevronRight, Utensils, ShoppingBasket } from "lucide-react";
import type { DFDStore, StoreType } from "~/lib/firebase/schema";
import styles from "./store-list-card.module.css";

interface StoreListCardProps {
  store: DFDStore;
}

const TYPE_CONFIG: Record<StoreType, { label: string; icon: typeof Utensils }> = {
  restaurant: { label: "Restaurant", icon: Utensils },
  grocery: { label: "Grocery", icon: ShoppingBasket },
};

export function StoreListCard({ store }: StoreListCardProps) {
  const config = TYPE_CONFIG[store.type];
  const TypeIcon = config.icon;

  return (
    <Link to={`/store/${store.id}`} className={styles.card}>
      <div className={styles.iconWrap}>
        <TypeIcon size={24} className={styles.typeIcon} />
      </div>

      <div className={styles.info}>
        <h3 className={styles.name}>{store.name}</h3>
        <div className={styles.meta}>
          <span className={styles.type}>{config.label}</span>
          <span className={styles.dot}>·</span>
          <span className={`${styles.status} ${styles.open}`}>Open</span>
        </div>
      </div>

      <ChevronRight size={18} className={styles.chevron} />
    </Link>
  );
}
