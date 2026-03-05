'use strict';

/**
 * Webhook handler: invoice.update
 *
 * Triggered when an invoice status changes in KiotViet.
 * Sends a channel notification when an invoice is cancelled or
 * transitions from pending/processing to completed.
 */

const { loadConfig } = require('../../src/config/loader');
const { route } = require('../../src/channels/index');

// KiotViet invoice status codes
const STATUS_LABELS = {
  1: 'Hoàn thành',
  2: 'Đang xử lý',
  3: 'Huỷ',
  4: 'Nháp',
};

function formatVND(n) {
  return Math.round(n || 0).toLocaleString('vi-VN').replace(/,/g, '.') + ' ₫';
}

async function handle(shopId, payload) {
  const config = loadConfig(shopId);
  const notifications = payload.Notifications || [];

  const updatedInvoices = notifications
    .filter((n) => n.Action === 'invoice.update' && n.Data)
    .map((n) => n.Data);

  if (updatedInvoices.length === 0) {
    return { handled: 0 };
  }

  // Only notify on meaningful status changes: completed or cancelled
  const notable = updatedInvoices.filter((inv) => {
    const status = inv.status || inv.Status;
    return status === 1 || status === 3; // completed or cancelled
  });

  if (notable.length === 0) {
    return { handled: 0, skipped: updatedInvoices.length };
  }

  const lines = notable.slice(0, 5).map((inv) => {
    const code = inv.code || inv.Code || inv.id || '—';
    const customer = inv.customerName || inv.CustomerName || 'Khách lẻ';
    const total = inv.totalPayment || inv.TotalPayment || 0;
    const status = inv.status || inv.Status;
    const statusLabel = STATUS_LABELS[status] || `Trạng thái ${status}`;
    const emoji = status === 1 ? '✅' : '❌';
    return `${emoji} **${code}** — ${customer} — ${formatVND(total)} → ${statusLabel}`;
  });

  if (notable.length > 5) {
    lines.push(`_... và ${notable.length - 5} hoá đơn khác_`);
  }

  const message = [
    `🧾 **Cập nhật hoá đơn** — ${shopId}`,
    ...lines,
  ].join('\n');

  let channelResult = null;
  try {
    channelResult = await route(config, message);
  } catch (e) {
    console.warn(`[invoice-updated] Channel send failed: ${e.message}`);
  }

  return { handled: notable.length, channelResult };
}

module.exports = { handle };
