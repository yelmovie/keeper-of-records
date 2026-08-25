/** PAGE 6 — STAGE 3 기록 탐구
 *  이 단계는 조작보다 "선택과 읽기"가 중심이므로 Phaser는 분위기와 해금 연출만 맡는다.
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { P } from '../systems/interactions/palette';

export class Stage3Scene extends BaseScene {
  constructor() {
    super('Stage3Scene');
  }

  preload(): void {
    this.loadTextures('bg-stage3');
  }

  create(): void {
    this.registerCleanup();
    this.addBackground('bg-stage3');
    this.add.rectangle(STAGE_W / 2, STAGE_H / 2, STAGE_W, STAGE_H, 0x0a1020, 0.74);
  }

  /** 근거를 제시해 새 기록이 열릴 때 — 종이 조각이 모여드는 짧은 연출 */
  playUnlock(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const g = this.add.graphics();
      g.fillStyle(P.hanji200, 0.75);
      g.fillRect(-5, -7, 10, 14);
      const a = (i / 12) * Math.PI * 2;
      const r = Phaser.Math.Between(120, 240);
      g.setPosition(x + Math.cos(a) * r, y + Math.sin(a) * r);
      this.tweens.add({
        targets: g,
        x,
        y,
        alpha: 0,
        scale: 0.4,
        duration: Phaser.Math.Between(560, 860),
        ease: 'Cubic.in',
        onComplete: () => g.destroy(),
      });
    }
    const ring = this.add.graphics();
    ring.lineStyle(2, P.brass300, 0.7);
    ring.strokeCircle(0, 0, 40);
    ring.setPosition(x, y);
    this.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });
  }
}
