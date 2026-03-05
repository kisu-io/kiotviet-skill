'use strict';

/**
 * Anomaly Detector
 *
 * Compares the current hour's revenue against a 4-week same-weekday/same-hour
 * baseline using z-score. Flags deviations at configurable warning/critical levels.
 *
 * Usage:
 *   node src/intelligence/anomaly-detector.js --shopId=example-shop [--threshold=30]
 */

const { getInvoices } = require('../api/invoices');

const DEFAULT_THRESHOLD = 30; // percent

function _dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _filterByHour(invoices, startHour, endHour) {
  return invoices.filter((inv) => {
    const d = new Date(inv.purchaseDate || inv.createdDate);
    return d >= startHour && d < endHour;
  });
}

function _sumRevenue(invoices) {
  return invoices.reduce((s, i) => s + (i.totalPayment || 0), 0);
}

/**
 * detectRevenueAnomalies — new enhanced interface with z-score and severity.
 *
 * @param {object} opts
 * @param {object} opts.api — KiotViet API client
 * @param {object} opts.shopConfig — full shop config
 * @param {Date}   [opts.now] — override current time (for testing)
 * @returns {Promise<AnomalyResult>}
 */
async function detectRevenueAnomalies({ api, shopConfig, now }) {
  const alertConfig = shopConfig.alerts?.revenueAnomaly || {};
  const warningThreshold = alertConfig.warningDeviationPct || 30;
  const criticalThreshold = alertConfig.criticalDeviationPct || 50;
  const baselineWeeks = alertConfig.baselineWeeks || 4;

  now = now || new Date();
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);
  const currentHourEnd = new Date(currentHourStart.getTime() + 60 * 60 * 1000);
  const currentHourNum = currentHourStart.getHours();
  const currentHourKey = `${_dateStr(now)}T${String(currentHourNum).padStart(2, '0')}:00`;

  const baseParams = {};
  if (shopConfig.branchId) baseParams.branchId = shopConfig.branchId;

  // Fetch current hour invoices
  const todayResult = await getInvoices(api, {
    ...baseParams,
    fromPurchaseDate: _dateStr(now),
    toPurchaseDate: _dateStr(now),
  });

  if (todayResult.error) {
    return {
      anomaly: false, severity: 'none', currentHour: currentHourKey,
      currentRevenue: 0, baselineMean: 0, baselineStdDev: 0,
      deviationPct: 0, zScore: 0, baselinePoints: [],
      message: `API error: ${todayResult.error}`,
    };
  }

  const currentHourInvoices = _filterByHour(todayResult.data, currentHourStart, currentHourEnd);
  const currentRevenue = _sumRevenue(currentHourInvoices);

  // Fetch baseline: same weekday, same hour, for past N weeks
  const baselinePoints = [];
  const fetchPromises = [];

  for (let week = 1; week <= baselineWeeks; week++) {
    const refDate = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
    const refHourStart = new Date(refDate);
    refHourStart.setHours(currentHourNum, 0, 0, 0);
    const refHourEnd = new Date(refHourStart.getTime() + 60 * 60 * 1000);

    fetchPromises.push(
      getInvoices(api, {
        ...baseParams,
        fromPurchaseDate: _dateStr(refDate),
        toPurchaseDate: _dateStr(refDate),
      }).then((result) => ({ result, refHourStart, refHourEnd }))
    );
  }

  const fetched = await Promise.all(fetchPromises);
  for (const { result, refHourStart, refHourEnd } of fetched) {
    if (result.error) continue;
    const refInvoices = _filterByHour(result.data, refHourStart, refHourEnd);
    baselinePoints.push(_sumRevenue(refInvoices));
  }

  if (baselinePoints.length === 0) {
    return {
      anomaly: false, severity: 'none', currentHour: currentHourKey,
      currentRevenue, baselineMean: 0, baselineStdDev: 0,
      deviationPct: 0, zScore: 0, baselinePoints,
      message: 'Chua du du lieu baseline (can it nhat 1 tuan truoc)',
    };
  }

  // Statistics
  const n = baselinePoints.length;
  const mean = baselinePoints.reduce((a, b) => a + b, 0) / n;
  const variance = baselinePoints.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const deviationPct = mean > 0 ? Math.round(((currentRevenue - mean) / mean) * 100) : (currentRevenue > 0 ? 100 : 0);
  const absDeviation = Math.abs(deviationPct);
  const zScore = stdDev > 0 ? Math.round(((currentRevenue - mean) / stdDev) * 100) / 100 : 0;

  let severity = 'none';
  let anomaly = false;
  if (absDeviation >= criticalThreshold) {
    severity = 'critical';
    anomaly = true;
  } else if (absDeviation >= warningThreshold) {
    severity = 'warning';
    anomaly = true;
  }

  return {
    anomaly,
    severity,
    currentHour: currentHourKey,
    currentRevenue,
    currentOrderCount: currentHourInvoices.length,
    baselineMean: Math.round(mean),
    baselineStdDev: Math.round(stdDev),
    deviationPct,
    zScore,
    baselinePoints,
    message: anomaly
      ? `Doanh thu bat thuong: ${deviationPct > 0 ? '+' : ''}${deviationPct}% so voi trung binh`
      : 'Doanh thu binh thuong',
  };
}

/**
 * Legacy interface — kept for backward compatibility.
 */
async function detectAnomalies(api, config, options = {}) {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const result = await detectRevenueAnomalies({
    api,
    shopConfig: {
      ...config,
      alerts: { revenueAnomaly: { warningDeviationPct: threshold, criticalDeviationPct: threshold + 20 } },
    },
    now: options.now,
  });

  // Map to legacy shape
  return {
    anomalyDetected: result.anomaly,
    direction: result.anomaly ? (result.deviationPct > 0 ? 'spike' : 'drop') : null,
    deviationPct: result.deviationPct,
    threshold,
    currentHour: new Date().getHours(),
    currentRevenue: result.currentRevenue,
    avgReference: result.baselineMean,
    referenceWeeks: result.baselinePoints.length,
    currentOrderCount: result.currentOrderCount || 0,
    message: result.anomaly
      ? `⚠️ DỊ THƯỜNG: Doanh thu ${new Date().getHours()}:00 ${
          result.deviationPct > 0 ? 'tăng' : 'giảm'
        } ${Math.abs(result.deviationPct)}% so với 4 tuần trước (TB: ${result.baselineMean.toLocaleString('vi-VN')} VND, thực tế: ${result.currentRevenue.toLocaleString('vi-VN')} VND)`
      : null,
  };
}

module.exports = { detectAnomalies, detectRevenueAnomalies };

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
