import { Product, Order, UserProfile } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('brewlite_token') : null);
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải danh sách sản phẩm');
  return res.json();
}

export async function loginUser(email: string, pass: string): Promise<{ access_token: string; user: UserProfile }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Đăng nhập không thành công');
  }
  return data;
}

export async function registerUser(email: string, pass: string): Promise<{ message: string; userId: number }> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Đăng ký thất bại'));
  }
  return data;
}

export async function fetchUserProfile(token?: string): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) throw new Error('Không thể lấy thông tin người dùng');
  return res.json();
}

export async function createOrder(
  items: Array<{ productId: number; size: string; qty: number; toppings?: string[] }>,
  promoCode?: string,
  token?: string,
): Promise<{ orderId: number; status: string; total: number; subtotal: number; discountAmount: number }> {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ items, promoCode: promoCode || undefined }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Không thể tạo đơn hàng'));
  }
  return data;
}

export async function processPayment(payload: {
  orderId: number;
  idempotencyKey: string;
  amount: number;
  method: 'WALLET' | 'CARD';
  mockFailed?: boolean;
}): Promise<{
  success: boolean;
  status: string;
  paymentId?: number;
  pointsEarned?: number;
  message: string;
  isIdempotentReplay?: boolean;
}> {
  const res = await fetch(`${API_URL}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Giao dịch thanh toán thất bại');
  }
  return data;
}

export async function fetchMyOrders(token?: string): Promise<Order[]> {
  const res = await fetch(`${API_URL}/orders/me`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) throw new Error('Không thể tải lịch sử đơn hàng');
  return res.json();
}

export async function validatePromotion(code: string): Promise<{ valid: boolean; code: string; discountPct: number }> {
  const res = await fetch(`${API_URL}/promotions/validate?code=${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Mã khuyến mãi không hợp lệ');
  }
  return data;
}

export async function fetchAllOrders(): Promise<Order[]> {
  const res = await fetch(`${API_URL}/orders`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải danh sách tất cả đơn hàng');
  return res.json();
}

export async function updateOrderStatus(orderId: number, status: string): Promise<Order> {
  const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Không thể cập nhật trạng thái đơn #${orderId}`);
  }
  return data;
}

export async function sendPaymentWebhook(payload: {
  orderId: number;
  idempotencyKey: string;
  amount: number;
  method: string;
  status: 'SUCCESS' | 'FAILED';
  gatewayRef?: string;
}): Promise<{
  success: boolean;
  status: string;
  paymentId?: number;
  pointsEarned?: number;
  message: string;
  gatewayRef?: string;
}> {
  const res = await fetch(`${API_URL}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Xử lý phản hồi từ cổng thanh toán thất bại');
  }
  return data;
}

export async function fetchAllPayments() {
  const res = await fetch(`${API_URL}/payments`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Không thể tải nhật ký thanh toán');
  return res.json();
}

