// Mock data for dashboard — replace with real API calls later

export const revenueByDay = [
  { date: "27/02", revenue: 8200000, orders: 34 },
  { date: "28/02", revenue: 9100000, orders: 41 },
  { date: "01/03", revenue: 7600000, orders: 29 },
  { date: "02/03", revenue: 11400000, orders: 52 },
  { date: "03/03", revenue: 10800000, orders: 47 },
  { date: "04/03", revenue: 12500000, orders: 55 },
  { date: "05/03", revenue: 9700000, orders: 38 },
];

export const kpiCards = {
  todayRevenue: 9700000,
  todayOrders: 38,
  weekRevenue: 69300000,
  weekRevenueChange: 15.3,
  monthRevenue: 285000000,
  monthRevenueChange: -2.1,
  lowStockCount: 7,
};

export const lowStockProducts = [
  { id: 1, code: "SP001", name: "Giày Nike Air Max", category: "Giày", onHand: 2, avgDaily: 1.5, daysLeft: 1.3, priority: "critical" as const },
  { id: 2, code: "SP015", name: "Áo Polo XL Trắng", category: "Áo", onHand: 3, avgDaily: 1.2, daysLeft: 2.5, priority: "critical" as const },
  { id: 3, code: "SP008", name: "Túi xách da nâu", category: "Phụ kiện", onHand: 5, avgDaily: 0.9, daysLeft: 5.6, priority: "warning" as const },
  { id: 4, code: "SP023", name: "Quần jeans slim fit", category: "Quần", onHand: 6, avgDaily: 1.0, daysLeft: 6.0, priority: "warning" as const },
  { id: 5, code: "SP031", name: "Nón lưỡi trai đen", category: "Phụ kiện", onHand: 4, avgDaily: 0.7, daysLeft: 5.7, priority: "warning" as const },
  { id: 6, code: "SP042", name: "Dép Adidas Slides", category: "Giày", onHand: 8, avgDaily: 1.3, daysLeft: 6.2, priority: "warning" as const },
  { id: 7, code: "SP019", name: "Áo khoác gió xanh", category: "Áo", onHand: 9, avgDaily: 1.5, daysLeft: 6.0, priority: "warning" as const },
];

export const recentOrders = [
  { id: "HD-20260305-001", customer: "Nguyễn Văn A", total: 1250000, status: "completed", time: "14:32" },
  { id: "HD-20260305-002", customer: "Trần Thị B", total: 890000, status: "completed", time: "13:15" },
  { id: "HD-20260305-003", customer: "Lê Văn C", total: 2340000, status: "completed", time: "11:48" },
  { id: "HD-20260305-004", customer: "Phạm Thị D", total: 560000, status: "completed", time: "10:22" },
  { id: "HD-20260305-005", customer: "Hoàng Văn E", total: 1780000, status: "pending", time: "09:55" },
];

export const inventoryProducts = [
  { id: 1, code: "SP001", name: "Giày Nike Air Max", category: "Giày", unit: "Đôi", onHand: 2, cost: 1800000, price: 2500000 },
  { id: 2, code: "SP002", name: "Giày Adidas Ultraboost", category: "Giày", unit: "Đôi", onHand: 15, cost: 2200000, price: 3200000 },
  { id: 3, code: "SP003", name: "Giày New Balance 574", category: "Giày", unit: "Đôi", onHand: 22, cost: 1500000, price: 2100000 },
  { id: 4, code: "SP008", name: "Túi xách da nâu", category: "Phụ kiện", unit: "Cái", onHand: 5, cost: 450000, price: 750000 },
  { id: 5, code: "SP015", name: "Áo Polo XL Trắng", category: "Áo", unit: "Cái", onHand: 3, cost: 180000, price: 350000 },
  { id: 6, code: "SP016", name: "Áo Polo XL Đen", category: "Áo", unit: "Cái", onHand: 28, cost: 180000, price: 350000 },
  { id: 7, code: "SP019", name: "Áo khoác gió xanh", category: "Áo", unit: "Cái", onHand: 9, cost: 320000, price: 550000 },
  { id: 8, code: "SP023", name: "Quần jeans slim fit", category: "Quần", unit: "Cái", onHand: 6, cost: 280000, price: 490000 },
  { id: 9, code: "SP031", name: "Nón lưỡi trai đen", category: "Phụ kiện", unit: "Cái", onHand: 4, cost: 85000, price: 150000 },
  { id: 10, code: "SP042", name: "Dép Adidas Slides", category: "Giày", unit: "Đôi", onHand: 8, cost: 350000, price: 600000 },
  { id: 11, code: "SP050", name: "Balo laptop 15 inch", category: "Phụ kiện", unit: "Cái", onHand: 18, cost: 420000, price: 690000 },
  { id: 12, code: "SP055", name: "Ví da nam cao cấp", category: "Phụ kiện", unit: "Cái", onHand: 35, cost: 250000, price: 450000 },
];

