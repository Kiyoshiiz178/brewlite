/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export interface DrinkDetailInfo {
  desc: string;
  ingredients: string;
  category: string;
}

export const getDrinkInfo = (name: string): DrinkDetailInfo => {
  const n = name.toLowerCase();
  if (n.includes('đen') || n.includes('den')) {
    return {
      desc: 'Cà phê phin mộc nguyên chất, đậm đắng thanh thoát và hậu vị sâu lắng',
      ingredients: 'Hạt Robusta Đắk Lắk • Nước tinh khiết',
      category: 'Cà phê truyền thống',
    };
  }
  if (n.includes('muối') || n.includes('muoi')) {
    return {
      desc: 'Lớp kem béo mặn độc quyền hòa quyện cùng vị cà phê phin rang đậm đà',
      ingredients: 'Hạt Robusta • Sữa đặc • Kem muối béo',
      category: 'Cà phê đặc sản',
    };
  }
  if (n.includes('bạc xỉu') || n.includes('bac xiu')) {
    return {
      desc: 'Vị ngọt béo từ sữa tươi thanh trùng và sữa đặc, thoang thoảng hương cà phê',
      ingredients: 'Hạt Robusta • Sữa tươi • Sữa đặc',
      category: 'Cà phê truyền thống',
    };
  }
  if (n.includes('sữa') || n.includes('sua')) {
    return {
      desc: 'Robusta Đắk Lắk đậm đà hòa quyện cùng sữa đặc Ông Thọ béo ngậy ngọt ngào',
      ingredients: 'Hạt Robusta • Sữa đặc Ông Thọ',
      category: 'Cà phê truyền thống',
    };
  }
  if (n.includes('americano')) {
    return {
      desc: 'Espresso nguyên chất pha loãng thanh nhẹ, lưu giữ trọn vẹn hương thơm mộc',
      ingredients: 'Hạt Robusta • Nước tinh khiết',
      category: 'Espresso hiện đại',
    };
  }
  if (n.includes('cappuccino')) {
    return {
      desc: 'Espresso chuẩn Ý phối lớp bọt sữa tươi thanh trùng đánh mịn nghệ thuật',
      ingredients: 'Hạt Robusta • Sữa tươi tiệt trùng',
      category: 'Espresso hiện đại',
    };
  }
  if (n.includes('đào') || n.includes('dao')) {
    return {
      desc: 'Trà đen Ceylon ủ cùng cam vàng, sả tươi đập dập và đào ngâm giòn ngọt',
      ingredients: 'Trà đen • Syrup đào • Cam & Sả',
      category: 'Trà trái cây tươi',
    };
  }
  if (n.includes('vải') || n.includes('vai') || n.includes('hoa hồng')) {
    return {
      desc: 'Hương trà hoa hồng ngát dịu kết hợp cùng trái vải thiều mọng nước thanh tao',
      ingredients: 'Trà đen • Syrup vải & hoa hồng',
      category: 'Trà trái cây tươi',
    };
  }
  if (n.includes('dâu') || n.includes('dau') || n.includes('ổi')) {
    return {
      desc: 'Mứt dâu tây Đà Lạt và ổi hồng nhiệt đới hòa quyện vị chua ngọt mát lạnh',
      ingredients: 'Trà đen • Mứt dâu tây & ổi hồng',
      category: 'Trà trái cây tươi',
    };
  }
  if (n.includes('matcha')) {
    return {
      desc: 'Bột trà xanh Uji Nhật Bản đánh bông cùng sữa tươi thanh trùng thơm béo',
      ingredients: 'Bột Matcha Uji • Sữa tươi tiệt trùng',
      category: 'Trà Nhật Bản',
    };
  }
  if (n.includes('oolong') || n.includes('ô long') || n.includes('o long')) {
    return {
      desc: 'Lá trà Oolong sao nhiệt đượm vị khói quyện sữa tươi thanh trùng béo ngậy',
      ingredients: 'Trà Oolong nướng • Sữa tươi • Sữa đặc',
      category: 'Trà sữa đậm vị',
    };
  }
  if (n.includes('sen')) {
    return {
      desc: 'Trà đen thanh khiết phối hạt sen Huế bùi ngọt và lớp bọt macchiato béo mịn',
      ingredients: 'Trà đen • Hạt sen ngâm • Kem Macchiato',
      category: 'Trà macchiato',
    };
  }
  return {
    desc: 'Thức uống được pha chế thủ công từ nguyên liệu tự nhiên chọn lọc',
    ingredients: 'Nguyên liệu tươi chọn lọc',
    category: 'Đặc sản BrewLite',
  };
};

const resolveDrinkImage = (name: string, imageUrl?: string | null): string => {
  if (imageUrl && imageUrl.trim().length > 0 && !imageUrl.startsWith('http://img.com')) return imageUrl;
  const n = name.toLowerCase();
  if (n.includes('đen') || n.includes('den')) return '/drinks/ca-phe-den-da.jpg';
  if (n.includes('muối') || n.includes('muoi')) return '/drinks/ca-phe-muoi.jpg';
  if (n.includes('bạc xỉu') || n.includes('bac xiu')) return '/drinks/bac-xiu.jpg';
  if (n.includes('sữa') || n.includes('sua')) return '/drinks/ca-phe-sua-da.jpg';
  if (n.includes('americano')) return '/drinks/americano.jpg';
  if (n.includes('cappuccino')) return '/drinks/cappuccino.jpg';
  if (n.includes('đào') || n.includes('dao')) return '/drinks/tra-dao-cam-sa.jpg';
  if (n.includes('vải') || n.includes('vai') || n.includes('hoa hồng')) return '/drinks/tra-vai-hoa-hong.jpg';
  if (n.includes('dâu') || n.includes('dau') || n.includes('ổi')) return '/drinks/tra-dau-oi-hong.jpg';
  if (n.includes('matcha')) return '/drinks/matcha-latte.jpg';
  if (n.includes('oolong') || n.includes('ô long') || n.includes('o long')) return '/drinks/tra-sua-oolong.jpg';
  if (n.includes('sen')) return '/drinks/tra-sen-vang.jpg';
  return '/drinks/ca-phe-sua-da.jpg';
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const isOutOfStock = product.stock <= 0;
  const imageSrc = resolveDrinkImage(product.name, product.imageUrl);
  const info = getDrinkInfo(product.name);

  return (
    <div className="group bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col">
      {/* Product Image */}
      <div className="relative aspect-4/3 w-full bg-stone-800 overflow-hidden">
        <img
          src={imageSrc}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            const fallback = resolveDrinkImage(product.name, null);
            if (e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
        />

        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-stone-950/80 text-amber-300 backdrop-blur-sm border border-stone-800">
            {info.category}
          </span>
        </div>
        
        {/* Stock badge */}
        <div className="absolute top-2.5 right-2.5">
          {isOutOfStock ? (
            <span className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg bg-rose-500/90 text-white backdrop-blur-sm shadow">
              Tạm hết món
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-stone-950/80 text-amber-300 backdrop-blur-sm border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
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
          <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
            {info.desc}
          </p>
          <div className="mt-2 text-[11px] text-amber-500/80 flex items-center gap-1 font-mono truncate">
            <Sparkles className="w-3 h-3 shrink-0 text-amber-400" />
            <span className="truncate">{info.ingredients}</span>
          </div>
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
