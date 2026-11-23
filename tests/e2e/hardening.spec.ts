import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { KEY } from '../../src/storage/project';

async function start(page: Page, name = 'B2B 多语言官网') {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
const commit = (page: Page) => page.getByRole('button', { name: /^(应用修改|确认并继续|继续下一题)$/ }).click();
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).project, KEY);
async function exportJson(page: Page) {
  await page.getByRole('button', { name: '导出', exact: true }).click();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 项目备份', exact: true }).click();
  const file = await waiting;
  return (await file.path())!;
}
/** Visible text rendered below the 12px floor (screen-reader-only text is excluded). */
function textBelowFloor(page: Page) {
  return page.evaluate(() => {
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, element = node.parentElement;
      if (!element || !node.textContent?.trim() || element.closest('.sr, [aria-hidden="true"]')) continue;
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      if (box.width <= 1 || box.height <= 1 || style.visibility === 'hidden') continue;
      if (parseFloat(style.fontSize) < 12) found.push(`${style.fontSize} ${node.textContent.trim().slice(0, 20)}`);
    }
    return found;
  });
}

test('导入替换和清空都使用页内确认：取消不改项目，确认才替换', async ({ page }) => {
  await start(page); await commit(page);
  const backupPath = await exportJson(page), backup = await stored(page);
  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  const current = await stored(page);
  expect(current.revision).toBe(2);

  await page.getByLabel('导入 JSON 项目', { exact: true }).setInputFiles(backupPath);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('用导入的文件替换当前项目？');
  await expect(dialog.getByRole('button', { name: '取消', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await stored(page)).toEqual(current);

  await page.getByLabel('导入 JSON 项目', { exact: true }).setInputFiles(backupPath);
  await page.getByRole('alertdialog').getByRole('button', { name: '替换项目', exact: true }).click();
  await expect(page.locator('.savestatus')).toContainText('r1');
  expect(await stored(page)).toEqual(backup);

  await page.getByRole('button', { name: '决策记录', exact: true }).click();
  await page.getByRole('button', { name: '清空本机项目', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '清空本机项目', exact: true })).toBeFocused();
  expect(await stored(page)).toEqual(backup);
});

test('另一个标签页修改项目时暂停自动保存，不静默覆盖；可载入最新或明确保留', async ({ page, context }) => {
  await start(page);
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByRole('heading', { name: 'B2B 多语言官网', exact: true })).toBeVisible();
  // Merely opening a second tab must not look like a conflicting change.
  await expect(page.getByText('另一个标签页', { exact: false })).toHaveCount(0);

  await commit(page);
  const fromFirst = await stored(page);
  expect(fromFirst.revision).toBe(1);
  await expect(other.getByRole('alert').filter({ hasText: '另一个标签页修改了本机项目' })).toBeVisible();
  await expect(other.locator('.savestatus')).toContainText('已暂停自动保存');

  // Work done in the paused tab stays in memory and does not overwrite the first tab's save.
  await commit(other);
  expect(await stored(other)).toEqual(fromFirst);

  // Loading would drop the paused tab's applied edit, so it asks first; cancel keeps everything.
  await other.getByRole('button', { name: '载入最新版本', exact: true }).click();
  const confirmLoad = other.getByRole('alertdialog');
  await expect(confirmLoad).toContainText('载入另一个标签页的版本？');
  await confirmLoad.getByRole('button', { name: '取消', exact: true }).click();
  await expect(other.locator('.savestatus')).toContainText('已暂停自动保存');
  expect(await stored(other)).toEqual(fromFirst);
  await other.getByRole('button', { name: '载入最新版本', exact: true }).click();
  await other.getByRole('alertdialog').getByRole('button', { name: '载入并放弃此页修改', exact: true }).click();
  await expect(other.getByText('另一个标签页', { exact: false })).toHaveCount(0);
  await expect(other.locator('.savestatus')).toContainText('已保存到本机 · r1');
  expect(await stored(other)).toEqual(fromFirst);

  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  await expect(other.getByRole('alert').filter({ hasText: '另一个标签页修改了本机项目' })).toBeVisible();
  await other.getByRole('button', { name: '保留此页并覆盖', exact: true }).click();
  await expect(other.locator('.savestatus')).toContainText('已保存到本机 · r1');
  expect((await stored(page)).revision).toBe(1);
  await expect(page.getByRole('alert').filter({ hasText: '另一个标签页修改了本机项目' })).toBeVisible();
});

test('即使错过跨标签页事件，写入前也核对本机内容，不覆盖他处保存', async ({ page }) => {
  await start(page);
  const older = await page.evaluate(k => localStorage.getItem(k)!, KEY);
  await commit(page);
  // A same-document write fires no storage event: the same situation as a frozen or bfcache-restored tab.
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: KEY, v: older });
  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  await expect(page.getByRole('alert').filter({ hasText: '另一个标签页修改了本机项目' })).toBeVisible();
  await expect(page.locator('.savestatus')).toContainText('已暂停自动保存');
  expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBe(older);
  await page.getByRole('button', { name: '保留此页并覆盖', exact: true }).click();
  await expect(page.locator('.savestatus')).toContainText('已保存到本机 · r2');
  expect((await stored(page)).revision).toBe(2);
});

test('界面渲染失败时显示恢复页，可下载未被改动的本机备份', async ({ page }) => {
  await start(page); await commit(page);
  const raw = await page.evaluate(k => localStorage.getItem(k), KEY);
  await page.addInitScript(() => { window.matchMedia = () => { throw new Error('模拟渲染失败'); }; });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('界面遇到错误');
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载本机项目备份' }).click();
  expect(await readFile((await (await waiting).path())!, 'utf8')).toBe(raw);
  expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBe(raw);
});

test('导出菜单可用 Escape 关闭并返回触发按钮，点击外部也会关闭', async ({ page }) => {
  await start(page);
  const trigger = page.getByRole('button', { name: '导出', exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('heading', { name: 'B2B 多语言官网', exact: true }).click();
  await expect(page.getByRole('button', { name: 'JSON 项目备份', exact: true })).toHaveCount(0);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`${viewport.width}px：所有视图可见文字不小于 12px，且无页面横向溢出`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    expect(await textBelowFloor(page)).toEqual([]);
    await start(page);
    await page.getByRole('button', { name: /全部关键决策/ }).click();
    for (const view of ['引导决策', '决策依赖图', '方案与取舍', '决策记录']) {
      if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');
      await page.getByRole('button', { name: view, exact: true }).click();
      expect(await textBelowFloor(page), view).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), view).toBe(true);
    }
  });
}

test.describe('窄屏导航', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  test('四个视图在一行内，保留完整可访问名称；顶部操作满足触控尺寸', async ({ page }) => {
    await start(page);
    const tabs = page.getByRole('navigation', { name: '工作台视图' }).getByRole('button');
    await expect(tabs).toHaveCount(4);
    const tops = await tabs.evaluateAll(items => items.map(item => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    await expect(page.getByRole('button', { name: '决策依赖图', exact: true })).toBeVisible();
    for (const name of ['导出', '场景模板']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box!.height, name).toBeGreaterThanOrEqual(44);
    }
  });
});
