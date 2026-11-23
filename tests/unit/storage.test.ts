import { describe, expect, test } from 'vitest';
import { answer, create } from '../../src/core/session';
import { jsonBackup, KEY, MAX_BYTES, restore, save } from '../../src/storage/project';
import { markdown } from '../../src/domain/report';

const at = '2026-11-22T12:00:00.000Z', id = 'a994cf01-577d-4ffa-9083-9d26006196c8';
const seed = () => create('b2b-site', '多语言产品介绍及询盘', at, id);
function revised() {
  let s = seed();
  s = answer(s, 'languages', ['zh', 'en'], at);
  s = answer(s, 'login', 'now', at);
  s = answer(s, 'identity', 'company', at);
  return answer(s, 'login', 'none', at);
}
const alter = (f: (envelope: ReturnType<typeof JSON.parse>) => void) => { const e = JSON.parse(jsonBackup(revised(), at)); f(e); return JSON.stringify(e); };

describe('P0 保存与恢复', () => {
  test('AC13：恢复事实来源、失效原答、约束、候选、修订记录', () => {
    const s = revised(), text = jsonBackup(s, at), recovered = restore(text);
    expect(recovered).toEqual(s);
    expect(markdown(recovered)).toBe(markdown(s));
    expect(recovered.project.answers.identity.value).toBe('company');
    expect(recovered.project.answers.identity.status).toBe('stale');
    expect(recovered.project.answers.languages.source.type).toBe('user');
  });
  test('存储原子单键写入，恢复从事实重新求值', () => {
    const values = new Map<string, string>();
    const storage = { setItem: (k: string, v: string) => values.set(k, v) } as unknown as Storage;
    const s = revised(); save(storage, s);
    expect(values.size).toBe(1); expect(restore(values.get(KEY)!)).toEqual(s);
  });
  test('JSON 中可重建的候选不能伪造结果或覆盖用户事实', () => {
    const text = alter(e => { e.candidates = [{ id: 'fake', feasible: true }]; e.nodes = {}; e.conflicts = []; });
    expect(restore(text)).toEqual(revised());
  });
  test('JSON 重新排版、交换顶层键顺序也可恢复', () => {
    const text = jsonBackup(revised(), at), e = JSON.parse(text);
    expect(restore(JSON.stringify(Object.fromEntries(Object.entries(e).reverse()), null, 2))).toEqual(revised());
  });
  test('保存配额失败会抛错，不伪报成功', () => {
    const storage = { setItem: () => { throw new Error('配额不足'); } } as unknown as Storage;
    expect(() => save(storage, seed())).toThrow('配额不足');
  });
  test.each([
    ['规则版本', (e: ReturnType<typeof JSON.parse>) => { e.project.domainPackVersion = '99.0.0'; }, '版本不匹配'],
    ['格式版本', (e: ReturnType<typeof JSON.parse>) => { e.project.schemaVersion = '0'; }, '格式版本'],
    ['伪造确认', (e: ReturnType<typeof JSON.parse>) => { e.project.answers.editors.status = 'user_confirmed'; }, '不一致'],
    ['AI 建议来源', (e: ReturnType<typeof JSON.parse>) => { e.project.answers.editors.source.type = 'ai'; }, '不合法'],
    ['无记录修改', (e: ReturnType<typeof JSON.parse>) => { e.project.answers.languages.value = ['ja']; }, '不一致'],
    ['修订数', (e: ReturnType<typeof JSON.parse>) => { e.project.revision += 1; }, '不一致'],
    ['非法预算', (e: ReturnType<typeof JSON.parse>) => { e.project.log[0].after.value = { min: 5, target: 3, max: 2 }; }, '预算'],
  ] as const)('%s 不合法时拒绝导入', (_, modify, message) => {
    expect(() => restore(alter(modify))).toThrow(message);
  });
  test('坏 JSON、缺少版本和超限文件均拒绝', () => {
    expect(() => restore('{')).toThrow('有效 JSON');
    expect(() => restore('{}')).toThrow('版本信息');
    expect(() => restore(' '.repeat(MAX_BYTES + 1))).toThrow('大小限制');
  });
  test('大小限制按 UTF-8 字节计算，超限保存不覆盖现有项目', () => {
    const values = new Map<string, string>();
    const storage = { setItem: (k: string, v: string) => values.set(k, v) } as unknown as Storage;
    const before = seed(); save(storage, before);
    const larger = { ...before, project: { ...before.project, description: '汉'.repeat(Math.ceil(MAX_BYTES / 3)) } };
    expect(() => save(storage, larger)).toThrow('大小限制');
    expect(restore(values.get(KEY)!)).toEqual(before);
  });
  test('报告转义用户 Markdown/HTML，不将需求文本当作指令或标记', () => {
    const s = create('blog', '<script>fake</script>\n# forged header', at, id);
    const report = markdown(s);
    expect(report).not.toContain('<script>');
    expect(report).toContain('&lt;script&gt;');
    expect(report).not.toContain('\n# forged header');
  });
});
