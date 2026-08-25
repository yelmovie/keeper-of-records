/** 사건 시작 공통 로직 — 다중 트랙 사건의 무작위 배정과 로드.
 *  트랙 = 인물별 완전한 CaseData 파일. 회차마다 아직 복원하지 않은 인물 중 무작위로 배정된다. */
import { SaveManager } from './SaveManager';
import { GameState } from './GameState';
import { loadCase, loadCatalog, loadPeople } from '../data/loaders';
import { personIdForCase } from '../config/PersonStages';

/** 검수·수업 시연용: localStorage 'keeper:force-track' = personId 면 그 트랙을 고정 배정 */
const FORCE_KEY = 'keeper:force-track';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface LaunchOptions {
  /** true면 진행을 초기화하고 새 트랙을 무작위 배정 (아직 복원 안 한 인물 우선) */
  newTrack?: boolean;
}

/** 사건을 로드해 GameState에 올린다. 라우팅은 호출자가 한다 */
export async function launchCase(
  caseId: string,
  opts: LaunchOptions = {},
): Promise<void> {
  const catalog = await loadCatalog();
  const entry = catalog.find((e) => e.id === caseId);
  const assignedPersonId = personIdForCase(caseId);
  if (!entry || !assignedPersonId || entry.tracks?.[0] !== assignedPersonId) {
    throw new Error(`플레이할 수 없는 인물 기록입니다: ${caseId}`);
  }
  const tracks = [assignedPersonId];
  const sourceCaseId = entry?.sourceCaseId ?? caseId;

  let track: string | undefined;
  if (tracks && tracks.length > 0) {
    const prog = SaveManager.getCaseProgress(caseId);
    let forced: string | null = null;
    try {
      forced = window.localStorage.getItem(FORCE_KEY);
    } catch {
      forced = null;
    }

    if (forced && tracks.includes(forced)) {
      track = forced;
      if (prog.trackPersonId !== forced) {
        SaveManager.resetCaseProgress(caseId);
        SaveManager.getCaseProgress(caseId).trackPersonId = forced;
        SaveManager.save();
      }
    } else if (!opts.newTrack && prog.trackPersonId && tracks.includes(prog.trackPersonId)) {
      track = prog.trackPersonId;
    } else {
      // 새 배정: 아직 복원하지 않은 인물 우선, 전부 복원했다면 아무나
      const done = SaveManager.completedTracksOf(caseId);
      const pool = tracks.filter((t) => !done.includes(t));
      track = pickRandom(pool.length > 0 ? pool : tracks);
      SaveManager.resetCaseProgress(caseId);
      SaveManager.getCaseProgress(caseId).trackPersonId = track;
      SaveManager.save();
    }
  }

  const [sourceCaseData, people] = await Promise.all([
    loadCase(sourceCaseId, track),
    loadPeople(),
  ]);
  // 선택 상자별로 진행 상황이 독립 저장되도록 런타임 사건 id는 선택한 id를 쓴다.
  const caseData =
    sourceCaseId === caseId
      ? sourceCaseData
      : { ...sourceCaseData, id: caseId };
  GameState.loadCase(caseData, people);
}
