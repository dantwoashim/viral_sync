import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync, type ChildProcess } from 'child_process';

import { chromium, type Browser, type BrowserContext, type Locator, type Page } from 'playwright';

const REPO_ROOT = process.cwd();
const ARTIFACT_DIR = path.join(process.cwd(), 'output', 'playwright');
const SUCCESS_SCREENSHOT = path.join(ARTIFACT_DIR, 'browser-smoke-success.png');
const FAILURE_SCREENSHOT = path.join(ARTIFACT_DIR, 'browser-smoke-failure.png');
const SKIP_APP_BUILD = process.env.VIRAL_SYNC_SKIP_APP_BUILD === 'true';

interface SpawnedProcess {
    child: ChildProcess;
    output: () => string;
}

function ensureArtifactDir() {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort(): Promise<number> {
    const server = http.createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (!address || typeof address !== 'object') {
        throw new Error('Failed to allocate a free port for the smoke app.');
    }
    return address.port;
}

function spawnNpm(workdir: string, args: string[], env: NodeJS.ProcessEnv): SpawnedProcess {
    let stdout = '';
    let stderr = '';
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
        cwd: workdir,
        env: {
            ...process.env,
            ...env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
    });

    child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    return {
        child,
        output: () => `${stdout}\n${stderr}`.trim(),
    };
}

function runNpmSync(workdir: string, args: string[], env: NodeJS.ProcessEnv) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
        cwd: workdir,
        env: {
            ...process.env,
            ...env,
        },
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

    if (result.status !== 0) {
        throw new Error(`npm ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`);
    }
}

async function stopChild(processRef: ChildProcess | null): Promise<void> {
    if (!processRef || processRef.exitCode !== null) {
        return;
    }

    processRef.kill('SIGTERM');
    await Promise.race([
        new Promise((resolve) => processRef.once('exit', resolve)),
        wait(8_000),
    ]);

    if (processRef.exitCode === null) {
        processRef.kill('SIGKILL');
    }
}

async function waitForHttp(url: string, processRef: SpawnedProcess): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 45_000) {
        if (processRef.child.exitCode !== null) {
            throw new Error(`Smoke app exited early while waiting for ${url}.\n${processRef.output()}`);
        }

        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
            if (response.ok) {
                return;
            }
        } catch {
            // wait for app startup
        }

        await wait(300);
    }

    throw new Error(`Timed out waiting for ${url}.\n${processRef.output()}`);
}

async function waitForButtonEnabled(page: Page, testId: string) {
    await page.waitForFunction(
        (id) => {
            const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
            return Boolean(element) && !element.hasAttribute('disabled');
        },
        testId,
        { timeout: 20_000 },
    );
}

async function waitForStableCode(locator: Locator): Promise<string> {
    const started = Date.now();
    await locator.waitFor({ state: 'visible', timeout: 20_000 });

    while (Date.now() - started < 20_000) {
        const code = (await locator.textContent())?.trim() ?? '';
        if (/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)) {
            return code;
        }
        await wait(250);
    }

    throw new Error('Timed out waiting for a live redemption code.');
}

async function waitForPassbookIdentity(page: Page) {
    await page.waitForFunction(() => {
        const sessionRaw = window.localStorage.getItem('vs-nepal-session');
        const deviceId = window.localStorage.getItem('vs-nepal-device');
        return Boolean(sessionRaw && deviceId);
    }, { timeout: 20_000 });
}

