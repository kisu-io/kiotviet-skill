#!/usr/bin/env node
'use strict';

const { parseArgs, loadShopConfig } = require('../src/config/loader');
const { createClient } = require('../src/api/client');
const { getRevenueInsights } = require('../src/intelligence/revenue-insights');

const args = parseArgs();
const shopId = args.shopId || 'example-shop';

async function main() {
  const config = loadShopConfig(shopId);
  if (args.branchId) config.branchId = parseInt(args.branchId, 10);

  const api = createClient(config);
  const result = await getRevenueInsights(api, config);

  if (result.error) {
    console.error(JSON.stringify({ error: result.error }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
