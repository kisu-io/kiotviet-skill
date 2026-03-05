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

const status = args.status;
const fromDate = args.fromDate;
const toDate = args.toDate;
const limit = parseInt(args.limit || '20', 10);

async function main() {
  const params = {
    pageSize: limit,
    currentItem: 0,
    orderBy: 'createdDate',
    orderDirection: 'DESC',
  };
  if (status) params.status = status;
  if (fromDate) params.fromPurchaseDate = fromDate;
  if (toDate) params.toPurchaseDate = toDate;

  const data = await apiClient.get('/orders', params);

  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const orders = data.data || [];
  const total = data.total || orders.length;

  const result = {
    total,
    filters: { status, fromDate, toDate, limit },
    orders: orders.map((o) => ({
      id: o.id,
      code: o.code,
      purchaseDate: o.purchaseDate,
      status: o.statusValue,
      customerName: o.customerName,
      customerCode: o.customerCode,
      totalAmount: o.totalPayment,
      discount: o.discount,
      deliveryDate: o.usingCod ? o.deliveryDate : null,
      branchName: o.branchName,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
