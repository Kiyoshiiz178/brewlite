// Giá size/topping. PHẢI khớp với cách tính trong apps/api/src/orders/orders.service.ts
// (size M +5.000đ, L +10.000đ; mỗi topping +5.000đ) để giá hiển thị = giá server tính.

export type SizeId = 'S' | 'M' | 'L';

export const SIZES: ReadonlyArray<{ id: SizeId; label: string; extra: number }> = [
  { id: 'S', label: 'Size S (Nhỏ)', extra: 0 },
  { id: 'M', label: 'Size M (Vừa)', extra: 5000 },
  { id: 'L', label: 'Size L (Lớn)', extra: 10000 },
];

export const TOPPING_PRICE = 5000;

export const TOPPINGS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'tranchau', label: 'Trân châu đen' },
  { id: 'kemcheese', label: 'Kem cheese Macchiato' },
  { id: 'thach', label: 'Thạch sương sáo' },
];

export function sizeExtra(size: SizeId): number {
  return SIZES.find((s) => s.id === size)?.extra ?? 0;
}

/** Tên hiển thị của topping; nếu không biết id thì trả lại chính id. */
export function toppingLabel(id: string): string {
  return TOPPINGS.find((t) => t.id === id)?.label ?? id;
}

/** Giá 1 ly = giá gốc + phụ thu size + (số topping × 5.000đ). */
export function calcUnitPrice(basePrice: number, size: SizeId, toppingIds: string[]): number {
  return basePrice + sizeExtra(size) + toppingIds.length * TOPPING_PRICE;
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`;
}
