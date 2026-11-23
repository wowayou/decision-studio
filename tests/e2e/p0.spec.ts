import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { KEY, MAX_BYTES } from '../../src/storage/project';

async function start(page: Page, name = 'B2B 多语言官网') {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByRole('region', { name: '方案草案' })).toBeVisible();
}
async function commit(page: Page) {
  await page.getByRole('button', { name: /^(应用修改|确认并继续|继续下一题)$/ }).click();
}
async function edit(page: Page, label: string) {
  if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '引导决策', exact: true }).click();
  const toggle = page.getByRole('button', { name: /全部关键决策/ });
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await page.locator('.allquestions').getByRole('button', { name: new RegExp(`^${label}`) }).click();
  await expect(page.getByRole('region', { name: '修改决策' })).toBeVisible();
}
async function stored(page: Page) { return page.evaluate(k => JSON.parse(localStorage.getItem(k)!).project, KEY); }
async function backup(page: Page, label: string) {
  await page.getByRole('button', { name: '导出', exact: true }).click();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await waiting;
  return { text: await readFile((await file.path())!, 'utf8'), path: (await file.path())! };
}

test('AC01/02：无需 AI，从模板立即进入有注释的引导和草案', async ({ page }) => {
  const external: string[] = [];
  page.on('request', r => { if (new URL(r.url()).origin !== 'http://127.0.0.1:4173') external.push(r.url()); });
  await start(page);
  await expect(page.getByRole('heading', { name: '以后谁来更新网站内容？' })).toBeVisible();
  await expect(page.getByText('选项预填不代表用户确认', { exact: false })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /运营同事/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /开发人员/ })).not.toBeChecked();
  await expect(page.getByRole('button', { name: '尚不确定', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '其他情况' })).toBeVisible();
  await expect(page.locator('.candidate')).toHaveCount(3);
  expect((await stored(page)).answers.editors.status).toBe('preset');
  await commit(page);
  await expect(page.getByRole('heading', { name: '访客现在需要登录网站吗？' })).toBeVisible();
  expect((await stored(page)).answers.editors.status).toBe('user_confirmed');
  expect(external).toEqual([]);
  expect(await page.locator('main').evaluate(el => Array.from(el.childNodes).filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent?.trim()).filter(Boolean))).toEqual([]);
  await page.screenshot({ path: 'test-results/desktop-p0.png', fullPage: true });
});

test('AC03/05/06：多维护者、未知登录、改为需要登录，语言与编辑不丢失', async ({ page }) => {
  await start(page);
  await page.getByRole('checkbox', { name: /开发人员/ }).check();
  await commit(page);
  await page.getByRole('button', { name: '尚不确定', exact: true }).click();
  await commit(page);
  let p = await stored(page);
  expect(p.answers.login.value).toBeNull();
  expect(p.answers.editors.value).toEqual(['team', 'dev']);
  await expect(page.getByTestId('candidate-static_content')).toBeVisible();
  await edit(page, '内容语言'); await commit(page);
  const preserved = (await stored(page)).answers.languages;
  await edit(page, '访客账户');
  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  await expect(page.locator('.candidate')).toHaveCount(2);
  p = await stored(page);
  expect(p.answers.languages).toEqual(preserved);
  expect(p.answers.editors.value).toEqual(['team', 'dev']);
  await page.getByRole('button', { name: '方案与取舍', exact: true }).click();
  await expect(page.getByTestId('capability-data')).toContainText('访客账户存储与备份');
  await expect(page.getByTestId('capability-deploy')).toContainText('支持登录会话的服务端');
  await expect(page.getByTestId('capability-auth')).toContainText('方式待确认');
});