export const ordersData = [
  { id: "HD-20260305-001", date: "05/03/2026", customer: "Nguyễn Văn A", items: 3, total: 1250000, status: "completed" },
  { id: "HD-20260305-002", date: "05/03/2026", customer: "Trần Thị B", items: 2, total: 890000, status: "completed" },
  { id: "HD-20260305-003", date: "05/03/2026", customer: "Lê Văn C", items: 5, total: 2340000, status: "completed" },
  { id: "HD-20260305-004", date: "05/03/2026", customer: "Phạm Thị D", items: 1, total: 560000, status: "completed" },
  { id: "HD-20260305-005", date: "05/03/2026", customer: "Hoàng Văn E", items: 4, total: 1780000, status: "pending" },
  { id: "HD-20260304-001", date: "04/03/2026", customer: "Đỗ Thị F", items: 2, total: 950000, status: "completed" },
  { id: "HD-20260304-002", date: "04/03/2026", customer: "Vũ Văn G", items: 6, total: 3200000, status: "completed" },
  { id: "HD-20260304-003", date: "04/03/2026", customer: "Bùi Thị H", items: 1, total: 420000, status: "cancelled" },
  { id: "HD-20260303-001", date: "03/03/2026", customer: "Ngô Văn I", items: 3, total: 1560000, status: "completed" },
  { id: "HD-20260303-002", date: "03/03/2026", customer: "Lý Thị K", items: 2, total: 780000, status: "completed" },
];

export type WorkflowConfig = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  lastRun: string;
  lastStatus: "success" | "error" | "pending";
  schedule: { hour: number; minute: number; days: string[] };
  channel: "discord" | "telegram" | "all";
  settings: Record<string, { label: string; description: string; type: "number" | "toggle"; value: number | boolean }>;
};

export const DAYS_OPTIONS = [
  { value: "mon", label: "T2" },
  { value: "tue", label: "T3" },
  { value: "wed", label: "T4" },
  { value: "thu", label: "T5" },
  { value: "fri", label: "T6" },
  { value: "sat", label: "T7" },
  { value: "sun", label: "CN" },
];

export const workflowsData: WorkflowConfig[] = [
  {
    id: "daily-briefing",
    name: "Báo cáo sáng",
    description: "Tóm tắt doanh thu hôm qua, xu hướng tuần, cảnh báo tồn kho thấp",
    enabled: true,
    lastRun: "05/03/2026 07:30",
    lastStatus: "success",
    schedule: { hour: 7, minute: 30, days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] },
    channel: "discord",
    settings: {
      includeRevenue: { label: "Báo cáo doanh thu", description: "Gồm doanh thu hôm qua & so sánh tuần", type: "toggle", value: true },
      includeLowStock: { label: "Cảnh báo tồn kho", description: "Gồm danh sách sản phẩm sắp hết hàng", type: "toggle", value: true },
      lowStockThreshold: { label: "Ngưỡng tồn kho thấp", description: "Sản phẩm dưới ngưỡng này sẽ được cảnh báo", type: "number", value: 10 },
    },
  },
  {
    id: "smart-restock",
    name: "Nhập hàng thông minh",
    description: "Dự báo nhu cầu 30 ngày, đề xuất nhập hàng cho sản phẩm sắp hết",
    enabled: true,
    lastRun: "05/03/2026 07:00",
    lastStatus: "success",
    schedule: { hour: 7, minute: 0, days: ["mon", "tue", "wed", "thu", "fri"] },
    channel: "discord",
    settings: {
      coverDays: { label: "Số ngày dự trữ", description: "Đề xuất nhập đủ hàng cho N ngày bán", type: "number", value: 14 },
      autoCreatePO: { label: "Tự động tạo phiếu nhập", description: "Tạo PO tự động cho sản phẩm cấp bách (≤3 ngày)", type: "toggle", value: false },
      criticalDays: { label: "Ngưỡng cấp bách (ngày)", description: "Sản phẩm hết hàng trong N ngày = cấp bách", type: "number", value: 3 },
    },
  },
  {
    id: "weekly-report",
    name: "Báo cáo tuần",
    description: "Tổng hợp kinh doanh tuần: doanh thu, top sản phẩm, khách hàng mới",
    enabled: false,
    lastRun: "03/03/2026 09:00",
    lastStatus: "success",
    schedule: { hour: 9, minute: 0, days: ["mon"] },
    channel: "all",
    settings: {
      topProductsCount: { label: "Số top sản phẩm", description: "Hiển thị N sản phẩm bán chạy nhất", type: "number", value: 5 },
      includeCustomers: { label: "Thống kê khách hàng", description: "Gồm thông tin khách hàng mới & quay lại", type: "toggle", value: true },
    },
  },
];

export const channelsData = [
  {
    id: "discord",
    name: "Discord",
    description: "Gửi thông báo qua Discord webhook",
    configured: true,
    enabled: true,
    isPrimary: true,
    lastSent: "05/03/2026 07:30",
    messagesSent: 142,
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Gửi thông báo qua Telegram Bot API",
    configured: true,
    enabled: false,
    isPrimary: false,
    lastSent: "28/02/2026 07:30",
    messagesSent: 87,
  },
];
