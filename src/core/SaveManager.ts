/** 진행 저장 — localStorage, 개인정보 저장 없음 */
import { SafeStorage } from './SafeStorage';
import { isActiveCaseId } from '../config/PersonStages';

const SAVE_KEY = 'keeper-of-records:v1';
const SAVE_VERSION = 1;

export interface CaseProgress {
  stage: number; // 0=briefing, 1~4=stages, 6=complete (legacy 5 is migrated to 4)
  /** 이번 회차에 배정된 인물 트랙 (다중 트랙 사건만) */
  trackPersonId: string | null;
  evidenceIds: string[];
  usedQuestionIds: string[];
  markedCandidateId: string | null;
  memorySceneSeen: boolean;
  unlockedProfile: boolean;
}

export interface SaveData {
  version: number;
  completedCaseIds: string[];
  /** 복원을 마친 트랙: `${caseId}/${personId}` */
  completedTrackIds: string[];
  currentCaseId: string | null;
  caseProgress: Record<string, CaseProgress>;
  settings: {
    bgm: number;
    sfx: number;
    muted: boolean;
  };
  lastSavedAt: string;
}

const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  completedCaseIds: [],
  completedTrackIds: [],
  currentCaseId: null,
  caseProgress: {},
  settings: { bgm: 0.7, sfx: 0.8, muted: false },
  lastSavedAt: '',
};

export const emptyCaseProgress = (): CaseProgress => ({
  stage: 0,
  trackPersonId: null,
  evidenceIds: [],
  usedQuestionIds: [],
  markedCandidateId: null,
  memorySceneSeen: false,
  unlockedProfile: false,
});

/** 저장 데이터 이관 겸 보정.
 *  버전이 달라도 통째로 버리지 않고 필드 단위로 검증해 살릴 수 있는
 *  진행 기록(completedCaseIds, caseProgress 등)은 최대한 보존하고,
 *  모르는 필드는 DEFAULT 값으로 채운다. (테스트를 위해 export)
 */
export function migrateSave(raw: unknown): SaveData {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_SAVE);
  const r = raw as Partial<SaveData>;
  const base = structuredClone(DEFAULT_SAVE);
  return {
    ...base,
    lastSavedAt: typeof r.lastSavedAt === 'string' ? r.lastSavedAt : '',
    version: SAVE_VERSION,
    completedCaseIds: Array.isArray(r.completedCaseIds)
      ? r.completedCaseIds.filter(
          (x): x is string => typeof x === 'string' && isActiveCaseId(x),
        )
      : [],
    completedTrackIds: Array.isArray(r.completedTrackIds)
      ? r.completedTrackIds.filter(
          (x): x is string =>
            typeof x === 'string' && isActiveCaseId(x.split('/')[0] ?? ''),
        )
      : [],
    currentCaseId:
      typeof r.currentCaseId === 'string' && isActiveCaseId(r.currentCaseId)
        ? r.currentCaseId
        : null,
    caseProgress:
      r.caseProgress && typeof r.caseProgress === 'object'
        ? Object.fromEntries(
            Object.entries(r.caseProgress as Record<string, CaseProgress>)
              .filter(([caseId]) => isActiveCaseId(caseId))
              .map(([k, p]) => {
                const progress = { ...emptyCaseProgress(), ...p };
                // 인물 비교 단계가 제거되기 전 저장값(5)은 현재 기록 복원 단계(4)다.
                if (progress.stage === 5) progress.stage = 4;
                return [k, progress];
              }),
          )
        : {},
    settings: {
      bgm: clamp01(r.settings?.bgm, 0.7),
      sfx: clamp01(r.settings?.sfx, 0.8),
      muted: r.settings?.muted === true,
    },
  };
}

function clamp01(v: unknown, fallback: number): number {
  return typeof v === 'number' && isFinite(v)
    ? Math.min(1, Math.max(0, v))
    : fallback;
}

class SaveManagerImpl {
  private data: SaveData;

  constructor() {
    this.data = migrateSave(SafeStorage.getJSON<unknown>(SAVE_KEY, null));
  }

  get(): SaveData {
    return this.data;
  }

  getCaseProgress(caseId: string): CaseProgress {
    if (!this.data.caseProgress[caseId]) {
      this.data.caseProgress[caseId] = emptyCaseProgress();
    }
    return this.data.caseProgress[caseId];
  }

  save(): void {
    this.data.lastSavedAt = new Date().toISOString();
    SafeStorage.setJSON(SAVE_KEY, this.data);
  }

  hasProgress(): boolean {
    return (
      this.data.currentCaseId !== null ||
      this.data.completedCaseIds.length > 0
    );
  }

  markCaseComplete(caseId: string, trackPersonId?: string | null): void {
    if (!this.data.completedCaseIds.includes(caseId)) {
      this.data.completedCaseIds.push(caseId);
    }
    if (trackPersonId) {
      const key = `${caseId}/${trackPersonId}`;
      if (!this.data.completedTrackIds.includes(key)) {
        this.data.completedTrackIds.push(key);
      }
    }
    this.getCaseProgress(caseId).stage = 6;
    this.getCaseProgress(caseId).unlockedProfile = true;
    this.save();
  }

  /** 이 사건에서 복원을 마친 인물 id 목록 */
  completedTracksOf(caseId: string): string[] {
    return this.data.completedTrackIds
      .filter((t) => t.startsWith(`${caseId}/`))
      .map((t) => t.slice(caseId.length + 1));
  }

  /** 한 사건의 진행만 처음으로 되돌린다. 완료 기록(completedCaseIds)은 유지 */
  resetCaseProgress(caseId: string): void {
    this.data.caseProgress[caseId] = emptyCaseProgress();
    this.save();
  }

  resetAll(): void {
    this.data = structuredClone(DEFAULT_SAVE);
    SafeStorage.remove(SAVE_KEY);
  }
}

export const SaveManager = new SaveManagerImpl();
