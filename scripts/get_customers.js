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

// orderBy options: totalRevenue, totalInvoiced, purchaseDate, name
const orderBy = args.orderBy || 'totalRevenue';
const limit = parseInt(args.limit || '10', 10);
const pageSize = parseInt(args.pageSize || String(limit), 10);

async function main() {
  const params = {
    pageSize,
    currentItem: 0,
    orderBy,
    orderDirection: 'DESC',
    includeTotal: true,
  };

  const data = await apiClient.get('/customers', params);

  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const customers = data.data || [];
  const total = data.total || customers.length;

  const result = {
    total,
    filters: { orderBy, limit },
    customers: customers.slice(0, limit).map((c, i) => ({
      rank: i + 1,
      id: c.id,
      code: c.code,
      name: c.name,
      contactNumber: c.contactNumber,
      email: c.email,
      gender: c.gender,
      totalRevenue: c.totalRevenue || 0,
      totalInvoiced: c.totalInvoiced || 0,
      totalPoint: c.totalPoint,
      rewardPoint: c.rewardPoint,
      lastPurchaseDate: c.lastPurchaseDate,
      debt: c.debt || 0,
      groupName: c.groups ? c.groups.map((g) => g.name).join(', ') : null,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
