'use strict';

/**
 * KiotViet Webhook Server
 *
 * Lightweight HTTP server (pure Node.js) that receives KiotViet webhook events
 * and dispatches them to the appropriate handler.
 *
 * KiotViet webhook format:
 *   POST /webhook/:shopId
 *   Headers: x-kiotviet-signature: <HMAC-SHA256 hex> (preferred)
 *            x-kiotviet-secret: <plain secret> (fallback)
 *   Body: { Notifications: [{ Action: string, Data: object }] }
 *
 * Supported actions:
 *   order.create              → handlers/order-created.js
 *   product.updateQuantity    → handlers/low-stock.js
 *   customer.update           → handlers/customer-updated.js
 *   invoice.update            → handlers/invoice-updated.js
 *
 * Environment variables:
 *   PORT                 — Server port (default: 4000)
 *   WEBHOOK_SECRET       — Shared secret; used as HMAC key for signature validation
 *
 * Usage:
 *   node webhooks/server.js [--port=4000]
 */

const http = require('http');
const crypto = require('crypto');
const { parseArgs } = require('../src/config/loader');

const orderCreatedHandler = require('./handlers/order-created');
const lowStockHandler = require('./handlers/low-stock');
const customerUpdatedHandler = require('./handlers/customer-updated');
const invoiceUpdatedHandler = require('./handlers/invoice-updated');

const ACTION_MAP = {
  'order.create': orderCreatedHandler,
  'product.updateQuantity': lowStockHandler,
  'customer.update': customerUpdatedHandler,
  'invoice.update': invoiceUpdatedHandler,
};

function _readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
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

/**
 * Validate incoming webhook signature.
 * Preferred: HMAC-SHA256 in x-kiotviet-signature header (hex digest of raw body).
 * Fallback: plain-text match in x-kiotviet-secret header.
 */
function _validateSignature(req, rawBody, secret) {
  if (!secret) return true; // no secret configured — accept all

  const sigHeader = req.headers['x-kiotviet-signature'];
  if (sigHeader) {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    // Constant-time comparison to prevent timing attacks
    if (sigHeader.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(sigHeader, 'hex'), Buffer.from(expected, 'hex'));
  }

  // Fallback: plain secret header
  const plainHeader = req.headers['x-kiotviet-secret'];
  if (plainHeader) {
    return plainHeader === secret;
  }

  return false;
}

/**
 * Retry a handler call with exponential backoff.
 * Retries up to maxRetries times on failure.
 */
async function _withRetry(fn, maxRetries = 2, baseDelayMs = 500) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

async function _handleRequest(req, res) {
  if (req.method !== 'POST') {
    return _respond(res, 405, { error: 'Method Not Allowed' });
  }

  const match = req.url && req.url.match(/^\/webhook\/([^/?]+)/);
  if (!match) {
    return _respond(res, 404, { error: 'Not Found. Use POST /webhook/:shopId' });
  }
  const shopId = match[1];

  // Read raw body first (needed for HMAC)
  const rawBody = await _readBody(req);

  // Validate signature
  const secret = process.env.WEBHOOK_SECRET;
  if (!_validateSignature(req, rawBody, secret)) {
    console.warn(`[webhook] Invalid signature for shopId=${shopId}`);
    return _respond(res, 401, { error: 'Invalid webhook signature' });
  }

  // Parse JSON
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch (e) {
    return _respond(res, 400, { error: `Invalid JSON: ${e.message}` });
  }

  const notifications = payload.Notifications || [];
  if (notifications.length === 0) {
    return _respond(res, 200, { ok: true, handled: 0 });
  }

  // Dispatch by action (deduplicate same action in one request)
  const results = [];
  const seenHandlers = new Set();

  for (const notification of notifications) {
    const action = notification.Action;
    const handler = ACTION_MAP[action];

    if (!handler) {
      results.push({ action, status: 'unhandled' });
      continue;
    }

    if (seenHandlers.has(action)) continue;
    seenHandlers.add(action);

    try {
      const result = await _withRetry(() => handler.handle(shopId, payload));
      results.push({ action, status: 'ok', ...result });
    } catch (e) {
      console.error(`[webhook] Error handling ${action} for shopId=${shopId}:`, e.message);
      results.push({ action, status: 'error', error: e.message });
    }
  }

  console.log(`[webhook] shopId=${shopId} actions=${results.map((r) => r.action).join(',')}`);
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
    console.log(`[webhook] HMAC-SHA256 signature validation: ${process.env.WEBHOOK_SECRET ? 'ENABLED' : 'DISABLED (set WEBHOOK_SECRET)'}`);
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
