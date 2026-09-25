#!/usr/bin/env node

/**
 * ==============================================================================
 * ORCA — Render Anti-Sleep Keep-Alive Cron Job
 * ==============================================================================
 * Render free-tier web services spin down after 15 minutes of inactivity.
 * This standalone script periodically pings your Render instance's `/api/health`
 * endpoint every 14 minutes (840,000 ms) to prevent it from sleeping.
 *
 * USAGE:
 *   node cron-keep-alive.js <YOUR_RENDER_URL>
 *
 * EXAMPLES:
 *   node cron-keep-alive.js https://orca-marine-intelligence.onrender.com
 *   RENDER_SERVICE_URL=https://orca-marine-intelligence.onrender.com node cron-keep-alive.js
 * ==============================================================================
 */

import http from 'node:http';
import https from 'node:https';

// Ping interval: 14 minutes (Render shuts down at 15 mins)
const INTERVAL_MS = 14 * 60 * 1000;

// Target URL from CLI args, environment variables, or fallback
const targetUrlArg = process.argv[2] || process.env.RENDER_SERVICE_URL || process.env.RENDER_EXTERNAL_URL;

if (!targetUrlArg) {
  console.error('\x1b[31m[ERROR]\x1b[0m Please provide your Render application URL!');
  console.log('\nUsage:');
  console.log('  node cron-keep-alive.js https://your-app.onrender.com');
  console.log('  RENDER_SERVICE_URL=https://your-app.onrender.com node cron-keep-alive.js\n');
  process.exit(1);
}

// Clean target URL and ensure it points to /api/health
let baseUrl = targetUrlArg.trim().replace(/\/+$/, '');
const healthEndpoint = baseUrl.endsWith('/api/health') ? baseUrl : `${baseUrl}/api/health`;

console.log('====================================================');
console.log('  ORCA — RENDER KEEP-ALIVE CRON SERVICE STARTED');
console.log('====================================================');
console.log(`Target Endpoint: ${healthEndpoint}`);
console.log(`Ping Interval:   Every 14 minutes (${INTERVAL_MS / 1000}s)`);
console.log(`Started At:      ${new Date().toISOString()}`);
console.log('====================================================\n');

/**
 * Perform a single HTTP/HTTPS ping with latency measurement
 */
function pingServer() {
  const startTime = Date.now();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isHttps = healthEndpoint.startsWith('https://');
  const client = isHttps ? https : http;

  const req = client.get(healthEndpoint, { timeout: 30000 }, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      const elapsed = Date.now() - startTime;
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`\x1b[32m[${timestamp}] ✓ PING SUCCESS\x1b[0m | Status: ${res.statusCode} | Latency: ${elapsed}ms | Keep-alive active`);
      } else {
        console.warn(`\x1b[33m[${timestamp}] ⚠ PING WARNING\x1b[0m | Status: ${res.statusCode} | Latency: ${elapsed}ms`);
      }
    });
  });

  req.on('timeout', () => {
    req.destroy();
    console.error(`\x1b[31m[${timestamp}] ✗ PING TIMEOUT\x1b[0m | Server took >30s to respond (it may be waking up)`);
  });

  req.on('error', (err) => {
    console.error(`\x1b[31m[${timestamp}] ✗ PING FAILED\x1b[0m | Error: ${err.message}`);
  });
}

// Execute initial ping immediately on launch
pingServer();

// Schedule recurring cron ping every 14 minutes
setInterval(pingServer, INTERVAL_MS);

// Handle clean shutdown signals
process.on('SIGINT', () => {
  console.log('\nKeep-alive cron job stopped gracefully.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nKeep-alive cron job terminated.');
  process.exit(0);
});
