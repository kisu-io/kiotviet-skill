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

const today = new Date().toISOString().slice(0, 10);
const fromDate = args.fromDate || today;
const toDate = args.toDate || today;
const limit = parseInt(args.limit || '10', 10);

async function main() {
  const params = {
    fromPurchaseDate: fromDate,
    toPurchaseDate: toDate,
    pageSize: 100,
    currentItem: 0,
  };

  const data = await apiClient.get('/invoicedetails/sale', params);

  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const items = data.data || [];

  // Aggregate by product
  const productMap = {};
  for (const item of items) {
    const id = item.productId || item.productCode;
    if (!id) continue;
    if (!productMap[id]) {
      productMap[id] = {
        productId: id,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        quantitySold: 0,
        revenue: 0,
      };
    }
    productMap[id].quantitySold += item.quantity || 0;
    productMap[id].revenue += (item.price || 0) * (item.quantity || 0) - (item.discount || 0);
  }

  const ranked = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((p, i) => ({ rank: i + 1, ...p }));

  console.log(
    JSON.stringify(
      {
        period: { fromDate, toDate },
        topProducts: ranked,
      },
      null,
      2
    )
  );
}

main();
