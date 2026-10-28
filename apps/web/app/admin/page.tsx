'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Coffee,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ArrowLeft,
  PackageCheck,
  Ban,
  Receipt,
  DollarSign,
  Layers,
  Sparkles,
  Send,
  Loader2,
  Boxes,
  Plus,
  Scale,
  Edit3,
  X,
  AlertCircle,
  PlusCircle,
  Check,
} from 'lucide-react';
import { Order, PaymentAuditRecord, Ingredient, ProductRecipeDetail } from '../types';
import {
  fetchAllOrders,
  updateOrderStatus,
  fetchAllPayments,
  sendPaymentWebhook,
  fetchIngredients,
  createIngredient,
  restockIngredient,
  fetchRecipes,
  saveProductRecipe,
  recalculateAllStock,
} from '../lib/api';
import { formatVnd, toppingLabel } from '../lib/pricing';

type FilterTab = 'ALL' | 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

function generateWebhookIdempotencyKey(orderId: number): string {
  return `wh-admin-${Date.now()}-${orderId}`;
}

function generateGatewayRef(): string {
  return `MOCK_GW_${Date.now()}`;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentAuditRecord[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'payments'>('orders');
  const [filterStatus, setFilterStatus] = useState<FilterTab>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States for Inventory
  const [restockModal, setRestockModal] = useState<{
    open: boolean;
    ingredient: Ingredient | null;
    amount: number;
  }>({ open: false, ingredient: null, amount: 500 });

  const [newIngredientModal, setNewIngredientModal] = useState<{
    open: boolean;
    name: string;
    unit: string;
    stock: number;
    minStockAlert: number;
  }>({ open: false, name: '', unit: 'g', stock: 1000, minStockAlert: 100 });

  const [recipeModal, setRecipeModal] = useState<{
    open: boolean;
    product: ProductRecipeDetail | null;
    items: Array<{ ingredientId: number; amount: number }>;
  }>({ open: false, product: null, items: [] });

  const [isSubmittingInventory, setIsSubmittingInventory] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [ordersData, paymentsData, ingData, recData] = await Promise.all([
        fetchAllOrders().catch(() => []),
        fetchAllPayments().catch(() => []),
        fetchIngredients().catch(() => []),
        fetchRecipes().catch(() => []),
      ]);
      setOrders(ordersData);
      setPayments(paymentsData);
      setIngredients(ingData);
      setRecipes(recData);
    } catch {
      showToast('Không thể tải dữ liệu quản trị');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchAllOrders().catch(() => []),
      fetchAllPayments().catch(() => []),
      fetchIngredients().catch(() => []),
      fetchRecipes().catch(() => []),
    ])
      .then(([ordersData, paymentsData, ingData, recData]) => {
        if (!isMounted) return;
        setOrders(ordersData);
        setPayments(paymentsData);
        setIngredients(ingData);
        setRecipes(recData);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const interval = setInterval(() => {
      loadData(false);
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadData]);

  // Order Actions
  const handleTransition = async (orderId: number, nextStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, nextStatus);
      showToast(`Đã chuyển đơn #${orderId} sang trạng thái: ${nextStatus}`);
      await loadData(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể chuyển trạng thái đơn hàng');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSimulateWebhook = async (order: Order) => {
    try {
      const idempotencyKey = generateWebhookIdempotencyKey(order.id);
      await sendPaymentWebhook({
        orderId: order.id,
        idempotencyKey,
        amount: order.total,
        method: 'WALLET',
        status: 'SUCCESS',
        gatewayRef: generateGatewayRef(),
      });
      showToast(`Webhook giả lập thành công cho đơn #${order.id}!`);
      await loadData(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi kích hoạt webhook');
    }
  };

  // Inventory Actions
  const handleRestock = async () => {
    if (!restockModal.ingredient || restockModal.amount <= 0) return;
    setIsSubmittingInventory(true);
    try {
      const res = await restockIngredient(restockModal.ingredient.id, restockModal.amount);
      showToast(
        `Đã nhập thêm ${restockModal.amount} ${restockModal.ingredient.unit} ${restockModal.ingredient.name}! Đã cập nhật ${res.affectedProducts.length} món trên menu.`,
      );
      setRestockModal({ open: false, ingredient: null, amount: 500 });
      await loadData(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Nhập kho thất bại');
    } finally {
      setIsSubmittingInventory(false);
    }
  };

  const handleCreateIngredient = async () => {
    if (!newIngredientModal.name.trim() || !newIngredientModal.unit.trim()) {
      showToast('Vui lòng điền đầy đủ tên và đơn vị tính');
      return;
    }
    setIsSubmittingInventory(true);
    try {
      await createIngredient({
        name: newIngredientModal.name.trim(),
        unit: newIngredientModal.unit.trim(),
        stock: Number(newIngredientModal.stock),
        minStockAlert: Number(newIngredientModal.minStockAlert),
      });
      showToast(`Đã tạo mới nguyên liệu '${newIngredientModal.name}'!`);
      setNewIngredientModal({ open: false, name: '', unit: 'g', stock: 1000, minStockAlert: 100 });
      await loadData(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Tạo nguyên liệu thất bại');
    } finally {
      setIsSubmittingInventory(false);
    }
  };

  const handleOpenRecipeModal = (product: ProductRecipeDetail) => {
    setRecipeModal({
      open: true,
      product,
      items: product.recipes.map((r) => ({
        ingredientId: r.ingredientId,
        amount: r.amount,
      })),
    });
  };

  const handleSaveRecipe = async () => {
    if (!recipeModal.product) return;
    setIsSubmittingInventory(true);
    try {
      await saveProductRecipe(recipeModal.product.productId, recipeModal.items);
      showToast(`Đã lưu công thức cho '${recipeModal.product.productName}'!`);
      setRecipeModal({ open: false, product: null, items: [] });
      await loadData(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lưu công thức thất bại');
    } finally {
      setIsSubmittingInventory(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSubmittingInventory(true);
    try {
      await recalculateAllStock();
      showToast('Đã tính toán và đồng bộ lại toàn bộ số ly theo kho nguyên liệu!');
      await loadData(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi đồng bộ');
    } finally {
      setIsSubmittingInventory(false);
    }
  };

  // KPIs
  const totalRevenue = orders
    .filter((o) => ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  const pendingPrepareCount = orders.filter((o) => ['PAID', 'PREPARING'].includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;

  const lowStockCount = ingredients.filter((i) => i.status === 'LOW_STOCK').length;
  const outOfStockCount = ingredients.filter((i) => i.status === 'OUT_OF_STOCK').length;

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'CANCELLED') return o.status === 'CANCELLED' || o.status === 'PAYMENT_FAILED';
    return o.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Clock className="w-3 h-3" />
            Chờ thanh toán
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Đã thanh toán (Chờ pha)
          </span>
        );
      case 'PREPARING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-600/20 border border-amber-600/40 text-amber-300 animate-pulse">
            <Flame className="w-3 h-3" />
            Đang pha chế...
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 border border-sky-500/40 text-sky-300">
            <PackageCheck className="w-3 h-3" />
            Sẵn sàng nhận nước!
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-700/50 border border-stone-600 text-stone-300">
            <CheckCircle2 className="w-3 h-3" />
            Đã hoàn thành
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-3 h-3" />
            Thanh toán lỗi
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/40 border border-rose-800 text-rose-300">
            <Ban className="w-3 h-3" />
            Đã hủy đơn (Đã hoàn kho)
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-stone-950 px-4 py-2.5 rounded-xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-stone-950 shadow-md shadow-amber-600/30">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">BrewLite Barista & Kho</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Live
                </span>
              </div>
              <p className="text-xs text-stone-400">Điều phối pha chế & Kho nguyên liệu liên kết Menu</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition active:scale-95 border border-stone-700/60"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>

            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition text-xs font-semibold flex items-center gap-1.5 border border-stone-700/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về trang đặt món</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Doanh thu ghi nhận</span>
              <span className="text-base sm:text-lg font-black text-white">{formatVnd(totalRevenue)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Đơn cần pha chế</span>
              <span className="text-base sm:text-lg font-black text-amber-400">{pendingPrepareCount} đơn</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Kho nguyên liệu</span>
              <span className="text-base sm:text-lg font-black text-white">
                {ingredients.length} loại
                {outOfStockCount > 0 ? (
                  <span className="text-xs text-rose-400 ml-1.5 font-bold">({outOfStockCount} hết)</span>
                ) : lowStockCount > 0 ? (
                  <span className="text-xs text-amber-400 ml-1.5 font-bold">({lowStockCount} sắp hết)</span>
                ) : null}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Đã hoàn thành / Chờ lấy</span>
              <span className="text-base sm:text-lg font-black text-white">
                {completedCount} xong • {readyCount} chờ lấy
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-3 border-b border-stone-800 pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Điều phối đơn hàng ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'inventory'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Kho & Công thức Menu ({ingredients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === 'payments'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/20'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Nhật ký thanh toán ({payments.length})</span>
          </button>
        </div>

        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Sub-Tabs */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'PAID', label: 'Đã thanh toán (Cần pha)' },
                { id: 'PREPARING', label: 'Đang pha chế' },
                { id: 'READY', label: 'Sẵn sàng lấy' },
                { id: 'COMPLETED', label: 'Hoàn thành' },
                { id: 'PENDING', label: 'Chờ thanh toán' },
                { id: 'CANCELLED', label: 'Đã hủy / Lỗi' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as FilterTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterStatus === tab.id
                      ? 'bg-stone-800 text-amber-400 border border-amber-500/50 shadow-sm'
                      : 'bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center bg-stone-900/40 border border-stone-800/80 rounded-3xl p-6">
                <Coffee className="w-12 h-12 text-stone-700 mx-auto mb-2" />
                <p className="font-bold text-stone-300 text-sm">Không có đơn hàng nào trong mục này</p>
                <p className="text-xs text-stone-500 mt-1">Đơn mới của khách sẽ xuất hiện tự động tại đây</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOrders.map((order) => {
                  const isUpdating = updatingOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      className="p-5 rounded-2xl bg-stone-900/90 border border-stone-800 hover:border-stone-700 transition shadow-xl flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-white">Đơn #{order.id}</span>
                              {getStatusBadge(order.status)}
                            </div>
                            <span className="text-[11px] text-stone-400">
                              {new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}{' '}
                              • {order.user?.email || 'Khách vãng lai'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[11px] text-stone-400 block">Tổng tiền</span>
                            <span className="text-base font-extrabold text-amber-400">{formatVnd(order.total)}</span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-1.5 py-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-start justify-between text-xs py-1">
                              <div>
                                <span className="font-bold text-stone-200">
                                  {item.qty}x {item.product?.name || `Món #${item.productId}`}
                                </span>
                                <span className="text-amber-500/90 font-medium ml-1.5">Size {item.size}</span>
                                {item.toppings && item.toppings.length > 0 && (
                                  <div className="text-[11px] text-stone-400 pl-4 mt-0.5">
                                    + Topping: {item.toppings.map((t) => toppingLabel(t)).join(', ')}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium text-stone-400">{formatVnd(item.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* State Machine Transition Actions */}
                      <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => handleSimulateWebhook(order)}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Mô phỏng Webhook thanh toán</span>
                            </button>
                          )}

                          {order.status === 'PAID' && (
                            <button
                              onClick={() => handleTransition(order.id, 'PREPARING')}
                              disabled={isUpdating}
                              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-amber-600/30 active:scale-95"
                            >
                              <Flame className="w-3.5 h-3.5" />
                              <span>Bắt đầu pha chế (PREPARING)</span>
                            </button>
                          )}

                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => handleTransition(order.id, 'READY')}
                              disabled={isUpdating}
                              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-sky-500/30 active:scale-95"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Đã pha xong! Gọi khách (READY)</span>
                            </button>
                          )}

                          {order.status === 'READY' && (
                            <button
                              onClick={() => handleTransition(order.id, 'COMPLETED')}
                              disabled={isUpdating}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/30 active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Khách đã nhận đồ (COMPLETED)</span>
                            </button>
                          )}
                        </div>

                        {/* Cancel Button */}
                        {['PENDING', 'PAID'].includes(order.status) && (
                          <button
                            onClick={() => handleTransition(order.id, 'CANCELLED')}
                            disabled={isUpdating}
                            className="px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-rose-950/20 text-xs font-semibold transition"
                            title="Hủy đơn và hoàn lại nguyên liệu vào kho"
                          >
                            Hủy đơn & Hoàn kho
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVENTORY & RECIPES */}
        {activeTab === 'inventory' && (
          <div className="space-y-8">
            {/* Action Bar for Inventory */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-stone-900 border border-stone-800">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-amber-500" />
                  <span>Kho Nguyên Liệu & Cơ Chế Khấu Trừ Theo Công Thức</span>
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Mỗi khi bán 1 ly, nguyên liệu sẽ trừ tự động và tính lại số ly còn lại của menu theo công thức (BOM).
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleSyncAll}
                  disabled={isSubmittingInventory}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-stone-700 transition"
                  title="Tính lại toàn bộ số ly menu từ kho"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingInventory ? 'animate-spin' : ''}`} />
                  <span>Đồng bộ tồn ly menu</span>
                </button>

                <button
                  onClick={() => setNewIngredientModal({ open: true, name: '', unit: 'g', stock: 1000, minStockAlert: 100 })}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm nguyên liệu mới</span>
                </button>
              </div>
            </div>

            {/* Section 1: Ingredients Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>1. Tồn Kho Nguyên Liệu Thực Tế ({ingredients.length} mục)</span>
                </h3>
                <span className="text-[11px] text-stone-500">Bấm &quot;+ Nhập hàng&quot; để bổ sung tồn kho</span>
              </div>

              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-950/70 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                      <tr>
                        <th className="py-3 px-4">Tên nguyên liệu</th>
                        <th className="py-3 px-4">Tồn kho hiện tại</th>
                        <th className="py-3 px-4">Đơn vị</th>
                        <th className="py-3 px-4">Ngưỡng cảnh báo</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 text-stone-200">
                      {ingredients.map((ing) => (
                        <tr key={ing.id} className="hover:bg-stone-800/30 transition">
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            {ing.name}
                          </td>
                          <td className="py-3 px-4 font-mono font-extrabold text-amber-400 text-sm">
                            {ing.stock.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4 text-stone-400">{ing.unit}</td>
                          <td className="py-3 px-4 text-stone-400 font-mono">
                            {ing.minStockAlert.toLocaleString('vi-VN')} {ing.unit}
                          </td>
                          <td className="py-3 px-4">
                            {ing.status === 'OUT_OF_STOCK' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                Hết hàng
                              </span>
                            ) : ing.status === 'LOW_STOCK' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Sắp hết
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Đầy đủ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setRestockModal({ open: true, ingredient: ing, amount: 500 })}
                              className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-stone-950 font-bold text-xs border border-amber-600/40 transition active:scale-95"
                            >
                              + Nhập hàng
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Section 2: Recipes & Capacity Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>2. Công Thức & Khả Năng Pha Chế Của Menu ({recipes.length} món)</span>
                </h3>
                <span className="text-[11px] text-stone-500">Số ly tính tự động = min (kho / định lượng)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map((p) => {
                  const isOut = p.maxCups <= 0;
                  const isLow = p.maxCups > 0 && p.maxCups <= 10;

                  return (
                    <div
                      key={p.productId}
                      className="p-5 rounded-2xl bg-stone-900 border border-stone-800 shadow-md flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-extrabold text-white text-base">{p.productName}</h4>
                            <span className="text-xs text-amber-400 font-bold">{formatVnd(p.price)}</span>
                          </div>

                          <div className="text-right">
                            {isOut ? (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                Hết hàng (0 ly)
                              </span>
                            ) : isLow ? (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                Còn {p.maxCups} ly (Sắp hết)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Pha được {p.maxCups} ly
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Recipe Ingredients List */}
                        <div className="mt-3 bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                          <span className="text-[11px] text-stone-400 uppercase font-bold block mb-1">
                            Công thức tiêu hao / 1 ly:
                          </span>
                          {p.recipes.length === 0 ? (
                            <span className="text-xs text-stone-500 italic">Chưa thiết lập công thức</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {p.recipes.map((r) => (
                                <span
                                  key={r.id}
                                  className="px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-stone-300 text-[11px] font-medium"
                                >
                                  {r.ingredientName}: <strong className="text-amber-400">{r.amount}{r.unit}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottleneck Alert */}
                        {p.bottleneck && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              Giới hạn bởi: <strong>{p.bottleneck.ingredientName}</strong> (Kho còn {p.bottleneck.currentStock}{p.bottleneck.unit} / {p.bottleneck.requiredAmount}{p.bottleneck.unit} = {p.bottleneck.limitingCups} ly)
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-800/60 flex items-center justify-end">
                        <button
                          onClick={() => handleOpenRecipeModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa công thức</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <h2 className="text-sm font-bold text-stone-300 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-500" />
              <span>Lịch sử giao dịch thanh toán & Webhook IPN</span>
            </h2>

            {payments.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500">Chưa có giao dịch thanh toán nào</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/70 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Mã GD</th>
                      <th className="py-3 px-4">Đơn hàng</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Phương thức</th>
                      <th className="py-3 px-4">Số tiền</th>
                      <th className="py-3 px-4">Idempotency Key</th>
                      <th className="py-3 px-4">Trạng thái đơn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 text-stone-200">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-stone-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">#{p.id}</td>
                        <td className="py-3 px-4 font-bold text-white">Đơn #{p.orderId}</td>
                        <td className="py-3 px-4 text-stone-400">{p.order?.user?.email || 'Khách vãng lai'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 border border-stone-700">
                            {p.method === 'WALLET' ? 'Ví MoMo' : 'Thẻ / VietQR'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-amber-400">{formatVnd(p.amount)}</td>
                        <td
                          className="py-3 px-4 font-mono text-[10px] text-stone-400 truncate max-w-[180px]"
                          title={p.idempotencyKey}
                        >
                          {p.idempotencyKey}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(p.order?.status || 'PAID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: RESTOCK INGREDIENT */}
      {restockModal.open && restockModal.ingredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-white text-base">Nhập Thêm Kho</h3>
              </div>
              <button
                onClick={() => setRestockModal({ open: false, ingredient: null, amount: 500 })}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800">
                <span className="text-xs text-stone-400 block">Nguyên liệu nhập:</span>
                <span className="text-base font-extrabold text-white">{restockModal.ingredient.name}</span>
                <span className="text-xs text-stone-400 block mt-1">
                  Tồn kho hiện tại:{' '}
                  <strong className="text-amber-400">
                    {restockModal.ingredient.stock} {restockModal.ingredient.unit}
                  </strong>
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">
                  Số lượng bổ sung ({restockModal.ingredient.unit}):
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockModal.amount}
                  onChange={(e) =>
                    setRestockModal({ ...restockModal, amount: Math.max(1, Number(e.target.value)) })
                  }
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-white font-mono text-base focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                {[200, 500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRestockModal({ ...restockModal, amount: val })}
                    className="flex-1 py-1 text-xs rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono transition"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRestockModal({ open: false, ingredient: null, amount: 500 })}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleRestock}
                disabled={isSubmittingInventory}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition active:scale-95"
              >
                {isSubmittingInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Xác nhận nhập kho</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW INGREDIENT */}
      {newIngredientModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-white text-base">Thêm Nguyên Liệu Mới</h3>
              </div>
              <button
                onClick={() => setNewIngredientModal({ ...newIngredientModal, open: false })}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">Tên nguyên liệu:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bột Cacao Đắk Lắk..."
                  value={newIngredientModal.name}
                  onChange={(e) => setNewIngredientModal({ ...newIngredientModal, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Đơn vị tính:</label>
                  <select
                    value={newIngredientModal.unit}
                    onChange={(e) => setNewIngredientModal({ ...newIngredientModal, unit: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="g">Gram (g)</option>
                    <option value="ml">Mililít (ml)</option>
                    <option value="phần">Phần (serving)</option>
                    <option value="lon">Lon / Hộp</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Tồn ban đầu:</label>
                  <input
                    type="number"
                    min="0"
                    value={newIngredientModal.stock}
                    onChange={(e) =>
                      setNewIngredientModal({ ...newIngredientModal, stock: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">Ngưỡng cảnh báo sắp hết:</label>
                <input
                  type="number"
                  min="0"
                  value={newIngredientModal.minStockAlert}
                  onChange={(e) =>
                    setNewIngredientModal({
                      ...newIngredientModal,
                      minStockAlert: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setNewIngredientModal({ ...newIngredientModal, open: false })}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateIngredient}
                disabled={isSubmittingInventory}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition active:scale-95"
              >
                {isSubmittingInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Tạo nguyên liệu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT RECIPE */}
      {recipeModal.open && recipeModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-extrabold text-white text-base">Định Lượng Công Thức</h3>
                  <span className="text-xs text-amber-400 font-bold">{recipeModal.product.productName}</span>
                </div>
              </div>
              <button
                onClick={() => setRecipeModal({ open: false, product: null, items: [] })}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs text-stone-400">
                Khai báo lượng nguyên liệu tiêu hao cho 1 ly. Tồn ly của món ngoài menu sẽ tự động tính = min(kho / định lượng).
              </p>

              {recipeModal.items.map((item, idx) => {
                const ing = ingredients.find((i) => i.id === item.ingredientId);

                return (
                  <div
                    key={idx}
                    className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <select
                        value={item.ingredientId}
                        onChange={(e) => {
                          const updated = [...recipeModal.items];
                          updated[idx].ingredientId = Number(e.target.value);
                          setRecipeModal({ ...recipeModal, items: updated });
                        }}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.unit}) - Kho: {i.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.amount}
                        onChange={(e) => {
                          const updated = [...recipeModal.items];
                          updated[idx].amount = Math.max(1, Number(e.target.value));
                          setRecipeModal({ ...recipeModal, items: updated });
                        }}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center"
                      />
                    </div>

                    <span className="text-xs text-stone-400 w-8">{ing?.unit || 'g'}</span>

                    <button
                      onClick={() => {
                        const updated = recipeModal.items.filter((_, i) => i !== idx);
                        setRecipeModal({ ...recipeModal, items: updated });
                      }}
                      className="text-stone-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  if (ingredients.length === 0) return;
                  setRecipeModal({
                    ...recipeModal,
                    items: [...recipeModal.items, { ingredientId: ingredients[0].id, amount: 20 }],
                  });
                }}
                className="w-full py-2 border border-dashed border-stone-700 hover:border-amber-500 rounded-xl text-xs text-stone-400 hover:text-amber-400 flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thành phần nguyên liệu vào công thức</span>
              </button>
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRecipeModal({ open: false, product: null, items: [] })}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveRecipe}
                disabled={isSubmittingInventory}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition active:scale-95"
              >
                {isSubmittingInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Lưu công thức</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
