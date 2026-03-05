'use strict';

const { loadShopConfig, parseArgs } = require('../config/loader');
const { createClient } = require('../api/client');
const { detectRevenueAnomalies } = require('../intelligence/anomaly-detector');
const { formatRevenueAnomalyAlert } = require('../intelligence/formatters/revenue-anomaly');
const channels = require('../channels');
const fs = require('fs');
const path = require('path');

// Idempotency guard: prevent duplicate alerts within the same hour
const LOCK_DIR = path.join(__dirname, '../../shops/.locks');
function _getLockFile(shopId, hourKey) {
  return path.join(LOCK_DIR, `anomaly-${shopId}-${hourKey.replace(/[:/]/g, '-')}.lock`);
}

function _isAlreadyRun(shopId, hourKey) {
  const lockFile = _getLockFile(shopId, hourKey);
  try {
    return fs.existsSync(lockFile);
  } catch { return false; }
}

function _markAsRun(shopId, hourKey) {
  try {
    if (!fs.existsSync(LOCK_DIR)) fs.mkdirSync(LOCK_DIR, { recursive: true });
    fs.writeFileSync(_getLockFile(shopId, hourKey), new Date().toISOString());
  } catch { /* best-effort */ }
}

// Clean up lock files older than 48 hours
function _cleanOldLocks() {
  try {
    if (!fs.existsSync(LOCK_DIR)) return;
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    for (const f of fs.readdirSync(LOCK_DIR)) {
      const fp = path.join(LOCK_DIR, f);
      const stat = fs.statSync(fp);
      if (stat.mtimeMs < cutoff) fs.unlinkSync(fp);
    }
  } catch { /* best-effort */ }
}

async function runRevenueAnomalyCheck(shopId, options = {}) {
  const config = loadShopConfig(shopId);

  // Check if enabled
  if (config.alerts?.revenueAnomaly?.enabled === false) {
    return { skipped: true, reason: 'revenueAnomaly alerts disabled in config' };
  }

  const api = createClient(config);
  const now = options.now || new Date();

  // Detect anomaly
  const result = await detectRevenueAnomalies({ api, shopConfig: config, now });

  // Idempotency: skip if already alerted this hour (unless forced)
  if (!options.force && _isAlreadyRun(shopId, result.currentHour)) {
    return {
      skipped: true,
      reason: `Already checked hour ${result.currentHour}`,
      cachedResult: result,
    };
  }

  _markAsRun(shopId, result.currentHour);
  _cleanOldLocks();

  // Only send alert if anomaly detected
  let channelResult = { skipped: true, reason: 'no anomaly' };
  if (result.anomaly) {
    const alert = formatRevenueAnomalyAlert(result, config);
    try {
      channelResult = await channels.send(config, alert.body);
    } catch (e) {
      channelResult = { error: e.message };
    }
  }

  return {
    shopId,
    workflow: 'revenue-anomaly-hourly',
    timestamp: new Date().toISOString(),
    detection: result,
    channelResult,
  };
}

module.exports = { runRevenueAnomalyCheck };

// CLI: node src/workflows/revenue-anomaly-hourly.js --shopId=example-shop [--force]
if (require.main === module) {
  const args = parseArgs();
  const shopId = args.shopId || 'example-shop';
  const force = args.force === 'true' || args.force === true;
  runRevenueAnomalyCheck(shopId, { force })
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}
