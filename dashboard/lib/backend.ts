// Server-side bridge to Node.js backend modules
// This file should only be imported in API route handlers (server-side)

import path from "path";

const ROOT = path.resolve(process.cwd(), "..");
const SRC = path.join(ROOT, "src");

// Use eval to prevent bundler from trying to resolve these at build time
const _require = eval("require") as NodeRequire;

export function getBackend() {
  const { loadShopConfig } = _require(path.join(SRC, "config/loader"));
  const { createClient } = _require(path.join(SRC, "api/client"));
  const { getInvoices, getInvoiceDetails } = _require(path.join(SRC, "api/invoices"));
  const { getProducts, getLowStock } = _require(path.join(SRC, "api/products"));
  const { getOrders } = _require(path.join(SRC, "api/orders"));
  const { getCustomers } = _require(path.join(SRC, "api/customers"));
  const { getRevenueInsights } = _require(path.join(SRC, "intelligence/revenue-insights"));
  const { getCustomerSegments } = _require(path.join(SRC, "intelligence/customer-segments"));
  const { getPricingAdvice } = _require(path.join(SRC, "intelligence/pricing-advisor"));
  const { detectRevenueAnomalies } = _require(path.join(SRC, "intelligence/anomaly-detector"));
  const { formatRevenueAnomalyAlert } = _require(path.join(SRC, "intelligence/formatters/revenue-anomaly"));
  const { getShopRevenueByHour } = _require(path.join(SRC, "api/revenue-hourly"));
  const { runRevenueAnomalyCheck } = _require(path.join(SRC, "workflows/revenue-anomaly-hourly"));
  const { forecastDemand } = _require(path.join(SRC, "intelligence/demand-forecast"));
  const { runCustomerWinback } = _require(path.join(SRC, "workflows/customer-winback"));

  return {
    loadShopConfig,
    createClient,
    getInvoices,
    getInvoiceDetails,
    getProducts,
    getLowStock,
    getOrders,
    getCustomers,
    getRevenueInsights,
    getCustomerSegments,
    getPricingAdvice,
    detectRevenueAnomalies,
    formatRevenueAnomalyAlert,
    getShopRevenueByHour,
    runRevenueAnomalyCheck,
    forecastDemand,
    runCustomerWinback,
  };
}

export function loadConfig(shopId = "example-shop") {
  const backend = getBackend();
  try {
    return backend.loadShopConfig(shopId);
  } catch (e) {
    // If validation fails (e.g. missing clientId), return a safe fallback for UI testing
    return {
      shopId,
      clientId: "",
      clientSecret: "",
      workflows: {
        lowStockThreshold: 10,
        customerWinback: true,
        dailyBriefing: true,
        smartRestock: true,
        invoiceReminder: true,
        weeklyReport: true,
        customerSegments: true,
        pricingAdvisor: true
      },
      channels: {}
    };
  }
}

function createMockApi() {
  return {
    get: async (endpoint: string, params: any) => {
      console.log(`[MOCK API] Fetching ${endpoint}`, params);
      const now = new Date();

      if (endpoint === '/invoices') {
        const invoices = [];
        for (let i = 0; i < 50; i++) {
          const daysAgo = Math.floor(Math.random() * 30);
          const d = new Date(now.getTime() - daysAgo * 86400000);
          d.setHours(Math.floor(Math.random() * 14) + 8);
          invoices.push({
            id: 1000 + i,
            code: `HD00${i + 1}`,
            purchaseDate: d.toISOString(),
            totalPayment: Math.floor(Math.random() * 5000000) + 150000,
            customerName: Math.random() > 0.3 ? `Khách Hàng ${i}` : "Khách lẻ",
            status: Math.random() > 0.1 ? 1 : 2,
            branchName: "Chi nhánh Trung Tâm"
          });
        }
        // Force at least a few for today/this week for KPI cards
        invoices[0].purchaseDate = now.toISOString();
        invoices[1].purchaseDate = now.toISOString();
        invoices[2].purchaseDate = new Date(now.getTime() - 2 * 86400000).toISOString();

        invoices.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        return { data: invoices, total: invoices.length };
      }

      if (endpoint === '/products') {
        const categories = ["Áo thun", "Quần Jean", "Phụ kiện", "Giày dép"];
        const products = [];
        for (let i = 0; i < 20; i++) {
          products.push({
            id: 2000 + i,
            code: `SP00${i + 1}`,
            name: `Sản phẩm Thời Trang Mẫu ${i + 1}`,
            categoryName: categories[i % categories.length],
            basePrice: Math.floor(Math.random() * 500000) + 50000,
            onHand: Math.floor(Math.random() * 50) + 5
          });
        }
        // Force a few low stock items for warnings
        products[0].onHand = 2;
        products[1].onHand = 0;
        products[2].onHand = 5;
        return { data: products, total: products.length };
      }

      if (endpoint === '/invoicedetails/sale') {
        return {
          data: [
            { productId: 2000, quantity: 5, invoice: { purchaseDate: now.toISOString() } },
            { productId: 2001, quantity: 2, invoice: { purchaseDate: now.toISOString() } }
          ],
          total: 2
        };
      }

      if (endpoint === '/customers') {
        const customers = [];
        for (let i = 0; i < 30; i++) {
          const modifiedDaysAgo = Math.floor(Math.random() * 120);
          const d = new Date(now.getTime() - modifiedDaysAgo * 86400000);
          customers.push({
            id: 3000 + i,
            code: `KH00${i + 1}`,
            name: `Khách Hàng VIP ${i + 1}`,
            contactNumber: `090${Math.floor(Math.random() * 10000000)}`,
            totalInvoiced: Math.floor(Math.random() * 50000000),
            latestModifiedDate: d.toISOString()
          });
        }
        return { data: customers, total: customers.length };
      }

      return { data: [], total: 0 };
    },
    post: async () => ({ success: true }),
    getToken: async () => "mock-token",
    // Mock for revenue-hourly aggregation (used directly by dashboard)
    getShopRevenueByHour: async () => {
      const now = new Date();
      const data = [];
      for (let h = 8; h <= now.getHours(); h++) {
        const hourStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(h).padStart(2, '0')}:00`;
        data.push({
          hour: hourStr,
          revenue: Math.floor(Math.random() * 3000000) + 200000,
          orderCount: Math.floor(Math.random() * 15) + 1,
        });
      }
      return { data, total: data.length };
    }
  };
}

export function createApiClient(shopId = "example-shop") {
  const backend = getBackend();
  const config = loadConfig(shopId);

  // MOCK MODE: If no clientId is present, spawn the mock API so UI testing works flawlessly
  if (!config.clientId) {
    console.log("⚠️ No KiotViet API credentials found. Using Mock Data Mode for UI.");
    return { api: createMockApi(), config, backend };
  }

  return { api: backend.createClient(config), config, backend };
}
