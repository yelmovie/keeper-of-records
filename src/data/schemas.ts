/** 핵심 데이터 모델 — CASE 추가는 JSON만으로 가능해야 한다 */

export type EvidenceKind =
  | 'document'
  | 'photo'
  | 'artifact'
  | 'map'
  | 'organization'
  | 'event'
  | 'place'
  | 'quote';

export type EvidenceStrength = 'context' | 'shared' | 'direct';

export type InteractionType =
  | 'tap'
  | 'drawer'
  | 'envelope'
  | 'flip'
  | 'rub'
  | 'pinch'
  | 'rotate'
  | 'puzzle'
  | 'connect'
  | 'timeline'
  | 'underline'
  | 'compare';

export interface EvidenceData {
  id: string;
  title: string;
  kind: EvidenceKind;
  summary: string;
  detail?: string;
  relatedPersonIds: string[];
  strength: EvidenceStrength;
  sourceClaimIds: string[];
  interaction: InteractionType;
  /** 학습용 시각화 표시 여부 */
  visualization?: boolean;
}

export interface PersonData {
  id: string;
  displayName: string;
  lifeText: string;
  activityPeriod: string;
  organizationIds: string[];
  profileSummary: string;
  /** 기록 복원 완료 화면에 쓰는 학습용 시각화 texture key (실제 초상 사진이 아님) */
  illustrationKey?: string;
  /** 그림마다 여백이 달라 얼굴 높이가 어긋난다. 위로 올릴 만큼(논리 px, 음수가 위) */
  illustrationOffsetY?: number;
  /** 후보 카드에 단계적으로 공개되는 정보 */
  revealFacts: { text: string; unlockedByEvidenceId?: string }[];
  sourceClaimIds: string[];
}

export interface OrganizationData {
  id: string;
  name: string;
  foundedText: string;
  summary: string;
  sourceClaimIds: string[];
}

export interface HistoricalClaim {
  id: string;
  claim: string;
  personIds?: string[];
  organizationIds?: string[];
  dateText?: string;
  sourceName: string;
  sourceUrl?: string;
  sourceType: 'official' | 'academic' | 'museum' | 'archive';
  directQuote: boolean;
  quoteText?: string;
  status: 'draft' | 'reviewed' | 'approved' | 'rejected';
}

/* ── Stage별 데이터 ─────────────────────────── */

export interface ExploreHotspot {
  id: string;
  /** 1600x900 논리 좌표 (탐색 공간 기준) */
  x: number;
  y: number;
  w: number;
  h: number;
  interaction: InteractionType;
  /** Optional person-specific Phaser texture key for this evidence prop. */
  textureKey?: string;
  /** Optional generated reverse-side texture used by flip/rotate interactions. */
  backTextureKey?: string;
  evidenceId?: string; // 없으면 "단서가 아닌 물건"
  emptyText?: string; // 단서가 아닐 때 표시할 관찰 텍스트
  hintText?: string;
  label: string;
}

export interface ExploreStageData {
  roomWidth: number; // 카메라 팬 가능한 전체 폭
  hotspots: ExploreHotspot[];
  requiredEvidenceIds: string[];
  hintTexts: string[];
}

export interface AnalyzeTask {
  id: string;
  type: 'compare' | 'timeline' | 'connect';
  title: string;
  instruction: string;
  /** compare: 두 자료 id */
  pairEvidenceIds?: [string, string];
  compareInsightText?: string;
  compareUnlockEvidenceId?: string;
  /** timeline: 배치할 자료 id들과 정답 순서 */
  timelineEvidenceIds?: string[];
  timelineCorrectOrder?: string[];
  timelineDateLabels?: Record<string, string>;
  /** 작업을 마쳤을 때 「확인한 사실」에 남길 문장. 그 사람에 대해 알아야 할 것을 한 줄로 정리한다. */
  timelineInsightText?: string;
  connectInsightText?: string;
  /** connect: 노드 연결 정답 쌍
   *  sourceEvidenceIds — 이 이름이 실제로 나오는 기록. 새 서술을 쓰지 않고 기존 기록을 가리키기만 한다.
   *  비어 있으면 확보한 기록에 근거가 없는 카드(= 어떤 짝과도 이어지지 않는다). */
  connectNodes?: {
    id: string;
    label: string;
    kind: string;
    sourceEvidenceIds?: string[];
  }[];
  connectAnswers?: [string, string][];
}

export interface AnalyzeStageData {
  tasks: AnalyzeTask[];
}

export interface InquiryQuestion {
  id: string;
  prompt: string;
  category: 'place' | 'organization' | 'event' | 'record' | 'relationship';
  /** 답 기록 본문 (밑줄 긋기 대상 문장 배열) */
  recordTitle: string;
  recordSentences: { text: string; isKey: boolean }[];
  unlockEvidenceIds: string[];
  resultSummary: string;
}

export interface InquiryStageData {
  budget: number;
  questions: InquiryQuestion[];
}

export interface RestoreSlotDef {
  slot: 'person' | 'period' | 'organization' | 'activity' | 'role';
  label: string;
  /** 슬롯에 올 수 있는 선택지 (근거 기반) */
  options: { id: string; text: string; correct: boolean; feedback?: string }[];
}

export interface RestoreStageData {
  timelineEvidenceIds: string[];
  timelineCorrectOrder: string[];
  /** 시간 순서 카드에 학생이 직접 확인할 수 있도록 표시하는 연도 */
  timelineDateLabels: Record<string, string>;
  relationPairs: { from: string; to: string; label: string }[];
  slots: RestoreSlotDef[];
  minEvidenceCount: number;
}

export interface MemorySceneData {
  id: string;
  unlockEvidenceId: string;
  title: string;
  narration: string[];
  imageKey: string;
  sourceClaimIds: string[];
}

export interface CaseData {
  id: string;
  title: string;
  subtitle: string;
  teaser: string;
  solvedPersonId: string;
  candidateIds: string[];
  finalCandidateIds: [string, string];
  initialClueIds: string[];
  evidence: EvidenceData[];
  stages: {
    explore: ExploreStageData;
    analyze: AnalyzeStageData;
    inquiry: InquiryStageData;
    restore: RestoreStageData;
  };
  memoryScene?: MemorySceneData;
  epilogue: {
    profileFacts: { label: string; text: string; sourceClaimIds: string[] }[];
    meaningText: string;
  };
}

export interface CaseCatalogEntry {
  id: string;
  title: string;
  teaser: string;
  status: 'available' | 'locked';
  /** 여러 선택 상자가 같은 원본 사건 폴더를 사용할 때의 원본 id */
  sourceCaseId?: string;
  /** 이 사건에 섞여 있는 인물 트랙들. 회차마다 무작위로 하나가 배정된다 */
  tracks?: string[];
}

export type CandidateState =
  | 'unknown'
  | 'possible'
  | 'supported'
  | 'notSupportedByCurrentEvidence';
