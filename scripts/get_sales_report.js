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

// Default: today
const today = new Date().toISOString().slice(0, 10);
const fromDate = args.fromDate || today;
const toDate = args.toDate || today;
const branchId = args.branchId;

async function main() {
  const params = {
    fromPurchaseDate: fromDate,
    toPurchaseDate: toDate,
    pageSize: 100,
    currentItem: 0,
    orderBy: 'purchaseDate',
    orderDirection: 'DESC',
  };
  if (branchId) params.branchId = branchId;

  const data = await apiClient.get('/invoices', params);

  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const invoices = data.data || [];
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalPayment || 0), 0);
  const totalDiscount = invoices.reduce((sum, inv) => sum + (inv.discount || 0), 0);
  const totalInvoices = data.total || invoices.length;

  // Aggregate by day
  const byDay = {};
  for (const inv of invoices) {
    const day = (inv.purchaseDate || '').slice(0, 10);
    if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 };
    byDay[day].count += 1;
    byDay[day].revenue += inv.totalPayment || 0;
  }

  const result = {
    period: { fromDate, toDate },
    summary: {
      totalInvoices,
      totalRevenue,
      totalDiscount,
      averageOrderValue: invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0,
    },
    byDay: Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats })),
    invoices: invoices.slice(0, 20),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
