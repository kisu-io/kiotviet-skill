'use strict';

/**
 * formatRevenueAnomalyAlert — formats anomaly detection result into
 * a Vietnamese alert message suitable for all channels.
 *
 * @param {AnomalyResult} result — from detectRevenueAnomalies()
 * @param {object} shopConfig — shop config (for shopId, retailer)
 * @returns {{ title: string, body: string, severity: string }}
 */
function formatRevenueAnomalyAlert(result, shopConfig) {
  const shopName = shopConfig.retailer || shopConfig.shopId;
  const severity = result.severity;

  const icon = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  const levelVi = severity === 'critical' ? 'NGHIEM TRONG' : severity === 'warning' ? 'CANH BAO' : 'BINH THUONG';

  const title = `${icon} ${levelVi}: Bat thuong doanh thu — ${shopName}`;

  const direction = result.deviationPct > 0 ? 'TANG' : 'GIAM';
  const absDeviation = Math.abs(result.deviationPct);

  let body = `${title}\n\n`;
  body += `⏰ Khung gio: ${_formatHour(result.currentHour)}\n`;
  body += `💰 Doanh thu hien tai: ${_formatVND(result.currentRevenue)}\n`;
  body += `📊 Trung binh 4 tuan: ${_formatVND(result.baselineMean)}\n`;
  body += `📉 Chenh lech: ${direction} ${absDeviation}% (z-score: ${result.zScore})\n\n`;

  if (severity === 'critical') {
    body += `⚡ Doanh thu ${direction.toLowerCase()} ${absDeviation}% so voi cung gio cung thu cac tuan truoc.\n`;
    body += `→ Can kiem tra ngay: co su co he thong, thieu hang, hoac su kien dac biet?\n`;
  } else if (severity === 'warning') {
    body += `📋 Doanh thu co bien dong ${absDeviation}% so voi baseline.\n`;
    body += `→ Theo doi them trong 1-2 gio toi.\n`;
  }

  return { title, body, severity };
}

function _formatVND(n) {
  return Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.') + ' VND';
}

function _formatHour(hourKey) {
  // "2026-03-05T14:00" → "14:00 ngay 05/03/2026"
  if (!hourKey) return '—';
  const [datePart, timePart] = hourKey.split('T');
  const [y, m, d] = datePart.split('-');
  return `${timePart} ngay ${d}/${m}/${y}`;
}

module.exports = { formatRevenueAnomalyAlert };
