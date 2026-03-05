'use strict';

/**
 * Customer Win-Back Workflow
 *
 * Fetches RFM at-risk and lost customer segments, then sends
 * personalized win-back messages via Zalo OA (or configured channel).
 *
 * Config:
 *   workflows.customerWinback  — must be true to enable
 *   channels.zalo.*            — Zalo OA credentials + ownerUserId for owner summary
 *
 * Usage:
 *   node src/workflows/customer-winback.js --shopId=example-shop [--dryRun]
 */

const { loadShopConfig, parseArgs } = require('../config/loader');
const { createClient } = require('../api/client');
const { getCustomerSegments } = require('../intelligence/customer-segments');
const { sendToUser } = require('../channels/zalo');
const channels = require('../channels');

function _formatVND(n) {
  return Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

function _buildAtRiskMessage(customer) {
  return (
    `Xin chào ${customer.customerName}! 👋\n\n` +
    `Chúng tôi nhận thấy bạn chưa ghé thăm cửa hàng trong ${customer.recency} ngày. ` +
    `Chúng tôi rất nhớ bạn! 🛍️\n\n` +
    `Hãy ghé lại để khám phá các sản phẩm mới và ưu đãi hấp dẫn nhé. ` +
    `Cảm ơn bạn đã tin tưởng và ủng hộ chúng tôi!`
  );
}

function _buildLostMessage(customer) {
  return (
    `Xin chào ${customer.customerName}! 😊\n\n` +
    `Chúng tôi rất vui khi được phục vụ bạn trước đây. ` +
    `Bạn đã không ghé thăm trong ${customer.recency} ngày — ` +
    `chúng tôi muốn mời bạn quay lại với ưu đãi đặc biệt! 🎁\n\n` +
    `Hãy liên hệ với chúng tôi để nhận ưu đãi dành riêng cho bạn.`
  );
}

async function runCustomerWinback(shopId, options = {}) {
  const config = loadShopConfig(shopId);

  if (!config.workflows.customerWinback && !options.force) {
    return { skipped: true, reason: 'customerWinback is disabled in config' };
  }

  const api = createClient(config);

  // Get RFM segments
  const segmentsResult = await getCustomerSegments(api, config);
  if (segmentsResult.error) {
    return { error: segmentsResult.error };
  }

  const { segments, summary } = segmentsResult;
  const atRiskCustomers = segments.atRisk || [];
  const lostCustomers = segments.lost || [];

  const results = {
    shopId,
    workflow: 'customer-winback',
    timestamp: new Date().toISOString(),
    dryRun: !!options.dryRun,
    summary: {
      atRisk: atRiskCustomers.length,
      lost: lostCustomers.length,
      totalContacted: 0,
    },
    contacted: [],
    errors: [],
  };

  const accessToken =
    config.channels?.zalo?.oaAccessToken || process.env.ZALO_OA_ACCESS_TOKEN;

  // Process at-risk customers
  for (const customer of atRiskCustomers) {
    const userId = customer.zaloUserId || customer.phone; // need Zalo user ID mapping
    if (!userId) {
      // Skip customers without Zalo user ID — log for owner awareness
      results.contacted.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        segment: 'atRisk',
        status: 'skipped',
        reason: 'No Zalo user ID',
      });
      continue;
    }

    const message = _buildAtRiskMessage(customer);

    if (options.dryRun) {
      results.contacted.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        segment: 'atRisk',
        status: 'dryRun',
        message,
      });
    } else if (accessToken) {
      try {
        const sendResult = await sendToUser(accessToken, userId, message);
        results.contacted.push({
          customerId: customer.customerId,
          customerName: customer.customerName,
          segment: 'atRisk',
          status: sendResult.error ? 'error' : 'sent',
          error: sendResult.error,
        });
        if (!sendResult.error) results.summary.totalContacted++;
      } catch (e) {
        results.errors.push({ customerId: customer.customerId, error: e.message });
      }
    }
  }

  // Process lost customers
  for (const customer of lostCustomers) {
    const userId = customer.zaloUserId || customer.phone;
    if (!userId) {
      results.contacted.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        segment: 'lost',
        status: 'skipped',
        reason: 'No Zalo user ID',
      });
      continue;
    }

    const message = _buildLostMessage(customer);

    if (options.dryRun) {
      results.contacted.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        segment: 'lost',
        status: 'dryRun',
        message,
      });
    } else if (accessToken) {
      try {
        const sendResult = await sendToUser(accessToken, userId, message);
        results.contacted.push({
          customerId: customer.customerId,
          customerName: customer.customerName,
          segment: 'lost',
          status: sendResult.error ? 'error' : 'sent',
          error: sendResult.error,
        });
        if (!sendResult.error) results.summary.totalContacted++;
      } catch (e) {
        results.errors.push({ customerId: customer.customerId, error: e.message });
      }
    }
  }

  // Send owner summary via primary channel
  const ownerSummary =
    `🔄 WIN-BACK CAMPAIGN — ${new Date().toLocaleDateString('vi-VN')}\n\n` +
    `📊 Phân tích RFM 90 ngày:\n` +
    `  • Có nguy cơ mất: ${atRiskCustomers.length} khách\n` +
    `  • Đã mất: ${lostCustomers.length} khách\n` +
    `  • Đã liên hệ: ${results.summary.totalContacted} khách\n` +
    (options.dryRun ? '\n⚠️ Chế độ thử — không gửi tin thật.' : '');

  try {
    const channelResult = await channels.send(config, ownerSummary);
    results.channelResult = channelResult;
  } catch (e) {
    results.channelResult = { error: e.message };
  }

  return results;
}

// CLI entry point
if (require.main === module) {
  const args = parseArgs();
  const shopId = args.shopId || 'example-shop';
  const options = {
    dryRun: args.dryRun === 'true' || args.dryRun === '' || !!args['dry-run'],
    force: !!args.force,
  };
  runCustomerWinback(shopId, options)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}

module.exports = { runCustomerWinback };
