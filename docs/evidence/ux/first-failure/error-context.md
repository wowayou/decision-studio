# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ux.spec.ts >> 窄屏编辑闭环 >> 对话框焦点包含、Escape 取消、应用反馈与返回节点
- Location: tests/e2e/ux.spec.ts:124:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [aria-hidden] [ref=e3]:
    - complementary [ref=e4]:
      - link [ref=e5] [cursor=pointer]:
        - /url: "#main"
        - generic [ref=e9]:
          - text: Decision Studio
          - generic [ref=e10]: 让每个选择都有依据
      - navigation [ref=e12]:
        - button [ref=e13] [cursor=pointer]: 引导决策
        - button [ref=e16] [cursor=pointer]: 决策依赖图
        - button [ref=e19] [cursor=pointer]: 方案与取舍
        - button [ref=e22] [cursor=pointer]: 决策记录
      - button [ref=e26] [cursor=pointer]: 场景模板
    - generic [ref=e29]:
      - banner [ref=e30]:
        - generic [ref=e31]:
          - text: 我的工作空间
          - generic [ref=e32]: /
          - text: 网站选型
        - generic [ref=e33]:
          - generic [ref=e34] [cursor=pointer]:
            - text: 导入
            - button [ref=e37]
          - button [ref=e39] [cursor=pointer]: 导出
      - main [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e46]:
            - generic [ref=e47]: WEBSITE ARCHITECTURE
            - heading [level=1] [ref=e48]: 带账户的 SaaS 网站
            - paragraph [ref=e49]: 应用答案后自动更新相关能力与方案。查看、取消或返回，不会改写已确认事实。
          - status [ref=e51]: 已保存到本机 · r0
        - button [ref=e55] [cursor=pointer]:
          - generic [ref=e58]: 全部关键决策
          - generic [ref=e59]: 0 项已确认 · 8 项待核对
        - generic [ref=e62]:
          - generic [ref=e63]:
            - generic [ref=e64]:
              - heading [level=2] [ref=e65]: 选择节点，就地调整条件
              - paragraph [ref=e66]: 输入节点可直接修改；规则节点可追溯上游。应用后自动重算，不用重新走引导。
            - button [expanded] [ref=e67] [cursor=pointer]: 收起详情
          - generic [ref=e69]:
            - generic [ref=e71]:
              - generic [ref=e72]: 你的输入
              - generic [ref=e73]: 所需能力
              - generic [ref=e74]: 条件与运行
              - generic [ref=e75]: 认证
              - button [ref=e85] [cursor=pointer]:
                - generic [ref=e86]:
                  - generic [ref=e87]: 网站用途
                  - generic [ref=e88]: 模板默认
                - generic [ref=e89]: 了解产品或业务、阅读文章
                - generic [ref=e90]: 点击修改
              - button [ref=e93] [cursor=pointer]:
                - generic [ref=e94]:
                  - generic [ref=e95]: 内容维护者
                  - generic [ref=e96]: 模板默认
                - generic [ref=e97]: 运营同事
                - generic [ref=e98]: 点击修改
              - button [pressed] [ref=e101] [cursor=pointer]:
                - generic [ref=e102]:
                  - generic [ref=e103]: 访客账户
                  - generic [ref=e104]: 模板默认
                - generic [ref=e105]: 现在需要
                - generic [ref=e106]: 点击修改
              - button [ref=e109] [cursor=pointer]:
                - generic [ref=e110]:
                  - generic [ref=e111]: 内容语言
                  - generic [ref=e112]: 模板默认
                - generic [ref=e113]: 中文、英语
                - generic [ref=e114]: 点击修改
              - button [ref=e117] [cursor=pointer]:
                - generic [ref=e118]:
                  - generic [ref=e119]: 硬性限制
                  - generic [ref=e120]: 模板默认
                - generic [ref=e121]: 没有额外限制
                - generic [ref=e122]: 点击修改
              - button [ref=e125] [cursor=pointer]:
                - generic [ref=e126]:
                  - generic [ref=e127]: 月预算
                  - generic [ref=e128]: 待确认
                - generic [ref=e129]: 尚不确定
                - generic [ref=e130]: 点击修改
              - button [ref=e133] [cursor=pointer]:
                - generic [ref=e134]:
                  - generic [ref=e135]: 维护偏好
                  - generic [ref=e136]: 模板默认
                - generic [ref=e137]: 一起权衡
                - generic [ref=e138]: 点击修改
              - button [ref=e141] [cursor=pointer]:
                - generic [ref=e142]:
                  - generic [ref=e143]: 本期账户能力
                  - generic [ref=e144]: 规则推导
                - generic [ref=e145]: 本期需要账户
                - generic [ref=e146]: 规则推导
              - button [ref=e147] [cursor=pointer]:
                - generic [ref=e148]:
                  - generic [ref=e149]: 登录方式
                  - generic [ref=e150]: 模板默认
                - generic [ref=e151]: 邮箱登录
                - generic [ref=e152]: 点击修改
              - button [ref=e155] [cursor=pointer]:
                - generic [ref=e156]:
                  - generic [ref=e157]: 编辑能力
                  - generic [ref=e158]: 规则推导
                - generic [ref=e159]: 可视化内容后台
                - generic [ref=e160]: 规则推导
              - button [ref=e161] [cursor=pointer]:
                - generic [ref=e162]:
                  - generic [ref=e163]: 身份认证
                  - generic [ref=e164]: 规则推导
                - generic [ref=e165]: 邮箱登录
                - generic [ref=e166]: 规则推导
              - button [ref=e167] [cursor=pointer]:
                - generic [ref=e168]:
                  - generic [ref=e169]: 账户数据
                  - generic [ref=e170]: 规则推导
                - generic [ref=e171]: 访客账户存储与备份
                - generic [ref=e172]: 规则推导
              - button [ref=e173] [cursor=pointer]:
                - generic [ref=e174]:
                  - generic [ref=e175]: 部署形态
                  - generic [ref=e176]: 规则推导
                - generic [ref=e177]: 支持登录会话的服务端
                - generic [ref=e178]: 规则推导
              - button [ref=e179] [cursor=pointer]:
                - generic [ref=e180]:
                  - generic [ref=e181]: 发布与询盘
                  - generic [ref=e182]: 规则推导
                - generic [ref=e183]: 业务展示页、文章归档、多语言地址与翻译校对
                - generic [ref=e184]: 规则推导
            - paragraph [ref=e185]: Tab / Enter 可选择节点。窄屏可横向浏览，也可用「全部关键决策」修改。
        - generic [ref=e188]:
          - generic [ref=e189]: Decision Studio · 决策正确性优先
          - generic [ref=e190]: 本地规则 · 无远端部署 · 无 AI 调用
  - dialog [ref=e191]:
    - region "修改决策" [ref=e192]:
      - generic [ref=e193]:
        - heading "修改：访客账户" [level=2] [ref=e197]
        - generic [ref=e198]: 单选
        - button "取消修改" [ref=e199] [cursor=pointer]
      - generic [ref=e202]:
        - generic [ref=e203]:
          - generic [ref=e204]:
            - text: 访客账户
            - generic [ref=e205]: / Q03
          - heading "访客现在需要登录网站吗？" [level=3] [ref=e206]
          - paragraph [ref=e207]: 登录后查看个人内容，需要核实身份、保存账户资料，并安排运行这些功能的服务。
          - paragraph [ref=e208]:
            - generic [ref=e209]: 模板默认
            - text: 已应用：现在需要
          - generic [ref=e210]:
            - generic [ref=e213]:
              - text: 系统建议 现在需要
              - generic [ref=e214]: 根据「带账户的 SaaS 网站」场景的起步配置，可按实际情况修改。
            - generic [ref=e215]: 与选项一致
          - paragraph [ref=e216]: 选项预填不代表用户确认。选择只改变草稿，应用修改后自动重算。
          - group "访客现在需要登录网站吗？" [ref=e217]:
            - generic [ref=e219] [cursor=pointer]:
              - radio "现在需要 会员登录后查看自己的内容。" [checked] [ref=e220]
              - generic [ref=e221]:
                - text: 现在需要
                - generic [ref=e222]: 会员登录后查看自己的内容。
            - generic [ref=e223] [cursor=pointer]:
              - radio "无需访客账户 访客直接浏览公开页面。运营登录编辑后台仍然可以使用。" [ref=e224]
              - generic [ref=e225]:
                - text: 无需访客账户
                - generic [ref=e226]: 访客直接浏览公开页面。运营登录编辑后台仍然可以使用。
            - generic [ref=e227] [cursor=pointer]:
              - radio "以后可能需要 当期先做公开页面，将账户能力列入后续阶段。" [ref=e228]
              - generic [ref=e229]:
                - text: 以后可能需要
                - generic [ref=e230]: 当期先做公开页面，将账户能力列入后续阶段。
          - generic [ref=e231]:
            - button "尚不确定" [ref=e232] [cursor=pointer]
            - button "其他情况" [ref=e233] [cursor=pointer]
          - region "影响预览" [ref=e234]:
            - generic [ref=e235]:
              - generic [ref=e238]: 应用前预览
              - generic [ref=e239]: 尚未应用
            - paragraph [ref=e240]: 答案保持「现在需要」
            - paragraph [ref=e241]: 下游结果没有变化 · 可评估方向 2 → 2
            - group [ref=e242]:
              - generic "查看将发生的变化与保留项" [ref=e243] [cursor=pointer]
          - group [ref=e244]:
            - generic "当前答案的来源与理由" [ref=e245] [cursor=pointer]
        - generic [ref=e246]:
          - generic [ref=e247]:
            - button "取消" [ref=e248] [cursor=pointer]
            - generic [ref=e249]: 尚未确认
          - button "应用修改" [ref=e250] [cursor=pointer]
