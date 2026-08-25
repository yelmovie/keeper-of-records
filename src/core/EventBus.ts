/** Phaser ↔ DOM 연결용 전역 이벤트 버스 */

export type GameEvent =
  | 'SCENE_CHANGED'
  | 'EVIDENCE_FOUND'
  | 'EVIDENCE_INSPECTED'
  | 'EVIDENCE_LINKED'
  | 'QUESTION_SELECTED'
  | 'QUESTION_UNLOCKED'
  | 'COMPARE_UPDATED'
  | 'RESTORE_SLOT_UPDATED'
  | 'RESTORE_READY'
  | 'RESTORE_COMPLETE'
  | 'MEMORY_SCENE_UNLOCKED'
  | 'SOURCE_OPEN'
  | 'BGM_CHANGE'
  | 'SFX'
  | 'HINT'
  | 'EXPLORE_ZONE_CHANGED'
  | 'STAGE_COMPLETE'
  | 'SAVE_REQUESTED';

type Handler = (payload?: unknown) => void;

class EventBusImpl {
  private handlers = new Map<GameEvent, Set<Handler>>();

  on(event: GameEvent, fn: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return () => this.off(event, fn);
  }

  off(event: GameEvent, fn: Handler): void {
    this.handlers.get(event)?.delete(fn);
  }

  emit(event: GameEvent, payload?: unknown): void {
    this.handlers.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] handler error on ${event}`, err);
      }
    });
  }

  /** Scene 전환 시 특정 이벤트의 모든 핸들러 제거 */
  clear(...events: GameEvent[]): void {
    if (events.length === 0) {
      this.handlers.clear();
      return;
    }
    events.forEach((e) => this.handlers.delete(e));
  }
}

export const EventBus = new EventBusImpl();
