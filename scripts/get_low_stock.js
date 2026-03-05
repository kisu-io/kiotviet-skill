#!/usr/bin/env node
'use strict';

const apiClient = require('./api_client');

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=')];
    })
);

const threshold = parseFloat(args.threshold || '10');
const branchId = args.branchId;

async function main() {
  const params = {
    pageSize: 100,
    currentItem: 0,
    includeInventory: true,
    orderBy: 'onHand',
    orderDirection: 'ASC',
  };
  if (branchId) params.branchId = branchId;

  const data = await apiClient.get('/products', params);

  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const products = data.data || [];
  const lowStock = products.filter((p) => (p.onHand || 0) < threshold);

  const result = {
    threshold,
    lowStockCount: lowStock.length,
    products: lowStock.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.categoryName,
      unit: p.unit,
      onHand: p.onHand || 0,
      suggestedReorder: Math.max(Math.ceil((p.onHand || 0) * 2), threshold * 2),
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
