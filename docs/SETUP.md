# Hướng dẫn cài đặt KiotViet Gateway v2 (Supabase)

## Bước 1: Khởi tạo Cơ Sở Dữ Liệu (Supabase)

1. Tạo dự án mới trên [Supabase](https://supabase.com)
2. Mở SQL Editor trong Supabase Dashboard
3. Copy toàn bộ nội dung file `supabase/migrations/001_initial_schema.sql` và chạy (Run)
4. Vào Project Settings > API, lấy **Project URL** và **anon public key**.

## Bước 2: Thiết lập KiotViet API

1. Đăng nhập KiotViet tại https://kvadmin.kiotviet.vn
2. Vào **Cài đặt > Kết nối API**
3. Tạo ứng dụng mới, lấy **Client ID**, **Client Secret**, và **Retailer name**.

## Bước 3: Cấu hình Môi trường (.env)

Trong thư mục gốc của dự án, tạo file `.env` (hoặc copy từ `.env.example`):

```bash
# ----- KIOTVIET CONFIG -----
KIOTVIET_CLIENT_ID=your-kiotviet-client-id
KIOTVIET_CLIENT_SECRET=your-kiotviet-client-secret
KIOTVIET_RETAILER=ten-cua-hang-tren-kiotviet

# ----- SUPABASE CONFIG -----
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Service role for admin bypassing (backend only)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Môi trường chạy dashboard
NODE_ENV=development
```

## Bước 4: Test kết nối API

Mở Terminal tại thư mục gốc và chạy:
```bash
node src/api/client.js
```
Kết quả báo `{"success": true}` nghĩa là đã kết nối thành công với KiotViet.

## Bước 5: Cấu hình kênh thông báo (Telegram / Discord)

### Telegram
1. Tạo bot qua [@BotFather](https://t.me/botfather)
2. Thêm vào `.env`: `TELEGRAM_BOT_TOKEN=...` và `TELEGRAM_CHAT_ID=...`

### Discord
1. Tạo Webhook trong Discord Server
2. Thêm vào `.env`: `DISCORD_WEBHOOK_URL=...`

## Bước 6: Khởi chạy Dashboard (Next.js)

```bash
cd dashboard
npm install
npm run dev
```

Mở trình duyệt tại http://localhost:3000

1. Bấm **Tạo tài khoản** (Register)
2. Email này sẽ được lưu vào Supabase Auth
3. Sau đó bạn có thể Đăng nhập để xem Dashboard với dữ liệu thực từ KiotViet của bạn.

## Bước 7: Cài đặt Workflows Tự Động (Cron)

Chạy các lệnh script để kích hoạt tự động hoá (hoặc cấu hình cron tab server):

```bash
# 07:00 - Nhập hàng thông minh (Dự báo tồn kho)
node src/workflows/smart-restock.js --shopId=default

# 07:30 - Báo cáo tin vắn buổi sáng (Doanh thu hôm qua)
node src/workflows/daily-briefing.js --shopId=default

# 09:00 - Nhắc nợ hoá đơn (Chưa thanh toán)
node src/workflows/invoice-reminder.js --shopId=default
```

### Xong!
Tất cả đã sẵn sàng.
Cơ sở dữ liệu Supabase sẽ chịu trách nhiệm quản lý user login (Auth), phân quyền (RLS) và lưu cấu hình shop thay thế cho cấu hình file JSON trước đây.
