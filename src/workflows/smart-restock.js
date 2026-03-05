'use strict';

const { loadShopConfig, parseArgs } = require('../config/loader');
const { createClient } = require('../api/client');
const { forecastDemand } = require('../intelligence/demand-forecast');
const { getSuppliers } = require('../api/suppliers');
const { createPurchaseOrder } = require('../api/purchase-orders');
const channels = require('../channels');

function _formatVND(n) {
  return Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

async function runSmartRestock(shopId) {
  const config = loadShopConfig(shopId);

  if (!config.workflows.smartRestock) {
    return { skipped: true, reason: 'smartRestock is disabled in config' };
  }

  const api = createClient(config);

  const forecast = await forecastDemand(api, config);
  if (forecast.error) return { error: forecast.error };

  const critical = forecast.recommendations.filter((r) => r.priority === 'critical');
  const warning = forecast.recommendations.filter((r) => r.priority === 'warning');
  const needsRestock = [...critical, ...warning];

  // Build message
  let message = `🔄 BÁO CÁO NHẬP HÀNG THÔNG MINH — ${new Date().toLocaleDateString('vi-VN')}\n\n`;

  if (needsRestock.length === 0) {
    message += `✅ Tồn kho đủ cho ${forecast.coverDays} ngày tới. Không cần nhập thêm.\n`;
  } else {
    message += `⚠ ${critical.length} sản phẩm CẤP BÁCH, ${warning.length} sản phẩm cần theo dõi\n\n`;

    if (critical.length > 0) {
      message += `🔴 CẤP BÁCH (hết hàng trong ≤3 ngày):\n`;
      for (const item of critical) {
        message += `  • ${item.productName}: còn ${item.onHand}, bán TB ${item.avgDailySales}/ngày → hết trong ${item.daysUntilStockout} ngày\n`;
        message += `    Đề xuất nhập: ${item.suggestedOrderQty} đơn vị\n`;
      }
      message += '\n';
    }

    if (warning.length > 0) {
      message += `🟡 THEO DÕI (hết hàng trong 4-7 ngày):\n`;
      for (const item of warning.slice(0, 10)) {
        message += `  • ${item.productName}: còn ${item.onHand}, hết trong ${item.daysUntilStockout} ngày → nhập ${item.suggestedOrderQty}\n`;
      }
      if (warning.length > 10) message += `  ... và ${warning.length - 10} sản phẩm khác\n`;
      message += '\n';
    }
  }

  // Auto-create POs if enabled
  const createdPOs = [];
  if (config.workflows.autoCreatePO && critical.length > 0) {
    // Group critical items — create one PO with all critical items
    const poBody = {
      branchId: config.branchId || 1,
      purchaseOrderDetails: critical.map((item) => ({
        productId: item.productId,
        quantity: item.suggestedOrderQty,
      })),
      description: `[Auto] Smart Restock ${new Date().toISOString().split('T')[0]}`,
    };

    const poResult = await createPurchaseOrder(api, poBody);
    if (!poResult.error) {
      createdPOs.push(poResult);
      message += `📦 Đã tự động tạo phiếu nhập hàng cho ${critical.length} sản phẩm cấp bách\n`;
    } else {
      message += `❌ Lỗi tạo phiếu nhập: ${poResult.error}\n`;
    }
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
    workflow: 'smart-restock',
    timestamp: new Date().toISOString(),
    data: {
      forecastPeriod: forecast.period,
      coverDays: forecast.coverDays,
      critical: critical.length,
      warning: warning.length,
      recommendations: needsRestock,
      createdPOs,
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
  runSmartRestock(shopId)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}

module.exports = { runSmartRestock };
