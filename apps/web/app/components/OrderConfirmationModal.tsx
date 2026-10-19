'use client';

import React from 'react';
import { CheckCircle2, Coffee, Clock, Home, Award } from 'lucide-react';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  orderId: number | null;
  status: string;
  pointsEarned?: number;
  onGoHome: () => void;
  onViewHistory: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  orderId,
  status,
  pointsEarned,
  onGoHome,
  onViewHistory,
}) => {
  if (!isOpen || !orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-stone-100 flex flex-col items-center text-center relative animate-scale-up">
        {/* Animated Success Check icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">
          Đặt hàng thành công!
        </h2>
        <p className="text-xs text-stone-400 mt-1">Cảm ơn bạn đã lựa chọn BrewLite</p>

        {/* Order Details Card */}
        <div className="w-full bg-stone-800/60 border border-stone-700/60 rounded-2xl p-4 my-5 space-y-2 text-left">
          <div className="flex justify-between items-center text-sm">
            <span className="text-stone-400">Mã đơn hàng:</span>
            <span className="font-extrabold text-amber-400 text-base">#{orderId}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-stone-400">Trạng thái:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {status}
            </span>
          </div>

          {pointsEarned && pointsEarned > 0 ? (
            <div className="flex justify-between items-center text-sm pt-1 border-t border-stone-700/60">
              <span className="text-stone-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Điểm tích lũy:
              </span>
              <span className="font-bold text-amber-400">+{pointsEarned} điểm</span>
            </div>
          ) : null}
        </div>

        {/* Barista pick-up message */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs w-full mb-6">
          <Coffee className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Mời bạn tới quầy nhận đồ uống khi nhận thông báo sẵn sàng!</span>
        </div>

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <button
            onClick={onViewHistory}
            className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs border border-stone-700 flex items-center justify-center gap-2 transition"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Theo dõi tiến độ đơn hàng</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
