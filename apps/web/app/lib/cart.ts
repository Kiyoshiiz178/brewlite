import type { CartItem } from '../types';

export const CART_STORAGE_KEY = 'brewlite_cart';

/** Dữ liệu để thêm vào giỏ: id và lineTotal do giỏ hàng tự tính. */
export type NewCartItem = Omit<CartItem, 'id' | 'lineTotal'>;

export type CartAction =
  | { type: 'hydrate'; items: CartItem[] }
  | { type: 'add'; id: string; item: NewCartItem }
  | { type: 'changeQty'; id: string; delta: number }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

/** Hai dòng giỏ được coi là "cùng món" khi cùng sản phẩm, size và bộ topping. */
function lineKey(item: Pick<CartItem, 'product' | 'size' | 'toppings'>): string {
  return `${item.product.id}|${item.size}|${[...item.toppings].sort().join(',')}`;
}

/** Tổng số ly của một sản phẩm trong giỏ (cộng mọi dòng, mọi size/topping). */
export function qtyOfProduct(items: CartItem[], productId: number): number {
  return items.reduce((sum, i) => (i.product.id === productId ? sum + i.qty : sum), 0);
}

/** Số ly còn có thể thêm cho sản phẩm này, tính theo tồn kho trừ phần đã có trong giỏ. */
export function remainingStock(items: CartItem[], product: { id: number; stock: number }): number {
  return Math.max(0, product.stock - qtyOfProduct(items, product.id));
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.lineTotal, 0);
}

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'hydrate':
      return action.items;

    case 'add': {
      const { item, id } = action;
      const room = remainingStock(state, item.product);
      const qtyToAdd = Math.min(item.qty, room);
      if (qtyToAdd <= 0) return state;

      const key = lineKey(item);
      const existing = state.find((i) => lineKey(i) === key);
      if (existing) {
        const qty = existing.qty + qtyToAdd;
        return state.map((i) =>
          i.id === existing.id
            ? { ...i, product: item.product, unitPrice: item.unitPrice, qty, lineTotal: item.unitPrice * qty }
            : i,
        );
      }
      return [...state, { ...item, id, qty: qtyToAdd, lineTotal: item.unitPrice * qtyToAdd }];
    }

    case 'changeQty': {
      const line = state.find((i) => i.id === action.id);
      if (!line) return state;
      const othersOfProduct = qtyOfProduct(state, line.product.id) - line.qty;
      const room = Math.max(0, line.product.stock - othersOfProduct);
      const qty = Math.min(line.qty + action.delta, room);
      if (qty <= 0) return state.filter((i) => i.id !== line.id);
      return state.map((i) => (i.id === line.id ? { ...i, qty, lineTotal: i.unitPrice * qty } : i));
    }

    case 'remove':
      return state.filter((i) => i.id !== action.id);

    case 'clear':
      return [];

    default:
      return state;
  }
}

function isValidItem(x: unknown): x is CartItem {
  if (typeof x !== 'object' || x === null) return false;
  const i = x as Record<string, unknown>;
  const p = i.product as Record<string, unknown> | null;
  return (
    typeof i.id === 'string' &&
    typeof p === 'object' &&
    p !== null &&
    typeof p.id === 'number' &&
    typeof p.name === 'string' &&
    typeof p.price === 'number' &&
    typeof p.stock === 'number' &&
    (i.size === 'S' || i.size === 'M' || i.size === 'L') &&
    Array.isArray(i.toppings) &&
    i.toppings.every((t) => typeof t === 'string') &&
    Number.isInteger(i.qty) &&
    (i.qty as number) >= 1 &&
    typeof i.unitPrice === 'number'
  );
}

/** Đọc giỏ hàng đã lưu. Dữ liệu hỏng/lạ bị bỏ qua; lineTotal luôn được tính lại. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isValidItem).map((i) => ({ ...i, lineTotal: i.unitPrice * i.qty }));
  } catch {
    return [];
  }
}
