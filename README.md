# BrewLite – Ứng dụng đặt cà phê không dùng tiền mặt

Bài tập lớn môn Công nghệ Phần mềm (Học kỳ I - Năm học 2026-2027).

## 1. Kiến trúc & Công nghệ
- Frontend: Next.js (App Router, TypeScript, Tailwind CSS) - Cổng 3000
- Backend: NestJS (ESM, TypeScript, Prisma 7) - Cổng 4000
- Database: PostgreSQL 16 (chạy qua Docker Compose) - Cổng 5432

## 2. Hướng dẫn cài đặt cho thành viên trong nhóm (Lần đầu)

### Bước 2.1: Clone dự án và cài đặt thư viện
    git clone https://github.com/Kiyoshiiz178/brewlite.git
    cd brewlite
    cd apps/api && npm install
    cd ../web && npm install
    cd ../..

### Bước 2.2: Tạo file biến môi trường (.env)
1. Tạo file apps/api/.env với nội dung:
    DATABASE_URL=postgresql://brewlite:brewlite@localhost:5432/brewlite
    PORT=4000

2. Tạo file apps/web/.env.local với nội dung:
    NEXT_PUBLIC_API_URL=http://localhost:4000

### Bước 2.3: Khởi chạy Database và đồng bộ Prisma
Đảm bảo đã bật Docker Desktop, đứng tại thư mục gốc brewlite:
    docker compose up -d db
    cd apps/api
    npx prisma migrate dev
    npx prisma generate

## 3. Chạy hệ thống hằng ngày (Mở 3 Terminal)
- Terminal 1 (Tại gốc brewlite): docker compose up -d db
- Terminal 2 (Tại apps/api): npm run start:dev (Kiểm tra: http://localhost:4000/health)
- Terminal 3 (Tại apps/web): npm run dev (Kiểm tra: http://localhost:3000)

Khi kết thúc làm việc: Nhấn Ctrl + C ở Terminal 2, 3 và chạy docker compose stop.
