import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../app/page';
import { CartProvider } from '../app/components/CartProvider';
import { americano, caPheSua } from './fixtures';

vi.mock('../app/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../app/lib/api')>()),
  fetchProducts: vi.fn(),
  fetchUserProfile: vi.fn(),
}));
import { fetchProducts } from '../app/lib/api';
const mockFetchProducts = vi.mocked(fetchProducts);

const renderPage = () =>
  render(
    <CartProvider>
      <Home />
    </CartProvider>,
  );

beforeEach(() => {
  mockFetchProducts.mockReset();
});

describe('trang Menu (Task 3)', () => {
  it('hiển thị trạng thái loading rồi danh sách sản phẩm', async () => {
    mockFetchProducts.mockResolvedValue([caPheSua, americano]);
    const { container } = renderPage();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(6); // khung chờ

    expect(await screen.findByText('Cà phê sữa đá')).toBeInTheDocument();
    expect(screen.getByText('Americano')).toBeInTheDocument();
    expect(screen.getByText('2 thức uống')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('hiển thị trạng thái trống khi menu không có sản phẩm', async () => {
    mockFetchProducts.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Chưa có sản phẩm nào')).toBeInTheDocument();
  });

  it('báo lỗi (không hiện trạng thái trống) và cho thử lại', async () => {
    const user = userEvent.setup();
    mockFetchProducts.mockRejectedValueOnce(new Error('Không thể tải danh sách sản phẩm'));
    renderPage();

    expect(await screen.findByText('Không thể tải danh sách sản phẩm')).toBeInTheDocument();
    expect(screen.queryByText('Chưa có sản phẩm nào')).not.toBeInTheDocument();

    mockFetchProducts.mockResolvedValue([caPheSua]);
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Cà phê sữa đá')).toBeInTheDocument();
    expect(screen.queryByText('Không thể tải danh sách sản phẩm')).not.toBeInTheDocument();
  });
});

describe('luồng menu → chi tiết → giỏ hàng (Task 3, 4, 5)', () => {
  async function addCaPheSua(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: /Tùy chọn/ }));
    await user.click(screen.getByRole('checkbox', { name: /Trân châu đen/ }));
    await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ hàng' }));
  }

  it('thêm món có topping: badge tăng, giỏ hiện đúng món và tổng tiền', async () => {
    const user = userEvent.setup();
    mockFetchProducts.mockResolvedValue([caPheSua]);
    renderPage();
    await addCaPheSua(user);

    expect(await screen.findByText(/Đã thêm "Cà phê sữa đá" vào giỏ hàng/)).toBeInTheDocument();
    const cartButton = screen.getByRole('button', { name: /Xem giỏ hàng \(1 ly\)/ });
    await user.click(cartButton);

    const drawer = screen.getByRole('dialog', { name: 'Giỏ hàng' });
    expect(within(drawer).getByText('Cà phê sữa đá')).toBeInTheDocument();
    expect(within(drawer).getByText(/Trân châu đen/)).toBeInTheDocument();
    // 35.000 + size M 5.000 + topping 5.000 = 45.000
    expect(within(drawer).getAllByText('45.000đ')).not.toHaveLength(0);
  });

  it('sửa số lượng và xóa món trong giỏ', async () => {
    const user = userEvent.setup();
    mockFetchProducts.mockResolvedValue([caPheSua]);
    renderPage();
    await addCaPheSua(user);
    await user.click(screen.getByRole('button', { name: /Xem giỏ hàng/ }));

    await user.click(screen.getByRole('button', { name: /Tăng số lượng Cà phê sữa đá/ }));
    expect(screen.getByRole('button', { name: /Xem giỏ hàng \(2 ly\)/ })).toBeInTheDocument();
    expect(screen.getAllByText('90.000đ')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Xóa Cà phê sữa đá/ }));
    expect(screen.getByText('Giỏ hàng đang trống')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem giỏ hàng \(0 ly\)/ })).toBeInTheDocument();
  });

  it('giỏ hàng được lưu lại khi tải lại trang', async () => {
    const user = userEvent.setup();
    mockFetchProducts.mockResolvedValue([caPheSua]);
    const first = renderPage();
    await addCaPheSua(user);
    await screen.findByRole('button', { name: /Xem giỏ hàng \(1 ly\)/ });
    first.unmount();

    renderPage(); // mô phỏng F5
    expect(await screen.findByRole('button', { name: /Xem giỏ hàng \(1 ly\)/ })).toBeInTheDocument();
  });

  it('không cho thêm quá tồn kho: sản phẩm còn 1 ly chỉ thêm được 1 lần', async () => {
    const user = userEvent.setup();
    mockFetchProducts.mockResolvedValue([{ ...caPheSua, stock: 1 }]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Tùy chọn/ }));
    await user.click(screen.getByRole('button', { name: 'Thêm vào giỏ hàng' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Xem giỏ hàng \(1 ly\)/ })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Tùy chọn/ }));
    expect(screen.getByRole('button', { name: 'Đã đủ số ly còn lại' })).toBeDisabled();
  });
});
