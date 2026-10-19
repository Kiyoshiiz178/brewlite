# BrewLite – Ứng dụng đặt cà phê không dùng tiền mặt

Bài tập lớn môn Công nghệ Phần mềm (Học kỳ I - Năm học 2026-2027) – Khoa Công nghệ Thông tin, Đại học Sài Gòn.

---

## 1. Kiến trúc & Công nghệ
- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS, Lucide Icons) – Cổng `3000`
- **Backend**: NestJS 12 (ESM, TypeScript, class-validator, JWT Passport) – Cổng `4000`
- **Database & ORM**: PostgreSQL 16 + Prisma 7 (pg adapter) – Cổng `5432`
- **Containerization**: Docker & Docker Compose chạy đồng thời cả 3 dịch vụ (`web`, `api`, `db`)

---

## 2. Phân công trách nhiệm & Danh sách Task hoàn thành


| Task | Tên Task | Người phụ trách | Mô tả & Tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| **Task 1** | Khởi tạo dự án và cấu trúc | Người 1, Người 4 | Monorepo Next.js + NestJS + Docker Compose + Git | ✅ Hoàn thành |
| **Task 2** | API danh sách sản phẩm | Người 1, Người 4 | `GET /products`, `GET /products/:id` từ PostgreSQL | ✅ Hoàn thành |
| **Task 3** | Trang Menu (Frontend) | Frontend Team | Next.js render lưới đồ uống, loading/empty states | ✅ Hoàn thành |
| **Task 4** | Chi tiết & tùy chọn sản phẩm | Frontend Team | Chọn size (S/M/L), topping (Trân châu, Kem cheese, Thạch), tính giá động | ✅ Hoàn thành |
| **Task 5** | Giỏ hàng (Cart) | Frontend Team | Thêm, sửa số lượng, xóa món, lưu trạng thái giỏ, badge đếm số lượng | ✅ Hoàn thành |
| **Task 6** | API tạo đơn hàng | Người 1, Người 4 | `POST /orders`, validate class-validator, lưu trạng thái PENDING | ✅ Hoàn thành |
| **Task 7** | Đăng ký / Đăng nhập (JWT) | Auth/Business | `POST /auth/register`, `POST /auth/login`, băm bcrypt, cấp JWT, bảo vệ route đơn hàng | ✅ Hoàn thành |
| **Task 8** | Thanh toán không tiền mặt | Auth/Business | `POST /payments`, chọn Ví điện tử / Thẻ, chuyển `PAID` khi thành công, `PAYMENT_FAILED` khi lỗi | ✅ Hoàn thành |
| **Task 9** | Xác nhận, lịch sử đơn & bàn giao | Toàn đội | Màn hình xác nhận mã đơn (#1042), `GET /orders/me`, Docker Compose 3 services | ✅ Hoàn thành |
| **Task 10**| Nghiệp vụ Backend nâng cao | Toàn đội | Order State Machine, Idempotent Payment, Optimistic Locking tồn kho, Loyalty Points | ✅ Hoàn thành |

---

## 3. Danh sách Endpoints API chính

| Phương thức | Endpoint | Chức năng | Bảo vệ |
|---|---|---|---|
| `GET` | `/products` | Lấy danh sách menu thức uống | Public |
| `GET` | `/products/:id` | Xem chi tiết thức uống | Public |
| `POST` | `/auth/register` | Đăng ký tài khoản khách hàng mới | Public |
| `POST` | `/auth/login` | Đăng nhập tài khoản, nhận access token JWT | Public |
| `GET` | `/auth/me` | Lấy thông tin tài khoản và điểm tích lũy | JWT Guard |
| `POST` | `/orders` | Tạo đơn hàng (Trạng thái PENDING, trừ kho) | JWT Guard |
| `GET` | `/orders/me` | Lấy danh sách lịch sử đơn hàng của user | JWT Guard |
| `GET` | `/orders/:id` | Xem chi tiết đơn hàng | Public |
| `PATCH`| `/orders/:id/status` | Cập nhật trạng thái đơn (kiểm tra State Machine) | Public |
| `POST` | `/payments` | Thanh toán không tiền mặt (Idempotency Key) | Public |
| `GET` | `/promotions/validate?code=` | Kiểm tra mã voucher giảm giá (`BREW10`, `WELCOME20`) | Public |
| `GET` | `/health` | Kiểm tra trạng thái hoạt động backend | Public |

---

## 4. Nghiệp vụ Backend (Task 10 Details)

### 4.1. Order State Machine (Sơ đồ máy trạng thái Mục 9.1)
```
          [Thanh toán OK]          [Barista nhận]           [Pha xong]             [Giao khách]
PENDING -------------------> PAID ----------------> PREPARING ------------> READY --------------> COMPLETED
   |                          |
   | [Thanh toán lỗi]         | [Hủy]
   v                          v
PAYMENT_FAILED           CANCELLED
   |        |                 ^
   |        +-----------------+ [Hủy]
   | [Thử lại OK]
   +------------------------> PAID
```
- Mọi chuyển trạng thái sai (ví dụ: `PENDING -> READY`, `COMPLETED -> PAID`, v.v.) sẽ bị hàm `assertTransition` chặn lại và ném mã lỗi `400 BadRequestException`.
- `COMPLETED` và `CANCELLED` là trạng thái kết thúc (terminal states).

### 4.2. Thanh toán Idempotent (Idempotency-Key)
- Mỗi yêu cầu thanh toán mang theo `idempotencyKey` duy nhất.
- Khi gửi trùng key, hệ thống lập tức trả về kết quả giao dịch trước đó, **không trừ tiền 2 lần** và **không cộng trùng điểm tích lũy loyalty**.

### 4.3. Kiểm soát tồn kho đồng thời (Optimistic Locking)
- Sử dụng trường `version` trong bảng `Product` kết hợp transaction Prisma:
  ```ts
  await tx.product.updateMany({
    where: { id: productId, version: product.version, stock: { gte: qty } },
    data: { stock: { decrement: qty }, version: { increment: 1 } }
  });
  ```
- Khi nhiều khách đặt cùng một sản phẩm cùng lúc, số lượng bán ra không bao giờ vượt quá tồn kho.

### 4.4. Khuyến mãi & Tích điểm thưởng (Loyalty)
- Hỗ trợ mã voucher: `BREW10` (-10%), `WELCOME20` (-20%).
- Sau khi đơn chuyển trạng thái `PAID`: Tự động quy đổi mỗi 10.000 VNĐ = 1 điểm tích lũy và ghi nhận vào bảng `LoyaltyTransaction`.

---

## 5. Hướng dẫn chạy hệ thống

### Cách 1: Chạy bằng Docker Compose (Bàn giao trọn gói cả 3 services)
Đảm bảo đã cài đặt Docker Desktop:
```bash
# Đứng tại thư mục gốc brewlite
docker compose up --build
```
- Frontend: Truy cập http://localhost:3000
- Backend API: Truy cập http://localhost:4000/health
- PostgreSQL: Cổng 5432

### Cách 2: Chạy cục bộ từng phần (Local Development)
#### Bước 1: Khởi động Database
```bash
docker compose up -d db
```

#### Bước 2: Khởi động Backend (apps/api)
```bash
cd apps/api
# Tạo .env từ .env.example
npm install
npx prisma migrate dev
npm run seed     # Khởi tạo món ăn mẫu và mã khuyến mãi
npm run start:dev
```

#### Bước 3: Khởi động Frontend (apps/web)
```bash
cd apps/web
npm install
npm run dev
```

---

## 6. Chạy Test Suites (Minh chứng tiêu chí kiểm thử)

Hệ thống bao gồm bộ test kiểm thử tự động toàn diện với Vitest gồm 8 suites (42 test cases):
```bash
cd apps/api
npm run test
```

### Danh sách các bộ Unit & Integration Tests:
1. **API Sản phẩm (Task 2 - Người 1 & Người 4)**:
   - `src/products/products.service.spec.ts`: Test `findAll`, `findOne` (thành công và ném 404), `create`, `update`, `remove`.
   - `src/products/products.controller.spec.ts`: Test controller endpoints với `ParseIntPipe`.
2. **API Đặt hàng & Giỏ hàng (Task 6 - Người 1 & Người 4)**:
   - `src/orders/orders.service.spec.ts`: Test tạo đơn `PENDING`, tính giá động size/topping, áp mã voucher, kiểm tra tồn kho, phát hiện xung đột optimistic locking, ném lỗi 400/404 khi vi phạm, lịch sử `findMyOrders`, cập nhật trạng thái `updateStatus`.
   - `src/orders/orders.controller.spec.ts`: Test controller bảo vệ bởi `JwtAuthGuard`.
3. **API Xác thực (Task 7)**:
   - `src/auth/auth.service.spec.ts` & `src/auth/auth.controller.spec.ts`: Test đăng ký, đăng nhập bcrypt, phát token JWT.
4. **Nghiệp vụ nâng cao (Task 10 & DoD)**:
   - `test/task10.spec.ts`:
     - `(a)` Chặn thành công mọi chuyển trạng thái sai (`assertTransition`).
     - `(b)` Gửi lặp lại cùng `Idempotency-Key` chỉ tạo 1 bản ghi payment và không nhân đôi điểm loyalty.
     - `(c)` Đặt đơn đồng thời không bao giờ vượt quá số lượng tồn kho (Optimistic Locking).
     - `(d)` Áp mã giảm giá và tích lũy điểm thưởng chính xác.

---

## 7. Kịch bản Demo End-to-End (Dành cho buổi nghiệm thu)
1. **Xem Menu**: Mở `http://localhost:3000`, quan sát danh sách thức uống, giá và số lượng tồn kho.
2. **Chọn món & tùy chỉnh**: Bấm "Tùy chọn" một thức uống (vd: Cà phê sữa đá) -> Chọn size M (+5k), thêm Trân châu (+5k) -> Thêm vào giỏ.
3. **Giỏ hàng**: Mở giỏ hàng, quan sát badge số lượng, thử tăng/giảm số lượng hoặc xóa món.
4. **Đăng ký / Đăng nhập**: Nhấn "Thanh toán", popup đăng nhập hiển thị -> Đăng ký tài khoản mới hoặc đăng nhập.
5. **Áp mã giảm giá**: Tại màn hình thanh toán, nhập mã `BREW10` -> Giảm giá 10% ngay trên hóa đơn.
6. **Thử nghiệm thanh toán lỗi**: Tích chọn "Mô phỏng lỗi thanh toán" -> Nhấn xác nhận -> Đơn chuyển `PAYMENT_FAILED`, giỏ hàng được giữ nguyên.
7. **Thanh toán thành công**: Bỏ chọn lỗi -> Nhấn xác nhận -> Đơn chuyển `PAID`, nhận mã đơn `#...`, thông báo "Mời tới quầy lấy nước", nhận điểm thưởng loyalty.
8. **Xem Lịch sử đơn**: Chuyển sang tab "Lịch sử đơn" -> Quan sát timeline tiến trình trạng thái và điểm tích lũy vừa được cộng.
