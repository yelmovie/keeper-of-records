/** 플레이 가능한 인물 스테이지. 서랍 순서와 인물 연결은 여기서 한 번만 관리한다. */
export const PERSON_STAGES = [
  { order: 1, caseId: 'case-001', personId: 'yunbonggil' },
  { order: 2, caseId: 'case-002', personId: 'kimgu' },
  { order: 3, caseId: 'case-003', personId: 'yugwansun' },
  { order: 4, caseId: 'case-004', personId: 'ahnjunggeun' },
  { order: 5, caseId: 'case-005', personId: 'ahnchangho' },
] as const;

export const ACTIVE_CASE_COUNT = PERSON_STAGES.length;

const ACTIVE_CASE_IDS = new Set<string>(
  PERSON_STAGES.map((stage) => stage.caseId),
);

export function isActiveCaseId(caseId: string): boolean {
  return ACTIVE_CASE_IDS.has(caseId);
}

export function completedActiveCaseCount(caseIds: string[]): number {
  return new Set(caseIds.filter(isActiveCaseId)).size;
}

export function personIdForCase(caseId: string): string | null {
  return PERSON_STAGES.find((stage) => stage.caseId === caseId)?.personId ?? null;
}
