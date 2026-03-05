# Kênh gửi tin (Channels)

## Discord

### Cách tạo Webhook

1. Mở Discord, vào server bạn muốn nhận thông báo
2. Click chuột phải vào channel → **Edit Channel**
3. Chọn tab **Integrations** → **Webhooks** → **New Webhook**
4. Đặt tên webhook (vd: "KiotViet Gateway")
5. Click **Copy Webhook URL**

### Cấu hình

Thêm webhook URL vào file `.env`:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1234567890/abcdefg...
```

Hoặc vào `shops/my-shop.json`:
```json
{
  "channels": {
    "primary": "discord",
    "discord": {
      "webhookUrl": "https://discord.com/api/webhooks/1234567890/abcdefg..."
    }
  }
}
```

### Giới hạn
- Tin nhắn tối đa 2000 ký tự (tự động chia nhỏ)
- Rate limit: 30 tin/phút

---

## Telegram

### Cách tạo Bot

1. Mở Telegram, tìm [@BotFather](https://t.me/botfather)
2. Gửi `/newbot` và làm theo hướng dẫn
3. Lưu lại **Bot Token** (dạng `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### Lấy Chat ID

1. Thêm bot vào group hoặc gửi tin nhắn cho bot
2. Mở trình duyệt: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
3. Tìm `"chat": {"id": 123456789}` — đó là Chat ID

### Cấu hình

Thêm vào `.env`:
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=123456789
```

Hoặc vào `shops/my-shop.json`:
```json
{
  "channels": {
    "primary": "telegram",
    "telegram": {
      "botToken": "123456:ABC-DEF...",
      "chatId": "123456789"
    }
  }
}
```

### Giới hạn
- Tin nhắn tối đa 4096 ký tự (tự động chia nhỏ)
- Hỗ trợ HTML formatting
- Rate limit: 30 tin/giây

---

## Đặt kênh chính

Kênh chính (`primary`) là kênh mặc định nhận tất cả thông báo:

```json
{
  "channels": {
    "primary": "discord"
  }
}
```

Có thể chọn `"discord"` hoặc `"telegram"`.

## Test kênh

Từ Dashboard: vào **Cài đặt** → click **Test Discord** hoặc **Test Telegram**

Từ CLI:
```bash
node scripts/send_channel_message.js --shopId=my-shop --message="Test tin nhắn"
```
