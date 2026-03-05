'use strict';

/**
 * KiotViet Webhook Server
 *
 * Lightweight HTTP server (pure Node.js) that receives KiotViet webhook events
 * and dispatches them to the appropriate handler.
 *
 * KiotViet webhook format:
 *   POST /webhook/:shopId
 *   Headers: x-kiotviet-secret: <WEBHOOK_SECRET>
 *   Body: { Notifications: [{ Action: string, Data: object }] }
 *
 * Supported actions:
 *   order.create              → handlers/order-created.js
 *   product.updateQuantity    → handlers/low-stock.js
 *
 * Environment variables:
 *   PORT                 — Server port (default: 4000)
 *   WEBHOOK_SECRET       — Shared secret to validate incoming requests
 *
 * Usage:
 *   node webhooks/server.js [--port=4000]
 */

const http = require('http');
const { parseArgs } = require('../src/config/loader');

const orderCreatedHandler = require('./handlers/order-created');
const lowStockHandler = require('./handlers/low-stock');

const ACTION_MAP = {
  'order.create': orderCreatedHandler,
  'product.updateQuantity': lowStockHandler,
};

function _readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function _respond(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function _handleRequest(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return _respond(res, 405, { error: 'Method Not Allowed' });
  }

  // Route: /webhook/:shopId
  const match = req.url && req.url.match(/^\/webhook\/([^/?]+)/);
  if (!match) {
    return _respond(res, 404, { error: 'Not Found. Use POST /webhook/:shopId' });
  }
  const shopId = match[1];

  // Validate secret if configured
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (expectedSecret) {
    const incoming = req.headers['x-kiotviet-secret'];
    if (incoming !== expectedSecret) {
      return _respond(res, 401, { error: 'Invalid webhook secret' });
    }
  }

  // Parse body
  let payload;
  try {
    const raw = await _readBody(req);
    payload = JSON.parse(raw);
  } catch (e) {
    return _respond(res, 400, { error: `Invalid JSON: ${e.message}` });
  }

  const notifications = payload.Notifications || [];
  if (notifications.length === 0) {
    return _respond(res, 200, { ok: true, handled: 0 });
  }

  // Dispatch by action
  const results = [];
  const seenHandlers = new Set();

  for (const notification of notifications) {
    const action = notification.Action;
    const handler = ACTION_MAP[action];

    if (!handler) {
      results.push({ action, status: 'unhandled' });
      continue;
    }

    // Deduplicate: call each handler once per request with the full payload
    if (seenHandlers.has(action)) continue;
    seenHandlers.add(action);

    try {
      const result = await handler.handle(shopId, payload);
      results.push({ action, status: 'ok', ...result });
    } catch (e) {
      console.error(`[webhook] Error handling ${action}:`, e.message);
      results.push({ action, status: 'error', error: e.message });
    }
  }

  _respond(res, 200, { ok: true, shopId, results });
}

function startServer(port) {
  const server = http.createServer(async (req, res) => {
    try {
      await _handleRequest(req, res);
    } catch (e) {
      console.error('[webhook] Unhandled error:', e.message);
      _respond(res, 500, { error: 'Internal server error' });
    }
  });

  server.listen(port, () => {
    console.log(`[webhook] Server listening on port ${port}`);
    console.log(`[webhook] Endpoint: POST http://localhost:${port}/webhook/:shopId`);
    if (!process.env.WEBHOOK_SECRET) {
      console.warn('[webhook] WARNING: WEBHOOK_SECRET not set — requests will not be validated');
    }
  });

  server.on('error', (e) => {
    console.error('[webhook] Server error:', e.message);
    process.exit(1);
  });

  return server;
}

if (require.main === module) {
  try { require('dotenv').config(); } catch (_) {}
  const args = parseArgs();
  const port = parseInt(args.port) || parseInt(process.env.PORT) || 4000;
  startServer(port);
}

module.exports = { startServer };
