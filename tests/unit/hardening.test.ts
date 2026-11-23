import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { newId } from '../../src/core/id';
import { answer, create } from '../../src/core/session';
import { TEXT_LIMITS } from '../../src/core/types';
import { editableQuestion, guideProgress, isQuestion } from '../../src/domain/inspect';
import { questionOrder } from '../../src/domain/website';
import { jsonBackup, KEY, restore, save, storesProject } from '../../src/storage/project';

const at = '2026-11-22T12:00:00.000Z', id = 'a994cf01-577d-4ffa-9083-9d26006196c8';
const seed = () => create('b2b-site', '', at, id);

describe('标识生成', () => {
  test('非安全上下文没有 randomUUID 时仍生成可导入的 v4 UUID', () => {
    const insecure = { getRandomValues: <T extends ArrayBufferView | null>(array: T) => crypto.getRandomValues(array as unknown as Uint8Array) as unknown as T };
    const values = Array.from({ length: 200 }, () => newId(insecure));
    for (const value of values) {
      expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(z.uuid().safeParse(value).success).toBe(true);
    }
    expect(new Set(values).size).toBe(values.length);
    const session = create('blog', '', at, newId(insecure));
    expect(restore(jsonBackup(session, at))).toEqual(session);
  });
  test('有 randomUUID 时直接使用平台实现', () => {
    expect(newId({ getRandomValues: () => { throw new Error('不应调用'); }, randomUUID: () => id })).toBe(id);
  });
});

describe('输入边界', () => {
  test('需求描述超过导入上限时拒绝创建，避免产生无法再导入的备份', () => {
    expect(() => create('blog', 'a'.repeat(TEXT_LIMITS.description + 1), at, id)).toThrow('字符内');
    const longest = create('blog', 'a'.repeat(TEXT_LIMITS.description), at, id);
    expect(restore(jsonBackup(longest, at))).toEqual(longest);
  });
  test('补充说明长度上限与导入校验一致', () => {
    expect(() => answer(seed(), 'editors', { other: 'x'.repeat(TEXT_LIMITS.other + 1) }, at)).toThrow();
    const s = answer(seed(), 'editors', { other: 'x'.repeat(TEXT_LIMITS.other) }, at);
    expect(restore(jsonBackup(s, at))).toEqual(s);
  });
});

describe('多标签页一致性判定', () => {
  test('只比较项目事实，忽略导出时间与派生结果', () => {
    const s = seed();
    expect(storesProject(jsonBackup(s, at), s.project)).toBe(true);
    expect(storesProject(jsonBackup(s, '2030-01-01T00:00:00.000Z'), s.project)).toBe(true);
    const changed = answer(s, 'login', 'now', at);
    expect(storesProject(jsonBackup(changed, at), s.project)).toBe(false);
  });
  test('清空、缺失与损坏文本都不被当作同一项目', () => {
    expect(storesProject(null, null)).toBe(true);
    expect(storesProject(null, seed().project)).toBe(false);
    expect(storesProject(jsonBackup(seed(), at), null)).toBe(false);
    expect(storesProject('{', seed().project)).toBe(false);
  });
  test('保存返回写入的原文，可用于同源比对', () => {
    const values = new Map<string, string>();
    const text = save({ setItem: (k, v) => { values.set(k, v); } }, seed());
    expect(values.get(KEY)).toBe(text);
  });
});

describe('视图共享的只读查询', () => {
  test('进度只统计当前适用的问题，题号遵循引导顺序', () => {
    const s = seed();
    expect(guideProgress(s, 'editors')).toEqual({ confirmed: 0, total: 7, position: 1 });
    const withAccounts = answer(answer(s, 'editors', ['team'], at), 'login', 'now', at);
    expect(guideProgress(withAccounts, 'identity')).toEqual({ confirmed: 2, total: 8, position: 3 });
    expect(guideProgress(withAccounts, null).position).toBeNull();
    expect(questionOrder.filter(q => editableQuestion(q, withAccounts))).toHaveLength(8);
  });
  test('问题判定与可编辑判定分开：登录方式是问题，但需前提才可编辑', () => {
    expect(isQuestion('identity')).toBe(true);
    expect(isQuestion('membership')).toBe(false);
    expect(editableQuestion('identity', seed())).toBe(false);
  });
});
