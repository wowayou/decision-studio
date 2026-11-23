import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { KEY } from '../../src/storage/project';

async function start(page: Page, name = '带账户的 SaaS 网站') {
  await page.goto('/'); await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
}
async function snapshot(page: Page) { return page.evaluate(k => JSON.parse(localStorage.getItem(k)!), KEY); }
async function openQuestion(page: Page, label: string) {
  const toggle = page.getByRole('button', { name: /全部关键决策/ });
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await page.locator('.allquestions').getByRole('button', { name: new RegExp(`^${label}`) }).click();
}
const commit = (page: Page) => page.getByRole('button', { name: /^(应用修改|确认并继续|继续下一题)$/ }).click();

test('图节点原位修改：预览不入库，三次操作后保持视图、节点与焦点', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await start(page); await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  const before = await snapshot(page);
  await page.getByTestId('node-login').click();
  const button = page.getByRole('button', { name: '应用修改', exact: true });
  const bounds = await button.boundingBox();
  expect(bounds).not.toBeNull(); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900); expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('radio', { name: /无需访客账户/ }).check();
  await expect(page.getByRole('region', { name: '影响预览' })).toContainText('可评估方向 2 → 3');
  expect((await snapshot(page)).project).toEqual(before.project);
  await page.screenshot({ path: 'test-results/ux-graph-preview.png', fullPage: true });
  await button.click();
  await expect(page.getByRole('region', { name: '变更影响' })).toContainText('访客账户已应用');
  await expect(page.getByRole('button', { name: '决策依赖图', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('node-login')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('node-login')).toBeFocused();
  const after = await snapshot(page);
  expect(after.project.answers.login.value).toBe('none'); expect(after.project.revision).toBe(before.project.revision + 1);
  expect(after.candidates.filter((c: { feasible: boolean | string }) => c.feasible !== false)).toHaveLength(3);
  await page.screenshot({ path: 'test-results/ux-graph-applied.png', fullPage: true });
});

test('未应用修改离开有明确选择，继续编辑保留草稿，取消不改项目', async ({ page }) => {
  await start(page, 'B2B 多语言官网');
  const before = (await snapshot(page)).project;
  await page.getByRole('checkbox', { name: /开发人员/ }).check();
  await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('当前修改还没有应用');
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /开发人员/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /开发人员/ })).toBeFocused();
  expect((await snapshot(page)).project).toEqual(before);
  await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  await page.getByRole('button', { name: '放弃并离开', exact: true }).click();
  await page.getByTestId('node-login').click(); await page.getByRole('radio', { name: /现在需要/ }).check();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  expect((await snapshot(page)).project).toEqual(before);
  await expect(page.getByTestId('node-login')).toBeFocused();
});

test('建议与未知都只改变草稿；任意修改从方案和记录返回原上下文', async ({ page }) => {
  await start(page, 'B2B 多语言官网');
  await page.getByRole('button', { name: '方案与取舍', exact: true }).click();
  const before = (await snapshot(page)).project;
  await openQuestion(page, '访客账户');
  await page.getByRole('button', { name: '填入建议', exact: true }).click();
  await expect(page.getByRole('radio', { name: /无需访客账户/ })).toBeChecked();
  expect((await snapshot(page)).project).toEqual(before);
  await page.getByRole('button', { name: '尚不确定', exact: true }).click();
  expect((await snapshot(page)).project).toEqual(before);
  await commit(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '方案与取舍', exact: true })).toHaveAttribute('aria-current', 'page');
  expect((await snapshot(page)).project.answers.login.source.type).toBe('user');
  await page.getByRole('button', { name: '决策记录', exact: true }).click();
  await page.locator('.recordrow').filter({ hasText: '维护偏好' }).getByRole('button', { name: '修改', exact: true }).click();
  await page.getByRole('radio', { name: /非常看重低维护/ }).check(); await commit(page);
  await expect(page.getByRole('button', { name: '决策记录', exact: true })).toHaveAttribute('aria-current', 'page');
  expect((await snapshot(page)).project.answers.priority.value).toBe('maintenance');
});

