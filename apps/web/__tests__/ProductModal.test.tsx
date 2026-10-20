import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductModal } from '../app/components/ProductModal';
import { americano, caPheSua } from './fixtures';

function setup(props: Partial<React.ComponentProps<typeof ProductModal>> = {}) {
  const onClose = vi.fn();
  const onAddToCart = vi.fn();
  const utils = render(
    <ProductModal product={caPheSua} onClose={onClose} onAddToCart={onAddToCart} {...props} />,
  );
  return { onClose, onAddToCart, ...utils };
}

describe('chi tiết & tùy chọn sản phẩm (Task 4)', () => {
  it('không hiển thị gì khi chưa chọn sản phẩm', () => {
    const { container } = setup({ product: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('mặc định size M: tổng = giá gốc + 5.000đ', () => {
    setup();
    expect(screen.getByText('40.000đ')).toBeInTheDocument();
  });

  it('đổi size và thêm topping thì giá đổi theo', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: 'Size L (Lớn)' }));
    expect(screen.getByText('45.000đ')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Trân châu đen/ }));
    expect(screen.getByText('50.000đ')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Trân châu đen/ }));
    expect(screen.getByText('45.000đ')).toBeInTheDocument();
  });

  it('thêm vào giỏ gửi đúng size, topping, số lượng và đơn giá', async () => {
    const user = userEvent.setup();
    const { onAddToCart, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Size L (Lớn)' }));
    await user.click(screen.getByRole('checkbox', { name: /Thạch sương sáo/ }));
    await user.click(screen.getByRole('button', { name: 'Tăng số lượng' }));
    await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ hàng' }));

    expect(onAddToCart).toHaveBeenCalledWith({
      product: caPheSua,
      size: 'L',
      toppings: ['thach'],
      qty: 2,
      unitPrice: 50000,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('số lượng không vượt quá tồn kho còn lại (đã trừ phần có trong giỏ)', async () => {
    const user = userEvent.setup();
    const { onAddToCart } = setup({ product: americano, inCartQty: 1 }); // tồn kho 2, đã có 1 => chọn tối đa 1
    expect(screen.getByRole('button', { name: 'Tăng số lượng' })).toBeDisabled();
    expect(screen.getByText(/đã có 1 ly trong giỏ/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ hàng' }));
    expect(onAddToCart).toHaveBeenCalledWith(expect.objectContaining({ qty: 1 }));
  });

  it('đã đủ tồn kho trong giỏ thì không cho thêm nữa', () => {
    const { onAddToCart } = setup({ product: americano, inCartQty: 2 });
    const btn = screen.getByRole('button', { name: 'Đã đủ số ly còn lại' });
    expect(btn).toBeDisabled();
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it('mở sản phẩm khác thì size, topping, số lượng được đặt lại', async () => {
    const user = userEvent.setup();
    const { rerender, onClose, onAddToCart } = setup();
    await user.click(screen.getByRole('button', { name: 'Size L (Lớn)' }));
    await user.click(screen.getByRole('checkbox', { name: /Trân châu đen/ }));
    await user.click(screen.getByRole('button', { name: 'Tăng số lượng' }));

    rerender(<ProductModal product={americano} onClose={onClose} onAddToCart={onAddToCart} />);
    expect(screen.getByRole('button', { name: 'Size M (Vừa)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: /Trân châu đen/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Số lượng đã chọn')).toHaveTextContent('1');
    expect(screen.getByText('45.000đ')).toBeInTheDocument(); // 40.000 + size M 5.000
  });

  it('nhấn Esc hoặc nút đóng thì đóng modal', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
