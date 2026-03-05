---
name: kiotviet
description: >
  Use this skill when the user asks about their KiotViet store data:
  sales, revenue, orders, invoices, inventory, stock levels, low stock alerts,
  customers, top products, or any business report from their POS system.
  Trigger phrases: "doanh thu", "tồn kho", "đơn hàng", "khách hàng",
  "sản phẩm bán chạy", "sales today", "inventory", "stock alert",
  "KiotViet", "cửa hàng".
version: 1.0.0
---

# KiotViet POS Integration Skill (Node.js)

A business intelligence layer on top of KiotViet POS. Query sales, inventory, orders, invoices, and customers directly from the KiotViet API. Built on Node.js standard libraries — no `npm install` required.

## Requirements

Set the following environment variables before running any script:
```bash
export KIOTVIET_CLIENT_ID="your_client_id"
export KIOTVIET_CLIENT_SECRET="your_client_secret"
export KIOTVIET_RETAILER="your_store_name"
```

## Tool Reference

| Script | Function | Command Example |
| :--- | :--- | :--- |
| `get_sales_report.js` | Daily/weekly revenue summary | `node scripts/get_sales_report.js --fromDate=2026-03-01 --toDate=2026-03-05` |
| `get_top_products.js` | Best-selling products | `node scripts/get_top_products.js --fromDate=2026-03-01 --limit=10` |
| `get_inventory.js` | Current stock levels | `node scripts/get_inventory.js --branchId=1` |
| `get_low_stock.js` | Products below threshold | `node scripts/get_low_stock.js --threshold=10` |
| `get_orders.js` | Recent orders by status | `node scripts/get_orders.js --status=Processing --limit=20` |
| `get_invoices.js` | Invoices with overdue detection | `node scripts/get_invoices.js --fromDate=2026-03-01 --status=1` |
| `get_customers.js` | Top customers by spend | `node scripts/get_customers.js --orderBy=totalRevenue --limit=10` |
| `get_customer_summary.js` | Single customer full profile | `node scripts/get_customer_summary.js --id=12345` |

---

## Usage Details

### 1. `get_sales_report.js`
Revenue summary for a date range. Aggregates invoice totals by day.

```bash
node scripts/get_sales_report.js [--fromDate=YYYY-MM-DD] [--toDate=YYYY-MM-DD] [--branchId=ID]
```

---

### 2. `get_top_products.js`
Best-selling products ranked by quantity sold or revenue in a date range.

```bash
node scripts/get_top_products.js [--fromDate=YYYY-MM-DD] [--toDate=YYYY-MM-DD] [--limit=10]
```

---

### 3. `get_inventory.js`
All products with current stock levels. Filter by category or branch.

```bash
node scripts/get_inventory.js [--categoryId=ID] [--branchId=ID] [--pageSize=100]
```

---

### 4. `get_low_stock.js`
Products with stock quantity below a configurable threshold.

```bash
node scripts/get_low_stock.js [--threshold=10] [--branchId=ID]
```

---

### 5. `get_orders.js`
Recent orders with status filtering. Statuses: `Backorder`, `Processing`, `ReadyToDeliver`, `Delivering`, `Completed`, `Cancelled`.

```bash
node scripts/get_orders.js [--status=STATUS] [--fromDate=YYYY-MM-DD] [--limit=20]
```

---

### 6. `get_invoices.js`
Invoices with automatic overdue detection (unpaid past due date).

```bash
node scripts/get_invoices.js [--fromDate=YYYY-MM-DD] [--toDate=YYYY-MM-DD] [--status=1]
```

---

### 7. `get_customers.js`
Customer list ordered by revenue, purchase count, or recent activity.

```bash
node scripts/get_customers.js [--orderBy=totalRevenue] [--limit=10] [--pageSize=20]
```

---

### 8. `get_customer_summary.js`
Full profile for a single customer by ID.

```bash
node scripts/get_customer_summary.js --id=CUSTOMER_ID
```

---

## Agent Guidelines

- Use Vietnamese when the user writes in Vietnamese.
- Format currency as Vietnamese style: `1.000.000 VND` (dots as thousand separators).
- Format dates as `DD/MM/YYYY` in output summaries.
- Always present revenue totals prominently at the top of any report.
- For low stock alerts, suggest reorder quantity = 2× current stock if below threshold.
- Authentication is handled automatically by `api_client.js` — tokens are cached for 24h.
