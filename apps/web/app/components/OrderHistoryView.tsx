'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  AlertCircle,
  RotateCw,
  ShoppingBag,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { Order } from '../types';
import { fetchMyOrders } from '../lib/api';

interface OrderHistoryViewProps {
  token: string | null;
  onOpenAuth: () => void;
  onGoToMenu: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; border: string; bg: string }
> = {
  PENDING: {
    label: 'Chờ thanh toán',
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
  PAID: {
    label: 'Đã thanh toán',
    color: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  PREPARING: {
    label: 'Đang pha chế',
    color: 'text-sky-400',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
  },
  READY: {
    label: 'Sẵn sàng nhận',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    color: 'text-stone-300',
    border: 'border-stone-700',
    bg: 'bg-stone-800',
  },
  PAYMENT_FAILED: {
    label: 'Thanh toán lỗi',
    color: 'text-rose-400',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
  },
  CANCELLED: {
    label: 'Đã hủy đơn',
    color: 'text-stone-500',
    border: 'border-stone-800',
    bg: 'bg-stone-900',
  },
};

const FLOW_STEPS = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED'];

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  token,
  onOpenAuth,
  onGoToMenu,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const loadOrders = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyOrders(token);
      setOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch sử đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    fetchMyOrders(token)
      .then((data) => {
        if (!ignore) {
          setOrders(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Không thể tải lịch sử đơn hàng');
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-stone-900/60 border border-stone-800 rounded-3xl">
        <Clock className="w-12 h-12 text-stone-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Bạn chưa đăng nhập</h3>
        <p className="text-xs text-stone-400 mt-1 mb-5">
          Vui lòng đăng nhập để xem lịch sử và tiến độ chuẩn bị các đơn hàng của bạn.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-xl transition"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            Lịch sử đơn hàng
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Theo dõi trạng thái và tiến độ xử lý đơn hàng theo thời gian thực
          </p>
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold border border-stone-700 transition"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
          <span className="text-xs">Đang tải lịch sử đơn...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-stone-900/40 border border-stone-800 rounded-3xl p-6">
          <ShoppingBag className="w-12 h-12 text-stone-700 mx-auto mb-3" />
          <p className="text-base font-bold text-stone-300">Chưa có đơn hàng nào</p>
          <p className="text-xs text-stone-500 mt-1 mb-4">
            Bạn chưa đặt đồ uống nào. Hãy khám phá menu của chúng tôi ngay hôm nay!
          </p>
          <button
            onClick={onGoToMenu}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md transition"
          >
            Xem thực đơn ngay
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusMeta = STATUS_CONFIG[order.status] || {
              label: order.status,
              color: 'text-stone-300',
              border: 'border-stone-700',
              bg: 'bg-stone-800',
            };
            const currentStepIdx = FLOW_STEPS.indexOf(order.status);

            return (
              <div
                key={order.id}
                className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-lg hover:border-stone-700 transition"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-stone-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-white">
                        Đơn hàng #{order.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusMeta.color} ${statusMeta.bg} border ${statusMeta.border}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400 mt-0.5 block">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-stone-400">Tổng tiền</span>
                    <div className="text-base font-bold text-amber-400">
                      {order.total.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                </div>

                {/* State Machine Progress Bar (Task 10.1 Order State Machine Visualization) */}
                {FLOW_STEPS.includes(order.status) && (
                  <div className="py-4 border-b border-stone-800/80">
                    <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      Tiến trình đơn (State Machine)
                    </div>
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-2 right-2 top-3 h-0.5 bg-stone-800 -z-0" />
                      {FLOW_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        return (
                          <div
                            key={step}
                            className="flex flex-col items-center relative z-10"
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isCurrent
                                  ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-500/20 shadow'
                                  : isDone
                                  ? 'bg-emerald-500 text-stone-950'
                                  : 'bg-stone-800 text-stone-500'
                              }`}
                            >
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <span
                              className={`text-[10px] mt-1 font-medium ${
                                isCurrent
                                  ? 'text-amber-400 font-bold'
                                  : isDone
                                  ? 'text-stone-300'
                                  : 'text-stone-600'
                              }`}
                            >
                              {STATUS_CONFIG[step]?.label || step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Items in order */}
                <div className="pt-3 space-y-1.5">
                  <div className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
                    Món đã đặt:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-stone-800/40 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-500">
                            {item.qty}x
                          </span>
                          <span className="text-stone-200">
                            {item.product?.name || `Món #${item.productId}`}
                          </span>
                          <span className="text-[10px] px-1 rounded bg-stone-700 text-stone-300">
                            Size {item.size}
                          </span>
                        </div>
                        <span className="text-stone-300 font-medium">
                          {item.lineTotal.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment records */}
                {order.payments && order.payments.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-stone-500" />
                      <span>Phương thức: {order.payments[0].method === 'WALLET' ? 'Ví điện tử' : 'Thẻ ngân hàng'}</span>
                    </div>
                    <span className="text-stone-500 font-mono text-[10px]">
                      Key: {order.payments[0].idempotencyKey.substring(0, 16)}...
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
