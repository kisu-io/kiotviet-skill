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

const categoryId = args.categoryId;
const branchId = args.branchId;
const pageSize = parseInt(args.pageSize || '100', 10);

async function main() {
  const params = {
    pageSize,
    currentItem: 0,
    includeInventory: true,
    orderBy: 'name',
    orderDirection: 'ASC',
  };
  if (categoryId) params.categoryId = categoryId;
  if (branchId) params.branchId = branchId;

  const data = await apiClient.get('/products', params);

  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const products = data.data || [];
  const total = data.total || products.length;

  const result = {
    total,
    pageSize,
    products: products.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.categoryName,
      unit: p.unit,
      basePrice: p.basePrice,
      retailPrice: p.retailPrice,
      onHand: p.onHand,
      reserved: p.reserved,
      inventories: p.inventories,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
