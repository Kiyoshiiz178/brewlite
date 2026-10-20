import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartDrawer } from '../app/components/CartDrawer';
import { americano, makeLine } from './fixtures';

function setup(items = [makeLine()], isOpen = true) {
  const handlers = {
    onClose: vi.fn(),
    onUpdateQty: vi.fn(),
    onRemoveItem: vi.fn(),
    onCheckout: vi.fn(),
  };
  render(<CartDrawer isOpen={isOpen} items={items} {...handlers} />);
  return handlers;
}

describe('giỏ hàng (Task 5): giao diện', () => {
  it('không hiển thị khi đóng', () => {
    setup([makeLine()], false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('giỏ trống: báo trống và không có nút thanh toán', () => {
    setup([]);
    expect(screen.getByText('Giỏ hàng đang trống')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Thanh toán/ })).not.toBeInTheDocument();
  });

  it('hiển thị tên topping tiếng Việt (không phải id) và tổng tiền', () => {
    setup([
      makeLine({ id: 'a', toppings: ['tranchau', 'kemcheese'], qty: 2, unitPrice: 50000 }),
      makeLine({ id: 'b', size: 'L', unitPrice: 45000, qty: 1 }),
    ]);
    expect(screen.getByText(/Trân châu đen, Kem cheese Macchiato/)).toBeInTheDocument();
    expect(screen.queryByText(/tranchau/)).not.toBeInTheDocument();
    expect(screen.getByText('145.000đ')).toBeInTheDocument(); // 2×50.000 + 45.000
  });

  it('nút tăng, giảm, xóa gọi đúng hàm với đúng id', async () => {
    const user = userEvent.setup();
    const { onUpdateQty, onRemoveItem } = setup([makeLine({ id: 'a' })]);
    await user.click(screen.getByRole('button', { name: /Tăng số lượng/ }));
    expect(onUpdateQty).toHaveBeenLastCalledWith('a', 1);
    await user.click(screen.getByRole('button', { name: /Giảm số lượng/ }));
    expect(onUpdateQty).toHaveBeenLastCalledWith('a', -1);
    await user.click(screen.getByRole('button', { name: /Xóa/ }));
    expect(onRemoveItem).toHaveBeenCalledWith('a');
  });

  it('khóa nút tăng khi tổng số ly của sản phẩm đã bằng tồn kho', () => {
    setup([
      makeLine({ id: 'a', product: americano, qty: 1 }),
      makeLine({ id: 'b', product: americano, size: 'L', qty: 1 }), // 1 + 1 = tồn kho 2
    ]);
    for (const btn of screen.getAllByRole('button', { name: /Tăng số lượng/ })) {
      expect(btn).toBeDisabled();
    }
  });

  it('bấm thanh toán gọi onCheckout', async () => {
    const user = userEvent.setup();
    const { onCheckout } = setup();
    await user.click(screen.getByRole('button', { name: /Thanh toán không tiền mặt/ }));
    expect(onCheckout).toHaveBeenCalled();
  });
});
