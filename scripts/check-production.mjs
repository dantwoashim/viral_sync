const baseUrl = process.env.PRODUCTION_BASE_URL || 'https://viralsync1.vercel.app';

const checks = [
  { name: 'home', path: '/', expectedStatus: 200 },
  { name: 'ops summary', path: '/api/launch/ops/summary', expectedStatus: 200 },
  { name: 'merchant summary', path: '/api/launch/merchant/summary', expectedStatus: 200 },
  { name: 'relayer monitoring', path: '/api/launch/relayer/monitoring', expectedStatus: 200 },
];

async function runCheck(check) {
  const startedAt = Date.now();
  const response = await fetch(new URL(check.path, baseUrl), {
    headers: { accept: 'application/json,text/html;q=0.9,*/*;q=0.8' },
  });
  const latencyMs = Date.now() - startedAt;
  const body = await response.text();

  if (response.status !== check.expectedStatus) {
    throw new Error(`${check.name} returned ${response.status}, expected ${check.expectedStatus}`);
  }

  if (!body.trim()) {
    throw new Error(`${check.name} returned an empty response`);
  }

  return {
    name: check.name,
    status: response.status,
    latencyMs,
    bytes: body.length,
  };
}

const results = [];

for (const check of checks) {
  results.push(await runCheck(check));
}

console.log(JSON.stringify({
  ok: true,
  checkedAt: new Date().toISOString(),
  baseUrl,
  results,
}, null, 2));
