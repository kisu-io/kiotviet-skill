'use strict';

/**
 * Webhook handler: LowStock (product.updateQuantity)
 *
 * KiotViet sends product.updateQuantity events when inventory changes.
 * We check if the new quantity is below the shop's lowStockThreshold.
 *
 * Payload shape:
 *   {
 *     Notifications: [{
 *       Action: "product.updateQuantity",
 *       Data: { Id, Code, Name, Inventories: [{ OnHand, BranchId, BranchName }] }
 *     }]
 *   }
 */

const channels = require('../../src/channels');
const { loadShopConfig } = require('../../src/config/loader');

async function handle(shopId, payload) {
  let config;
  try {
    config = loadShopConfig(shopId);
  } catch (e) {
    return { error: `Cannot load config for shop ${shopId}: ${e.message}` };
  }

  const threshold = config.workflows?.lowStockThreshold ?? 10;
  const notifications = payload.Notifications || [];
  const alerts = [];

  for (const notification of notifications) {
    const data = notification.Data || {};
    const inventories = data.Inventories || [];

    for (const inv of inventories) {
      const onHand = inv.OnHand ?? 0;
      if (onHand <= threshold) {
        alerts.push({
          productId: data.Id,
          productCode: data.Code,
          productName: data.Name,
          onHand,
          branchName: inv.BranchName,
          threshold,
        });
      }
    }
  }

  if (alerts.length === 0) {
    return { handled: 0, alerts: [] };
  }

  let message = `⚠️ TỒN KHO THẤP — ${new Date().toLocaleDateString('vi-VN')}\n\n`;
  for (const a of alerts) {
    message +=
      `• ${a.productName} (${a.productCode})\n` +
      `  Còn: ${a.onHand} — Chi nhánh: ${a.branchName || 'N/A'}\n`;
  }

  let channelResult = { skipped: true };
  try {
    channelResult = await channels.send(config, message);
  } catch (e) {
    channelResult = { error: e.message };
  }

  return { handled: alerts.length, alerts, channelResult };
}

module.exports = { handle };
