import { describe, expect, it } from 'vitest';
import {
  cartCount,
  cartReducer,
  cartTotal,
  parseStoredCart,
  qtyOfProduct,
  remainingStock,
} from '../app/lib/cart';
import { americano, caPheSua, makeLine } from './fixtures';

const base = { product: caPheSua, size: 'M' as const, toppings: [] as string[], unitPrice: 40000 };

describe('giỏ hàng (Task 5): thêm', () => {
  it('thêm món mới và tự tính lineTotal', () => {
    const s = cartReducer([], { type: 'add', id: 'a', item: { ...base, qty: 2 } });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ id: 'a', qty: 2, lineTotal: 80000 });
  });

  it('cùng sản phẩm + size + topping thì gộp dòng (không phụ thuộc thứ tự topping)', () => {
    let s = cartReducer([], { type: 'add', id: 'a', item: { ...base, toppings: ['thach', 'tranchau'], unitPrice: 50000, qty: 1 } });
    s = cartReducer(s, { type: 'add', id: 'b', item: { ...base, toppings: ['tranchau', 'thach'], unitPrice: 50000, qty: 2 } });
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ id: 'a', qty: 3, lineTotal: 150000 });
  });

  it('khác size hoặc khác topping thì tách dòng', () => {
    let s = cartReducer([], { type: 'add', id: 'a', item: { ...base, qty: 1 } });
    s = cartReducer(s, { type: 'add', id: 'b', item: { ...base, size: 'L', unitPrice: 45000, qty: 1 } });
    s = cartReducer(s, { type: 'add', id: 'c', item: { ...base, toppings: ['thach'], unitPrice: 45000, qty: 1 } });
    expect(s).toHaveLength(3);
  });

  it('không cho vượt tồn kho, tính chung mọi dòng của cùng sản phẩm', () => {
    const item = { ...base, product: americano }; // tồn kho 2
    let s = cartReducer([], { type: 'add', id: 'a', item: { ...item, qty: 1 } });
    s = cartReducer(s, { type: 'add', id: 'b', item: { ...item, size: 'L', qty: 5 } });
    expect(qtyOfProduct(s, americano.id)).toBe(2);
    expect(remainingStock(s, americano)).toBe(0);
  });

  it('hết chỗ thì giữ nguyên giỏ (cùng tham chiếu)', () => {
    const full = cartReducer([], { type: 'add', id: 'a', item: { ...base, product: americano, qty: 2 } });
    const next = cartReducer(full, { type: 'add', id: 'b', item: { ...base, product: americano, qty: 1 } });
    expect(next).toBe(full);
  });
});

describe('giỏ hàng (Task 5): sửa, xóa, tổng', () => {
  it('tăng/giảm số lượng và cập nhật lineTotal', () => {
    let s = [makeLine({ qty: 1, unitPrice: 40000 })];
    s = cartReducer(s, { type: 'changeQty', id: 'line-1', delta: 2 });
    expect(s[0]).toMatchObject({ qty: 3, lineTotal: 120000 });
    s = cartReducer(s, { type: 'changeQty', id: 'line-1', delta: -1 });
    expect(s[0]).toMatchObject({ qty: 2, lineTotal: 80000 });
  });

  it('giảm về 0 thì xóa dòng', () => {
    const s = cartReducer([makeLine({ qty: 1 })], { type: 'changeQty', id: 'line-1', delta: -1 });
    expect(s).toEqual([]);
  });

  it('tăng không vượt tồn kho', () => {
    const line = makeLine({ product: americano, qty: 2 }); // tồn kho 2
    const s = cartReducer([line], { type: 'changeQty', id: 'line-1', delta: 1 });
    expect(s[0].qty).toBe(2);
  });

  it('xóa một dòng và xóa sạch giỏ', () => {
    const lines = [makeLine({ id: 'a' }), makeLine({ id: 'b', size: 'L' })];
    expect(cartReducer(lines, { type: 'remove', id: 'a' }).map((i) => i.id)).toEqual(['b']);
    expect(cartReducer(lines, { type: 'clear' })).toEqual([]);
  });

  it('id không tồn tại thì không đổi gì', () => {
    const lines = [makeLine()];
    expect(cartReducer(lines, { type: 'changeQty', id: 'x', delta: 1 })).toBe(lines);
  });

  it('đếm số ly (badge) và tính tổng tiền', () => {
    const lines = [makeLine({ id: 'a', qty: 2, unitPrice: 40000 }), makeLine({ id: 'b', qty: 1, unitPrice: 45000 })];
    expect(cartCount(lines)).toBe(3);
    expect(cartTotal(lines)).toBe(125000);
    expect(cartCount([])).toBe(0);
    expect(cartTotal([])).toBe(0);
  });
});

describe('đọc giỏ hàng đã lưu (parseStoredCart)', () => {
  it('trả về [] khi rỗng, JSON hỏng hoặc không phải mảng', () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart('{khong-phai-json')).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
  });

  it('bỏ qua dòng sai cấu trúc và tính lại lineTotal', () => {
    const good = { ...makeLine({ qty: 2, unitPrice: 40000 }), lineTotal: 1 }; // lineTotal bị sửa tay
    const bad = { id: 'x', qty: 0 };
    const parsed = parseStoredCart(JSON.stringify([good, bad, 'rác', null]));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].lineTotal).toBe(80000);
  });
});
