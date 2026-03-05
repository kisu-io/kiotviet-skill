'use strict';

const https = require('https');

const MAX_LEN = 4096;

function _post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let resBody = '';
      res.on('data', (c) => (resBody += c));
      res.on('end', () => resolve({ status: res.statusCode, body: resBody }));
    });
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

async function send(config, message) {
  const botToken = config.channels?.telegram?.botToken;
  const chatId = config.channels?.telegram?.chatId;
  if (!botToken || !chatId) {
    return { error: 'Telegram bot token or chat ID not configured' };
  }

  const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const chunks = _splitMessage(message);
  const results = [];
  for (const chunk of chunks) {
    const result = await _post(apiUrl, { chat_id: chatId, text: chunk, parse_mode: 'HTML' });
    results.push(result);
    if (result.status !== 200) {
      return { error: `Telegram API error: ${result.status} ${result.body}` };
    }
  }
  return { success: true, chunks: chunks.length };
}

module.exports = { send };
