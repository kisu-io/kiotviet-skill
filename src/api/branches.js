'use strict';

async function getBranches(api) {
  const data = await api.get('/branches', { pageSize: 100 });
  if (data.error) return data;
  return { data: data.data || [], total: data.total || 0 };
}

module.exports = { getBranches };
