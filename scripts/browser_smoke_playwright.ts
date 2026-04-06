import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync, type ChildProcess } from 'child_process';

import { chromium, type Browser, type BrowserContext, type Locator, type Page } from 'playwright';

const REPO_ROOT = process.cwd();
const APP_ROOT = path.join(REPO_ROOT, 'app');
const ARTIFACT_DIR = path.join(process.cwd(), 'output', 'playwright');
const SUCCESS_SCREENSHOT = path.join(ARTIFACT_DIR, 'browser-smoke-success.png');
const FAILURE_SCREENSHOT = path.join(ARTIFACT_DIR, 'browser-smoke-failure.png');
const SKIP_APP_BUILD = process.env.VIRAL_SYNC_SKIP_APP_BUILD === 'true';
const APP_BUILD_ID_PATH = path.join(APP_ROOT, '.next', 'BUILD_ID');

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
        const deviceId = window.localStorage.getItem('vs-nepal-device');
        return Boolean(deviceId);
    }, { timeout: 20_000 });
}

async function openInvitePreview(page: Page, baseUrl: string): Promise<string> {
    await page.goto(`${baseUrl}/invite`, { waitUntil: 'networkidle' });
    await waitForPassbookIdentity(page);
    await page.waitForFunction(() => {
        const link = document.querySelector<HTMLAnchorElement>('[data-testid="invite-open-preview"]');
        const href = link?.getAttribute('href');
        return Boolean(href && href !== '#');
    }, { timeout: 20_000 });
    await page.waitForFunction(() => {
        const qr = document.querySelector('.launch-qr');
        return Boolean(qr) && !qr?.textContent?.includes('QR pending');
    }, { timeout: 20_000 });

    const href = await page.getByTestId('invite-open-preview').getAttribute('href');
    if (!href || href === '#') {
        throw new Error('Invite smoke could not read the initialized referral preview link.');
    }

    return href.startsWith('http') ? href : `${baseUrl}${href}`;
}

async function assertSelfClaimBlocked(page: Page, previewUrl: string) {
    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => {
        const button = document.querySelector<HTMLButtonElement>('[data-testid="offer-claim-button"]');
        return Boolean(button?.disabled);
    }, { timeout: 20_000 });
}

async function claimOffer(page: Page, previewUrl: string) {
    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await waitForButtonEnabled(page, 'offer-claim-button');
    await page.getByTestId('offer-claim-button').click();
    await page.waitForURL((url) => url.pathname === '/redeem', { timeout: 20_000 });
}

async function assertMerchantGate(page: Page, baseUrl: string) {
    await page.goto(`${baseUrl}/merchant/scan`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="merchant-operator-name"]', { timeout: 20_000 });
    const codeInput = await page.locator('[data-testid="merchant-code-input"]').count();
    if (codeInput > 0) {
        throw new Error('Merchant scan screen exposed the confirmation input before operator authentication.');
    }
}

async function confirmRedeemFlow(inviteePage: Page, merchantPage: Page, baseUrl: string) {
    const code = await waitForStableCode(inviteePage.getByTestId('redeem-active-code'));

    await assertMerchantGate(merchantPage, baseUrl);
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
            VIRAL_SYNC_ALLOW_FILE_LEDGER_IN_PRODUCTION: 'true',
            VIRAL_SYNC_MERCHANT_ACCESS_CODE: 'pilot-counter',
            VIRAL_SYNC_MERCHANT_SESSION_SECRET: 'browser-smoke-secret',
            VIRAL_SYNC_CONSUMER_SESSION_SECRET: 'browser-smoke-consumer-secret',
        };

        if (!SKIP_APP_BUILD && !fs.existsSync(APP_BUILD_ID_PATH)) {
            runNpmSync(APP_ROOT, ['run', 'build'], sharedEnv);
        }

        appProcess = spawnNpm(
            APP_ROOT,
            ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', String(appPort)],
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
        await assertSelfClaimBlocked(referrerPage, previewUrl);
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
