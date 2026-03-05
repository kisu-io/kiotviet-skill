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
  };
}

export function loadConfig(shopId = "example-shop") {
  const { loadShopConfig } = getBackend();
  return loadShopConfig(shopId);
}

export function createApiClient(shopId = "example-shop") {
  const backend = getBackend();
  const config = backend.loadShopConfig(shopId);
  return { api: backend.createClient(config), config, backend };
}
