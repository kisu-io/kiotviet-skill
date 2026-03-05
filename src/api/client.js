'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const BASE_URL = 'https://public.kiotapi.com';
const TOKENS_DIR = path.resolve(__dirname, '../../shops/.tokens');

function _ensureTokenDir() {
  if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true });
  }
}

function _request(reqUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(reqUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = mod.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function _tokenPath(shopId) {
  return path.join(TOKENS_DIR, `${shopId}.json`);
}

function _loadToken(shopId) {
  const file = _tokenPath(shopId);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!data.expires_at || Date.now() >= new Date(data.expires_at).getTime()) return null;
    return data.access_token || null;
  } catch (_) {
    return null;
  }
}

function _saveToken(shopId, accessToken, expiresIn) {
  _ensureTokenDir();
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString();
  fs.writeFileSync(
    _tokenPath(shopId),
    JSON.stringify({ access_token: accessToken, expires_at: expiresAt })
  );
}

function createClient(config) {
  const { shopId, clientId, clientSecret, retailer } = config;

  async function getToken() {
    const cached = _loadToken(shopId);
    if (cached) return cached;

    const body =
      `client_id=${encodeURIComponent(clientId)}` +
      `&client_secret=${encodeURIComponent(clientSecret)}` +
      `&grant_type=client_credentials` +
      `&scopes=PublicApi.Access`;

    const { status, body: resBody } = await _request(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
      body,
    });

    if (status !== 200) {
      throw new Error(`Token fetch failed. Status: ${status}. Body: ${resBody}`);
    }

    const data = JSON.parse(resBody);
    _saveToken(shopId, data.access_token, data.expires_in || 86400);
    return data.access_token;
  }

  function _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function _apiRequest(method, endpoint, params, jsonBody) {
    const maxRetries = 1;
    const retryDelay = 2000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const token = await getToken();
      const url = new URL(`${BASE_URL}${endpoint}`);
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            url.searchParams.set(key, value);
          }
        }
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Retailer': retailer,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const options = { method, headers };
      if (jsonBody) options.body = JSON.stringify(jsonBody);

      const { status, body } = await _request(url.toString(), options);
      if (status === 200 || status === 201) {
        return JSON.parse(body);
      }

      // Retry on 429 (rate limit) or 5xx (server error)
      if ((status === 429 || status >= 500) && attempt < maxRetries) {
        await _delay(retryDelay);
        continue;
      }

      try {
        const errData = JSON.parse(body);
        return { error: `HTTP ${status}: ${errData.message || errData.error || JSON.stringify(errData)}` };
      } catch (_) {
        return { error: `HTTP ${status}: ${body.slice(0, 200)}` };
      }
    }
  }

  return {
    get: (endpoint, params) => _apiRequest('GET', endpoint, params),
    post: (endpoint, body) => _apiRequest('POST', endpoint, null, body),
    getToken,
  };
}

module.exports = { createClient };

// Allow direct execution to test auth
if (require.main === module) {
  try { require('dotenv').config(); } catch (_) {}
  const config = {
    shopId: '_test',
    clientId: process.env.KIOTVIET_CLIENT_ID,
    clientSecret: process.env.KIOTVIET_CLIENT_SECRET,
    retailer: process.env.KIOTVIET_RETAILER,
  };
  const api = createClient(config);
  api.getToken()
    .then((token) => {
      console.log(JSON.stringify({ success: true, token_preview: token.slice(0, 20) + '...' }, null, 2));
    })
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}
