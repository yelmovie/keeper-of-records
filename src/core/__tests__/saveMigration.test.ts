import { describe, it, expect } from 'vitest';
import { migrateSave, emptyCaseProgress } from '../SaveManager';

describe('저장 데이터 마이그레이션', () => {
  it('버전이 달라도 진행 기록을 버리지 않고 필드 단위로 이관한다', () => {
    // 구버전(v0) 저장: 알 수 없는 필드 + 유효한 진행 기록이 섞여 있다
    const old = {
      version: 0,
      completedCaseIds: ['case-001', 'ghost-case', 123],
      currentCaseId: 'case-002',
      caseProgress: {
        'case-001': { stage: 5, evidenceIds: ['e1'] }, // legacy stage 5 → 4
        'ghost-case': { stage: 2 }, // 없는 사건은 걸러진다
      },
      settings: { bgm: 3, sfx: -1 }, // 범위 밖 값은 보정
      legacyField: '버린다',
    };

    const s = migrateSave(old);

    expect(s.version).toBe(1);
    expect(s.completedCaseIds).toEqual(['case-001']);
    expect(s.currentCaseId).toBe('case-002');
    expect(s.caseProgress['case-001']).toEqual({
      ...emptyCaseProgress(),
      stage: 4,
      evidenceIds: ['e1'],
    });
    expect(s.caseProgress['ghost-case']).toBeUndefined();
    expect(s.settings.bgm).toBe(1);
    expect(s.settings.sfx).toBe(0);
    // 없는 필드는 기본값으로 채워진다
    expect(s.completedTrackIds).toEqual([]);
    expect((s as unknown as Record<string, unknown>).legacyField).toBeUndefined();
  });

  it('깨진 값(null·문자열)은 기본 저장으로 돌아간다', () => {
    expect(migrateSave(null).completedCaseIds).toEqual([]);
    expect(migrateSave('oops').caseProgress).toEqual({});
  });
});
