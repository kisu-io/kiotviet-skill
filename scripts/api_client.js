#!/usr/bin/env node
'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const BASE_URL = 'https://public.kiotapi.com';
const TOKEN_FILE = path.join(__dirname, '.token');

const CLIENT_ID = process.env.KIOTVIET_CLIENT_ID;
const CLIENT_SECRET = process.env.KIOTVIET_CLIENT_SECRET;
const RETAILER = process.env.KIOTVIET_RETAILER;

function _loadToken() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    if (!data.expires_at) return null;
    if (Date.now() >= new Date(data.expires_at).getTime()) return null;
    return data.access_token || null;
  } catch (e) {
    return null;
  }
}

function _saveToken(accessToken, expiresIn) {
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: accessToken, expires_at: expiresAt }));
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

async function _fetchNewToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'Missing credentials. Set KIOTVIET_CLIENT_ID and KIOTVIET_CLIENT_SECRET environment variables.'
    );
  }

  const body =
    `client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&client_secret=${encodeURIComponent(CLIENT_SECRET)}` +
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
  _saveToken(data.access_token, data.expires_in || 86400);
  return data.access_token;
}

async function getToken() {
  const cached = _loadToken();
  if (cached) return cached;
  return _fetchNewToken();
}

async function get(endpoint, params = {}) {
  if (!RETAILER) {
    return { error: 'Missing KIOTVIET_RETAILER environment variable.' };
  }

  let token;
  try {
    token = await getToken();
  } catch (e) {
    return { error: e.message };
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Retailer': RETAILER,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const { status, body } = await _request(url.toString(), { headers });
    if (status === 200 || status === 201) {
      return JSON.parse(body);
    }
    try {
      const errData = JSON.parse(body);
      return { error: `HTTP ${status}: ${errData.message || errData.error || JSON.stringify(errData)}` };
    } catch {
      return { error: `HTTP ${status}: ${body.slice(0, 200)}` };
    }
  } catch (e) {
    return { error: `Request error: ${e.message}` };
  }
}

module.exports = { get, getToken };

// Allow direct execution to test auth
if (require.main === module) {
  getToken()
    .then((token) => {
      console.log(JSON.stringify({ success: true, token_preview: token.slice(0, 20) + '...' }, null, 2));
    })
    .catch((e) => {
      console.error(JSON.stringify({ error: e.message }, null, 2));
      process.exit(1);
    });
}
