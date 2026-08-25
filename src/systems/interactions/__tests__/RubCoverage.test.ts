import { describe, expect, it } from 'vitest';
import { RubCoverage, RUB_COMPLETION_RATIO } from '../RubCoverage';

describe('RubCoverage', () => {
  it('같은 곳을 반복해서 닦아도 제거량을 중복 계산하지 않는다', () => {
    const coverage = new RubCoverage(260, 190);
    const first = coverage.markCircle(130, 95, 26);
    for (let i = 0; i < 100; i++) coverage.markCircle(130, 95, 26);

    expect(coverage.ratio).toBe(first);
    expect(coverage.isComplete).toBe(false);
  });

  it('짧게 한 번 문지른 상태에서는 완료되지 않는다', () => {
    const coverage = new RubCoverage(260, 190);
    for (let x = 30; x <= 110; x += 14) coverage.markCircle(x, 45, 26);

    expect(coverage.ratio).toBeLessThan(RUB_COMPLETION_RATIO);
    expect(coverage.isComplete).toBe(false);
  });

  it('문서 전반을 충분히 닦아야 완료된다', () => {
    const coverage = new RubCoverage(260, 190);
    for (let y = 20; y <= 180; y += 32) {
      for (let x = 20; x <= 250; x += 14) coverage.markCircle(x, y, 26);
    }

    expect(coverage.ratio).toBeGreaterThanOrEqual(RUB_COMPLETION_RATIO);
    expect(coverage.isComplete).toBe(true);
  });
});
