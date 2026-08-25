import type Phaser from 'phaser';
import type { ExploreHotspot, InteractionType } from '../../data/schemas';

export interface InteractionContext {
  scene: Phaser.Scene;
  hotspot: ExploreHotspot;
  /** 조작이 완료되어 내용이 드러났을 때 */
  onReveal: (hotspot: ExploreHotspot) => void;
  /** 조작 중 안내 문구 */
  onNotice?: (text: string) => void;
}

export interface InteractionController {
  container: Phaser.GameObjects.Container;
  destroy(): void;
}

export type InteractionFactory = (
  ctx: InteractionContext,
) => InteractionController;

export type InteractionRegistry = Partial<
  Record<InteractionType, InteractionFactory>
>;
