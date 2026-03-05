'use strict';

const { loadShopConfig, parseArgs } = require('../config/loader');
const { createClient } = require('../api/client');
const { getInvoices } = require('../api/invoices');
const channels = require('../channels');

function _formatVND(n) {
  return Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

function _daysBetween(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function runInvoiceReminder(shopId) {
  const config = loadShopConfig(shopId);

  if (!config.workflows.invoiceReminder) {
    return { skipped: true, reason: 'invoiceReminder is disabled in config' };
  }

  const api = createClient(config);
  const overdueThreshold = config.workflows.overdueInvoiceDays || 7;

  // Fetch invoices from last 90 days to find unpaid ones
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const params = {
    fromPurchaseDate: ninetyDaysAgo.toISOString().split('T')[0],
    toPurchaseDate: now.toISOString().split('T')[0],
    status: 2, // Unpaid/pending
  };
  if (config.branchId) params.branchId = config.branchId;

  const result = await getInvoices(api, params);
  if (result.error) return { error: result.error };

  // Filter and tier by days overdue
  const unpaid = result.data.filter((i) => {
    const remaining = (i.totalPayment || 0) - (i.paidAmount || 0);
    return remaining > 0;
  });

  const polite = []; // 7-13 days
  const firm = [];   // 14-29 days
  const flagged = []; // 30+ days

  for (const inv of unpaid) {
    const days = _daysBetween(inv.purchaseDate || inv.createdDate);
    const remaining = (inv.totalPayment || 0) - (inv.paidAmount || 0);
    const entry = {
      code: inv.code || inv.id,
      customer: inv.customerName || 'Khách lẻ',
      total: inv.totalPayment || 0,
      paid: inv.paidAmount || 0,
      remaining,
      daysOverdue: days,
    };

    if (days >= 30) flagged.push(entry);
    else if (days >= 14) firm.push(entry);
    else if (days >= overdueThreshold) polite.push(entry);
  }

  const totalOverdue = polite.length + firm.length + flagged.length;

  // Build Vietnamese message
  let message = `📋 NHẮC NỢ HOÁ ĐƠN — ${new Date().toLocaleDateString('vi-VN')}\n\n`;

  if (totalOverdue === 0) {
    message += `✅ Không có hoá đơn quá hạn. Tất cả đã thanh toán đầy đủ!\n`;
  } else {
    message += `⚠ Tổng cộng ${totalOverdue} hoá đơn chưa thanh toán\n\n`;

    if (flagged.length > 0) {
      const total = flagged.reduce((s, i) => s + i.remaining, 0);
      message += `🔴 QUÁ HẠN NGHIÊM TRỌNG (≥30 ngày): ${flagged.length} đơn — ${_formatVND(total)}\n`;
      for (const i of flagged.slice(0, 5)) {
        message += `  • ${i.code} — ${i.customer}: còn nợ ${_formatVND(i.remaining)} (${i.daysOverdue} ngày)\n`;
      }
      if (flagged.length > 5) message += `  ... và ${flagged.length - 5} đơn khác\n`;
      message += '\n';
    }

    if (firm.length > 0) {
      const total = firm.reduce((s, i) => s + i.remaining, 0);
      message += `🟡 CẦN NHẮC NHỞ (14-29 ngày): ${firm.length} đơn — ${_formatVND(total)}\n`;
      for (const i of firm.slice(0, 5)) {
        message += `  • ${i.code} — ${i.customer}: còn nợ ${_formatVND(i.remaining)} (${i.daysOverdue} ngày)\n`;
      }
      if (firm.length > 5) message += `  ... và ${firm.length - 5} đơn khác\n`;
      message += '\n';
    }

    if (polite.length > 0) {
      const total = polite.reduce((s, i) => s + i.remaining, 0);
      message += `🟢 NHẮC NHẸ (${overdueThreshold}-13 ngày): ${polite.length} đơn — ${_formatVND(total)}\n`;
      for (const i of polite.slice(0, 5)) {
        message += `  • ${i.code} — ${i.customer}: còn nợ ${_formatVND(i.remaining)} (${i.daysOverdue} ngày)\n`;
      }
      if (polite.length > 5) message += `  ... và ${polite.length - 5} đơn khác\n`;
      message += '\n';
    }

    const totalDebt = [...polite, ...firm, ...flagged].reduce((s, i) => s + i.remaining, 0);
    message += `💰 Tổng nợ cần thu: ${_formatVND(totalDebt)}\n`;
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
    workflow: 'invoice-reminder',
    timestamp: new Date().toISOString(),
    data: {
      polite: polite.length,
      firm: firm.length,
      flagged: flagged.length,
      totalOverdue,
      overdueInvoices: [...flagged, ...firm, ...polite],
    },
    message,
    channelResult,
  };
}

// CLI entry point
if (require.main === module) {
  const args = parseArgs();
  const shopId = args.shopId || 'example-shop';
  runInvoiceReminder(shopId)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}

module.exports = { runInvoiceReminder };
