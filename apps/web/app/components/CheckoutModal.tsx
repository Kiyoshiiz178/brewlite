'use client';

import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Wallet,
  Tag,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { CartItem } from '../types';
import { createOrder, processPayment, validatePromotion } from '../lib/api';

interface CheckoutModalProps {
  isOpen: boolean;
  items: CartItem[];
  token: string | null;
  onClose: () => void;
  onSuccess: (orderId: number, status: string, pointsEarned?: number) => void;
  onErrorState: (message: string) => void;
  onProceedToGateway?: (data: {
    orderId: number;
    amount: number;
    method: 'WALLET' | 'CARD';
    idempotencyKey: string;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  items,
  token,
  onClose,
  onSuccess,
  onErrorState,
  onProceedToGateway,
}) => {
  const [method, setMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPct: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const discountAmount = appliedPromo
    ? Math.round((subtotal * appliedPromo.discountPct) / 100)
    : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const estimatedPoints = Math.floor(finalTotal / 10000);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError(null);
    setIsApplyingPromo(true);

    try {
      const res = await validatePromotion(promoInput);
      setAppliedPromo(res);
      setPromoInput('');
    } catch (err: unknown) {
      setPromoError(err instanceof Error ? err.message : 'Mã khuyến mãi không hợp lệ');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handlePayment = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Tạo đơn hàng với POST /orders (Trạng thái PENDING)
      const orderPayload = items.map((i) => ({
        productId: i.product.id,
        size: i.size,
        qty: i.qty,
        toppings: i.toppings,
      }));

      const orderRes = await createOrder(
        orderPayload,
        appliedPromo?.code,
        token || undefined,
      );

      // 2. Tạo Idempotency-Key duy nhất cho lần thanh toán này (Task 10.2)
      const idempotencyKey = `pay-${orderRes.orderId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // 3. Nếu có Mock Gateway bên thứ 3 -> Chuyển hướng sang cổng thanh toán giả lập
      if (onProceedToGateway) {
        onProceedToGateway({
          orderId: orderRes.orderId,
          amount: orderRes.total,
          method,
          idempotencyKey,
        });
        onClose();
        return;
      }

      // Fallback: Gọi POST /payments trực tiếp nếu không dùng Gateway Modal
      const paymentRes = await processPayment({
        orderId: orderRes.orderId,
        idempotencyKey,
        amount: orderRes.total,
        method,
      });

      if (!paymentRes.success || paymentRes.status === 'PAYMENT_FAILED') {
        // Luồng thanh toán lỗi (US-05: đơn ở trạng thái PAYMENT_FAILED và giỏ hàng được giữ nguyên)
        onErrorState(`Thanh toán đơn hàng #${orderRes.orderId} thất bại. Giỏ hàng đã được giữ nguyên để bạn thử lại.`);
        onClose();
        return;
      }

      // Thanh toán thành công (Happy path)
      onSuccess(orderRes.orderId, paymentRes.status, paymentRes.pointsEarned);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi xử lý đặt hàng hoặc thanh toán');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-stone-100 flex flex-col relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Xác nhận thanh toán</h2>
        <p className="text-xs text-stone-400 mb-5">Thanh toán không dùng tiền mặt BrewLite</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-stone-800/50 border border-stone-800 rounded-2xl p-4 mb-4 space-y-2">
          <div className="text-xs font-semibold uppercase text-stone-400 tracking-wider mb-2">
            Chi tiết đơn ({items.length} món)
          </div>
          <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs text-stone-300 pr-1">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between">
                <span>
                  {i.qty}x {i.product.name} ({i.size})
                </span>
                <span className="font-semibold text-stone-200">
                  {i.lineTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-700/60 space-y-1 text-xs">
            <div className="flex justify-between text-stone-400">
              <span>Tạm tính</span>
              <span>{subtotal.toLocaleString('vi-VN')}đ</span>
            </div>
            {appliedPromo && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Khuyến mãi ({appliedPromo.code})</span>
                <span>-{discountAmount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-amber-400 pt-1 border-t border-stone-700/60">
              <span>Tổng cộng</span>
              <span>{finalTotal.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="text-[11px] text-amber-500/90 flex items-center gap-1 mt-0.5">
              <span>⭐ Tích lũy dự kiến:</span>
              <span className="font-semibold">+{estimatedPoints} điểm loyalty</span>
            </div>
          </div>
        </div>

        {/* Promo code voucher */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-stone-400 mb-1.5 block">
            Mã giảm giá (Gợi ý: BREW10, WELCOME20)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Nhập mã ưu đãi..."
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 uppercase focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={handleApplyPromo}
              disabled={isApplyingPromo || !promoInput.trim()}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition disabled:opacity-40"
            >
              {isApplyingPromo ? 'Đang kiểm tra...' : 'Áp dụng'}
            </button>
          </div>
          {promoError && (
            <p className="text-[11px] text-rose-400 mt-1">{promoError}</p>
          )}
          {appliedPromo && (
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Đã áp dụng giảm {appliedPromo.discountPct}% từ {appliedPromo.code}
            </p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-stone-400 mb-2 block">
            Phương thức thanh toán
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod('WALLET')}
              className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition ${
                method === 'WALLET'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold shadow-md shadow-amber-500/10'
                  : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:border-stone-700'
              }`}
            >
              <Wallet className="w-6 h-6" />
              <div className="text-xs font-medium text-center">
                Ví điện tử
                <span className="block text-[10px] text-stone-500">Momo / ZaloPay</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMethod('CARD')}
              className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition ${
                method === 'CARD'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold shadow-md shadow-amber-500/10'
                  : 'border-stone-800 bg-stone-800/40 text-stone-400 hover:border-stone-700'
              }`}
            >
              <CreditCard className="w-6 h-6" />
              <div className="text-xs font-medium text-center">
                Thẻ ngân hàng
                <span className="block text-[10px] text-stone-500">ATM / Visa / Master</span>
              </div>
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2 transition transform active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xử lý giao dịch...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Xác nhận trả {finalTotal.toLocaleString('vi-VN')}đ</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
