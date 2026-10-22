'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  CreditCard,
  Wallet,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { sendPaymentWebhook } from '../lib/api';
import { formatVnd } from '../lib/pricing';

interface MockPaymentGatewayModalProps {
  isOpen: boolean;
  orderId: number | null;
  amount: number;
  method: 'WALLET' | 'CARD';
  idempotencyKey: string;
  onClose: () => void;
  onSuccess: (orderId: number, status: string, pointsEarned?: number) => void;
  onErrorState: (message: string) => void;
}

export const MockPaymentGatewayModal: React.FC<MockPaymentGatewayModalProps> = ({
  isOpen,
  orderId,
  amount,
  method,
  idempotencyKey,
  onClose,
  onSuccess,
  onErrorState,
}) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [status, setStatus] = useState<'WAITING' | 'SENDING_WEBHOOK' | 'SUCCESS' | 'FAILED'>('WAITING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || status !== 'WAITING') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, status]);

  if (!isOpen || !orderId) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isWallet = method === 'WALLET';
  const gatewayName = isWallet ? 'MoMo Sandbox Gateway' : 'VietQR / Napas Banking Sandbox';
  const gatewayColor = isWallet ? 'from-pink-600 to-rose-700' : 'from-blue-600 to-indigo-800';

  // Giả lập bắn Webhook từ Cổng thanh toán bên thứ 3 về Backend BrewLite
  const handleSimulateWebhook = async (targetStatus: 'SUCCESS' | 'FAILED') => {
    setStatus('SENDING_WEBHOOK');
    setErrorMessage(null);

    const gatewayRef = isWallet
      ? `MOMO-${orderId}-${Date.now().toString().slice(-6)}`
      : `VIETQR-${orderId}-${Date.now().toString().slice(-6)}`;

    try {
      // Mô phỏng độ trễ mạng của cổng thanh toán (800ms)
      await new Promise((resolve) => setTimeout(resolve, 800));

      const res = await sendPaymentWebhook({
        orderId,
        idempotencyKey,
        amount,
        method,
        status: targetStatus,
        gatewayRef,
      });

      if (targetStatus === 'SUCCESS' && res.success) {
        setStatus('SUCCESS');
        setTimeout(() => {
          onSuccess(orderId, 'PAID', res.pointsEarned);
          onClose();
        }, 1500);
      } else {
        setStatus('FAILED');
        setErrorMessage(res.message || 'Giao dịch bị từ chối bởi cổng thanh toán');
        setTimeout(() => {
          onErrorState('Thanh toán thất bại từ cổng thanh toán bên thứ 3');
          onClose();
        }, 2000);
      }
    } catch (err: unknown) {
      setStatus('FAILED');
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối cổng thanh toán';
      setErrorMessage(msg);
      setTimeout(() => {
        onErrorState(msg);
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-stone-900 border border-stone-700/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-stone-100 flex flex-col max-h-[95vh] animate-scale-up">
        {/* Header giả lập Cổng thanh toán bên thứ 3 */}
        <div className={`p-4 sm:p-5 bg-gradient-to-r ${gatewayColor} relative text-white shrink-0`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isWallet ? <Wallet className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
              <div>
                <h3 className="font-black text-sm tracking-wide uppercase flex items-center gap-1.5">
                  {gatewayName}
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">TEST</span>
                </h3>
                <p className="text-[11px] text-white/80">Cổng thanh toán giả lập bên thứ 3</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={status === 'SENDING_WEBHOOK'}
              className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 transition"
              title="Hủy thanh toán"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thân giao diện thanh toán */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Thông tin đơn và số tiền */}
          <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-400 block">Đơn hàng cần thanh toán</span>
              <span className="text-sm font-extrabold text-stone-200">BrewLite #{orderId}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-400 block">Tổng tiền</span>
              <span className="text-lg font-black text-amber-400">{formatVnd(amount)}</span>
            </div>
          </div>

          {/* Trạng thái màn hình */}
          {status === 'SUCCESS' ? (
            <div className="text-center py-8 space-y-3 animate-fade-in">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="text-lg font-bold text-emerald-400">Thanh toán thành công!</h4>
              <p className="text-xs text-stone-400">
                Cổng thanh toán đã gửi Webhook IPN về máy chủ BrewLite. Đang chuyển hướng...
              </p>
            </div>
          ) : status === 'FAILED' ? (
            <div className="text-center py-8 space-y-3 animate-fade-in">
              <XCircle className="w-16 h-16 text-rose-500 mx-auto" />
              <h4 className="text-lg font-bold text-rose-400">Giao dịch không thành công</h4>
              <p className="text-xs text-rose-300">{errorMessage || 'Khách hàng hủy giao dịch hoặc thẻ bị từ chối'}</p>
            </div>
          ) : status === 'SENDING_WEBHOOK' ? (
            <div className="text-center py-10 space-y-3">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-amber-300">Đang truyền Webhook IPN Callback...</h4>
              <p className="text-xs text-stone-400">
                Mô phỏng máy chủ cổng thanh toán gửi trạng thái xác nhận về Backend NestJS
              </p>
            </div>
          ) : (
            <>
              {/* QR Code mô phỏng thanh toán */}
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner text-stone-900">
                <div className="relative border-4 border-stone-900 rounded-xl p-2 bg-stone-50">
                  <div className="w-44 h-44 flex flex-col items-center justify-center border-2 border-dashed border-stone-400 rounded-lg bg-stone-100">
                    <QrCode className="w-28 h-28 text-stone-900" />
                    <span className="text-[10px] font-bold tracking-wider mt-1 text-stone-700">
                      SCAN ME WITH {isWallet ? 'MOMO' : 'BANKING'}
                    </span>
                  </div>
                  {/* Decorative corner markers */}
                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-stone-900" />
                  <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-stone-900" />
                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-stone-900" />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-stone-900" />
                </div>

                <div className="mt-3 text-center text-xs">
                  <p className="font-bold text-stone-800">Nội dung CK: <span className="text-amber-700">BREWLITE {orderId}</span></p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Số tiền: {formatVnd(amount)}</p>
                </div>
              </div>

              {/* Đồng hồ đếm ngược */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Giao dịch hết hạn trong:</span>
                <span className="font-mono font-bold text-amber-400">{timeFormatted}</span>
              </div>

              {/* Khung hướng dẫn Demo dành cho Thầy / Người dùng */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Khu vực Giả lập Webhook Cổng thanh toán:</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Để kiểm chứng quy trình bên thứ 3 gửi trạng thái về backend, chọn 1 trong 2 kịch bản mô phỏng bên dưới:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleSimulateWebhook('SUCCESS')}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition transform active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Quét mã thành công</span>
                  </button>

                  <button
                    onClick={() => handleSimulateWebhook('FAILED')}
                    className="p-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition transform active:scale-95"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Mô phỏng lỗi / Hủy</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Mã hóa bảo mật TLS 256-bit</span>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'SENDING_WEBHOOK'}
            className="text-stone-400 hover:text-white transition"
          >
            Hủy và quay về giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
};