```

# Test source

```ts
  30  |   await expect(page.getByRole('button', { name: '决策依赖图', exact: true })).toHaveAttribute('aria-current', 'page');
  31  |   await expect(page.getByTestId('node-login')).toHaveAttribute('aria-pressed', 'true');
  32  |   await expect(page.getByTestId('node-login')).toBeFocused();
  33  |   const after = await snapshot(page);
  34  |   expect(after.project.answers.login.value).toBe('none'); expect(after.project.revision).toBe(before.project.revision + 1);
  35  |   expect(after.candidates.filter((c: { feasible: boolean | string }) => c.feasible !== false)).toHaveLength(3);
  36  |   await page.screenshot({ path: 'test-results/ux-graph-applied.png', fullPage: true });
  37  | });
  38  | 
  39  | test('未应用修改离开有明确选择，继续编辑保留草稿，取消不改项目', async ({ page }) => {
  40  |   await start(page, 'B2B 多语言官网');
  41  |   const before = (await snapshot(page)).project;
  42  |   await page.getByRole('checkbox', { name: /开发人员/ }).check();
  43  |   await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  44  |   await expect(page.getByRole('dialog')).toContainText('当前修改还没有应用');
  45  |   await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  46  |   await expect(page.getByRole('checkbox', { name: /开发人员/ })).toBeChecked();
  47  |   await expect(page.getByRole('checkbox', { name: /开发人员/ })).toBeFocused();
  48  |   expect((await snapshot(page)).project).toEqual(before);
  49  |   await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  50  |   await page.getByRole('button', { name: '放弃并离开', exact: true }).click();
  51  |   await page.getByTestId('node-login').click(); await page.getByRole('radio', { name: /现在需要/ }).check();
  52  |   await page.getByRole('button', { name: '取消', exact: true }).click();
  53  |   expect((await snapshot(page)).project).toEqual(before);
  54  |   await expect(page.getByTestId('node-login')).toBeFocused();
  55  | });
  56  | 
  57  | test('建议与未知都只改变草稿；任意修改从方案和记录返回原上下文', async ({ page }) => {
  58  |   await start(page, 'B2B 多语言官网');
  59  |   await page.getByRole('button', { name: '方案与取舍', exact: true }).click();
  60  |   const before = (await snapshot(page)).project;
  61  |   await openQuestion(page, '访客账户');
  62  |   await page.getByRole('button', { name: '填入建议', exact: true }).click();
  63  |   await expect(page.getByRole('radio', { name: /无需访客账户/ })).toBeChecked();
  64  |   expect((await snapshot(page)).project).toEqual(before);
  65  |   await page.getByRole('button', { name: '尚不确定', exact: true }).click();
  66  |   expect((await snapshot(page)).project).toEqual(before);
  67  |   await commit(page);
  68  |   await expect(page.getByRole('dialog')).toHaveCount(0);
  69  |   await expect(page.getByRole('button', { name: '方案与取舍', exact: true })).toHaveAttribute('aria-current', 'page');
  70  |   expect((await snapshot(page)).project.answers.login.source.type).toBe('user');
  71  |   await page.getByRole('button', { name: '决策记录', exact: true }).click();
  72  |   await page.locator('.recordrow').filter({ hasText: '维护偏好' }).getByRole('button', { name: '修改', exact: true }).click();
  73  |   await page.getByRole('radio', { name: /非常看重低维护/ }).check(); await commit(page);
  74  |   await expect(page.getByRole('button', { name: '决策记录', exact: true })).toHaveAttribute('aria-current', 'page');
  75  |   expect((await snapshot(page)).project.answers.priority.value).toBe('maintenance');
  76  | });
  77  | 
  78  | test('引导上一题与继续只做导航，焦点跟随新题，不产生重复修订', async ({ page }) => {
  79  |   await start(page, 'B2B 多语言官网');
  80  |   await expect(page.getByRole('heading', { name: '以后谁来更新网站内容？' })).toBeFocused();
  81  |   await commit(page);
  82  |   await expect(page.getByRole('heading', { name: '访客现在需要登录网站吗？' })).toBeFocused();
  83  |   await page.getByRole('button', { name: '尚不确定', exact: true }).click(); await commit(page);
  84  |   const before = (await snapshot(page)).project;
  85  |   await page.getByRole('button', { name: '上一题', exact: true }).click();
  86  |   await expect(page.getByRole('heading', { name: '访客现在需要登录网站吗？' })).toBeFocused();
  87  |   await page.getByRole('button', { name: '继续下一题', exact: true }).click();
  88  |   await expect(page.getByRole('heading', { name: '哪些条件必须同时满足？' })).toBeFocused();
  89  |   expect((await snapshot(page)).project).toEqual(before);
  90  | });
  91  | 
  92  | test('上游使原答失效后，无关修改不消除提示，重新启用仍需确认', async ({ page }) => {
  93  |   await start(page); await openQuestion(page, '登录方式'); await commit(page);
  94  |   await openQuestion(page, '访客账户'); await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
  95  |   await openQuestion(page, '内容语言'); await page.getByRole('checkbox', { name: /日语/ }).check(); await commit(page);
  96  |   await expect(page.locator('.stale-notice')).toContainText('原值已保留');
  97  |   expect((await snapshot(page)).project.answers.identity.status).toBe('stale');
  98  |   await page.getByRole('button', { name: '调整访客账户', exact: true }).click();
  99  |   await page.getByRole('radio', { name: /现在需要/ }).check(); await commit(page);
  100 |   await expect(page.locator('.stale-notice')).toContainText('仍待重新确认');
  101 |   expect((await snapshot(page)).project.answers.identity.status).toBe('stale');
  102 |   await page.getByRole('button', { name: '重新确认登录方式', exact: true }).click(); await commit(page);
  103 |   await expect(page.locator('.stale-notice')).toHaveCount(0);
  104 |   expect((await snapshot(page)).project.answers.identity.status).toBe('user_confirmed');
  105 | });
  106 | 
  107 | test('从派生能力调整上游后仍选中原能力；已确认相同答案不重复应用', async ({ page }) => {
  108 |   await start(page); await page.getByRole('button', { name: '决策依赖图', exact: true }).click();
  109 |   await page.getByTestId('node-data').click();
  110 |   await page.getByRole('region', { name: '节点依据' }).getByRole('button', { name: /访客账户/ }).click();
  111 |   await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
  112 |   await expect(page.getByTestId('node-data')).toHaveAttribute('aria-pressed', 'true');
  113 |   await expect(page.getByTestId('node-data')).toBeFocused();
  114 |   await expect(page.getByRole('region', { name: '节点依据' })).toContainText('无需访客账户库');
  115 |   const before = (await snapshot(page)).project;
  116 |   await page.getByRole('region', { name: '节点依据' }).getByRole('button', { name: /访客账户/ }).click();
  117 |   await expect(page.getByRole('button', { name: '应用修改', exact: true })).toBeDisabled();
  118 |   await page.getByRole('button', { name: '取消', exact: true }).click();
  119 |   expect((await snapshot(page)).project).toEqual(before);
  120 | });
  121 | 
  122 | test.describe('窄屏编辑闭环', () => {
  123 |   test.use({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  124 |   test('对话框焦点包含、Escape 取消、应用反馈与返回节点', async ({ page }) => {
  125 |     await start(page); await page.getByRole('button', { name: '决策依赖图', exact: true }).tap();
  126 |     const before = (await snapshot(page)).project;
  127 |     await page.getByTestId('node-login').tap();
  128 |     for (let i = 0; i < 16; i++) {
  129 |       await page.keyboard.press('Tab');
> 130 |       expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
      |                                                                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  131 |     }
  132 |     await page.getByRole('radio', { name: /无需访客账户/ }).check();
  133 |     await page.keyboard.press('Escape');
  134 |     await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByTestId('node-login')).toBeFocused();
  135 |     expect((await snapshot(page)).project).toEqual(before);
  136 |     await page.getByTestId('node-login').tap();
  137 |     await expect(page.getByRole('radio', { name: /现在需要/ })).toBeChecked();
  138 |     await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
  139 |     await expect(page.getByRole('dialog')).toContainText('访客账户已应用');
  140 |     await expect(page.locator('dialog #node-info-title')).toBeFocused();
  141 |     expect(await page.evaluate(() => document.querySelectorAll('#node-info-title').length)).toBe(1);
  142 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  143 |     await page.screenshot({ path: 'test-results/ux-mobile-applied.png', fullPage: true });
  144 |     await page.getByRole('button', { name: '返回决策图', exact: true }).tap();
  145 |     await expect(page.getByTestId('node-login')).toBeFocused();
  146 |   });
  147 |   test('图内应用后保存失败也可见，并能在窄屏直接备份', async ({ page }) => {
  148 |     await page.addInitScript(key => {
  149 |       const original = Storage.prototype.setItem;
  150 |       Storage.prototype.setItem = function (k, v) { if (k === key) throw new DOMException('配额不足', 'QuotaExceededError'); original.call(this, k, v); };
  151 |     }, KEY);
  152 |     await start(page); await page.getByRole('button', { name: '决策依赖图', exact: true }).tap();
  153 |     await page.getByTestId('node-login').tap(); await page.getByRole('radio', { name: /无需访客账户/ }).check(); await commit(page);
  154 |     await expect(page.getByRole('dialog').getByRole('alert')).toContainText('本机保存失败');
  155 |     await expect(page.getByRole('region', { name: '变更影响' })).toContainText('访客账户已应用');
  156 |     const waiting = page.waitForEvent('download');
  157 |     await page.getByRole('button', { name: '导出 JSON 备份', exact: true }).tap();
  158 |     const file = await waiting;
  159 |     const data = JSON.parse(await readFile((await file.path())!, 'utf8'));
  160 |     expect(data.project.answers.login.value).toBe('none');
  161 |     expect(await page.evaluate(k => localStorage.getItem(k), KEY)).toBeNull();
  162 |   });
  163 | });
  164 | 
```