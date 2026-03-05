'use strict';

const { loadShopConfig, parseArgs } = require('../config/loader');
const { createClient } = require('../api/client');
const { getInvoices } = require('../api/invoices');
const { getLowStock } = require('../api/products');
const { getRevenueInsights } = require('../intelligence/revenue-insights');
const channels = require('../channels');

function _formatVND(n) {
  return Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

function _trendArrow(trend) {
  if (trend === 'up') return '▲';
  if (trend === 'down') return '▼';
  return '→';
}

async function runDailyBriefing(shopId) {
  const config = loadShopConfig(shopId);

  if (!config.workflows.dailyBriefing) {
    return { skipped: true, reason: 'dailyBriefing is disabled in config' };
  }

  const api = createClient(config);

  // Yesterday's date range
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const fromDate = yesterday.toISOString().split('T')[0];
  const toDate = fromDate;

  const params = {};
  if (config.branchId) params.branchId = config.branchId;

  const [salesData, lowStockData, insights] = await Promise.all([
    getInvoices(api, { ...params, fromPurchaseDate: fromDate, toPurchaseDate: toDate }),
    getLowStock(api, config.workflows.lowStockThreshold, config.branchId),
    getRevenueInsights(api, config),
  ]);

  // Build Vietnamese morning brief
  const salesCount = salesData.error ? 0 : salesData.total;
  const salesRevenue = salesData.error ? 0 : salesData.data.reduce((s, i) => s + (i.totalPayment || 0), 0);
  const lowStockCount = lowStockData.error ? 0 : lowStockData.total;

  let message = `☀ BÁO CÁO SÁNG — ${new Date().toLocaleDateString('vi-VN')}\n\n`;
  message += `📊 Hôm qua (${fromDate}):\n`;
  message += `  • Số hóa đơn: ${salesCount}\n`;
  message += `  • Doanh thu: ${_formatVND(salesRevenue)}\n\n`;

  if (!insights.error) {
    const wow = insights.weekOverWeek;
    message += `📈 So với tuần trước: ${_trendArrow(wow.trend)} ${wow.revenue.change > 0 ? '+' : ''}${wow.revenue.change}%\n`;
    message += `  • Doanh thu tuần: ${_formatVND(wow.revenue.current)}\n`;
    message += `  • Số đơn tuần: ${wow.invoiceCount.current}\n\n`;
  }

  if (lowStockCount > 0) {
    message += `⚠ Sắp hết hàng: ${lowStockCount} sản phẩm dưới ${config.workflows.lowStockThreshold} đơn vị\n`;
    if (!lowStockData.error) {
      const top5 = lowStockData.data.slice(0, 5);
      for (const p of top5) {
        message += `  • ${p.name}: còn ${p.onHand || 0}\n`;
      }
    }
  } else {
    message += `✅ Tồn kho ổn định\n`;
  }

  // Send to channel
  let channelResult = { skipped: true };
  try {
    channelResult = await channels.send(config, message);
  } catch (e) {
    channelResult = { error: e.message };
  }

  const result = {
    shopId,
    workflow: 'daily-briefing',
    timestamp: new Date().toISOString(),
    data: {
      yesterdaySales: { count: salesCount, revenue: salesRevenue },
      lowStockCount,
      weekOverWeek: insights.error ? null : insights.weekOverWeek,
    },
    message,
    channelResult,
  };

  return result;
}

// CLI entry point
if (require.main === module) {
  const args = parseArgs();
  const shopId = args.shopId || 'example-shop';
  runDailyBriefing(shopId)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}

module.exports = { runDailyBriefing };
