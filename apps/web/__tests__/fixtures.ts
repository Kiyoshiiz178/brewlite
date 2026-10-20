import type { CartItem, Product } from '../app/types';

export const caPheSua: Product = {
  id: 1,
  name: 'Cà phê sữa đá',
  price: 35000,
  imageUrl: null,
  stock: 10,
  version: 0,
};

export const americano: Product = {
  id: 2,
  name: 'Americano',
  price: 40000,
  imageUrl: null,
  stock: 2,
  version: 0,
};

export function makeLine(over: Partial<CartItem> = {}): CartItem {
  const qty = over.qty ?? 1;
  const unitPrice = over.unitPrice ?? 40000;
  return {
    id: 'line-1',
    product: caPheSua,
    size: 'M',
    toppings: [],
    qty,
    unitPrice,
    lineTotal: unitPrice * qty,
    ...over,
  };
}
