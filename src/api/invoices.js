'use strict';

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

async function getInvoices(api, params = {}) {
  const allItems = [];
  let currentItem = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await api.get('/invoices', {
      pageSize: PAGE_SIZE,
      currentItem,
      orderBy: 'purchaseDate',
      orderDirection: 'DESC',
      ...params,
    });
    if (data.error) return data;
    const items = data.data || [];
    allItems.push(...items);
    if (allItems.length >= (data.total || 0) || items.length < PAGE_SIZE) break;
    currentItem += items.length;
  }
  return { data: allItems, total: allItems.length };
}

async function getInvoiceDetails(api, params = {}) {
  const allItems = [];
  let currentItem = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await api.get('/invoicedetails/sale', {
      pageSize: PAGE_SIZE,
      currentItem,
      ...params,
    });
    if (data.error) return data;
    const items = data.data || [];
    allItems.push(...items);
    if (allItems.length >= (data.total || 0) || items.length < PAGE_SIZE) break;
    currentItem += items.length;
  }
  return { data: allItems, total: allItems.length };
}

module.exports = { getInvoices, getInvoiceDetails };
