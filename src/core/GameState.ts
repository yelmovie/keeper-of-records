/** 진행 중인 CASE의 런타임 상태 — Scene들은 여기만 참조한다 */
import { EventBus } from './EventBus';
import { SaveManager } from './SaveManager';
import type {
  CandidateState,
  CaseData,
  EvidenceData,
  PersonData,
} from '../data/schemas';

class GameStateImpl {
  caseData: CaseData | null = null;
  people = new Map<string, PersonData>();
  private evidenceMap = new Map<string, EvidenceData>();
  private found = new Set<string>();
  usedQuestionIds: string[] = [];
  markedCandidateId: string | null = null;
  memorySceneSeen = false;

  loadCase(data: CaseData, people: PersonData[]): void {
    this.caseData = data;
    this.people = new Map(people.map((p) => [p.id, p]));
    this.evidenceMap = new Map(data.evidence.map((e) => [e.id, e]));

    const prog = SaveManager.getCaseProgress(data.id);
    this.found = new Set(prog.evidenceIds);
    this.usedQuestionIds = [...prog.usedQuestionIds];
    this.markedCandidateId = prog.markedCandidateId;
    this.memorySceneSeen = prog.memorySceneSeen;

    // 초기 단서는 항상 보유
    data.initialClueIds.forEach((id) => this.found.add(id));
    this.persist();
  }

  getEvidence(id: string): EvidenceData | undefined {
    return this.evidenceMap.get(id);
  }

  get allEvidence(): EvidenceData[] {
    return this.caseData?.evidence ?? [];
  }

  get foundEvidence(): EvidenceData[] {
    return this.allEvidence.filter((e) => this.found.has(e.id));
  }

  has(id: string): boolean {
    return this.found.has(id);
  }

  /** 새 근거 확보. 이미 있으면 false */
  addEvidence(id: string): boolean {
    if (this.found.has(id)) return false;
    if (!this.evidenceMap.has(id)) {
      console.warn(`[GameState] unknown evidence id: ${id}`);
      return false;
    }
    this.found.add(id);
    this.persist();
    EventBus.emit('EVIDENCE_FOUND', { id });

    const memory = this.caseData?.memoryScene;
    if (memory && memory.unlockEvidenceId === id && !this.memorySceneSeen) {
      EventBus.emit('MEMORY_SCENE_UNLOCKED', { id: memory.id });
    }
    return true;
  }

  useQuestion(id: string): void {
    if (!this.usedQuestionIds.includes(id)) {
      this.usedQuestionIds.push(id);
      this.persist();
    }
  }

  get remainingInquiryBudget(): number {
    const budget = this.caseData?.stages.inquiry.budget ?? 0;
    return Math.max(0, budget - this.usedQuestionIds.length);
  }

  markCandidate(personId: string | null): void {
    this.markedCandidateId = personId;
    this.persist();
  }

  /** 현재 근거로 후보 상태 평가 — 확률 숫자로 표현하지 않는다 */
  evaluateCandidate(personId: string): CandidateState {
    const related = this.foundEvidence.filter((e) =>
      e.relatedPersonIds.includes(personId),
    );
    if (related.length === 0) return 'notSupportedByCurrentEvidence';
    if (related.some((e) => e.strength === 'direct')) return 'supported';
    return 'possible';
  }

  /** 인물에 대한 직접 근거 수 */
  directCountFor(personId: string): number {
    return this.foundEvidence.filter(
      (e) => e.strength === 'direct' && e.relatedPersonIds.includes(personId),
    ).length;
  }

  /** 이 사건을 이미 복원(해결)했는가 */
  get caseSolved(): boolean {
    if (!this.caseData) return false;
    return (
      SaveManager.get().completedCaseIds.includes(this.caseData.id) ||
      this.stage >= 6
    );
  }

  /** 해결 전에는 출처·확인된 사실 속 후보 인물 이름을 가린다 (정답 스포일러 방지) */
  maskSpoilers(text: string): string {
    if (!text || !this.caseData || this.caseSolved) return text;
    let out = text;
    this.caseData.candidateIds.forEach((pid) => {
      const name = this.people.get(pid)?.displayName;
      if (name) out = out.split(name).join('○○○');
    });
    return out;
  }

  get stage(): number {
    if (!this.caseData) return 0;
    return SaveManager.getCaseProgress(this.caseData.id).stage;
  }

  setStage(stage: number): void {
    if (!this.caseData) return;
    const prog = SaveManager.getCaseProgress(this.caseData.id);
    prog.stage = Math.max(prog.stage, stage);
    SaveManager.get().currentCaseId = this.caseData.id;
    SaveManager.save();
  }

  setMemorySceneSeen(): void {
    this.memorySceneSeen = true;
    this.persist();
  }

  persist(): void {
    if (!this.caseData) return;
    const prog = SaveManager.getCaseProgress(this.caseData.id);
    prog.evidenceIds = [...this.found];
    prog.usedQuestionIds = [...this.usedQuestionIds];
    prog.markedCandidateId = this.markedCandidateId;
    prog.memorySceneSeen = this.memorySceneSeen;
    SaveManager.get().currentCaseId = this.caseData.id;
    SaveManager.save();
  }

  reset(): void {
    this.caseData = null;
    this.people.clear();
    this.evidenceMap.clear();
    this.found.clear();
    this.usedQuestionIds = [];
    this.markedCandidateId = null;
    this.memorySceneSeen = false;
  }
}

export const GameState = new GameStateImpl();
