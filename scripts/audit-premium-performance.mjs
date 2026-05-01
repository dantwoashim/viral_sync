import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const baseUrl = process.env.PREMIUM_PERFORMANCE_BASE_URL || process.env.PREMIUM_SCREENSHOT_BASE_URL || 'http://localhost:3000';
const outPath = path.resolve(process.env.PREMIUM_PERFORMANCE_REPORT || 'tmp/premium-performance-audit.json');
const port = Number(process.env.PREMIUM_CHROME_PORT || 9235);
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.resolve('tmp/chrome-premium-performance-profile');

const routes = [
  '/',
  '/demo',
  '/premium-scorecard',
  '/merchant/scan',
  '/developer',
];

const budgets = {
  routeLoadMs: 6000,
  domNodes: 2600,
  jsHeapMb: 120,
  transferKb: 2800,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
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

async function measure(route) {
  const target = await getJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  const cdp = await connect(target.webSocketDebuggerUrl);
  const resourceSizes = [];

  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 920,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp.send('Page.navigate', { url: `${baseUrl}${route}` });
  await sleep(3200);

  const evaluation = await cdp.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const transferBytes = resources.reduce((sum, item) => sum + (item.transferSize || 0), 0);
      return {
        route: location.pathname,
        routeLoadMs: Math.round(nav?.duration || 0),
        domNodes: document.querySelectorAll('*').length,
        transferKb: Math.round(transferBytes / 1024),
        readyState: document.readyState,
        h1: document.querySelector('h1')?.textContent || ''
      };
    })()`,
  });
  const metrics = await cdp.send('Performance.getMetrics');
  const heapMetric = metrics.metrics.find((item) => item.name === 'JSHeapUsedSize');
  const value = evaluation.result.value;
  const result = {
    ...value,
    jsHeapMb: Number(((heapMetric?.value || 0) / 1024 / 1024).toFixed(2)),
  };

  await cdp.send('Target.closeTarget', { targetId: target.id }).catch(() => {});
  cdp.close();
  return result;
}

async function main() {
  await assertServer();
  mkdirSync(path.dirname(outPath), { recursive: true });

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
    for (const route of routes) {
      results.push(await measure(route));
    }

    const failures = [];
    for (const result of results) {
      if (!result.h1 || result.readyState !== 'complete') failures.push(`${result.route} did not finish rendering.`);
      if (result.routeLoadMs > budgets.routeLoadMs) failures.push(`${result.route} route load ${result.routeLoadMs}ms exceeds ${budgets.routeLoadMs}ms.`);
      if (result.domNodes > budgets.domNodes) failures.push(`${result.route} has ${result.domNodes} DOM nodes over ${budgets.domNodes}.`);
      if (result.jsHeapMb > budgets.jsHeapMb) failures.push(`${result.route} uses ${result.jsHeapMb}MB heap over ${budgets.jsHeapMb}MB.`);
      if (result.transferKb > budgets.transferKb) failures.push(`${result.route} transfers ${result.transferKb}KB over ${budgets.transferKb}KB.`);
    }

    const report = {
      ok: failures.length === 0,
      generatedAt: new Date().toISOString(),
      baseUrl,
      budgets,
      results,
      failures,
    };
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (failures.length > 0) process.exitCode = 1;
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
