/** 모든 Scene 공통 — 배경 로드, 정리, 안전 여백 */
import Phaser from 'phaser';
import { TEXTURE_KEYS, type TextureKey } from '../config/AssetMap';
import { STAGE_W, STAGE_H } from '../core/Viewport';

export abstract class BaseScene extends Phaser.Scene {
  protected loadTextures(...keys: TextureKey[]): void {
    keys.forEach((k) => {
      if (!this.textures.exists(k)) this.load.image(k, TEXTURE_KEYS[k]);
    });
  }

  /** 화면을 덮는 배경. cover 방식으로 비율 유지 */
  protected addBackground(
    key: TextureKey,
    opts: { dim?: number; scale?: number } = {},
  ): Phaser.GameObjects.Image {
    const img = this.add.image(STAGE_W / 2, STAGE_H / 2, key);
    const s =
      Math.max(STAGE_W / img.width, STAGE_H / img.height) * (opts.scale ?? 1);
    img.setScale(s);
    if (opts.dim) {
      const veil = this.add.rectangle(
        STAGE_W / 2,
        STAGE_H / 2,
        STAGE_W,
        STAGE_H,
        0x0a1020,
        opts.dim,
      );
      veil.setDepth(img.depth + 1);
    }
    return img;
  }

  /** Scene 종료 시 tween/timer 정리 */
  protected registerCleanup(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.input.removeAllListeners();
    });
  }
}