test('引导上一题与继续只做导航，焦点跟随新题，不产生重复修订', async ({ page }) => {
  await start(page, 'B2B 多语言官网');
  await expect(page.getByRole('heading', { name: '以后谁来更新网站内容？' })).toBeFocused();
  await commit(page);
  await expect(page.getByRole('heading', { name: '访客现在需要登录网站吗？' })).toBeFocused();
  await page.getByRole('button', { name: '尚不确定', exact: true }).click(); await commit(page);
  const before = (await snapshot(page)).project;
  await page.getByRole('button', { name: '上一题', exact: true }).click();
  await expect(page.getByRole('heading', { name: '访客现在需要登录网站吗？' })).toBeFocused();
  await page.getByRole('button', { name: '继续下一题', exact: true }).click();
  await expect(page.getByRole('heading', { name: '哪些条件必须同时满足？' })).toBeFocused();
  expect((await snapshot(page)).project).toEqual(before);
});

test('上游使原答失效后，无关修改不消除提示，重新启用仍需确认', async ({ page }) => {
  await start(page); await openQuestion(page, '登录方式'); await commit(page);
  await openQuestion(page, '访客账户'); await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
  await openQuestion(page, '内容语言'); await page.getByRole('checkbox', { name: /日语/ }).check(); await commit(page);
  await expect(page.locator('.stale-notice')).toContainText('原值已保留');
  expect((await snapshot(page)).project.answers.identity.status).toBe('stale');
  await page.getByRole('button', { name: '调整访客账户', exact: true }).click();
  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  await expect(page.locator('.stale-notice')).toContainText('仍待重新确认');
  expect((await snapshot(page)).project.answers.identity.status).toBe('stale');
  await page.getByRole('button', { name: '重新确认登录方式', exact: true }).click(); await commit(page);
  await expect(page.locator('.stale-notice')).toHaveCount(0);
  expect((await snapshot(page)).project.answers.identity.status).toBe('user_confirmed');
});

test('从派生能力调整上游后仍选中原能力；已确认相同答案不重复应用', async ({ page }) => {
  await start(page); await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  await page.getByTestId('node-data').click();
  await page.getByRole('region', { name: '节点依据' }).getByRole('button', { name: /访客账户/ }).click();
  await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
  await expect(page.getByTestId('node-data')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('node-data')).toBeFocused();
  await expect(page.getByRole('region', { name: '节点依据' })).toContainText('无需访客账户库');
  const before = (await snapshot(page)).project;
  await page.getByRole('region', { name: '节点依据' }).getByRole('button', { name: /访客账户/ }).click();
  await expect(page.getByRole('button', { name: '应用修改', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  expect((await snapshot(page)).project).toEqual(before);
});

test.describe('窄屏编辑闭环', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  test('对话框焦点包含、Escape 取消、应用反馈与返回节点', async ({ page }) => {
    await start(page); await page.getByRole('button', { name: '决策依赖图', exact: true }).tap();
    const before = (await snapshot(page)).project;
    await page.getByTestId('node-login').tap();
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    }
    await page.getByRole('radio', { name: /无需访客账户/ }).check();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByTestId('node-login')).toBeFocused();
    expect((await snapshot(page)).project).toEqual(before);
    await page.getByTestId('node-login').tap();
    await expect(page.getByRole('radio', { name: /现在需要/ })).toBeChecked();
    await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
    await expect(page.getByRole('dialog')).toContainText('访客账户已应用');
    await expect(page.locator('dialog #node-info-title')).toBeFocused();
    expect(await page.evaluate(() => document.querySelectorAll('#node-info-title').length)).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/ux-mobile-applied.png', fullPage: true });
    await page.getByRole('button', { name: '返回决策图', exact: true }).tap();
    await expect(page.getByTestId('node-login')).toBeFocused();
  });
  test('图内应用后保存失败也可见，并能在窄屏直接备份', async ({ page }) => {
    await page.addInitScript(key => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) { if (k === key) throw new DOMException('配额不足', 'QuotaExceededError'); original.call(this, k, v); };
    }, KEY);
    await start(page); await page.getByRole('button', { name: '决策依赖图', exact: true }).tap();
    await page.getByTestId('node-login').tap(); await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('本机保存失败');
    await expect(page.getByRole('region', { name: '变更影响' })).toContainText('访客账户已应用');
    const waiting = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 JSON 备份', exact: true }).tap();
    const file = await waiting;
    const data = JSON.parse(await readFile((await file.path())!, 'utf8'));
    expect(data.project.answers.login.value).toBe('none');
    expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBeNull();
  });
});
