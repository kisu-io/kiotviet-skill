#!/usr/bin/env node
'use strict';

const { parseArgs, loadShopConfig } = require('../src/config/loader');
const { createClient } = require('../src/api/client');
const { getSuppliers } = require('../src/api/suppliers');

const args = parseArgs();
const shopId = args.shopId || 'example-shop';

async function main() {
  const config = loadShopConfig(shopId);
  const api = createClient(config);

  const params = {};
  if (args.name) params.name = args.name;
  if (args.contactNumber) params.contactNumber = args.contactNumber;

  const data = await getSuppliers(api, params);
  if (data.error) {
    console.error(JSON.stringify({ error: data.error }, null, 2));
    process.exit(1);
  }

  const result = {
    total: data.total,
    suppliers: data.data.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      contactNumber: s.contactNumber,
      email: s.email,
      address: s.address,
      debt: s.debt || 0,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
