'use strict';

const { getInvoices } = require('./invoices');

/**
 * getShopRevenueByHour — aggregates invoice revenue into hourly buckets.
 *
 * @param {object} api — KiotViet API client (from createClient)
 * @param {object} config — shop config (for branchId)
 * @param {string} from — ISO date string (start)
 * @param {string} to — ISO date string (end)
 * @returns {Promise<HourlyRevenuePoint[]>}
 *
 * HourlyRevenuePoint: { hour: "2026-03-05T14:00", revenue: 1500000, orderCount: 5 }
 */
async function getShopRevenueByHour(api, config, from, to) {
  const params = {
    fromPurchaseDate: from,
    toPurchaseDate: to,
  };
  if (config.branchId) params.branchId = config.branchId;

  const result = await getInvoices(api, params);
  if (result.error) return { error: result.error, data: [] };

  // Build hourly buckets
  const buckets = {};
  for (const inv of result.data) {
    if (!inv.purchaseDate) continue;
    const d = new Date(inv.purchaseDate);
    // Key: YYYY-MM-DDTHH:00
    const hourKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00`;
    if (!buckets[hourKey]) {
      buckets[hourKey] = { hour: hourKey, revenue: 0, orderCount: 0 };
    }
    buckets[hourKey].revenue += inv.totalPayment || 0;
    buckets[hourKey].orderCount += 1;
  }

  // Sort chronologically
  const data = Object.values(buckets).sort((a, b) => a.hour.localeCompare(b.hour));
  return { data, total: data.length };
}

module.exports = { getShopRevenueByHour };

// CLI: node src/api/revenue-hourly.js --shopId=example-shop --from=2026-03-04 --to=2026-03-05
if (require.main === module) {
  const { loadShopConfig, parseArgs } = require('../config/loader');
  const { createClient } = require('./client');
  const args = parseArgs();
  const shopId = args.shopId || 'example-shop';
  const config = loadShopConfig(shopId);
  const api = createClient(config);
  const from = args.from || new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const to = args.to || new Date().toISOString().split('T')[0];
  getShopRevenueByHour(api, config, from, to)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(JSON.stringify({ error: e.message })); process.exit(1); });
}
