'use strict';

const MAX_PAGES = 20;
const PAGE_SIZE = 100;

async function getProducts(api, params = {}) {
  const allItems = [];
  let currentItem = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await api.get('/products', {
      pageSize: PAGE_SIZE,
      currentItem,
      includeInventory: true,
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

async function getLowStock(api, threshold = 10, branchId) {
  const params = { orderBy: 'onHand', orderDirection: 'ASC' };
  if (branchId) params.branchId = branchId;
  const result = await getProducts(api, params);
  if (result.error) return result;
  const lowStock = result.data.filter((p) => (p.onHand || 0) < threshold);
  return { data: lowStock, total: lowStock.length };
}

module.exports = { getProducts, getLowStock };
