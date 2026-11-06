# BrewLite – Ứng dụng đặt cà phê không dùng tiền mặt

Bài tập lớn môn Công nghệ Phần mềm (Học kỳ I - Năm học 2026-2027) – Khoa Công nghệ Thông tin, Đại học Sài Gòn.

---

## 1. Kiến trúc & Công nghệ

- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS, Lucide Icons) – Cổng `3000`
- **Backend API**: NestJS 12 (ESM, TypeScript, class-validator, JWT Passport) – Cổng `4000`
- **Database & ORM**: PostgreSQL 16 + Prisma 7 (pg adapter) – Cổng `5432`
- **Tích hợp Thanh toán**:
  - **VietQR Napas 247 (Ngân hàng MBBank thật)**: Tự động xác thực biến động số dư qua **SePay Webhook**.
  - **Cổng thanh toán VNPay Sandbox**: Bảo mật chữ ký điện tử chuẩn băm `HMAC-SHA512`.
  - **Mock Payment Gateway**: Mô phỏng giao dịch Ví điện tử / Thẻ ngân hàng nội bộ.
- **Hệ thống Quản lý Kho & Định mức công thức (BOM)**:
  - Tự động tính số ly có thể bán theo nguyên liệu thắt nút cổ chai nhỏ nhất.
  - Tự động trừ nguyên liệu khi đặt đơn và hoàn kho khi hủy đơn.
- **Containerization & Networking**: Docker & Docker Compose chạy đồng thời cả 3 dịch vụ (`web`, `api`, `db`) kèm Cloudflare Tunnel cho Webhook.

---

## 2. Phân công trách nhiệm & Danh sách Task hoàn thành

### 2.1. Phân vai 3 cặp thành viên trong nhóm
- **Cặp 1 — Backend Core & Database**: **Tuân** & **Quân**
  - Phụ trách cấu trúc API backend (NestJS), thiết kế cơ sở dữ liệu PostgreSQL, migration Prisma, API sản phẩm và API tạo đơn hàng (Task 1, Task 2, Task 6).
- **Cặp 2 — Frontend, Menu & Giỏ hàng**: **Trung** & **Tài**
  - Phụ trách giao diện người dùng Next.js, hiển thị lưới menu, chi tiết món tùy chọn size/topping, giỏ hàng CartProvider và bộ test frontend Vitest (Task 1, Task 3, Task 4, Task 5).
- **Cặp 3 — Nghiệp vụ, Thanh toán & Scrum**: **Tâm** & **Thịnh**
  - Phụ trách xác thực JWT/bcrypt, đa kênh thanh toán không tiền mặt (VietQR SePay, VNPay, Mock), màn hình xác nhận/lịch sử, State machine, tồn kho đồng thời (Optimistic Locking), quản lý kho BOM, Docker Compose và quản lý Scrum (Task 7, Task 8, Task 9, Task 10).

### 2.2. Danh sách 10 Task Scrum

