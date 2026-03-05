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

const customerId = args.id || args.customerId;

async function main() {
  if (!customerId) {
    console.error(JSON.stringify({ error: 'Missing required argument: --id=CUSTOMER_ID' }, null, 2));
    process.exit(1);
  }

  const [profileData, invoiceData] = await Promise.all([
    apiClient.get(`/customers/${customerId}`),
    apiClient.get('/invoices', {
      customerId,
      pageSize: 10,
      currentItem: 0,
      orderBy: 'purchaseDate',
      orderDirection: 'DESC',
    }),
  ]);

  if (profileData.error) {
    console.error(JSON.stringify({ error: profileData.error }, null, 2));
    process.exit(1);
  }

  const c = profileData;
  const recentInvoices = invoiceData.data || [];

  const result = {
    id: c.id,
    code: c.code,
    name: c.name,
    contactNumber: c.contactNumber,
    email: c.email,
    gender: c.gender,
    birthDate: c.birthDate,
    address: c.address,
    wardName: c.wardName,
    districtName: c.districtName,
    locationName: c.locationName,
    debt: c.debt || 0,
    totalRevenue: c.totalRevenue || 0,
    totalInvoiced: c.totalInvoiced || 0,
    rewardPoint: c.rewardPoint,
    totalPoint: c.totalPoint,
    usedPoint: c.usedPoint,
    lastPurchaseDate: c.lastPurchaseDate,
    createdDate: c.createdDate,
    groups: c.groups ? c.groups.map((g) => g.name) : [],
    comments: c.comments,
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      code: inv.code,
      purchaseDate: inv.purchaseDate,
      totalPayment: inv.totalPayment,
      status: inv.statusValue,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
