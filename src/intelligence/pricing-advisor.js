'use strict';

const { getInvoiceDetails } = require('../api/invoices');
const { getProducts } = require('../api/products');

function _formatVND(n) {
  return Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

async function getPricingAdvice(api, config) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const params = {
    fromPurchaseDate: thirtyDaysAgo.toISOString().split('T')[0],
    toPurchaseDate: now.toISOString().split('T')[0],
  };
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

  const slowMovers = [];
  const fastMovers = [];

  for (const product of productsResult.data) {
    const sales = salesByProduct[product.id];
    const onHand = product.onHand || 0;
    const avgDailySales = sales ? sales.qty / 30 : 0;
    const velocity = avgDailySales;

    // Skip products with no stock
    if (onHand === 0 && !sales) continue;

    const entry = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      categoryName: product.categoryName,
      onHand,
      currentPrice: product.basePrice || 0,
      cost: product.cost || 0,
      avgDailySales: Math.round(velocity * 100) / 100,
      last30DaysQty: sales ? sales.qty : 0,
      last30DaysRevenue: sales ? sales.revenue : 0,
    };

    // Slow movers: low velocity + high stock
    if (velocity < 0.5 && onHand > 20) {
      const daysOfStock = velocity > 0 ? Math.round(onHand / velocity) : Infinity;
      const suggestedDiscount = daysOfStock > 180 ? 30 : daysOfStock > 90 ? 20 : 10;
      const suggestedPrice = Math.round(entry.currentPrice * (1 - suggestedDiscount / 100));
      slowMovers.push({
        ...entry,
        daysOfStock: daysOfStock === Infinity ? 999 : daysOfStock,
        suggestedDiscount,
        suggestedPrice,
        reason: `Tồn kho ${onHand} đơn vị, bán TB ${entry.avgDailySales}/ngày → ~${daysOfStock === Infinity ? '999+' : daysOfStock} ngày tồn`,
      });
    }

    // Fast movers: high velocity + low stock
    if (velocity >= 2 && onHand < velocity * 7) {
      const daysUntilOut = velocity > 0 ? Math.round(onHand / velocity) : 0;
      fastMovers.push({
        ...entry,
        daysUntilStockout: daysUntilOut,
        signal: 'hold_or_increase',
        reason: `Bán chạy ${entry.avgDailySales}/ngày, chỉ còn ~${daysUntilOut} ngày hàng → giữ hoặc tăng giá`,
      });
    }
  }

  // Sort: slow movers by days of stock descending, fast movers by velocity descending
  slowMovers.sort((a, b) => b.daysOfStock - a.daysOfStock);
  fastMovers.sort((a, b) => b.avgDailySales - a.avgDailySales);

  return {
    slowMovers,
    fastMovers,
    summary: {
      totalProducts: productsResult.data.length,
      slowMoverCount: slowMovers.length,
      fastMoverCount: fastMovers.length,
    },
    period: {
      from: thirtyDaysAgo.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    },
  };
}

module.exports = { getPricingAdvice };
