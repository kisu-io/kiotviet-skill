'use strict';

const { getInvoices } = require('../api/invoices');

function _dateStr(d) {
  return d.toISOString().split('T')[0];
}

function _calcMetrics(invoices) {
  const count = invoices.length;
  const revenue = invoices.reduce((s, i) => s + (i.totalPayment || 0), 0);
  const avgOrderValue = count > 0 ? revenue / count : 0;
  return { count, revenue, avgOrderValue };
}

function _pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

function _trend(pct) {
  if (pct > 5) return 'up';
  if (pct < -5) return 'down';
  return 'stable';
}

async function getRevenueInsights(api, config) {
  const now = new Date();

  // Week boundaries (Mon-Sun)
  const dayOfWeek = now.getDay() || 7; // Convert Sunday=0 to 7
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - dayOfWeek + 1);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  // Month boundaries
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const baseParams = {};
  if (config.branchId) baseParams.branchId = config.branchId;

  const [thisWeekData, lastWeekData, thisMonthData, lastMonthData] = await Promise.all([
    getInvoices(api, { ...baseParams, fromPurchaseDate: _dateStr(thisWeekStart), toPurchaseDate: _dateStr(now) }),
    getInvoices(api, { ...baseParams, fromPurchaseDate: _dateStr(lastWeekStart), toPurchaseDate: _dateStr(lastWeekEnd) }),
    getInvoices(api, { ...baseParams, fromPurchaseDate: _dateStr(thisMonthStart), toPurchaseDate: _dateStr(now) }),
    getInvoices(api, { ...baseParams, fromPurchaseDate: _dateStr(lastMonthStart), toPurchaseDate: _dateStr(lastMonthEnd) }),
  ]);

  for (const d of [thisWeekData, lastWeekData, thisMonthData, lastMonthData]) {
    if (d.error) return d;
  }

  const thisWeek = _calcMetrics(thisWeekData.data);
  const lastWeek = _calcMetrics(lastWeekData.data);
  const thisMonth = _calcMetrics(thisMonthData.data);
  const lastMonth = _calcMetrics(lastMonthData.data);

  const weekOverWeek = {
    revenue: { current: thisWeek.revenue, previous: lastWeek.revenue, change: _pctChange(thisWeek.revenue, lastWeek.revenue) },
    invoiceCount: { current: thisWeek.count, previous: lastWeek.count, change: _pctChange(thisWeek.count, lastWeek.count) },
    avgOrderValue: { current: Math.round(thisWeek.avgOrderValue), previous: Math.round(lastWeek.avgOrderValue), change: _pctChange(thisWeek.avgOrderValue, lastWeek.avgOrderValue) },
    trend: _trend(_pctChange(thisWeek.revenue, lastWeek.revenue)),
  };

  const monthOverMonth = {
    revenue: { current: thisMonth.revenue, previous: lastMonth.revenue, change: _pctChange(thisMonth.revenue, lastMonth.revenue) },
    invoiceCount: { current: thisMonth.count, previous: lastMonth.count, change: _pctChange(thisMonth.count, lastMonth.count) },
    avgOrderValue: { current: Math.round(thisMonth.avgOrderValue), previous: Math.round(lastMonth.avgOrderValue), change: _pctChange(thisMonth.avgOrderValue, lastMonth.avgOrderValue) },
    trend: _trend(_pctChange(thisMonth.revenue, lastMonth.revenue)),
  };

  const recommendations = [];
  if (weekOverWeek.trend === 'down') {
    recommendations.push('Doanh thu tuan nay giam so voi tuan truoc. Kiem tra chuong trinh khuyen mai hoac nguon khach hang.');
  }
  if (monthOverMonth.trend === 'down') {
    recommendations.push('Doanh thu thang nay giam so voi thang truoc. Can xem xet chien luoc ban hang.');
  }
  if (weekOverWeek.trend === 'up') {
    recommendations.push('Doanh thu tuan nay tang truong tot. Tiep tuc phat huy!');
  }

  return { weekOverWeek, monthOverMonth, recommendations };
}

module.exports = { getRevenueInsights };
