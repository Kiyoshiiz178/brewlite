'use client';

import React from 'react';
import { Coffee, ShoppingBag, User, LogOut, Award, Clock } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  cartCount: number;
  activeTab: 'menu' | 'history';
  onTabChange: (tab: 'menu' | 'history') => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  cartCount,
  activeTab,
  onTabChange,
  onOpenCart,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 text-stone-100 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('menu')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/20">
            <Coffee className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              BrewLite
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                PRO
              </span>
            </span>
            <p className="text-[11px] text-stone-400 -mt-0.5">Cà phê không tiền mặt</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden sm:flex items-center space-x-1 bg-stone-800/80 p-1 rounded-xl border border-stone-700/60">
          <button
            onClick={() => onTabChange('menu')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'menu'
                ? 'bg-amber-600 text-white shadow'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            Thực đơn
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Lịch sử đơn
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* User profile & loyalty points */}
          {user ? (
            <div className="flex items-center space-x-2 bg-stone-800/90 border border-stone-700 rounded-xl px-3 py-1.5">
              <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50">
                <Award className="w-3.5 h-3.5" />
                <span>{user.loyaltyPoints} điểm</span>
              </div>
              <div className="text-xs font-medium text-stone-300 max-w-[120px] truncate hidden md:block">
                {user.email.split('@')[0]}
              </div>
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="p-1 text-stone-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-xl transition"
            >
              <User className="w-4 h-4 text-amber-400" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative flex items-center justify-center p-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition transform active:scale-95"
            title="Xem giỏ hàng"
            aria-label={`Xem giỏ hàng (${cartCount} ly)`}
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
