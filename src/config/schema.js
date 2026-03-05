'use strict';

const DEFAULTS = {
  branchId: null,
  channels: {
    primary: 'discord',
    discord: { webhookUrl: '' },
    telegram: { botToken: '', chatId: '' },
  },
  workflows: {
    dailyBriefing: true,
    smartRestock: true,
    invoiceReminder: true,
    weeklyReport: true,
    autoCreatePO: false,
    lowStockThreshold: 10,
    restockCoverDays: 14,
    overdueInvoiceDays: 7,
    topProductsCount: 5,
    customerSegments: true,
    pricingAdvisor: true,
  },
};

function validate(config) {
  const errors = [];
  if (!config.shopId) errors.push('shopId is required');
  if (!config.retailer) errors.push('retailer is required');
  if (!config.clientId) errors.push('clientId is required');
  if (!config.clientSecret) errors.push('clientSecret is required');
  if (errors.length > 0) {
    throw new Error(`Invalid shop config: ${errors.join(', ')}`);
  }
  return {
    ...DEFAULTS,
    ...config,
    channels: { ...DEFAULTS.channels, ...config.channels },
    workflows: { ...DEFAULTS.workflows, ...config.workflows },
  };
}

module.exports = { DEFAULTS, validate };
