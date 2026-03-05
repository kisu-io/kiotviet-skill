'use strict';

/**
 * Anomaly Detector
 *
 * Compares the current hour's revenue against the 4-week average for
 * the same hour of the same day-of-week. Flags deviations > 30%.
 *
 * Algorithm:
 *   1. Fetch all invoices for the current hour (today HH:00 — HH:59)
 *   2. Fetch invoices for the same hour in the last 4 weeks (same weekday)
 *   3. Compute average hourly revenue across those 4 reference points
 *   4. Flag if current hour revenue deviates > THRESHOLD (default 30%)
 *
 * Usage:
 *   node src/intelligence/anomaly-detector.js --shopId=example-shop [--threshold=30]
 */

const { getInvoices } = require('../api/invoices');

const DEFAULT_THRESHOLD = 30; // percent

function _dateStr(d) {
  return d.toISOString().split('T')[0];
}

/** Returns invoices whose purchaseDate falls within [startHour, endHour) */
function _filterByHour(invoices, startHour, endHour) {
  return invoices.filter((inv) => {
    const d = new Date(inv.purchaseDate || inv.createdDate);
    return d >= startHour && d < endHour;
  });
}

function _sumRevenue(invoices) {
  return invoices.reduce((s, i) => s + (i.totalPayment || 0), 0);
}

async function detectAnomalies(api, config, options = {}) {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const now = new Date();

  // Current hour window
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);
  const currentHourEnd = new Date(currentHourStart.getTime() + 60 * 60 * 1000);

  const baseParams = {};
  if (config.branchId) baseParams.branchId = config.branchId;

  // Fetch current hour invoices
  const todayResult = await getInvoices(api, {
    ...baseParams,
    fromPurchaseDate: _dateStr(now),
    toPurchaseDate: _dateStr(now),
  });

  if (todayResult.error) return todayResult;

  const currentHourInvoices = _filterByHour(
    todayResult.data,
    currentHourStart,
    currentHourEnd
  );
  const currentRevenue = _sumRevenue(currentHourInvoices);

  // Fetch 4 reference weeks (same weekday, same hour)
  const referenceRevenues = [];
  const fetchPromises = [];

  for (let week = 1; week <= 4; week++) {
    const refDate = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
    const refHourStart = new Date(refDate);
    refHourStart.setHours(currentHourStart.getHours(), 0, 0, 0);
    const refHourEnd = new Date(refHourStart.getTime() + 60 * 60 * 1000);

    fetchPromises.push(
      getInvoices(api, {
        ...baseParams,
        fromPurchaseDate: _dateStr(refDate),
        toPurchaseDate: _dateStr(refDate),
      }).then((result) => ({ week, result, refHourStart, refHourEnd }))
    );
  }

  const fetched = await Promise.all(fetchPromises);

  for (const { week, result, refHourStart, refHourEnd } of fetched) {
    if (result.error) continue; // skip weeks with errors
    const refInvoices = _filterByHour(result.data, refHourStart, refHourEnd);
    referenceRevenues.push(_sumRevenue(refInvoices));
  }

  if (referenceRevenues.length === 0) {
    return {
      anomalyDetected: false,
      reason: 'Not enough historical data (< 1 week)',
      currentHour: currentHourStart.getHours(),
      currentRevenue,
    };
  }

  const avgReference =
    referenceRevenues.reduce((s, r) => s + r, 0) / referenceRevenues.length;

  let deviationPct = 0;
  if (avgReference > 0) {
    deviationPct = Math.round(((currentRevenue - avgReference) / avgReference) * 100);
  } else if (currentRevenue > 0) {
    deviationPct = 100; // went from 0 to something
  }

  const anomalyDetected = Math.abs(deviationPct) > threshold;
  const direction = deviationPct > 0 ? 'spike' : 'drop';

  return {
    anomalyDetected,
    direction: anomalyDetected ? direction : null,
    deviationPct,
    threshold,
    currentHour: currentHourStart.getHours(),
    currentRevenue,
    avgReference: Math.round(avgReference),
    referenceWeeks: referenceRevenues.length,
    currentOrderCount: currentHourInvoices.length,
    message: anomalyDetected
      ? `⚠️ DỊ THƯỜNG: Doanh thu ${currentHourStart.getHours()}:00 ${
          direction === 'spike' ? 'tăng' : 'giảm'
        } ${Math.abs(deviationPct)}% so với 4 tuần trước (TB: ${Math.round(avgReference).toLocaleString('vi-VN')} VND, thực tế: ${currentRevenue.toLocaleString('vi-VN')} VND)`
      : null,
  };
}

module.exports = { detectAnomalies };

// CLI entry point
if (require.main === module) {
  const { loadShopConfig, parseArgs } = require('../config/loader');
  const { createClient } = require('../api/client');
  const args = parseArgs();
  const shopId = args.shopId || 'example-shop';
  const threshold = args.threshold ? parseInt(args.threshold) : DEFAULT_THRESHOLD;

  const config = loadShopConfig(shopId);
  const api = createClient(config);

  detectAnomalies(api, config, { threshold })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}
