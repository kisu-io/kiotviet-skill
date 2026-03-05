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

const fromDate = args.fromDate;
const toDate = args.toDate;
const status = args.status; // 1=completed, 2=cancelled, etc.
const limit = parseInt(args.limit || '50', 10);

const now = Date.now();

async function main() {
  const params = {
    pageSize: limit,
    currentItem: 0,
    orderBy: 'purchaseDate',
    orderDirection: 'DESC',
  };
  if (fromDate) params.fromPurchaseDate = fromDate;
  if (toDate) params.toPurchaseDate = toDate;
  if (status) params.status = status;

  const data = await apiClient.get('/invoices', params);

  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const invoices = data.data || [];
  const total = data.total || invoices.length;

  const mapped = invoices.map((inv) => {
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
    const isOverdue =
      dueDate &&
      inv.status !== 1 && // not fully paid
      dueDate.getTime() < now;

    return {
      id: inv.id,
      code: inv.code,
      purchaseDate: inv.purchaseDate,
      dueDate: inv.dueDate,
      isOverdue: isOverdue || false,
      customerName: inv.customerName,
      customerCode: inv.customerCode,
      status: inv.statusValue,
      totalPayment: inv.totalPayment,
      totalPaid: inv.totalPaid || 0,
      balance: (inv.totalPayment || 0) - (inv.totalPaid || 0),
      branchName: inv.branchName,
    };
  });

  const overdueInvoices = mapped.filter((i) => i.isOverdue);
  const totalRevenue = mapped.reduce((s, i) => s + (i.totalPayment || 0), 0);
  const totalOutstanding = overdueInvoices.reduce((s, i) => s + (i.balance || 0), 0);

  const result = {
    total,
    filters: { fromDate, toDate, status },
    summary: {
      totalInvoices: mapped.length,
      totalRevenue,
      overdueCount: overdueInvoices.length,
      totalOutstanding,
    },
    invoices: mapped,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
