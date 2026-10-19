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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-stone-100 flex flex-col max-h-[90vh]">
        {/* Header with image */}
        <div className="relative aspect-16/9 w-full bg-stone-800">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-stone-950/70 text-stone-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-xl font-bold text-white drop-shadow-md">
              {product.name}
            </h2>
            <p className="text-sm text-amber-400 font-semibold drop-shadow-md">
              Giá gốc: {product.price.toLocaleString('vi-VN')}đ
            </p>
          </div>
        </div>

        {/* Customization Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Size selection */}
          <div>
            <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2.5">
              1. Chọn kích cỡ (Size)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    size === s.id
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold shadow-md shadow-amber-500/10'
                      : 'border-stone-800 bg-stone-800/60 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-sm">{s.id}</div>
                  <div className="text-[11px] mt-0.5 opacity-80">
                    {s.extra > 0 ? `+${s.extra.toLocaleString('vi-VN')}đ` : 'Chuẩn'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Toppings selection */}
          <div>
            <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2.5">
              2. Thêm Topping (+5.000đ/loại)
            </h3>
            <div className="space-y-2">
              {TOPPINGS.map((t) => {
                const isSelected = selectedToppings.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTopping(t.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-500/10 text-white'
                        : 'border-stone-800 bg-stone-800/40 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500 text-stone-950'
                            : 'border-stone-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-sm font-medium">{t.label}</span>
                    </div>
                    <span className="text-xs text-amber-400 font-medium">+5.000đ</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity stepper */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-sm font-semibold text-stone-300">Số lượng</span>
              <p className="text-xs text-stone-400">Còn lại: {product.stock} ly</p>
            </div>
            <div className="flex items-center space-x-3 bg-stone-800 border border-stone-700 rounded-xl p-1">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="p-2 text-stone-300 hover:text-white rounded-lg hover:bg-stone-700 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-sm text-white">{qty}</span>
              <button
                onClick={() => setQty(Math.min(product.stock, qty + 1))}
                disabled={qty >= product.stock}
                className="p-2 text-stone-300 hover:text-white rounded-lg hover:bg-stone-700 transition disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400">Tạm tính</span>
            <div className="text-lg font-bold text-amber-400">
              {lineTotal.toLocaleString('vi-VN')}đ
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-bold text-sm shadow-lg shadow-amber-600/30 transition transform active:scale-95"
          >
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </div>
  );
};
