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
} from 'lucide-react';
import { Order, PaymentAuditRecord } from '../types';
import { fetchAllOrders, updateOrderStatus, fetchAllPayments, sendPaymentWebhook } from '../lib/api';
import { formatVnd, toppingLabel } from '../lib/pricing';

type FilterTab = 'ALL' | 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentAuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
  const [filterStatus, setFilterStatus] = useState<FilterTab>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [ordersData, paymentsData] = await Promise.all([
        fetchAllOrders().catch(() => []),
        fetchAllPayments().catch(() => []),
      ]);
      setOrders(ordersData);
      setPayments(paymentsData);
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
    ]).then(([ordersData, paymentsData]) => {
      if (isMounted) {
        setOrders(ordersData);
        setPayments(paymentsData);
        setLoading(false);
      }
    });

    // Auto-refresh every 15s to simulate live board
    const interval = setInterval(() => {
      Promise.all([
        fetchAllOrders().catch(() => []),
        fetchAllPayments().catch(() => []),
      ]).then(([ordersData, paymentsData]) => {
        if (isMounted) {
          setOrders(ordersData);
          setPayments(paymentsData);
        }
      });
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle Order State Machine status transition
  const handleTransition = async (orderId: number, nextStatus: string, label: string) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrderStatus(orderId, nextStatus);
      showToast(`Đã chuyển đơn #${orderId} sang trạng thái: ${label}`);
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Chuyển trạng thái thất bại');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Trigger manual webhook for PENDING order
  const handleManualWebhook = async (order: Order) => {
    try {
      setUpdatingOrderId(order.id);
      const idempotencyKey = `pay-${order.id}-${Date.now()}`;
      await sendPaymentWebhook({
        orderId: order.id,
        idempotencyKey,
        amount: order.total,
        method: 'WALLET',
        status: 'SUCCESS',
        gatewayRef: `ADMIN-TRIGGER-${Date.now().toString().slice(-6)}`,
      });
      showToast(`Cổng thanh toán đã gửi Webhook IPN! Đơn #${order.id} chuyển sang PAID.`);
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Kích hoạt Webhook thất bại');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // KPIs
  const totalRevenue = orders
    .filter((o) => ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  const pendingPrepareCount = orders.filter((o) => ['PAID', 'PREPARING'].includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;

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
            Đã hủy đơn
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
        <div className="fixed top-5 right-5 z-50 bg-stone-900 border border-amber-500/60 text-stone-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-slide-left">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="border-b border-stone-800/80 bg-stone-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-stone-950 shadow-md shadow-amber-600/30">
              <Coffee className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                BrewLite Barista & Quản lý quầy
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                  ADMIN / BARISTA
                </span>
              </h1>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Điều phối đơn hàng theo Order State Machine và quản lý giao dịch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition transform active:scale-95"
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
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Chờ khách lấy</span>
              <span className="text-base sm:text-lg font-black text-sky-400">{readyCount} đơn</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Đã hoàn thành</span>
              <span className="text-base sm:text-lg font-black text-white">{completedCount} / {orders.length} đơn</span>
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
            <span>Điều phối đơn hàng (Live Barista)</span>
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
            <span>Nhật ký thanh toán & Webhook ({payments.length})</span>
          </button>
        </div>

        {activeTab === 'orders' ? (
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
                      className="bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-stone-700 transition"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-stone-800/80 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">Đơn #{order.id}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <span className="text-[11px] text-stone-400 mt-1 block">
                            Đặt lúc: {new Date(order.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-amber-400 block">{formatVnd(order.total)}</span>
                          <span className="text-[11px] text-stone-400">
                            {order.user?.email || 'Khách vãng lai'}
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2 flex-1">
                        <span className="text-[11px] uppercase font-bold text-stone-400 tracking-wider">
                          Món nước đặt ({order.items.reduce((s, i) => s + i.qty, 0)} ly):
                        </span>
                        <div className="bg-stone-950/60 rounded-xl p-2.5 space-y-1.5 border border-stone-800/60">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-stone-200">
                                  {item.qty}x {item.product?.name || `Món #${item.productId}`}
                                </span>
                                <span className="text-stone-400 ml-1.5">
                                  (Size {item.size}
                                  {item.toppings && item.toppings.length > 0
                                    ? ` + ${item.toppings.map(toppingLabel).join(', ')}`
                                    : ''}
                                  )
                                </span>
                              </div>
                              <span className="text-stone-400 font-semibold">{formatVnd(item.lineTotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Barista State Machine Actions */}
                      <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-stone-400">
                          Quy trình: <span className="font-mono text-stone-300">{order.status}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {order.status === 'PAID' && (
                            <>
                              <button
                                onClick={() => handleTransition(order.id, 'PREPARING', 'Đang pha chế')}
                                disabled={isUpdating}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition transform active:scale-95"
                              >
                                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
                                <span>Bắt đầu pha chế ➜</span>
                              </button>
                              <button
                                onClick={() => handleTransition(order.id, 'CANCELLED', 'Đã hủy đơn')}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-900/40 text-rose-300 text-xs font-semibold transition"
                              >
                                Hủy đơn
                              </button>
                            </>
                          )}

                          {order.status === 'PREPARING' && (
                            <button
                              onClick={() => handleTransition(order.id, 'READY', 'Sẵn sàng nhận nước')}
                              disabled={isUpdating}
                              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition transform active:scale-95"
                            >
                              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                              <span>Đã pha xong, gọi khách ➜</span>
                            </button>
                          )}

                          {order.status === 'READY' && (
                            <button
                              onClick={() => handleTransition(order.id, 'COMPLETED', 'Đã hoàn thành')}
                              disabled={isUpdating}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition transform active:scale-95"
                            >
                              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>Hoàn tất & Giao khách ✔</span>
                            </button>
                          )}

                          {order.status === 'PENDING' && (
                            <button
                              onClick={() => handleManualWebhook(order)}
                              disabled={isUpdating}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
                              title="Giả lập cổng thanh toán gửi Webhook xác nhận"
                            >
                              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              <span>Giả lập Webhook PAID</span>
                            </button>
                          )}

                          {['COMPLETED', 'CANCELLED', 'PAYMENT_FAILED'].includes(order.status) && (
                            <span className="text-[11px] text-stone-500 font-medium">Trạng thái kết thúc</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Payment Logs View */
          <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  Nhật ký giao dịch & Khóa Idempotency
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Dữ liệu ghi nhận từ Cổng thanh toán giả lập bên thứ 3 (Task 8 & 10.2)
                </p>
              </div>
              <span className="text-xs font-semibold bg-stone-800 text-stone-300 px-3 py-1 rounded-full">
                {payments.length} giao dịch
              </span>
            </div>

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
                        <td className="py-3 px-4 font-mono text-[10px] text-stone-400 truncate max-w-[180px]" title={p.idempotencyKey}>
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
    </div>
  );
}
