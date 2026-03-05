#!/usr/bin/env node
'use strict';

const { parseArgs, loadShopConfig } = require('../src/config/loader');
const { createClient } = require('../src/api/client');
const { getPurchaseOrders } = require('../src/api/purchase-orders');

const args = parseArgs();
const shopId = args.shopId || 'example-shop';

async function main() {
  const config = loadShopConfig(shopId);
  const api = createClient(config);

  const params = {};
  if (args.fromDate) params.createdDate = args.fromDate;
  if (args.status) params.status = args.status;
  if (args.branchId) params.branchId = args.branchId;

  const data = await getPurchaseOrders(api, params);
  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const result = {
    total: data.total,
    purchaseOrders: data.data.map((po) => ({
      id: po.id,
      code: po.code,
      createdDate: po.createdDate,
      supplierName: po.supplierName,
      branchName: po.branchName,
      status: po.statusValue,
      total: po.total || 0,
      discount: po.discount || 0,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
