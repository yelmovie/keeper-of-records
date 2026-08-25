import { describe, expect, it } from 'vitest';
import {
  ACTIVE_CASE_COUNT,
  PERSON_STAGES,
  completedActiveCaseCount,
  isActiveCaseId,
  personIdForCase,
} from '../../config/PersonStages';

describe('플레이 가능한 인물 스테이지', () => {
  it('서랍 순서대로 다섯 인물만 고정 연결한다', () => {
    expect(ACTIVE_CASE_COUNT).toBe(5);
    expect(PERSON_STAGES).toEqual([
      { order: 1, caseId: 'case-001', personId: 'yunbonggil' },
      { order: 2, caseId: 'case-002', personId: 'kimgu' },
      { order: 3, caseId: 'case-003', personId: 'yugwansun' },
      { order: 4, caseId: 'case-004', personId: 'ahnjunggeun' },
      { order: 5, caseId: 'case-005', personId: 'ahnchangho' },
    ]);
  });

  it('삭제된 김좌진 스테이지는 진입과 완료 수에서 제외한다', () => {
    expect(isActiveCaseId('case-006')).toBe(false);
    expect(personIdForCase('case-006')).toBeNull();
    expect(
      completedActiveCaseCount([
        'case-001',
        'case-002',
        'case-003',
        'case-004',
        'case-005',
        'case-006',
        'case-006',
      ]),
    ).toBe(5);
  });
});
