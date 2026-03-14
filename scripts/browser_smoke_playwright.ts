import fs from 'fs';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';

import { chromium, type Browser, type Page } from 'playwright';

const ARTIFACT_DIR = path.join(process.cwd(), 'output', 'playwright');
const SUCCESS_SCREENSHOT = path.join(ARTIFACT_DIR, 'browser-smoke-success.png');
const FAILURE_SCREENSHOT = path.join(ARTIFACT_DIR, 'browser-smoke-failure.png');

interface StackReadyInfo {
    appUrl: string;
}

function ensureArtifactDir() {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function spawnStackProcess(): { child: ChildProcess; ready: Promise<StackReadyInfo> } {
    const child = spawn(
        process.execPath,
        ['-r', 'ts-node/register/transpile-only', 'scripts/runtime_browser_stack.ts'],
        {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    );

    const ready = new Promise<StackReadyInfo>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let resolved = false;

        const parseChunk = (chunk: Buffer | string) => {
            const text = chunk.toString();
            stdout += text;

            const readyMatch = stdout.match(/App:\s+(http:\/\/[^\s]+\/login)/);
            if (readyMatch && !resolved) {
                resolved = true;
                resolve({ appUrl: readyMatch[1] });
            }
        };

        child.stdout?.on('data', parseChunk);
        child.stderr?.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.once('exit', (code) => {
            if (!resolved) {
                reject(new Error(`Smoke stack exited before readiness (code ${code ?? 'unknown'}).\n${stdout}\n${stderr}`));
            }
        });

        setTimeout(() => {
            if (!resolved) {
                reject(new Error(`Timed out waiting for smoke stack readiness.\n${stdout}\n${stderr}`));
            }
        }, 120_000);
    });

    return { child, ready };
}

async function stopChild(child: ChildProcess | null) {
    if (!child || child.exitCode !== null) {
        return;
    }

    child.kill('SIGTERM');
    await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        wait(8_000),
    ]);

    if (child.exitCode === null) {
        child.kill('SIGKILL');
    }
}

async function waitForPath(page: Page, pathSuffix: string) {
    await page.waitForURL((url) => url.pathname === pathSuffix, { timeout: 20_000 });
}

async function waitForStoredRole(page: Page, role: 'merchant' | 'consumer') {
    await page.waitForFunction(
        (expectedRole) => window.localStorage.getItem('vs-user-role') === expectedRole,
        role,
        { timeout: 30_000 },
    );
}

async function clickTestId(page: Page, testId: string) {
    await page.getByTestId(testId).click();
}

async function loginAsMerchant(page: Page, baseUrl: string) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await clickTestId(page, 'login-role-merchant');
    await page.getByTestId('login-modal').waitFor({ state: 'visible' });
    await clickTestId(page, 'wallet-option-test-merchant');
    await waitForStoredRole(page, 'merchant');
}

async function createPosCode(page: Page, baseUrl: string): Promise<string> {
    await page.goto(`${baseUrl}/pos`, { waitUntil: 'networkidle' });
    await page.getByTestId('pos-amount-input').fill('25000');
    await clickTestId(page, 'pos-create-code-button');
    await page.getByTestId('pos-active-code').waitFor({ state: 'visible', timeout: 20_000 });
    const code = (await page.getByTestId('pos-active-code').textContent())?.trim();
    if (!code) {
        throw new Error('POS code was not rendered after creation.');
    }
    return code;
}

async function signOut(page: Page, baseUrl: string) {
    await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
    await clickTestId(page, 'settings-sign-out');
    await clickTestId(page, 'settings-sign-out-confirm');
    await waitForPath(page, '/login');
}

async function loginAsConsumer(page: Page, baseUrl: string) {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await clickTestId(page, 'login-role-consumer');
    await page.getByTestId('login-modal').waitFor({ state: 'visible' });
    await clickTestId(page, 'wallet-option-test-consumer');
    await waitForStoredRole(page, 'consumer');
}

async function redeemAsConsumer(page: Page, baseUrl: string, code: string) {
    await page.goto(`${baseUrl}/consumer/scan`, { waitUntil: 'networkidle' });
    await page.getByTestId('scan-code-input').fill(code);
    await clickTestId(page, 'scan-start-button');
    await page.getByTestId('scan-signature-link').waitFor({ state: 'visible', timeout: 25_000 });
}

async function runSmoke(page: Page, baseUrl: string) {
    await loginAsMerchant(page, baseUrl);
    const code = await createPosCode(page, baseUrl);
    await signOut(page, baseUrl);
    await loginAsConsumer(page, baseUrl);
    await redeemAsConsumer(page, baseUrl, code);
}

async function main() {
    ensureArtifactDir();

    let stackChild: ChildProcess | null = null;
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        const stack = spawnStackProcess();
        stackChild = stack.child;
        const { appUrl } = await stack.ready;
        const baseUrl = appUrl.replace(/\/login$/, '');

        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            viewport: { width: 1440, height: 1100 },
        });
        page = await context.newPage();

        await runSmoke(page, baseUrl);
        await page.screenshot({ path: SUCCESS_SCREENSHOT, fullPage: true });
        console.log(`Browser smoke passed. Screenshot: ${SUCCESS_SCREENSHOT}`);
    } catch (error: unknown) {
        if (page) {
            await page.screenshot({ path: FAILURE_SCREENSHOT, fullPage: true }).catch(() => undefined);
        }
        throw error;
    } finally {
        await browser?.close();
        await stopChild(stackChild);
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
