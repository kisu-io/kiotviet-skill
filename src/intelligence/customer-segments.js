'use strict';

const { getCustomers } = require('../api/customers');
const { getInvoices } = require('../api/invoices');

async function getCustomerSegments(api, config) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const baseParams = {};
  if (config.branchId) baseParams.branchId = config.branchId;

  const [customersResult, invoicesResult] = await Promise.all([
    getCustomers(api, baseParams),
    getInvoices(api, {
      ...baseParams,
      fromPurchaseDate: ninetyDaysAgo.toISOString().split('T')[0],
      toPurchaseDate: now.toISOString().split('T')[0],
    }),
  ]);

  if (customersResult.error) return customersResult;
  if (invoicesResult.error) return invoicesResult;

  // Build customer purchase map from invoices
  const customerMap = {};
  for (const inv of invoicesResult.data) {
    const custId = inv.customerId;
    if (!custId) continue;
    if (!customerMap[custId]) {
      customerMap[custId] = {
        customerId: custId,
        customerName: inv.customerName || 'N/A',
        invoices: [],
        totalSpent: 0,
        lastPurchaseDate: null,
      };
    }
    customerMap[custId].invoices.push(inv);
    customerMap[custId].totalSpent += inv.totalPayment || 0;
    const purchaseDate = new Date(inv.purchaseDate || inv.createdDate);
    if (!customerMap[custId].lastPurchaseDate || purchaseDate > customerMap[custId].lastPurchaseDate) {
      customerMap[custId].lastPurchaseDate = purchaseDate;
    }
  }

  // Calculate RFM scores
  const customers = Object.values(customerMap);
  if (customers.length === 0) {
    return {
      segments: { champions: [], loyal: [], atRisk: [], lost: [] },
      summary: { totalCustomers: 0, champions: 0, loyal: 0, atRisk: 0, lost: 0 },
    };
  }

  // Compute raw RFM values
  for (const c of customers) {
    c.recency = Math.floor((now.getTime() - (c.lastPurchaseDate?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24));
    c.frequency = c.invoices.length;
    c.monetary = c.totalSpent;
  }

  // Quintile scoring (1-5, 5 = best)
  function quintileScore(arr, key, reverse = false) {
    const sorted = [...arr].sort((a, b) => a[key] - b[key]);
    const n = sorted.length;
    for (let i = 0; i < n; i++) {
      const q = Math.ceil(((i + 1) / n) * 5);
      sorted[i][key + 'Score'] = reverse ? (6 - q) : q;
    }
  }

  quintileScore(customers, 'recency', true); // Lower recency = better
  quintileScore(customers, 'frequency', false); // Higher frequency = better
  quintileScore(customers, 'monetary', false); // Higher monetary = better

  // Classify segments
  const segments = { champions: [], loyal: [], atRisk: [], lost: [] };

  for (const c of customers) {
    const rfmAvg = (c.recencyScore + c.frequencyScore + c.monetaryScore) / 3;
    const entry = {
      customerId: c.customerId,
      customerName: c.customerName,
      recency: c.recency,
      frequency: c.frequency,
      monetary: c.monetary,
      recencyScore: c.recencyScore,
      frequencyScore: c.frequencyScore,
      monetaryScore: c.monetaryScore,
      rfmAvg: Math.round(rfmAvg * 10) / 10,
    };

    if (rfmAvg >= 4) {
      entry.segment = 'champions';
      segments.champions.push(entry);
    } else if (rfmAvg >= 3) {
      entry.segment = 'loyal';
      segments.loyal.push(entry);
    } else if (rfmAvg >= 2) {
      entry.segment = 'atRisk';
      segments.atRisk.push(entry);
    } else {
      entry.segment = 'lost';
      segments.lost.push(entry);
    }
  }

  // Sort each segment by RFM avg descending
  for (const key of Object.keys(segments)) {
    segments[key].sort((a, b) => b.rfmAvg - a.rfmAvg);
  }

  return {
    segments,
    summary: {
      totalCustomers: customers.length,
      champions: segments.champions.length,
      loyal: segments.loyal.length,
      atRisk: segments.atRisk.length,
      lost: segments.lost.length,
    },
    period: {
      from: ninetyDaysAgo.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    },
  };
}

module.exports = { getCustomerSegments };