async function openInvitePreview(page: Page, baseUrl: string): Promise<string> {
    await page.goto(`${baseUrl}/invite`, { waitUntil: 'networkidle' });
    await waitForPassbookIdentity(page);

    const authState = await page.evaluate(() => {
        const sessionRaw = window.localStorage.getItem('vs-nepal-session');
        const deviceId = window.localStorage.getItem('vs-nepal-device');
        const session = sessionRaw ? JSON.parse(sessionRaw) as {
            sessionId: string;
            displayName: string;
        } : null;

        return {
            sessionId: session?.sessionId ?? null,
            displayName: session?.displayName ?? 'Guest',
            deviceId,
        };
    });

    if (!authState.sessionId || !authState.deviceId) {
        throw new Error('Invite smoke could not read the initialized passbook identity.');
    }

    const response = await fetch(`${baseUrl}/api/launch/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: authState.sessionId,
            displayName: authState.displayName,
            deviceFingerprint: authState.deviceId,
        }),
    });
    const payload = await response.json() as { sharePath?: string; error?: string };
    if (!response.ok || !payload.sharePath) {
        throw new Error(payload.error ?? 'Invite smoke could not create a referral link.');
    }

    return `${baseUrl}${payload.sharePath}`;
}

async function claimOffer(page: Page, previewUrl: string) {
    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await waitForButtonEnabled(page, 'offer-claim-button');
    await page.getByTestId('offer-claim-button').click();
    await page.waitForURL((url) => url.pathname === '/redeem', { timeout: 20_000 });
}

async function confirmRedeemFlow(inviteePage: Page, merchantPage: Page, baseUrl: string) {
    const code = await waitForStableCode(inviteePage.getByTestId('redeem-active-code'));

    await merchantPage.goto(`${baseUrl}/merchant/scan`, { waitUntil: 'networkidle' });
    await merchantPage.getByTestId('merchant-operator-name').fill('Pilot Counter');
    await merchantPage.getByTestId('merchant-access-code').fill('pilot-counter');
    await merchantPage.getByTestId('merchant-access-submit').click();
    await merchantPage.waitForSelector('[data-testid="merchant-code-input"]', { timeout: 20_000 });
    await merchantPage.getByTestId('merchant-code-input').fill(code);
    await merchantPage.getByTestId('merchant-confirm-button').click();
    await merchantPage.waitForFunction(
        (expectedCode) => {
            const element = document.querySelector<HTMLElement>('[data-testid="merchant-confirm-message"]');
            return Boolean(element?.textContent?.includes(expectedCode)) && element?.textContent?.includes('redeemed');
        },
        code,
        { timeout: 20_000 },
    );
}

async function closeContext(context: BrowserContext | null) {
    await context?.close();
}

async function main() {
    ensureArtifactDir();

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viral-sync-browser-smoke-'));
    const ledgerPath = path.join(tempDir, 'launch-ledger.json');

    let appProcess: SpawnedProcess | null = null;
    let browser: Browser | null = null;
    let referrerContext: BrowserContext | null = null;
    let inviteeContext: BrowserContext | null = null;
    let merchantContext: BrowserContext | null = null;
    let activePage: Page | null = null;

    try {
        const appPort = await getFreePort();
        const baseUrl = `http://127.0.0.1:${appPort}`;
        const sharedEnv = {
            PORT: String(appPort),
            VIRAL_SYNC_LEDGER_PATH: ledgerPath,
            VIRAL_SYNC_MERCHANT_ACCESS_CODE: 'pilot-counter',
            VIRAL_SYNC_MERCHANT_SESSION_SECRET: 'browser-smoke-secret',
        };

        if (!SKIP_APP_BUILD) {
            runNpmSync(REPO_ROOT, ['run', 'build', '--workspace', 'app'], sharedEnv);
        }

        appProcess = spawnNpm(
            REPO_ROOT,
            ['run', 'start', '--workspace', 'app', '--', '--hostname', '127.0.0.1', '--port', String(appPort)],
            sharedEnv
        );
        await waitForHttp(`${baseUrl}/login`, appProcess);

        browser = await chromium.launch({ headless: true });
        referrerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
        inviteeContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
        merchantContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });

        const referrerPage = await referrerContext.newPage();
        const inviteePage = await inviteeContext.newPage();
        const merchantPage = await merchantContext.newPage();
        activePage = merchantPage;

        const previewUrl = await openInvitePreview(referrerPage, baseUrl);
        await claimOffer(inviteePage, previewUrl);
        await confirmRedeemFlow(inviteePage, merchantPage, baseUrl);

        activePage = merchantPage;
        await merchantPage.screenshot({ path: SUCCESS_SCREENSHOT, fullPage: true });
        console.log(`Browser smoke passed. Screenshot: ${SUCCESS_SCREENSHOT}`);
    } catch (error: unknown) {
        if (activePage) {
            await activePage.screenshot({ path: FAILURE_SCREENSHOT, fullPage: true }).catch(() => undefined);
        }
        throw error;
    } finally {
        await closeContext(merchantContext);
        await closeContext(inviteeContext);
        await closeContext(referrerContext);
        await browser?.close();
        await stopChild(appProcess?.child ?? null);
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

void main()
    .then(() => {
        process.exit(0);
    })
    .catch((error: unknown) => {
        console.error('Browser smoke failed', error);
        process.exit(1);
    });
