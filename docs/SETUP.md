# Hướng dẫn cài đặt KiotViet Gateway

## Bước 1: Lấy thông tin xác thực KiotViet API

1. Đăng nhập KiotViet tại https://kvadmin.kiotviet.vn
2. Vào **Cài đặt > Kết nối API**
3. Tạo ứng dụng mới, lấy:
   - **Client ID**
   - **Client Secret**
   - **Retailer name** (tên cửa hàng trên KiotViet)

## Bước 2: Cấu hình cửa hàng

1. Sao chép file cấu hình mẫu:
   ```bash
   cp shops/example-shop.json shops/my-shop.json
   ```

2. Sửa file `shops/my-shop.json`:
   ```json
   {
     "shopId": "my-shop",
     "retailer": "ten-cua-hang",
     "clientId": "your-client-id",
     "clientSecret": "your-client-secret"
   }
   ```

   Hoặc dùng biến môi trường (tạo file `.env`):
   ```
   KIOTVIET_CLIENT_ID=your-client-id
   KIOTVIET_CLIENT_SECRET=your-client-secret
   KIOTVIET_RETAILER=ten-cua-hang
   ```

## Bước 3: Test kết nối

```bash
node src/api/client.js
```

Kết quả thành công:
```json
{ "success": true, "token_preview": "eyJhbGciOiJSUzI1..." }
```

## Bước 4: Cấu hình kênh thông báo

### Discord
1. Tạo webhook trong server Discord: **Server Settings > Integrations > Webhooks > New Webhook**
2. Copy webhook URL
3. Thêm vào `.env`:
   ```
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

### Telegram
1. Tạo bot qua [@BotFather](https://t.me/botfather)
2. Lấy bot token và chat ID
3. Thêm vào `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your-bot-token
   TELEGRAM_CHAT_ID=your-chat-id
   ```

## Bước 5: Chạy báo cáo đầu tiên

```bash
# Báo cáo sáng
node src/workflows/daily-briefing.js --shopId=my-shop

# Nhập hàng thông minh
node src/workflows/smart-restock.js --shopId=my-shop

# Nhắc nợ hoá đơn
node src/workflows/invoice-reminder.js --shopId=my-shop

# Báo cáo tuần
node src/workflows/weekly-report.js --shopId=my-shop
```

## Bước 6: Mở Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Mở trình duyệt tại http://localhost:3000

### Bảo mật dashboard

Đặt mật khẩu trong `.env`:
```
DASHBOARD_PASSWORD=your-secure-password
```

## Bước 7: Cấu hình cron (tự động)

Sửa `cron/jobs.json` để bật/tắt các workflow tự động. Cài cron job:

```bash
# Chạy mỗi ngày lúc 7:00
0 7 * * * cd /path/to/project && node src/workflows/smart-restock.js --shopId=my-shop
30 7 * * * cd /path/to/project && node src/workflows/daily-briefing.js --shopId=my-shop
0 9 * * * cd /path/to/project && node src/workflows/invoice-reminder.js --shopId=my-shop
0 9 * * 1 cd /path/to/project && node src/workflows/weekly-report.js --shopId=my-shop
```

## Xong!

Từ bây giờ, mỗi sáng bạn sẽ nhận được:
- 07:00 — Đề xuất nhập hàng thông minh
- 07:30 — Báo cáo doanh thu hôm qua
- 09:00 — Nhắc nợ hoá đơn quá hạn
- Thứ Hai 09:00 — Báo cáo tổng hợp tuần
