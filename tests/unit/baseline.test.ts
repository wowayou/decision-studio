import { expect, test } from 'vitest';
import { answer, create, evaluate } from '../../src/core/session';

// Observed baseline, not a product SLA or a timing-sensitive regression assertion.
test('局部重算基线与全量一致性（500 次，固定输入）', () => {
  const base = create('b2b-site', '', '2026-11-22T12:00:00.000Z', 'a994cf01-577d-4ffa-9083-9d26006196c8');
  const samples: number[] = [];
  let last = base;
  for (let i = 0; i < 500; i++) {
    const start = performance.now();
    last = answer(base, 'login', i % 2 ? 'now' : 'none', base.project.createdAt);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(`LOCAL_BASELINE n=500 median=${samples[250].toFixed(3)}ms p95=${samples[475].toFixed(3)}ms`);
  expect(last.result).toEqual(evaluate(last.project).result);
  expect(last.project.log[0].affected).toHaveLength(6);
});
