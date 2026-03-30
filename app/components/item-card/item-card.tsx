import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { DFDItem } from "~/lib/firebase/schema";
import styles from "./item-card.module.css";

interface ItemCardProps {
  item: DFDItem;
  quantity: number;
  onAdd: (item: DFDItem) => void;
  onRemove: (itemId: string) => void;
  onChangeQty: (itemId: string, qty: number) => void;
}

export function ItemCard({ item, quantity, onAdd, onRemove, onChangeQty }: ItemCardProps) {
  const unavailable = !item.available;

  return (
    <div className={`${styles.card} ${unavailable ? styles.unavailable : ""}`}>
      {item.imageUrl && (
        <div className={styles.imageWrap}>
          <img src={item.imageUrl} alt={item.name} className={styles.image} />
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.top}>
          <div className={styles.info}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {item.itemType === "veg" && (
                <span className={styles.dietIcon} style={{ borderColor: "green" }}>
                  <span style={{ backgroundColor: "green" }} />
                </span>
              )}
              {item.itemType === "non-veg" && (
                <span className={styles.dietIcon} style={{ borderColor: "red" }}>
                  <span style={{ backgroundColor: "red" }} />
                </span>
              )}
              <h3 className={styles.name}>{item.name}</h3>
            </div>
            {item.description && <p className={styles.description}>{item.description}</p>}
          </div>
          {unavailable && <span className={styles.badge}>Unavailable</span>}
        </div>

        <div className={styles.footer}>
          <span className={styles.price}>₹{item.price.toFixed(2)}</span>

          {unavailable ? (
            <button className={styles.addBtn} disabled aria-disabled="true">
              <ShoppingCart size={15} />
              Add
            </button>
          ) : quantity === 0 ? (
            <button className={styles.addBtn} onClick={() => onAdd(item)}>
              <ShoppingCart size={15} />
              Add
            </button>
          ) : (
            <div className={styles.qtyControl}>
              <button
                className={styles.qtyBtn}
                onClick={() =>
                  quantity === 1 ? onRemove(item.id) : onChangeQty(item.id, quantity - 1)
                }
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className={styles.qty}>{quantity}</span>
              <button
                className={styles.qtyBtn}
                onClick={() => onChangeQty(item.id, quantity + 1)}
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
