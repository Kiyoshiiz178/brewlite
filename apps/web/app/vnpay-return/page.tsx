'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Coffee, ShieldCheck } from 'lucide-react';
import { verifyVnpayReturn } from '../lib/api';
import { useCart } from '../components/CartProvider';

interface VerifyResult {
  success: boolean;
  orderId: number;
  amount: number;
  transactionNo?: string;
  bankCode?: string;
  message: string;
  status?: string;
  responseCode?: string;
}

function VnpayReturnContent() {
  const searchParams = useSearchParams();
  const { clear } = useCart();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!qs) {
      setError('Không tìm thấy thông tin phản hồi từ cổng thanh toán');
      setLoading(false);
      return;
    }

    verifyVnpayReturn(qs)
      .then((data) => {
        setResult(data);
        if (data.success) {
          clear();
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Xác thực thanh toán thất bại');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams, clear]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-white">Đang xác thực giao dịch...</h2>
          <p className="text-sm text-stone-400">
            Hệ thống đang kết nối với cổng VNPay để kiểm tra và hoàn tất đơn hàng của bạn.
          </p>
        </div>
      </div>
    );
  }

  const isSuccess = result?.success;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-stone-950">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        {/* Header Icon */}
        <div className="flex justify-center">
          {isSuccess ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce-subtle">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-500/10">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-white">
            {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán chưa hoàn tất'}
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            {isSuccess
              ? 'Đơn hàng của bạn đã được ghi nhận và đang được chuẩn bị'
              : error || result?.message || 'Giao dịch bị hủy hoặc xảy ra lỗi trong quá trình xử lý'}
          </p>
        </div>

        {/* Transaction Summary Card */}
        {result && (
          <div className="bg-stone-950/60 border border-stone-800/80 rounded-2xl p-4 text-xs space-y-2.5 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-stone-800">
              <span className="text-stone-400">Mã đơn hàng:</span>
              <span className="font-bold text-amber-400">#{result.orderId}</span>
            </div>

            {result.transactionNo && (
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Mã GD VNPay:</span>
                <span className="font-mono text-stone-300">{result.transactionNo}</span>
              </div>
            )}

            {result.bankCode && (
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Ngân hàng / Cổng:</span>
                <span className="font-semibold text-stone-200">{result.bankCode}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-stone-800">
              <span className="text-stone-400">Số tiền:</span>
              <span className="text-base font-bold text-white">
                {result.amount.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-stone-800">
              <span className="text-stone-400">Trạng thái:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  isSuccess
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isSuccess ? 'ĐÃ THANH TOÁN (PAID)' : 'CHƯA THANH TOÁN'}
              </span>
            </div>
          </div>
        )}

        {/* Order notification notice for customer */}
        {isSuccess && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300 flex items-center gap-2 text-left">
            <Coffee className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              Quầy pha chế đã nhận được thông tin đơn của bạn. Vui lòng kiểm tra mã đơn khi nhận nước!
            </span>
          </div>
        )}

        {/* Action Button - Only back to menu */}
        <Link
          href="/"
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2 transition transform active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Menu & Đặt thêm</span>
        </Link>
      </div>
    </div>
  );
}

export default function VnpayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
        </div>
      }
    >
      <VnpayReturnContent />
    </Suspense>
  );
}
