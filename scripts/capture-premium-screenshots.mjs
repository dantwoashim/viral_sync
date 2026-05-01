import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const baseUrl = process.env.PREMIUM_SCREENSHOT_BASE_URL || 'http://localhost:3000';
const outDir = path.resolve(process.env.PREMIUM_SCREENSHOT_DIR || 'tmp/premium-screenshots');
const port = Number(process.env.PREMIUM_CHROME_PORT || 9234);
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('tmp/chrome-premium-screenshots-profile');
const bannedCopy = [/\bWeek\s+\d+\b/i, /judge-visible/i, /Judge script/i, /hackathon/i, /student project/i, /good enough/i];
const viewportSet = process.env.PREMIUM_VIEWPORT_SET || 'core';

const routes = [
  ['/', 'home'],
  ['/demo', 'demo'],
  ['/premium-scorecard', 'premium-scorecard'],
  ['/invite', 'invite'],
  ['/passbook', 'passbook'],
  ['/routes', 'routes'],
  ['/profile', 'profile'],
  ['/pricing', 'pricing'],
  ['/security', 'security'],
  ['/support', 'support'],
  ['/examples', 'examples'],
  ['/redeem', 'redeem'],
  ['/merchant/scan', 'merchant-scan'],
  ['/causal-graph', 'causal-graph'],
  ['/merchant/today', 'merchant-today'],
  ['/merchant/campaigns', 'merchant-campaigns'],
  ['/merchant/ledger', 'merchant-ledger'],
  ['/admin/relayer', 'admin-relayer'],
  ['/developer', 'developer'],
  ['/example-receipt-graph', 'example-receipt-graph'],
];

const viewportSets = {
  core: [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile', width: 390, height: 920 },
  ],
  final: [
    { name: 'mobile-320', width: 320, height: 900 },
    { name: 'mobile-390', width: 390, height: 920 },
    { name: 'mobile-430', width: 430, height: 932 },
    { name: 'tablet-1024', width: 1024, height: 900 },
    { name: 'desktop-1440', width: 1440, height: 1100 },
    { name: 'wide-1728', width: 1728, height: 1200 },
  ],
};

const viewports = viewportSets[viewportSet] || [
  { name: 'desktop', width: 1440, height: 1100 },
  { name: 'mobile', width: 390, height: 920 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const callbacks = new Map();
    let id = 0;

    ws.onopen = () => {
      resolve({
        send(method, params = {}) {
          const current = ++id;
          ws.send(JSON.stringify({ id: current, method, params }));
          return new Promise((res, rej) => callbacks.set(current, { res, rej }));
        },
        close() {
          ws.close();
        },
      });
    };
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !callbacks.has(message.id)) return;
      const callback = callbacks.get(message.id);
      callbacks.delete(message.id);
      if (message.error) callback.rej(new Error(JSON.stringify(message.error)));
      else callback.res(message.result);
    };
  });
}

async function assertServer() {
  const response = await fetch(`${baseUrl}/demo`);
  if (!response.ok) {
    throw new Error(`Expected a running app at ${baseUrl}; /demo returned ${response.status}.`);
  }
}

async function capture(route, name, viewport) {
  const target = await getJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 700,
  });
  await cdp.send('Page.navigate', { url: `${baseUrl}${route}` });
  await sleep(2600);

  const evaluation = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const text = document.body.textContent || '';
      const banned = ${JSON.stringify(bannedCopy.map((pattern) => pattern.source))}.filter((source) => new RegExp(source, 'i').test(text));
      const styles = Array.from(document.styleSheets).some((sheet) => {
        try {
          return Array.from(sheet.cssRules || []).some((rule) => String(rule.cssText).includes(':focus-visible'));
        } catch {
          return false;
        }
      });
      return {
        title: document.title,
        route: location.pathname,
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1,
        h1: document.querySelector('h1')?.textContent || '',
        textLength: text.trim().length,
        oldChrome: text.includes('Consumer Mode') || text.includes('Current passbook'),
        bannedCopy: banned,
        missingFocusStyles: !styles
      };
    })()`,
  });

  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(outDir, `${name}-${viewport.name}.png`);
  writeFileSync(file, Buffer.from(screenshot.data, 'base64'));
  await cdp.send('Target.closeTarget', { targetId: target.id }).catch(() => {});
  cdp.close();
  return { route, name, viewport, file, ...evaluation.result.value };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  await assertServer();

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });

  try {
    await sleep(1800);
    const results = [];
    for (const [route, name] of routes) {
      for (const viewport of viewports) {
        results.push(await capture(route, name, viewport));
      }
    }
    const manifest = { generatedAt: new Date().toISOString(), baseUrl, viewportSet, results };
    const manifestPath = path.join(outDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({
      ok: results.every((item) => !item.overflow && !item.oldChrome && item.textLength >= 80 && item.bannedCopy.length === 0 && !item.missingFocusStyles),
      screenshots: results.length,
      manifest: manifestPath,
      overflow: results.filter((item) => item.overflow).map((item) => `${item.route}:${item.viewport.width}`),
      bannedCopy: results.filter((item) => item.bannedCopy.length).map((item) => `${item.route}:${item.viewport.width}`),
    }, null, 2));
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
