# BrewLite – Frontend (Next.js)

Giao diện đặt đồ uống: Menu, chi tiết sản phẩm (size/topping), giỏ hàng, đăng nhập, thanh toán, lịch sử đơn.

## Chạy

```bash
npm install
npm run dev        # http://localhost:3000
```

Cần API đang chạy ở `http://localhost:4000` (xem README ở thư mục gốc). Địa chỉ API đặt trong `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Lệnh thường dùng

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy chế độ phát triển |
| `npm run lint` | Kiểm tra lỗi code |
| `npm run test` | Chạy test (Vitest + Testing Library) |
| `npm run build` | Build bản production |

## Cấu trúc chính

- `app/page.tsx`: trang chính (Menu, ghép các thành phần).
- `app/components/`: `ProductCard`, `ProductModal` (size/topping), `CartDrawer`, `CartProvider` (giỏ hàng dùng React Context + localStorage), `CheckoutModal`, `AuthModal`, `OrderHistoryView`...
- `app/lib/pricing.ts`: bảng giá size/topping (phải khớp `apps/api/src/orders/orders.service.ts`).
- `app/lib/cart.ts`: logic giỏ hàng thuần (thêm, gộp dòng, sửa, xóa, giới hạn tồn kho).
- `app/lib/api.ts`: gọi API backend.
- `__tests__/`: test tự động.
