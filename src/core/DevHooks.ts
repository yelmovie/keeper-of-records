/** 개발/QA 전용 훅 — 프로덕션 번들에는 포함되지 않는다.
 *  스크린샷·회귀 확인 스크립트가 각 단계를 빠르게 통과하기 위해 사용한다.
 */
import { GameState } from './GameState';
import { EventBus } from './EventBus';

type StageCompleter = () => void;

let completer: StageCompleter | null = null;

export function registerStageCompleter(fn: StageCompleter | null): void {
  if (!import.meta.env.DEV) return;
  completer = fn;
}

export function installDevHooks(): void {
  if (!import.meta.env.DEV) return;

  const w = window as unknown as Record<string, unknown>;

  w.__keeperDebugGrantAll = () => {
    GameState.allEvidence.forEach((e) => GameState.addEvidence(e.id));
    EventBus.emit('EVIDENCE_FOUND', { id: GameState.allEvidence[0]?.id });
  };

  w.__keeperDebugCompleteStage = () => {
    completer?.();
  };

  w.__keeperDebugState = () => ({
    route: GameState.caseData?.id,
    stage: GameState.stage,
    evidence: GameState.foundEvidence.map((e) => e.id),
  });

}
