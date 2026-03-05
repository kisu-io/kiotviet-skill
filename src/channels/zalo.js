'use strict';

/**
 * Zalo OA channel — sends messages via Zalo Official Account API v3.
 *
 * Config shape (in shops/<shopId>.json):
 *   channels.zalo.oaAccessToken  — OA access token (from oa.zalo.me)
 *   channels.zalo.oaId           — OA ID (optional, for logging)
 *
 * To send to the OA follower (shop owner), set:
 *   channels.zalo.ownerUserId    — Zalo user ID of the shop owner (must have followed the OA)
 *
 * Env var alternative:
 *   ZALO_OA_ACCESS_TOKEN
 */

const https = require('https');

const ZALO_API_BASE = 'https://openapi.zalo.me/v3.0/oa';
const MAX_LEN = 2000;

function _post(url, body, accessToken) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'access_token': accessToken,
        },
      },
      (res) => {
        let resBody = '';
        res.on('data', (c) => (resBody += c));
        res.on('end', () => resolve({ status: res.statusCode, body: resBody }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function _splitMessage(text) {
  if (text.length <= MAX_LEN) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_LEN) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf('\n', MAX_LEN);
    if (splitAt <= 0) splitAt = MAX_LEN;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return chunks;
}

/**
 * Send a text message to a specific Zalo user (must be an OA follower).
 * @param {string} accessToken
 * @param {string} userId  — Zalo user ID
 * @param {string} text
 */
async function sendToUser(accessToken, userId, text) {
  const chunks = _splitMessage(text);
  for (const chunk of chunks) {
    const payload = {
      recipient: { user_id: userId },
      message: { text: chunk },
    };
    const result = await _post(`${ZALO_API_BASE}/message/cs`, payload, accessToken);
    let parsed;
    try {
      parsed = JSON.parse(result.body);
    } catch (_) {
      parsed = { error: result.body };
    }
    if (result.status !== 200 || parsed.error) {
      return { error: `Zalo API error: ${result.status} ${result.body}` };
    }
  }
  return { success: true, chunks: chunks.length };
}

/**
 * Broadcast a text message to all followers of the OA.
 * Note: requires sufficient follower count as per Zalo OA policy.
 * @param {string} accessToken
 * @param {string} text
 */
async function broadcast(accessToken, text) {
  const payload = {
    recipient: { target: 'all' },
    message: { text },
  };
  const result = await _post(`${ZALO_API_BASE}/message/promotion/multicast`, payload, accessToken);
  let parsed;
  try {
    parsed = JSON.parse(result.body);
  } catch (_) {
    parsed = { error: result.body };
  }
  if (result.status !== 200 || parsed.error) {
    return { error: `Zalo broadcast error: ${result.status} ${result.body}` };
  }
  return { success: true };
}

/**
 * Main send() — sends message to the shop owner via Zalo OA.
 * Used by the channel router (src/channels/index.js).
 */
async function send(config, message) {
  const accessToken =
    config.channels?.zalo?.oaAccessToken || process.env.ZALO_OA_ACCESS_TOKEN;
  if (!accessToken) {
    return { error: 'Zalo OA access token not configured' };
  }

  const ownerUserId = config.channels?.zalo?.ownerUserId;
  if (!ownerUserId) {
    return { error: 'Zalo ownerUserId not configured (channels.zalo.ownerUserId)' };
  }

  return sendToUser(accessToken, ownerUserId, message);
}

module.exports = { send, sendToUser, broadcast };

// CLI test: node src/channels/zalo.js --test --shopId=example-shop
if (require.main === module) {
  const { loadShopConfig, parseArgs } = require('../config/loader');
  const args = parseArgs();

  if (args.test) {
    const shopId = args.shopId || 'example-shop';
    const config = loadShopConfig(shopId);
    send(config, '🧪 Test Zalo OA từ KiotViet Gateway — ' + new Date().toLocaleString('vi-VN'))
      .then((r) => console.log(JSON.stringify(r, null, 2)))
      .catch((e) => {
        console.error(JSON.stringify({ error: e.message }, null, 2));
        process.exit(1);
      });
  }
}
