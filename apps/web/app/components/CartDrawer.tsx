/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';
import { cartTotal, qtyOfProduct } from '../lib/cart';
import { formatVnd, toppingLabel } from '../lib/pricing';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const total = cartTotal(items);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in flex justify-end">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Giỏ hàng"
        className="w-full max-w-md bg-stone-900 border-l border-stone-800 text-stone-100 h-full flex flex-col shadow-2xl animate-slide-left"
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-white">Giỏ hàng của bạn</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-medium">
              {items.length} món
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng giỏ hàng"
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
              <ShoppingBag className="w-16 h-16 stroke-1 mb-3 text-stone-700" />
              <p className="text-base font-semibold text-stone-400">Giỏ hàng đang trống</p>
              <p className="text-xs text-stone-500 mt-1 max-w-[200px]">
                Hãy chọn món nước yêu thích từ menu để thưởng thức nhé!
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-stone-800/60 border border-stone-800 rounded-2xl p-3.5 flex flex-col gap-2.5 transition hover:border-stone-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {item.product.imageUrl && (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.product.name}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-400 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-stone-700 text-amber-400 text-[10px] font-semibold">
                          Size {item.size}
                        </span>
                        {item.toppings.length > 0 && (
                          <span className="text-[11px] text-stone-400">
                            + {item.toppings.map(toppingLabel).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 text-stone-500 hover:text-rose-400 transition"
                    title="Xóa"
                    aria-label={`Xóa ${item.product.name} khỏi giỏ`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-stone-700/50 flex items-center justify-between">
                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-2 bg-stone-900 border border-stone-700 rounded-lg p-0.5">
                    <button
                      onClick={() => onUpdateQty(item.id, -1)}
                      aria-label={`Giảm số lượng ${item.product.name}`}
                      className="p-1 text-stone-400 hover:text-white rounded"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => onUpdateQty(item.id, 1)}
                      disabled={qtyOfProduct(items, item.product.id) >= item.product.stock}
                      aria-label={`Tăng số lượng ${item.product.name}`}
                      className="p-1 text-stone-400 hover:text-white rounded disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-sm font-bold text-amber-400">
                    {formatVnd(item.lineTotal)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-800 bg-stone-950/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-400">Tổng thanh toán</span>
              <div className="text-xl font-bold text-amber-500">
                {formatVnd(total)}
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-xl shadow-amber-600/25 flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              <span>Thanh toán không tiền mặt</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