test('AC07：登录方式失效后保留原答，图可用键盘查看证据', async ({ page }) => {
  await start(page, '带账户的 SaaS 网站');
  await edit(page, '登录方式');
  await page.getByRole('radio', { name: /企业统一登录/ }).check(); await commit(page);
  await edit(page, '访客账户');
  await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
  await expect(page.getByText('已确认的登录方式现在不适用，原值已保留。', { exact: true })).toBeVisible();
  const identity = (await stored(page)).answers.identity;
  expect(identity.status).toBe('stale'); expect(identity.value).toBe('company');
  await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  await page.getByTestId('node-identity').focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: '节点依据' })).toContainText('企业统一登录');
  await expect(page.getByRole('region', { name: '节点依据' })).toContainText('已失效');
  await edit(page, '访客账户');
  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  expect((await stored(page)).answers.identity.status).toBe('stale');
  await edit(page, '登录方式'); await commit(page);
  expect((await stored(page)).answers.identity.status).toBe('user_confirmed');
});

test('AC08/09：硬约束冲突不能通过软偏好绕过，修正后只有实际可行数量', async ({ page }) => {
  await start(page, '硬约束冲突示例');
  await expect(page.getByRole('alert', { name: '硬约束冲突' })).toContainText('禁止存储访客账户资料');
  await expect(page.locator('.candidate')).toHaveCount(0);
  await edit(page, '维护偏好');
  await page.getByRole('radio', { name: /非常看重低维护/ }).check(); await commit(page);
  await expect(page.locator('.candidate')).toHaveCount(0);
  expect((await stored(page)).answers.limits.value).toEqual(['accounts', 'no_profiles']);
  await edit(page, '硬性限制');
  await page.getByRole('checkbox', { name: /禁止存储访客账户资料/ }).uncheck(); await commit(page);
  await expect(page.getByRole('alert', { name: '硬约束冲突' })).toHaveCount(0);
  await expect(page.locator('.candidate')).toHaveCount(2);
  await expect(page.getByText('同档并列。', { exact: false })).toBeVisible();
});

test('AC04：区间校验和报告，不用虚构价格宣称达标', async ({ page }) => {
  await start(page); await edit(page, '月预算');
  await page.getByRole('spinbutton', { name: '目标下限', exact: true }).fill('100');
  await page.getByRole('spinbutton', { name: '目标上限', exact: true }).fill('300');
  await page.getByRole('spinbutton', { name: '可容忍上限', exact: true }).fill('200');
  await commit(page);
  await expect(page.getByRole('alert')).toContainText('目标下限 ≤ 目标上限');
  await expect(page.getByRole('spinbutton', { name: '可容忍上限', exact: true })).toBeFocused();
  expect((await stored(page)).answers.budget.value).toBeNull();
  await page.getByRole('spinbutton', { name: '可容忍上限', exact: true }).fill('500'); await commit(page);
  const md = (await backup(page, 'Markdown 草案')).text;
  expect(md).toContain('目标 100–300 元/月，可容忍 300–500 元/月');
  expect(md).toContain('成本待核实'); expect(md).not.toContain('符合预算');
});

test('AC13：自动保存、刷新恢复、JSON 导出、清空再导入一致', async ({ page }) => {
  await start(page); await commit(page);
  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  const before = await stored(page), exported = await backup(page, 'JSON 项目备份');
  const envelope = JSON.parse(exported.text);
  expect(envelope.project).toEqual(before);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'B2B 多语言官网', exact: true })).toBeVisible();
  expect(await stored(page)).toEqual(before);
  await page.getByRole('button', { name: '决策记录', exact: true }).click();
  await page.getByRole('button', { name: '清空本机项目', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '清空项目', exact: true }).click();
  await expect(page.getByRole('heading', { name: '先说目标，再做取舍。' })).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBeNull();
  await page.getByLabel('导入 JSON 项目', { exact: true }).setInputFiles(exported.path);
  await expect(page.getByRole('region', { name: '方案草案' })).toBeVisible();
  expect(await stored(page)).toEqual(before);
  const after = JSON.parse((await backup(page, 'JSON 项目备份')).text);
  expect(after.candidates).toEqual(envelope.candidates);
  expect(after.constraints).toEqual(envelope.constraints); expect(after.nodes).toEqual(envelope.nodes);
});

test('AC11：加载后断网，规则、图、保存和导出仍然可用', async ({ page, context }) => {
  await start(page); await context.setOffline(true); await commit(page);
  await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  await expect(page.locator('.savestatus')).toContainText('已保存到本机');
  await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  await page.getByTestId('node-deploy').click();
  await expect(page.getByRole('region', { name: '节点依据' })).toContainText('支持登录会话的服务端');
  expect((await backup(page, 'JSON 项目备份')).text).toContain('user_confirmed');
});

