/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { Product, CartItem } from '../types';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, 'id'>) => void;
}

const SIZES: Array<{ id: 'S' | 'M' | 'L'; label: string; extra: number }> = [
  { id: 'S', label: 'Size S (Nhỏ)', extra: 0 },
  { id: 'M', label: 'Size M (Vừa)', extra: 5000 },
  { id: 'L', label: 'Size L (Lớn)', extra: 10000 },
];

const TOPPINGS: Array<{ id: string; label: string; extra: number }> = [
  { id: 'tranchau', label: 'Trân châu đen', extra: 5000 },
  { id: 'kemcheese', label: 'Kem cheese Macchiato', extra: 5000 },
  { id: 'thach', label: 'Thạch sương sáo', extra: 5000 },
];

const resolveDrinkImage = (name: string, imageUrl?: string | null): string => {
  if (imageUrl && imageUrl.trim().length > 0) return imageUrl;
  const n = name.toLowerCase();
  if (n.includes('sữa') || n.includes('sua')) return '/drinks/ca-phe-sua-da.jpg';
  if (n.includes('đào') || n.includes('dao')) return '/drinks/tra-dao-cam-sa.jpg';
  if (n.includes('americano')) return '/drinks/americano.jpg';
  if (n.includes('cappuccino')) return '/drinks/cappuccino.jpg';
  if (n.includes('bạc xỉu') || n.includes('bac xiu')) return '/drinks/bac-xiu.jpg';
  if (n.includes('sen')) return '/drinks/tra-sen-vang.jpg';
  return '/drinks/ca-phe-sua-da.jpg';
};

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  const [size, setSize] = useState<'S' | 'M' | 'L'>('M');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const currentSizeExtra = SIZES.find((s) => s.id === size)?.extra || 0;
  const currentToppingsExtra = selectedToppings.length * 5000;
  const unitPrice = product.price + currentSizeExtra + currentToppingsExtra;
  const lineTotal = unitPrice * qty;

  const toggleTopping = (toppingId: string) => {
    if (selectedToppings.includes(toppingId)) {
      setSelectedToppings(selectedToppings.filter((t) => t !== toppingId));
    } else {
      setSelectedToppings([...selectedToppings, toppingId]);
    }
  };

  const handleAdd = () => {
    onAddToCart({
      product,
      size,
      toppings: selectedToppings,
      qty,
      unitPrice,
      lineTotal,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-stone-100 flex flex-col max-h-[92vh]">
        {/* Header with image */}
        <div className="relative h-44 sm:h-48 w-full bg-stone-800 shrink-0">
          <img
            src={resolveDrinkImage(product.name, product.imageUrl)}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              const fallback = resolveDrinkImage(product.name, null);
              if (e.currentTarget.src !== fallback) {
                e.currentTarget.src = fallback;
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/30 to-black/40" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-stone-950/80 text-stone-300 hover:text-white transition shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">
              {product.name}
            </h2>
            <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold drop-shadow-sm">
              Giá gốc: {product.price.toLocaleString('vi-VN')}đ
            </div>
          </div>
        </div>

        {/* Customization Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Size selection */}
          <div>
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. Chọn kích cỡ (Size)</span>
              <span className="text-[11px] text-amber-400/80 font-normal">Đã chọn: Size {size}</span>
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-center transition-all ${
                    size === s.id
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400 font-bold shadow-md shadow-amber-500/10 ring-1 ring-amber-500/50'
                      : 'border-stone-800 bg-stone-800/60 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                  }`}
                >
                  <div className="text-sm font-extrabold">{s.id}</div>
                  <div className="text-[11px] mt-0.5 opacity-90">
                    {s.extra > 0 ? `+${s.extra.toLocaleString('vi-VN')}đ` : 'Tiêu chuẩn'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Toppings selection */}
          <div>
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2. Thêm Topping</span>
              <span className="text-[11px] text-amber-400/80 font-normal">+5.000đ / loại</span>
            </h3>
            <div className="space-y-2">
              {TOPPINGS.map((t) => {
                const isSelected = selectedToppings.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTopping(t.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-sm shadow-amber-500/10'
                        : 'border-stone-800 bg-stone-800/50 text-stone-300 hover:border-stone-700 hover:bg-stone-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500 text-stone-950 font-bold'
                            : 'border-stone-600 bg-stone-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-semibold">{t.label}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      +5.000đ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity stepper */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-800">
            <div>
              <span className="text-sm font-bold text-stone-200">Số lượng ly</span>
              <p className="text-[11px] text-stone-400">Tồn kho: {product.stock} ly sẵn có</p>
            </div>
            <div className="flex items-center space-x-3 bg-stone-800/80 border border-stone-700 rounded-xl p-1">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="p-1.5 text-stone-300 hover:text-white rounded-lg hover:bg-stone-700 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-black text-sm text-white">{qty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock, qty + 1))}
                disabled={qty >= product.stock}
                className="p-1.5 text-stone-300 hover:text-white rounded-lg hover:bg-stone-700 transition disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/90 flex items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[11px] text-stone-400 block">Tổng thanh toán:</span>
            <div className="text-xl font-black text-amber-400">
              {lineTotal.toLocaleString('vi-VN')}đ
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm shadow-xl shadow-amber-600/25 transition transform active:scale-95"
          >
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
};
