'use strict';

const discord = require('./discord');
const telegram = require('./telegram');

const CHANNELS = { discord, telegram };

async function send(config, message) {
  const primary = config.channels?.primary;
  const channel = CHANNELS[primary];
  if (!channel) {
    return { error: `Unknown channel: ${primary}. Supported: ${Object.keys(CHANNELS).join(', ')}` };
  }
  return channel.send(config, message);
}

async function sendToAll(config, message) {
  const results = {};
  for (const [name, channel] of Object.entries(CHANNELS)) {
    try {
      results[name] = await channel.send(config, message);
    } catch (e) {
      results[name] = { error: e.message };
    }
  }
  return results;
}

module.exports = { send, sendToAll };
