#!/usr/bin/env node
'use strict';

/**
 * CLI entry point for the revenue anomaly hourly workflow.
 * Usage: node scripts/run-revenue-anomaly-hourly.js --shopId=example-shop [--force]
 */

const path = require('path');
const { parseArgs } = require(path.join(__dirname, '..', 'src', 'config', 'loader'));
const { runRevenueAnomalyCheck } = require(path.join(__dirname, '..', 'src', 'workflows', 'revenue-anomaly-hourly'));

const args = parseArgs();
const shopId = args.shopId || 'example-shop';
const force = args.force === 'true' || args.force === true;

runRevenueAnomalyCheck(shopId, { force })
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(JSON.stringify({ error: e.message }, null, 2));
    process.exit(1);
  });
