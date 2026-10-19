/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { Plus, Coffee } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="group bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col">
      {/* Product Image */}
      <div className="relative aspect-4/3 w-full bg-stone-800 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-600">
            <Coffee className="w-12 h-12" />
          </div>
        )}
        
        {/* Stock badge */}
        <div className="absolute top-2.5 right-2.5">
          {isOutOfStock ? (
            <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-rose-500/90 text-white backdrop-blur-sm shadow">
              Hết hàng
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-stone-950/75 text-amber-300 backdrop-blur-sm border border-stone-800">
              Còn {product.stock} ly
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-stone-400 mt-1 line-clamp-1">
            Pha chế thủ công nguyên chất
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-400">Giá từ</span>
            <div className="text-lg font-bold text-amber-500">
              {product.price.toLocaleString('vi-VN')}đ
            </div>
          </div>

          <button
            onClick={() => onSelect(product)}
            disabled={isOutOfStock}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isOutOfStock
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 active:scale-95'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Tùy chọn</span>
          </button>
        </div>
      </div>
    </div>
  );
};
