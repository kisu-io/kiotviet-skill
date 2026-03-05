'use strict';

const discord = require('./discord');
const telegram = require('./telegram');
const zalo = require('./zalo');

const CHANNELS = { discord, telegram, zalo };

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

/**
 * broadcastRevenueAlert — sends to all configured channels (not just primary).
 * Used by revenue anomaly workflow to ensure alerts reach the shop owner.
 */
async function broadcastRevenueAlert(config, message) {
  const results = {};
  const channelConfig = config.channels || {};

  for (const [name, channel] of Object.entries(CHANNELS)) {
    // Only send if channel has config
    const chConf = channelConfig[name];
    if (!chConf) continue;
    // Check if channel is actually configured (has at least one non-empty value)
    const hasConfig = Object.values(chConf).some((v) => v && String(v).trim() !== '');
    if (!hasConfig) continue;

    try {
      results[name] = await channel.send(config, message);
    } catch (e) {
      results[name] = { error: e.message };
    }
  }
  return results;
}

module.exports = { send, sendToAll, broadcastRevenueAlert };
