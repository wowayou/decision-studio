import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

// A bounded, local-only check of the actual dist build. No remote runners/resources.
const origin = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
let timer;
const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('生产冒烟测试超过 30 秒')), 30_000); });
async function run() {
  await new Promise((resolve, reject) => {
    let stderr = '';
    server.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-2000); });
    server.stdout.on('data', data => { if (data.toString().includes(origin)) resolve(); });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`本机预览未启动（${code}）：${stderr}`)));
  });
  browser = await chromium.launch({ timeout: 10_000 });
  console.log(`PRODUCTION_SMOKE browser=${browser.version()}`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(5000);
  const external = [];
  page.on('request', r => { if (new URL(r.url()).origin !== origin) external.push(r.url()); });
  await page.goto(origin, { timeout: 10_000 });
  await expect(page).toHaveTitle(/Decision Studio/);
  await page.getByRole('button', { name: /^B2B 多语言官网/ }).click();
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await page.getByRole('button', { name: '尚不确定', exact: true }).click();
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await expect(page.locator('.candidate')).toHaveCount(3);
  for (const width of [1440, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    console.log(`PRODUCTION_SMOKE viewport=${width} overflow=false candidates=3`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/evidence/ux/production-p0.png', fullPage: true });
  expect(external).toEqual([]);
  console.log('PRODUCTION_SMOKE passed; external HTTP requests=0');
}
try {
  await Promise.race([run(), timeout]);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  await browser?.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    const force = setTimeout(() => server.kill('SIGKILL'), 2000);
    await new Promise(resolve => server.once('exit', resolve));
    clearTimeout(force);
  }
}
