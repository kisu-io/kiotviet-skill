'use strict';

/**
 * Webhook handler: OrderCreated
 *
 * KiotViet sends this event when a new invoice/order is created.
 * Payload shape (KiotViet webhook v2):
 *   {
 *     Notifications: [{
 *       Action: "order.create",
 *       Data: { Id, Code, CustomerName, Total, BranchName, SaleChannelName, ... }
 *     }]
 *   }
 */

const channels = require('../../src/channels');
const { loadShopConfig } = require('../../src/config/loader');

function _formatVND(n) {
  return Math.round(n || 0).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

async function handle(shopId, payload) {
  const notifications = payload.Notifications || [];
  const results = [];

  for (const notification of notifications) {
    const data = notification.Data || {};

    const message =
      `🛒 ĐƠN HÀNG MỚI\n` +
      `  Mã: ${data.Code || data.Id || 'N/A'}\n` +
      `  Khách: ${data.CustomerName || 'Khách lẻ'}\n` +
      `  Tổng: ${_formatVND(data.Total)}\n` +
      `  Chi nhánh: ${data.BranchName || 'N/A'}\n` +
      `  Kênh: ${data.SaleChannelName || 'POS'}`;

    let channelResult = { skipped: true };
    try {
      const config = loadShopConfig(shopId);
      channelResult = await channels.send(config, message);
    } catch (e) {
      channelResult = { error: e.message };
    }

    results.push({
      action: notification.Action,
      orderId: data.Id,
      orderCode: data.Code,
      channelResult,
    });
  }

  return { handled: results.length, results };
}

module.exports = { handle };
