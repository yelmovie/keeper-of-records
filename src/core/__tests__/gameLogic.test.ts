import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameState } from '../GameState';
import { SaveManager } from '../SaveManager';
import type { CaseData, PersonData, HistoricalClaim } from '../../data/schemas';

const DATA = join(process.cwd(), 'public', 'data');
const caseData = JSON.parse(
  readFileSync(
    join(DATA, 'cases', 'case-001', 'track-yunbonggil.json'),
    'utf8',
  ),
) as CaseData;
const people = JSON.parse(
  readFileSync(join(DATA, 'people.json'), 'utf8'),
) as PersonData[];
const claims = JSON.parse(
  readFileSync(join(DATA, 'historical-sources.json'), 'utf8'),
) as HistoricalClaim[];

describe('후보 판정 로직', () => {
  beforeEach(() => {
    SaveManager.resetAll();
    GameState.reset();
    GameState.loadCase(caseData, people);
  });

  it('초기 단서만으로는 정답 인물을 확정할 수 없다', () => {
    const state = GameState.evaluateCandidate(caseData.solvedPersonId);
    expect(state).not.toBe('supported');
  });

  it('공통 자료(shared)는 후보를 한 명으로 좁히지 못한다', () => {
    const shared = caseData.evidence.filter((e) => e.strength === 'shared');
    expect(shared.length).toBeGreaterThan(0);
    shared.forEach((e) => {
      expect(e.relatedPersonIds.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('직접 근거를 확보해야 supported 상태가 된다', () => {
    const direct = caseData.evidence.find(
      (e) =>
        e.strength === 'direct' &&
        e.relatedPersonIds.includes(caseData.solvedPersonId),
    );
    expect(direct).toBeDefined();
    GameState.addEvidence(direct!.id);
    expect(GameState.evaluateCandidate(caseData.solvedPersonId)).toBe('supported');
  });

  it('기록 복원에는 최소 3개 이상의 직접 근거가 필요하다', () => {
    const need = caseData.stages.restore.minEvidenceCount;
    expect(need).toBeGreaterThanOrEqual(3);

    const directs = caseData.evidence.filter(
      (e) =>
        e.strength === 'direct' &&
        e.relatedPersonIds.includes(caseData.solvedPersonId),
    );
    // 하나만 있으면 아직 부족해야 한다
    GameState.addEvidence(directs[0].id);
    expect(GameState.directCountFor(caseData.solvedPersonId)).toBeLessThan(need);

    directs.slice(1, need).forEach((e) => GameState.addEvidence(e.id));
    expect(GameState.directCountFor(caseData.solvedPersonId)).toBeGreaterThanOrEqual(
      need,
    );
  });

  it('조사권은 질문 수보다 적어 선택이 필요하다', () => {
    const inq = caseData.stages.inquiry;
    expect(inq.budget).toBeLessThan(inq.questions.length);
    expect(GameState.remainingInquiryBudget).toBe(inq.budget);
    GameState.useQuestion(inq.questions[0].id);
    expect(GameState.remainingInquiryBudget).toBe(inq.budget - 1);
  });

  it('같은 자료를 두 번 확보해도 중복되지 않는다', () => {
    const id = caseData.evidence[3].id;
    expect(GameState.addEvidence(id)).toBe(true);
    expect(GameState.addEvidence(id)).toBe(false);
  });
});

describe('역사 데이터 노출 규칙', () => {
  it('학생 화면에 쓰이는 claim은 모두 approved 이다', () => {
    const map = new Map(claims.map((c) => [c.id, c]));
    const used = new Set<string>();
    caseData.evidence.forEach((e) => e.sourceClaimIds.forEach((id) => used.add(id)));
    caseData.epilogue.profileFacts.forEach((f) =>
      f.sourceClaimIds.forEach((id) => used.add(id)),
    );
    caseData.memoryScene?.sourceClaimIds.forEach((id) => used.add(id));

    used.forEach((id) => {
      expect(map.get(id)?.status, `${id} 는 approved 여야 합니다`).toBe('approved');
    });
  });

  it('직접 인용 claim에는 인용문과 출처가 모두 있다', () => {
    claims
      .filter((c) => c.directQuote)
      .forEach((c) => {
        expect(c.quoteText, `${c.id} 에 인용문이 없습니다`).toBeTruthy();
        expect(c.sourceName, `${c.id} 에 출처가 없습니다`).toBeTruthy();
      });
  });

  it('금지 표현을 사용하지 않는다', () => {
    const forbidden = ['용의자', '범인', '심문', '검거', '혐의'];
    const blob = JSON.stringify(caseData) + JSON.stringify(people);
    forbidden.forEach((w) => {
      expect(blob.includes(w), `"${w}" 표현이 사용되었습니다`).toBe(false);
    });
  });

  it('오답 피드백에 "틀렸습니다"를 쓰지 않는다', () => {
    caseData.stages.restore.slots.forEach((s) => {
      s.options
        .filter((o) => !o.correct)
        .forEach((o) => {
          expect(o.feedback).toBeTruthy();
          expect(o.feedback).not.toMatch(/틀렸/);
        });
    });
  });
});

describe('Stage 구성 규칙', () => {
  it('흔적 탐색에는 서로 다른 조작이 3개 이상 있다', () => {
    const kinds = new Set(
      caseData.stages.explore.hotspots.map((h) => h.interaction),
    );
    expect(kinds.size).toBeGreaterThanOrEqual(3);
  });

  it('모든 물건이 단서는 아니다', () => {
    const empties = caseData.stages.explore.hotspots.filter((h) => !h.evidenceId);
    expect(empties.length).toBeGreaterThan(0);
    empties.forEach((h) => expect(h.emptyText).toBeTruthy());
  });

  it('자료 분석에는 서로 다른 유형의 작업이 2개 이상 있다', () => {
    const types = new Set(caseData.stages.analyze.tasks.map((t) => t.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('질문마다 열리는 자료가 다르다', () => {
    const sets = caseData.stages.inquiry.questions.map((q) =>
      q.unlockEvidenceIds.join(','),
    );
    expect(new Set(sets).size).toBe(sets.length);
  });

  it('복원 슬롯마다 정답은 정확히 하나다', () => {
    caseData.stages.restore.slots.forEach((s) => {
      expect(s.options.filter((o) => o.correct).length).toBe(1);
    });
  });
});

describe('저장', () => {
  beforeEach(() => {
    SaveManager.resetAll();
    GameState.reset();
  });

  it('개인정보 필드를 저장하지 않는다', () => {
    GameState.loadCase(caseData, people);
    GameState.setStage(2);
    const blob = JSON.stringify(SaveManager.get());
    ['name', 'studentName', 'grade', 'classNo', '이름', '학년', '반'].forEach(
      (k) => expect(blob.includes(k)).toBe(false),
    );
  });

  it('진행 상황이 저장되고 다시 읽힌다', () => {
    GameState.loadCase(caseData, people);
    const id = caseData.evidence[2].id;
    GameState.addEvidence(id);
    GameState.setStage(3);

    const prog = SaveManager.getCaseProgress(caseData.id);
    expect(prog.evidenceIds).toContain(id);
    expect(prog.stage).toBe(3);
  });

  it('새로 시작하기(resetProgress)는 복원 완료 기록을 모두 지우고 소리 설정만 남긴다', () => {
    GameState.loadCase(caseData, people);
    GameState.setStage(3);
    SaveManager.markCaseComplete(caseData.id, caseData.solvedPersonId);
    SaveManager.get().settings.bgm = 0.2;
    SaveManager.save();
    expect(SaveManager.hasProgress()).toBe(true);
    expect(SaveManager.completedTracksOf(caseData.id)).toHaveLength(1);

    SaveManager.resetProgress();

    const s = SaveManager.get();
    expect(SaveManager.hasProgress()).toBe(false);
    expect(s.completedCaseIds).toEqual([]);
    expect(s.completedTrackIds).toEqual([]);
    expect(s.currentCaseId).toBeNull();
    expect(s.caseProgress).toEqual({});
    expect(s.settings.bgm).toBe(0.2);
    // localStorage 에도 빈 진행이 기록되어 새로고침해도 이전 회차가 되살아나지 않는다
    const raw = JSON.parse(
      localStorage.getItem('keeper-of-records:v1') ?? '{}',
    ) as { completedTrackIds?: string[] };
    expect(raw.completedTrackIds).toEqual([]);
  });
});
