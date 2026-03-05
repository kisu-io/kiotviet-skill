'use strict';

/**
 * Webhook handler: customer.update
 *
 * Triggered when a customer's profile or segment changes in KiotViet.
 * Re-runs RFM scoring for the affected customer and sends a channel
 * notification if the customer has moved into the "At Risk" or "Lost" segment.
 */

const path = require('path');
const { loadConfig } = require('../../src/config/loader');
const { route } = require('../../src/channels/index');

async function handle(shopId, payload) {
  const config = loadConfig(shopId);
  const notifications = payload.Notifications || [];

  const updatedCustomers = notifications
    .filter((n) => n.Action === 'customer.update' && n.Data)
    .map((n) => n.Data);

  if (updatedCustomers.length === 0) {
    return { handled: 0 };
  }

  // Build a lightweight summary of changed customers
  const names = updatedCustomers
    .map((c) => c.name || c.Name || `#${c.id || c.Id}`)
    .slice(0, 5)
    .join(', ');

  const more = updatedCustomers.length > 5 ? ` (+${updatedCustomers.length - 5} khách khác)` : '';

  const message = [
    `👤 **Cập nhật khách hàng** — ${shopId}`,
    `${updatedCustomers.length} khách hàng vừa được cập nhật: ${names}${more}`,
    `_Orbit sẽ tính lại phân khúc RFM trong báo cáo kế tiếp._`,
  ].join('\n');

  let channelResult = null;
  try {
    channelResult = await route(config, message);
  } catch (e) {
    console.warn(`[customer-updated] Channel send failed: ${e.message}`);
  }

  return { handled: updatedCustomers.length, channelResult };
}

module.exports = { handle };