test('错误与版本不符的导入不会改写当前项目', async ({ page }) => {
  await start(page);
  const before = await stored(page), e = JSON.parse((await backup(page, 'JSON 项目备份')).text);
  e.project.domainPackVersion = '99.0.0';
  await page.getByLabel('导入 JSON 项目', { exact: true }).setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(e)) });
  await expect(page.getByRole('alert')).toContainText('版本不匹配'); expect(await stored(page)).toEqual(before);
  await page.getByLabel('导入 JSON 项目', { exact: true }).setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.alloc(MAX_BYTES + 1, ' ') });
  await expect(page.getByRole('alert')).toContainText('大小限制'); expect(await stored(page)).toEqual(before);
  await page.getByLabel('导入 JSON 项目', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('alert')).toContainText('有效 JSON'); expect(await stored(page)).toEqual(before);
});

test('不匹配的本机版本不自动覆盖，保留原始备份入口', async ({ page }) => {
  await start(page);
  const text = await page.evaluate(k => localStorage.getItem(k)!, KEY), e = JSON.parse(text);
  e.project.domainPackVersion = '99.0.0'; const invalid = JSON.stringify(e);
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: KEY, v: invalid }); await page.reload();
  await expect(page.getByRole('alert')).toContainText('本机项目未恢复');
  await expect(page.getByRole('button', { name: '下载原始本机备份', exact: true })).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBe(invalid);
});

test('本机保存失败有明显提示，当前草案仍可导出', async ({ page }) => {
  await page.addInitScript(k => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === k) throw new DOMException('配额不足', 'QuotaExceededError'); original.call(this, key, value); };
  }, KEY);
  await start(page);
  await expect(page.getByRole('alert')).toContainText('未能保存到本机');
  await expect(page.locator('.savestatus')).toContainText('保存失败');
  const exported = await backup(page, 'JSON 项目备份');
  expect(JSON.parse(exported.text).project.seed).toBe('b2b-site');
  expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBeNull();
});

test('不支持的复杂业务显示覆盖不足，不提供确定性完整架构', async ({ page }) => {
  await start(page); await edit(page, '网站用途');
  await page.getByRole('checkbox', { name: /交易或定制业务/ }).check(); await commit(page);
  await expect(page.getByRole('alert')).toContainText('规则覆盖不足');
  await expect(page.locator('.candidate')).toHaveCount(0);
});

test.describe('移动端与键盘', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  test('其他情况保留为待核对输入，长原文与导出在移动端不溢出', async ({ page }) => {
    await start(page);
    await page.getByRole('button', { name: '其他情况', exact: true }).tap();
    const other = 'X'.repeat(500);
    await page.getByRole('textbox', { name: /补充实际情况/ }).fill(other); await commit(page);
    expect((await stored(page)).answers.editors.value).toEqual({ other });
    await page.getByRole('button', { name: /默认或待核对事项/ }).tap();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const data = JSON.parse((await backup(page, 'JSON 项目备份')).text);
    expect(data.nodes.content.status).toBe('unknown');
    await page.getByRole('button', { name: '决策记录', exact: true }).tap();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test('375px 引导无需 hover 和图编辑，键盘可完成核心选择', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^B2B 多语言官网/ }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '确认并继续', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '尚不确定', exact: true }).focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '确认并继续', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: '方案草案' })).toBeVisible();
    expect((await stored(page)).answers.login.status).toBe('unknown');
    await page.screenshot({ path: 'test-results/mobile-guide-p0.png', fullPage: true });
    await page.getByRole('button', { name: '方案与取舍', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByTestId('capability-membership')).toContainText('待确认');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
    await page.getByTestId('node-login').focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText('访客现在需要登录网站吗？');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('node-login')).toBeFocused();
    await page.getByTestId('node-data').focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: '节点依据' })).toContainText('账户数据');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/mobile-p0.png', fullPage: true });
  });
});
