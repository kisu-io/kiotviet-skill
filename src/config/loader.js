'use strict';

const fs = require('fs');
const path = require('path');
const { validate } = require('./schema');

try { require('dotenv').config(); } catch (_) { /* dotenv optional */ }

const SHOPS_DIR = path.resolve(__dirname, '../../shops');

function parseArgs(argv) {
  return Object.fromEntries(
    (argv || process.argv.slice(2))
      .filter((a) => a.startsWith('--'))
      .map((a) => {
        const [k, ...v] = a.slice(2).split('=');
        return [k, v.join('=') || 'true'];
      })
  );
}

function loadShopConfig(shopId) {
  const filePath = path.join(SHOPS_DIR, `${shopId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Shop config not found: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Allow env var overrides
  if (!raw.clientId) raw.clientId = process.env.KIOTVIET_CLIENT_ID || '';
  if (!raw.clientSecret) raw.clientSecret = process.env.KIOTVIET_CLIENT_SECRET || '';
  if (!raw.retailer) raw.retailer = process.env.KIOTVIET_RETAILER || '';
  if (!raw.channels?.discord?.webhookUrl && process.env.DISCORD_WEBHOOK_URL) {
    raw.channels = raw.channels || {};
    raw.channels.discord = raw.channels.discord || {};
    raw.channels.discord.webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  }
  if (!raw.channels?.telegram?.botToken && process.env.TELEGRAM_BOT_TOKEN) {
    raw.channels = raw.channels || {};
    raw.channels.telegram = raw.channels.telegram || {};
    raw.channels.telegram.botToken = process.env.TELEGRAM_BOT_TOKEN;
    raw.channels.telegram.chatId = process.env.TELEGRAM_CHAT_ID || '';
  }

  return validate(raw);
}

module.exports = { parseArgs, loadShopConfig };
