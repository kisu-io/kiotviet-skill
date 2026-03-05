# Quy trình tự động (Workflows)

## 1. Báo cáo sáng (Daily Briefing)

**File:** `src/workflows/daily-briefing.js`
**Lịch:** Hàng ngày lúc 07:30
**Chạy:** `node src/workflows/daily-briefing.js --shopId=my-shop`

### Nội dung
- Doanh thu và số hoá đơn hôm qua
- So sánh doanh thu với tuần trước (WoW %)
- Danh sách sản phẩm sắp hết hàng

### Ví dụ output
```
☀ BÁO CÁO SÁNG — 05/03/2026

📊 Hôm qua (2026-03-04):
  • Số hóa đơn: 47
  • Doanh thu: 12.500.000 VND

📈 So với tuần trước: ▲ +15.3%
  • Doanh thu tuần: 69.300.000 VND
  • Số đơn tuần: 241

⚠ Sắp hết hàng: 7 sản phẩm dưới 10 đơn vị
  • Giày Nike Air Max: còn 2
  • Áo Polo XL Trắng: còn 3
```

---

## 2. Nhập hàng thông minh (Smart Restock)

**File:** `src/workflows/smart-restock.js`
**Lịch:** Hàng ngày lúc 07:00
**Chạy:** `node src/workflows/smart-restock.js --shopId=my-shop`

### Nội dung
- Phân tích 30 ngày bán hàng → dự báo nhu cầu
- Phân loại: Cấp bách (≤3 ngày), Theo dõi (4-7 ngày)
- Đề xuất số lượng nhập cho mỗi sản phẩm
- Tự động tạo phiếu nhập (PO) nếu bật

### Cấu hình
```json
{
  "workflows": {
    "smartRestock": true,
    "autoCreatePO": false,
    "restockCoverDays": 14
  }
}
```

---

## 3. Nhắc nợ hoá đơn (Invoice Reminder)

**File:** `src/workflows/invoice-reminder.js`
**Lịch:** Hàng ngày lúc 09:00
**Chạy:** `node src/workflows/invoice-reminder.js --shopId=my-shop`

### Nội dung
- Quét hoá đơn chưa thanh toán 90 ngày
- Phân tầng nhắc nợ:
  - 🟢 Nhắc nhẹ: 7-13 ngày quá hạn
  - 🟡 Nhắc mạnh: 14-29 ngày quá hạn
  - 🔴 Cảnh báo: ≥30 ngày quá hạn
- Tổng nợ cần thu

### Cấu hình
```json
{
  "workflows": {
    "invoiceReminder": true,
    "overdueInvoiceDays": 7
  }
}
```

---

## 4. Báo cáo tuần (Weekly Report)

**File:** `src/workflows/weekly-report.js`
**Lịch:** Thứ Hai lúc 09:00
**Chạy:** `node src/workflows/weekly-report.js --shopId=my-shop`

### Nội dung
- Tổng kết doanh thu tuần + so sánh WoW
- Top 5 sản phẩm bán chạy
- Cảnh báo tồn kho thấp
- Phân tích khách hàng RFM (Champions, Trung thành, Có nguy cơ, Đã mất)
- Đề xuất giá: sản phẩm tồn chậm (giảm giá), sản phẩm bán chạy (giữ/tăng giá)
- Gợi ý cải thiện kinh doanh

### Cấu hình
```json
{
  "workflows": {
    "weeklyReport": true,
    "topProductsCount": 5,
    "customerSegments": true,
    "pricingAdvisor": true
  }
}
```
