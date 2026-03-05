'use strict';

const { loadShopConfig, parseArgs } = require('../config/loader');
const { createClient } = require('../api/client');
const { getInvoices } = require('../api/invoices');
const { getProducts } = require('../api/products');
const { getRevenueInsights } = require('../intelligence/revenue-insights');
const { getCustomerSegments } = require('../intelligence/customer-segments');
const { getPricingAdvice } = require('../intelligence/pricing-advisor');
const channels = require('../channels');

function _formatVND(n) {
  return Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

function _trendArrow(trend) {
  if (trend === 'up') return '▲';
  if (trend === 'down') return '▼';
  return '→';
}

async function runWeeklyReport(shopId) {
  const config = loadShopConfig(shopId);

  if (!config.workflows.weeklyReport) {
    return { skipped: true, reason: 'weeklyReport is disabled in config' };
  }

  const api = createClient(config);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromDate = sevenDaysAgo.toISOString().split('T')[0];
  const toDate = now.toISOString().split('T')[0];

  const baseParams = {};
  if (config.branchId) baseParams.branchId = config.branchId;

  const [weekInvoices, productsResult, insights, customerData, pricingData] = await Promise.all([
    getInvoices(api, { ...baseParams, fromPurchaseDate: fromDate, toPurchaseDate: toDate }),
    getProducts(api, baseParams),
    getRevenueInsights(api, config),
    config.workflows.customerSegments ? getCustomerSegments(api, config).catch(() => null) : null,
    config.workflows.pricingAdvisor ? getPricingAdvice(api, config).catch(() => null) : null,
  ]);

  // Week summary
  const invoices = weekInvoices.error ? [] : weekInvoices.data;
  const weekRevenue = invoices.reduce((s, i) => s + (i.totalPayment || 0), 0);
  const weekCount = invoices.length;
  const avgOrderValue = weekCount > 0 ? weekRevenue / weekCount : 0;

  // Top sellers from invoice details
  const productSales = {};
  for (const inv of invoices) {
    const details = inv.invoiceDetails || [];
    for (const d of details) {
      const id = d.productId;
      if (!productSales[id]) productSales[id] = { name: d.productName || 'N/A', qty: 0, revenue: 0 };
      productSales[id].qty += d.quantity || 0;
      productSales[id].revenue += d.subTotal || 0;
    }
  }
  const topCount = config.workflows.topProductsCount || 5;
  const topSellers = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topCount);

  // Build Vietnamese executive summary
  let message = `📊 BÁO CÁO TUẦN — ${fromDate} → ${toDate}\n\n`;

  message += `💰 TỔNG KẾT DOANH THU\n`;
  message += `  • Doanh thu tuần: ${_formatVND(weekRevenue)}\n`;
  message += `  • Số hoá đơn: ${weekCount}\n`;
  message += `  • Giá trị TB/đơn: ${_formatVND(avgOrderValue)}\n`;

  if (!insights.error) {
    const wow = insights.weekOverWeek;
    message += `  • So với tuần trước: ${_trendArrow(wow.trend)} ${wow.revenue.change > 0 ? '+' : ''}${wow.revenue.change}%\n`;
    const mom = insights.monthOverMonth;
    message += `  • Xu hướng tháng: ${_trendArrow(mom.trend)} ${mom.revenue.change > 0 ? '+' : ''}${mom.revenue.change}%\n`;
  }
  message += '\n';

  if (topSellers.length > 0) {
    message += `🏆 TOP ${topSellers.length} SẢN PHẨM BÁN CHẠY\n`;
    topSellers.forEach((p, i) => {
      message += `  ${i + 1}. ${p.name} — ${p.qty} SP — ${_formatVND(p.revenue)}\n`;
    });
    message += '\n';
  }

  // Low stock summary
  const products = productsResult.error ? [] : productsResult.data;
  const threshold = config.workflows.lowStockThreshold || 10;
  const lowStock = products.filter((p) => (p.onHand || 0) < threshold);
  if (lowStock.length > 0) {
    message += `⚠ TỒN KHO THẤP: ${lowStock.length} sản phẩm dưới ${threshold} đơn vị\n`;
    for (const p of lowStock.slice(0, 5)) {
      message += `  • ${p.name}: còn ${p.onHand || 0}\n`;
    }
    if (lowStock.length > 5) message += `  ... và ${lowStock.length - 5} sản phẩm khác\n`;
    message += '\n';
  }

  // Customer segments
  if (customerData && !customerData.error && customerData.summary) {
    const cs = customerData.summary;
    message += `👥 KHÁCH HÀNG (RFM 90 ngày)\n`;
    message += `  • Champions: ${cs.champions} | Trung thành: ${cs.loyal}\n`;
    message += `  • Có nguy cơ: ${cs.atRisk} | Đã mất: ${cs.lost}\n`;
    message += `  • Tổng: ${cs.totalCustomers} khách hàng\n\n`;
  }

  // Pricing advisor
  if (pricingData && !pricingData.error) {
    if (pricingData.slowMovers.length > 0) {
      message += `📉 TỒN KHO CHẬM (đề xuất giảm giá): ${pricingData.slowMovers.length} sản phẩm\n`;
      for (const p of pricingData.slowMovers.slice(0, 3)) {
        message += `  • ${p.productName}: -${p.suggestedDiscount}% (${_formatVND(p.suggestedPrice)})\n`;
      }
      message += '\n';
    }
    if (pricingData.fastMovers.length > 0) {
      message += `📈 BÁN CHẠY (giữ/tăng giá): ${pricingData.fastMovers.length} sản phẩm\n`;
      for (const p of pricingData.fastMovers.slice(0, 3)) {
        message += `  • ${p.productName}: ${p.avgDailySales}/ngày, còn ~${p.daysUntilStockout} ngày\n`;
      }
      message += '\n';
    }
  }

  if (!insights.error && insights.recommendations.length > 0) {
    message += `💡 GỢI Ý\n`;
    for (const r of insights.recommendations) {
      message += `  • ${r}\n`;
    }
  }

  // Send to channel
  let channelResult = { skipped: true };
  try {
    channelResult = await channels.send(config, message);
  } catch (e) {
    channelResult = { error: e.message };
  }

  return {
    shopId,
    workflow: 'weekly-report',
    timestamp: new Date().toISOString(),
    data: {
      period: { from: fromDate, to: toDate },
      weekRevenue,
      weekInvoiceCount: weekCount,
      avgOrderValue: Math.round(avgOrderValue),
      topSellers,
      lowStockCount: lowStock.length,
      weekOverWeek: insights.error ? null : insights.weekOverWeek,
    },
    message,
    channelResult,
  };
}

// CLI entry point
if (require.main === module) {
  const args = parseArgs();
  const shopId = args.shopId || 'example-shop';
  runWeeklyReport(shopId)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}

module.exports = { runWeeklyReport };
