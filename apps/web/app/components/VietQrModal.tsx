'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { fetchOrderById } from '../lib/api';

interface VietQrModalProps {
  isOpen: boolean;
  orderId: number | null;
  amount: number;
  onClose: () => void;
  onSuccess: (orderId: number, status: string, pointsEarned?: number) => void;
}

export const VietQrModal: React.FC<VietQrModalProps> = ({
  isOpen,
  orderId,
  amount,
  onClose,
  onSuccess,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  const bankName = 'MBBank (Quân Đội)';
  const accountNumber = '6563617082006';
  const accountHolder = 'TRAN LE MINH TAM';
  const transferContent = orderId ? `BREWLITE${orderId}` : '';
  const qrUrl = orderId
    ? `https://img.vietqr.io/image/MB-6563617082006-compact2.png?amount=${amount}&addInfo=${transferContent}&accountName=TRAN%20LE%20MINH%20TAM`
    : '';

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Tự động kiểm tra trạng thái đơn hàng mỗi 1.5 giây (Webhook SePay tự động bắn về)
  useEffect(() => {
    if (!isOpen || !orderId || isSuccess) return;

    const interval = setInterval(async () => {
      try {
        setCheckCount((prev) => prev + 1);
        const order = await fetchOrderById(orderId);
        if (order.status === 'PAID') {
          setIsSuccess(true);
          clearInterval(interval);
          setTimeout(() => {
            const points = Math.floor(amount / 10000);
            onSuccess(orderId, 'PAID', points);
            onClose();
          }, 1200);
        }
      } catch {
        // bỏ qua lỗi mạng tạm thời trong lúc polling
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isOpen, orderId, isSuccess, amount, onSuccess, onClose]);

  if (!isOpen || !orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-stone-100 flex flex-col relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <QrCode className="w-3.5 h-3.5" />
            <span>Chuyển khoản Napas 247 – Xác thực tự động</span>
          </div>
          <h2 className="text-xl font-black text-white">Quét mã VietQR</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Mở bất kỳ App ngân hàng nào (MB, VCB, Techcom, MoMo...) để quét
          </p>
        </div>

        {/* Success Overlay Animation if Paid */}
        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-scale-up">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce-subtle">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Đã nhận được tiền!</h3>
            <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4" />
              <span>SePay đã xác nhận thành công đơn #{orderId}</span>
            </p>
          </div>
        ) : (
          <>
            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl mx-auto shadow-xl border-4 border-amber-500/30 mb-4 max-w-[260px]">
              <img
                src={qrUrl}
                alt="VietQR Payment"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>

            {/* Waiting Indicator */}
            <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span className="font-medium">Đang đợi tiền vào tài khoản...</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 font-mono">
                {checkCount > 0 ? `Đang dò (${checkCount})` : 'Chờ quét'}
              </span>
            </div>

            {/* Account Details Box */}
            <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-3.5 space-y-2 text-xs mb-4">
              <div className="flex justify-between items-center text-stone-400">
                <span>Ngân hàng:</span>
                <span className="font-semibold text-stone-200">{bankName}</span>
              </div>

              <div className="flex justify-between items-center text-stone-400">
                <span>Chủ tài khoản:</span>
                <span className="font-semibold text-stone-200">{accountHolder}</span>
              </div>

              <div className="flex justify-between items-center text-stone-400">
                <span>Số tài khoản:</span>
                <button
                  onClick={() => copyToClipboard(accountNumber, 'acc')}
                  className="flex items-center gap-1 font-mono font-bold text-white hover:text-amber-400 transition"
                >
                  <span>{accountNumber}</span>
                  {copiedField === 'acc' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-stone-400 pt-1.5 border-t border-stone-800">
                <span>Số tiền:</span>
                <button
                  onClick={() => copyToClipboard(String(amount), 'amt')}
                  className="flex items-center gap-1 font-bold text-base text-amber-400 hover:text-amber-300 transition"
                >
                  <span>{amount.toLocaleString('vi-VN')}đ</span>
                  {copiedField === 'amt' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center text-stone-400 pt-1.5 border-t border-stone-800">
                <span>Nội dung chuyển khoản:</span>
                <button
                  onClick={() => copyToClipboard(transferContent, 'content')}
                  className="flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition"
                >
                  <span>{transferContent}</span>
                  {copiedField === 'content' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Note alert */}
            <div className="mb-4 text-[11px] text-stone-400 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Quét mã QR bằng App ngân hàng sẽ tự điền đúng nội dung và số tiền. Màn hình sẽ tự động cập nhật ngay khi bạn bấm chuyển tiền thành công.
              </span>
            </div>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-stone-200 text-xs font-medium transition"
            >
              Hủy / Đổi phương thức khác
            </button>
          </>
        )}
      </div>
    </div>
  );
};