| Task | Tên Task | Người phụ trách | Mô tả & Tiêu chí nghiệm thu | Trạng thái |
|---|---|---|---|---|
| **Task 1** | Khởi tạo dự án và cấu trúc | Cả nhóm | Monorepo Next.js + NestJS + Docker Compose + Git | ✅ Hoàn thành |
| **Task 2** | API danh sách sản phẩm | Tuân, Quân | `GET /products`, `GET /products/:id` từ PostgreSQL | ✅ Hoàn thành |
| **Task 3** | Trang Menu (Frontend) | Trung, Tài | Next.js render lưới đồ uống, loading/empty/error states | ✅ Hoàn thành |
| **Task 4** | Chi tiết & tùy chọn sản phẩm | Trung, Tài | Chọn size (S/M/L), topping (Trân châu, Kem cheese, Thạch), tính giá động | ✅ Hoàn thành |
| **Task 5** | Giỏ hàng (Cart) | Trung, Tài | Thêm, sửa số lượng, xóa món, lưu LocalStorage, badge đếm số lượng | ✅ Hoàn thành |
| **Task 6** | API tạo đơn hàng | Tuân, Quân | `POST /orders`, validate class-validator, lưu trạng thái PENDING | ✅ Hoàn thành |
| **Task 7** | Đăng ký / Đăng nhập (JWT) | Tâm, Thịnh | `POST /auth/register`, `POST /auth/login`, băm bcrypt (cost=10), cấp JWT stateless, JwtAuthGuard | ✅ Hoàn thành |
| **Task 8** | Thanh toán không tiền mặt | Tâm, Thịnh | Tích hợp VietQR (SePay Webhook MBBank), Cổng VNPay Sandbox (HMAC-SHA512) & Mock Gateway | ✅ Hoàn thành |
| **Task 9** | Xác nhận, lịch sử đơn & bàn giao | Tâm, Thịnh (Toàn đội) | Modal xác nhận mã đơn (#id), timeline tiến trình `GET /orders/me`, Docker Compose trọn gói 3 services | ✅ Hoàn thành |
| **Task 10**| Nghiệp vụ Backend nâng cao | Tâm, Thịnh | Order State Machine, Idempotent Payment (`Idempotency-Key`), Optimistic Locking tồn kho, Loyalty Points | ✅ Hoàn thành |

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
| `POST` | `/payments` | Thanh toán không tiền mặt nội bộ (Idempotency Key) | Public |
| `POST` | `/payments/sepay-webhook` | Webhook tiếp nhận biến động số dư SePay (MBBank) | Public |
| `POST` | `/payments/vnpay-url` | Sinh URL thanh toán cổng VNPay Sandbox | Public |
| `GET` | `/payments/vnpay-verify` | Xác thực chữ ký số phản hồi từ VNPay | Public |
| `GET` | `/payments/vnpay-ipn` | Server-to-server IPN từ VNPay | Public |
| `GET` | `/inventory/ingredients` | Lấy danh sách nguyên vật liệu kho | Public |
| `POST` | `/inventory/ingredients` | Tạo mới nguyên vật liệu | Public |
| `POST` | `/inventory/restock` | Nhập thêm số lượng nguyên liệu vào kho | Public |
| `GET` | `/inventory/recipes/:id` | Lấy định mức công thức của món | Public |
| `POST` | `/inventory/recipes/:id` | Lưu cấu hình công thức pha chế | Public |
| `GET` | `/promotions/validate?code=` | Kiểm tra mã voucher (`BREW10`, `WELCOME20`) | Public |
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

## 5. Hướng dẫn khởi động hệ thống (Full Setup)

### Cách 1: Khởi động nhanh bằng Docker Compose (Khuyên dùng)
Đảm bảo máy tính đã cài đặt và bật **Docker Desktop**. Mở PowerShell tại thư mục gốc `brewlite` và chạy:

```powershell
# 1. Khởi động toàn bộ 3 dịch vụ (Web, API, PostgreSQL)
docker compose up --build -d

# 2. Kiểm tra trạng thái các container đang chạy
docker ps
```

- **Frontend (Web khách hàng)**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard (Quản lý kho & công thức)**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Backend API**: [http://localhost:4000/health](http://localhost:4000/health)
- **PostgreSQL Database**: Cổng `5432`

---

### Cách 2: Khởi động cục bộ từng dịch vụ (Local Development)

#### Bước 1: Khởi động Database
```powershell
docker compose up -d db
```

#### Bước 2: Khởi động Backend (apps/api)
```powershell
cd apps/api
npm install
npx prisma migrate dev
npm run seed     # Khởi tạo sản phẩm, nguyên vật liệu, công thức và voucher
npm run start:dev
```

#### Bước 3: Khởi động Frontend (apps/web)
Mở cửa sổ PowerShell mới:
```powershell
cd apps/web
npm install
npm run dev
```

---

## 6. Hướng dẫn chi tiết các Phương thức Thanh toán

Hệ thống hỗ trợ 3 hình thức thanh toán không tiền mặt đáp ứng toàn diện các tiêu chí đánh giá:

```
                            ┌───────────────────────────────────────────────┐
                            │           CHỌN PHƯƠNG THỨC THANH TOÁN         │
                            └───────┬───────────────┬───────────────┬───────┘
                                    │               │               │
                                    ▼               ▼               ▼
                       ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
                       │  Quét VietQR   │ │ Cổng VNPay SB  │ │  Ví/Thẻ Mock   │
                       │  (App ngân hàng│ │ (Thẻ ATM/Visa  │ │ (Mô phỏng nội  │
                       │   MBBank thật) │ │  bảo mật HMAC) │ │  bộ + test lỗi)│
                       └────────────────┘ └────────────────┘ └────────────────┘
```

---

### 🟢 Phương thức 1: Quét mã VietQR (Tự động xác nhận qua SePay Webhook)
> **Đặc điểm**: Khách hàng quét mã QR bằng App ngân hàng bất kỳ (Vietcombank, MB, Techcombank, Momo, v.v.). Khi tiền vào tài khoản MBBank thật của chủ quán, hệ thống SePay tự động gọi Webhook về máy chủ để chuyển trạng thái đơn hàng sang `PAID` trong 1-2 giây.

#### Bước 1: Khởi chạy Cloudflare Tunnel để nhận Webhook từ Internet
Mở một cửa sổ PowerShell riêng tại thư mục dự án và chạy:
```powershell
.\cloudflared.exe tunnel --url http://localhost:4000
```
Màn hình sẽ hiển thị link tunnel có dạng:
`https://<tên-ngẫu-nhiên>.trycloudflare.com`

#### Bước 2: Cấu hình Webhook trên SePay (Chỉ cần làm 1 lần)
1. Đăng nhập [my.sepay.vn](https://my.sepay.vn) -> Chọn **Webhooks** -> Bấm Sửa hoặc Thêm Webhook.
2. Dán link nhận Webhook:
   ```text
   https://<tên-ngẫu-nhiên>.trycloudflare.com/payments/sepay-webhook
   ```
   *(Ví dụ đang hoạt động: `https://strings-satellite-enrolled-maine.trycloudflare.com/payments/sepay-webhook`)*
3. **Loại giao dịch**: Chọn `Tiền vào`.
4. **Định dạng dữ liệu**: Chọn `JSON`.
5. **Bảo mật**: Chọn `Không xác thực`.
6. Bấm **Lưu thay đổi**.

#### Bước 3: Trải nghiệm thanh toán
1. Vào `http://localhost:3000` -> Đăng nhập tài khoản -> Thêm món vào giỏ -> Bấm **Thanh toán**.
2. Chọn phương thức: **"Quét mã VietQR (App ngân hàng thật - Tự động qua SePay)"**.
3. Bấm **Tạo mã VietQR**: Màn hình hiển thị mã QR kèm đúng số tiền và nội dung chuyển khoản `BREWLITE<id>`.
4. Mở App ngân hàng trên điện thoại quét mã và chuyển tiền (chuyển test từ 1.000đ trở lên).
5. **Kết quả**: Ngay khi giao dịch hoàn tất, màn hình máy tính tự động nhảy sang thông báo **"Đặt hàng thành công!"**, cộng điểm loyalty và làm sạch giỏ hàng.

---

### 🔵 Phương thức 2: Cổng thanh toán VNPay Sandbox (Thẻ ATM Nội địa)
> **Đặc điểm**: Điều hướng sang cổng VNPay chính thức, băm chữ ký `HMAC-SHA512` bảo mật, sau khi nhập mã OTP sẽ tự động redirect về trang `/vnpay-return` xác thực kết quả.

1. Tại màn hình Checkout, chọn phương thức: **"VNPay Sandbox"** -> Bấm **Chuyển sang VNPay**.
2. Trình duyệt điều hướng sang cổng thanh toán VNPay Sandbox.
3. Chọn phương thức: **"Thẻ nội địa và tài khoản ngân hàng"** -> Chọn ngân hàng **NCB** (hoặc bất kỳ).
4. Nhập thông tin thẻ thử nghiệm chính thức của VNPay:
   - **Số thẻ**: `9704198526191432198`
   - **Tên chủ thẻ**: `NGUYEN VAN A`
   - **Ngày phát hành**: `07/15`
   - Bấm **Tiếp tục**.
5. Nhập mã xác thực OTP:
   - **Mã OTP**: `123456`
   - Bấm **Thanh toán**.
6. **Kết quả**: Cổng VNPay điều hướng trở về trang `http://localhost:3000/vnpay-return`, hiển thị mã giao dịch, số tiền và thông báo thanh toán thành công.

---

### 🟡 Phương thức 3: Ví điện tử / Thẻ nội bộ (Mock Payment Gateway)
> **Đặc điểm**: Phục vụ kiểm thử nhanh các trường hợp thành công và thất bại mà không cần Internet.

1. Tại màn hình Checkout, chọn phương thức: **"Ví điện tử (Momo/ZaloPay)"** hoặc **"Thẻ thanh toán (Visa/Mastercard)"**.
2. Bấm **Xác nhận thanh toán**: Popup cổng mô phỏng hiển thị.
3. **Thử nghiệm lỗi (Failure Case)**:
   - Tích chọn switch **"Mô phỏng lỗi thanh toán"** -> Bấm **Xác nhận**.
   - Đơn chuyển sang trạng thái `PAYMENT_FAILED`. Giỏ hàng của khách hàng **được giữ nguyên** để có thể thử lại.
4. **Thử nghiệm thành công (Success Case)**:
   - Tắt switch lỗi -> Bấm **Xác nhận**.
   - Đơn chuyển sang `PAID`, kích hoạt trừ kho, cộng điểm và mở modal chúc mừng.

---

## 7. Thông tin Tài khoản Thử nghiệm (Demo Accounts)

### 7.1. Tài khoản Khách hàng (Customer)
- **Email**: `customer@brewlite.vn`
- **Mật khẩu**: `123456`
*(Hoặc có thể tự bấm Đăng ký tài khoản mới trực tiếp trên giao diện)*

### 7.2. Quản trị viên (Admin - Quản lý Kho & Định mức)
- **Đường dẫn truy cập**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Chức năng**:
  - Xem tổng quan tồn kho, số món cảnh báo sắp hết hàng.
  - Bấm nút **"Nhập kho"** để thêm số lượng nguyên liệu (Sữa tươi, Hạt cà phê, Matcha, v.v.).
  - Bấm nút **"Công thức"** để chỉnh sửa định mức nguyên liệu tiêu hao cho từng món.

### 7.3. Mã Voucher giảm giá có sẵn
- `BREW10`: Giảm **10%** tổng hóa đơn.
- `WELCOME20`: Giảm **20%** tổng hóa đơn.

---

## 8. Chạy Test Suites tự động (Automated Verification)

Dự án sở hữu bộ kiểm thử tự động toàn diện với Vitest cho cả Frontend và Backend gồm **13 test suites (86 test cases)**:

### 8.1. Kiểm thử Backend API (`apps/api`)
```powershell
cd apps/api
npm run test
```
*Kết quả: **47/47 tests passed (100%)** bao gồm:*
- Kiểm thử State Machine (`assertTransition` chặn nhảy cóc trạng thái).
- Kiểm thử Idempotency (`idempotencyKey` không nhân đôi tiền và điểm).
- Kiểm thử Optimistic Locking (chống bán vượt tồn kho khi concurrency cao).
- Kiểm thử CRUD sản phẩm, đơn hàng, nguyên liệu kho và xác thực bcrypt/JWT.

### 8.2. Kiểm thử Frontend Web (`apps/web`)
```powershell
cd apps/web
npm run test
```
*Kết quả: **39/39 tests passed (100%)** bao gồm:*
- Kiểm thử công thức tính giá động theo Size (S/M/L) và Topping.
- Kiểm thử logic giỏ hàng (thêm món, tăng giảm, xóa, lưu LocalStorage).
- Kiểm thử giới hạn tồn kho không cho thêm vượt quá số lượng kho.
- Kiểm thử giao diện ProductModal, CartDrawer và MenuPage (loading/empty/error states).
