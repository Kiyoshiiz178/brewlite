export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  version: number;
}

export interface CartItem {
  id: string; // unique item uuid/timestamp for cart
  product: Product;
  size: 'S' | 'M' | 'L';
  toppings: string[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface UserProfile {
  id: number;
  email: string;
  loyaltyPoints: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  size: string;
  qty: number;
  lineTotal: number;
  product?: Product;
}

export interface PaymentRecord {
  id: number;
  orderId: number;
  idempotencyKey: string;
  amount: number;
  method: string;
}

export interface Order {
  id: number;
  userId: number | null;
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'PAYMENT_FAILED' | 'CANCELLED';
  total: number;
  createdAt: string;
  items: OrderItem[];
  payments?: PaymentRecord[];
}
