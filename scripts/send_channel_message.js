#!/usr/bin/env node
'use strict';

const { parseArgs, loadShopConfig } = require('../src/config/loader');
const channels = require('../src/channels');

const args = parseArgs();
const shopId = args.shopId || 'example-shop';

// Usage: --channel=discord|telegram --msg="text"

async function main() {
  if (!args.msg) {
    console.error(JSON.stringify({ error: 'Missing --msg="your message"' }, null, 2));
    process.exit(1);
  }

  const config = loadShopConfig(shopId);

  // Override primary channel if specified
  if (args.channel) {
    config.channels.primary = args.channel;
  }

  const result = await channels.send(config, args.msg);

  if (result.error) {
    console.error(JSON.stringify({ error: result.error }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ success: true, ...result }, null, 2));
}

main();
