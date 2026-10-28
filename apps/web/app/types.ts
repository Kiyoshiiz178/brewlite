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
  toppings?: string[];
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
  user?: {
    id: number;
    email: string;
    loyaltyPoints?: number;
  } | null;
}

export interface PaymentAuditRecord {
  id: number;
  orderId: number;
  idempotencyKey: string;
  amount: number;
  method: string;
  order?: {
    id: number;
    status: string;
    user?: { id: number; email: string } | null;
  };
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  stock: number;
  minStockAlert: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface BottleneckInfo {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  currentStock: number;
  requiredAmount: number;
  limitingCups: number;
}

export interface ProductRecipeDetail {
  productId: number;
  productName: string;
  price: number;
  stock: number;
  maxCups: number;
  bottleneck: BottleneckInfo | null;
  recipes: Array<{
    id: number;
    ingredientId: number;
    ingredientName: string;
    unit: string;
    amount: number;
    currentStock: number;
  }>;
}


