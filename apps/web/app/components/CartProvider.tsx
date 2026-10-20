'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { CartItem } from '../types';
import {
  CART_STORAGE_KEY,
  NewCartItem,
  cartCount,
  cartReducer,
  cartTotal,
  parseStoredCart,
  qtyOfProduct,
  remainingStock,
} from '../lib/cart';

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  /** Thêm vào giỏ; trả về số ly thực sự được thêm (có thể ít hơn do giới hạn tồn kho). */
  addItem: (item: NewCartItem) => number;
  changeQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  /** Số ly của sản phẩm này đã có trong giỏ. */
  qtyInCart: (productId: number) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  // Chỉ ghi localStorage sau khi đã đọc xong, tránh ghi đè giỏ cũ bằng giỏ rỗng.
  const hydrated = useRef(false);

  useEffect(() => {
    dispatch({ type: 'hydrate', items: parseStoredCart(localStorage.getItem(CART_STORAGE_KEY)) });
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Trình duyệt chặn/đầy localStorage: giỏ vẫn hoạt động trong phiên hiện tại.
    }
  }, [items]);

  const addItem = useCallback(
    (item: NewCartItem) => {
      const added = Math.min(item.qty, remainingStock(items, item.product));
      if (added > 0) dispatch({ type: 'add', id: newId(), item });
      return Math.max(0, added);
    },
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      total: cartTotal(items),
      addItem,
      changeQty: (id, delta) => dispatch({ type: 'changeQty', id, delta }),
      removeItem: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
      qtyInCart: (productId) => qtyOfProduct(items, productId),
    }),
    [items, addItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart phải được dùng bên trong <CartProvider>');
  return ctx;
}
