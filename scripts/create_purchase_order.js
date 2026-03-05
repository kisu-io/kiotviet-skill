#!/usr/bin/env node
'use strict';

const { parseArgs, loadShopConfig } = require('../src/config/loader');
const { createClient } = require('../src/api/client');
const { createPurchaseOrder } = require('../src/api/purchase-orders');

const args = parseArgs();
const shopId = args.shopId || 'example-shop';

// Usage: --supplierId=X --branchId=X --products=ID1:QTY1,ID2:QTY2

async function main() {
  if (!args.products) {
    console.error(JSON.stringify({ error: 'Missing --products=ID1:QTY1,ID2:QTY2' }, null, 2));
    process.exit(1);
  }

  const config = loadShopConfig(shopId);
  const api = createClient(config);

  const products = args.products.split(',').map((p) => {
    const [productId, quantity] = p.split(':');
    return { productId: parseInt(productId, 10), quantity: parseInt(quantity, 10) };
  });

  const body = {
    branchId: parseInt(args.branchId || config.branchId || '1', 10),
    purchaseOrderDetails: products,
    description: args.description || '',
  };

  if (args.supplierId) body.supplierId = parseInt(args.supplierId, 10);

  const result = await createPurchaseOrder(api, body);
  if (result.error) {
    console.error(JSON.stringify({ error: result.error }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    success: true,
    purchaseOrder: {
      id: result.id,
      code: result.code,
      createdDate: result.createdDate,
      total: result.total,
    },
  }, null, 2));
}

main();
