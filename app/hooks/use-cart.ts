import { useState, useEffect, useCallback } from "react";
import type { DFDItem } from "~/lib/firebase/schema";

export interface CartItem {
  item: DFDItem;
  quantity: number;
}

export interface CartState {
  storeId: string | null;
  items: CartItem[];
}

export interface UseCartReturn {
  cartItems: CartItem[];
  cartStoreId: string | null;
  totalCount: number;
  addItem: (item: DFDItem) => void;
  removeItem: (itemId: string) => void;
  changeQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "dfd_cart";
const EMPTY_CART: CartState = { storeId: null, items: [] };

function loadCart(): CartState {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartState) : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

function saveCart(cart: CartState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

/**
 * Persistent cart hook backed by localStorage.
 * Enforces single-store rule: adding an item from a different store clears the cart first.
 */
export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setCart(loadCart());
  }, []);

  const updateCart = useCallback((next: CartState) => {
    setCart(next);
    saveCart(next);
  }, []);

  const addItem = useCallback(
    (item: DFDItem) => {
      setCart((prev) => {
        // If item from a different store → clear cart first
        const base: CartState =
          prev.storeId && prev.storeId !== item.storeId
            ? { storeId: item.storeId, items: [] }
            : { ...prev, storeId: item.storeId };

        const existing = base.items.find((c) => c.item.id === item.id);
        const nextItems = existing
          ? base.items.map((c) =>
              c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
            )
          : [...base.items, { item, quantity: 1 }];

        const next = { ...base, items: nextItems };
        saveCart(next);
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setCart((prev) => {
        const nextItems = prev.items.filter((c) => c.item.id !== itemId);
        const next: CartState = {
          storeId: nextItems.length > 0 ? prev.storeId : null,
          items: nextItems,
        };
        saveCart(next);
        return next;
      });
    },
    [],
  );

  const changeQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(itemId);
        return;
      }
      setCart((prev) => {
        const nextItems = prev.items.map((c) =>
          c.item.id === itemId ? { ...c, quantity } : c,
        );
        const next = { ...prev, items: nextItems };
        saveCart(next);
        return next;
      });
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    updateCart(EMPTY_CART);
  }, [updateCart]);

  const totalCount = cart.items.reduce((sum, c) => sum + c.quantity, 0);

  return {
    cartItems: cart.items,
    cartStoreId: cart.storeId,
    totalCount,
    addItem,
    removeItem,
    changeQuantity,
    clearCart,
  };
}
