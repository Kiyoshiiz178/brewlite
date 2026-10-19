'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Coffee, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { Product, CartItem, UserProfile } from './types';
import { fetchProducts, fetchUserProfile } from './lib/api';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { OrderHistoryView } from './components/OrderHistoryView';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User & Auth State (Task 7)
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('brewlite_token');
    }
    return null;
  });
  const [user, setUser] = useState<UserProfile | null>(null);

  // Cart State (Task 5)
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('brewlite_cart');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<'menu' | 'history'>('menu');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Confirmation screen state (Task 9)
  const [confirmationData, setConfirmationData] = useState<{
    orderId: number;
    status: string;
    pointsEarned?: number;
  } | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ API');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial products and auth state
  useEffect(() => {
    if (token) {
      fetchUserProfile(token)
        .then((profile) => setUser(profile))
        .catch(() => {
          localStorage.removeItem('brewlite_token');
          setToken(null);
        });
    }

    let ignore = false;
    fetchProducts()
      .then((data) => {
        if (!ignore) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ API');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('brewlite_cart', JSON.stringify(cart));
  }, [cart]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Cart actions
  const handleAddToCart = (itemData: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...itemData,
      id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    };
    setCart((prev) => [...prev, newItem]);
    showToast(`Đã thêm "${itemData.product.name}" vào giỏ hàng`);
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              qty: newQty,
              lineTotal: item.unitPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const handleRemoveItem = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  // Auth actions
  const handleAuthSuccess = (newToken: string, loggedUser: UserProfile) => {
    setToken(newToken);
    setUser(loggedUser);
    showToast(`Chào mừng ${loggedUser.email.split('@')[0]} quay trở lại!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('brewlite_token');
    setToken(null);
    setUser(null);
    showToast('Đã đăng xuất tài khoản');
  };

  // Checkout trigger
  const handleProceedToCheckout = () => {
    if (!token) {
      setIsCartOpen(false);
      setIsAuthOpen(true);
      showToast('Vui lòng đăng nhập trước khi tiến hành thanh toán');
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  // Payment success handler (Task 8 & 9)
  const handlePaymentSuccess = (
    orderId: number,
    status: string,
    pointsEarned?: number,
  ) => {
    // Clear cart on successful payment
    setCart([]);
    localStorage.removeItem('brewlite_cart');

    // Refresh user profile to show updated loyalty points (Task 10.4)
    if (token) {
      fetchUserProfile(token)
        .then((profile) => setUser(profile))
        .catch(() => {});
    }

    // Open Confirmation modal
    setConfirmationData({ orderId, status, pointsEarned });
  };

  // Payment failed handler (US-05: Giỏ hàng được giữ nguyên)
  const handlePaymentError = (msg: string) => {
    showToast(msg);
    // Reload user orders if tab is history
    if (activeTab === 'history' && token) {
      loadProducts();
    }
  };

  const totalCartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900 border border-amber-500/50 text-stone-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-slide-left">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        user={user}
        cartCount={totalCartCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'history' ? (
          <OrderHistoryView
            token={token}
            onOpenAuth={() => setIsAuthOpen(true)}
            onGoToMenu={() => setActiveTab('menu')}
          />
        ) : (
          <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Hero / Promo Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/80 via-stone-900 to-stone-900 border border-stone-800 p-6 sm:p-10 mb-10 shadow-2xl">
              <div className="relative z-10 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Trải nghiệm đặt nước thông minh</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  Cà phê thượng hạng, <br />
                  <span className="text-amber-500">Thanh toán không tiền mặt.</span>
                </h1>
                <p className="text-sm text-stone-300 mt-3 leading-relaxed">
                  Đặt và thanh toán đồ uống trực tiếp trên điện thoại chỉ trong vài chạm.
                  Không cần xếp hàng, nhận nước nhanh tại quầy!
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      const el = document.getElementById('menu-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-600/25 flex items-center gap-2 transition transform active:scale-95"
                  >
                    <span>Khám phá menu</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="px-3.5 py-2 rounded-xl bg-stone-800/80 border border-stone-700/80 text-xs text-stone-300 flex items-center gap-2">
                    <span className="text-amber-400 font-bold">VOUCHER:</span>
                    <span>BREW10 (-10%)</span>
                  </div>
                </div>
              </div>

              {/* Decorative background glow */}
              <div className="absolute -right-10 -bottom-10 w-80 h-80 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
            </div>

            {/* Menu Section */}
            <section id="menu-section">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Coffee className="w-6 h-6 text-amber-500" />
                    Thực đơn chọn lọc
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Hương vị đậm đà từ nguồn hạt Arabica và Robusta tuyển chọn
                  </p>
                </div>

                <span className="text-xs text-stone-400 font-medium">
                  {products.length} thức uống
                </span>
              </div>

              {/* Error state */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 mb-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={loadProducts}
                    className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {/* Loading state */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-72 rounded-2xl bg-stone-900 border border-stone-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                /* Empty state */
                <div className="text-center py-16 bg-stone-900/50 border border-stone-800 rounded-3xl p-6">
                  <Coffee className="w-12 h-12 text-stone-700 mx-auto mb-3" />
                  <p className="text-base font-bold text-stone-300">
                    Chưa có sản phẩm nào
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Hệ thống đang chuẩn bị menu. Vui lòng quay lại sau ít phút!
                  </p>
                </div>
              ) : (
                /* Products Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={(p) => setSelectedProduct(p)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-950 py-8 text-center text-xs text-stone-500 mt-16">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-stone-400 font-semibold">
            <Coffee className="w-4 h-4 text-amber-500" />
            <span>BrewLite – Cà phê không tiền mặt</span>
          </div>
          <p>© 2026 Đại học Sài Gòn – Môn Công nghệ Phần mềm. Tất cả các quyền được bảo lưu.</p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        onClose={() => setIsCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleProceedToCheckout}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        items={cart}
        token={token}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handlePaymentSuccess}
        onErrorState={handlePaymentError}
      />

      <OrderConfirmationModal
        isOpen={!!confirmationData}
        orderId={confirmationData?.orderId || null}
        status={confirmationData?.status || ''}
        pointsEarned={confirmationData?.pointsEarned}
        onGoHome={() => {
          setConfirmationData(null);
          setActiveTab('menu');
        }}
        onViewHistory={() => {
          setConfirmationData(null);
          setActiveTab('history');
        }}
      />
    </div>
  );
}
