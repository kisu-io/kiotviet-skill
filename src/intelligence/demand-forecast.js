'use strict';

const { getInvoiceDetails } = require('../api/invoices');
const { getProducts } = require('../api/products');

function _formatVND(n) {
  return n.toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

async function forecastDemand(api, config) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
  const toDate = now.toISOString().split('T')[0];

  const params = { fromPurchaseDate: fromDate, toPurchaseDate: toDate };
  if (config.branchId) params.branchId = config.branchId;

  const [salesResult, productsResult] = await Promise.all([
    getInvoiceDetails(api, params),
    getProducts(api, config.branchId ? { branchId: config.branchId } : {}),
  ]);

  if (salesResult.error) return salesResult;
  if (productsResult.error) return productsResult;

  // Aggregate sales by product
  const salesByProduct = {};
  for (const item of salesResult.data) {
    const id = item.productId;
    if (!salesByProduct[id]) salesByProduct[id] = { qty: 0, revenue: 0 };
    salesByProduct[id].qty += item.quantity || 0;
    salesByProduct[id].revenue += item.subTotal || 0;
  }

  const coverDays = config.workflows?.restockCoverDays || 14;
  const recommendations = [];

  for (const product of productsResult.data) {
    const sales = salesByProduct[product.id];
    if (!sales || sales.qty === 0) continue;

    const avgDailySales = sales.qty / 30;
    const onHand = product.onHand || 0;
    const daysUntilStockout = avgDailySales > 0 ? onHand / avgDailySales : Infinity;
    const suggestedOrderQty = Math.max(0, Math.ceil(avgDailySales * coverDays - onHand));

    let priority;
    if (daysUntilStockout <= 3) priority = 'critical';
    else if (daysUntilStockout <= 7) priority = 'warning';
    else priority = 'ok';

    if (priority === 'ok' && suggestedOrderQty === 0) continue;

    recommendations.push({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      categoryName: product.categoryName,
      onHand,
      avgDailySales: Math.round(avgDailySales * 100) / 100,
      daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
      suggestedOrderQty,
      priority,
      last30DaysRevenue: sales.revenue,
    });
  }

  // Sort: critical first, then warning, then ok
  const priorityOrder = { critical: 0, warning: 1, ok: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.daysUntilStockout - b.daysUntilStockout);

  return {
    period: { from: fromDate, to: toDate },
    coverDays,
    totalProducts: productsResult.data.length,
    recommendations,
    summary: {
      critical: recommendations.filter((r) => r.priority === 'critical').length,
      warning: recommendations.filter((r) => r.priority === 'warning').length,
    },
  };
}

module.exports = { forecastDemand };
