/** PAGE 3 — 사건 브리핑
 *  Phaser: 배경, 미확인 인물 실루엣의 빛 흔들림, 기록 렌즈로 초기 단서 확인
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { P } from '../systems/interactions/palette';

export class BriefingScene extends BaseScene {
  constructor() {
    super('BriefingScene');
  }

  preload(): void {
    this.loadTextures('bg-briefing');
  }

  create(): void {
    this.registerCleanup();

    this.addBackground('bg-briefing');
    this.add.rectangle(STAGE_W / 2, STAGE_H / 2, STAGE_W, STAGE_H, 0x0a1020, 0.58);

    // 중앙 인물 자리를 비추는 빛
    const beam = this.add.graphics();
    beam.fillStyle(P.brass300, 0.05);
    beam.fillEllipse(STAGE_W / 2, STAGE_H * 0.44, 460, 520);
    this.tweens.add({
      targets: beam,
      alpha: { from: 0.6, to: 1 },
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // 안내 인물은 DOM Guide(말풍선 조사원)가 담당한다.
    // (guide-archivist.webp 는 알파가 없어 흰 사각형이 노출되므로 쓰지 않는다)

    // 떠 있는 기록 조각 (적게)
    for (let i = 0; i < 10; i++) {
      const g = this.add.graphics();
      g.fillStyle(P.hanji200, Phaser.Math.FloatBetween(0.1, 0.24));
      g.fillRect(0, 0, Phaser.Math.Between(8, 14), Phaser.Math.Between(10, 18));
      g.setPosition(
        Phaser.Math.Between(STAGE_W * 0.3, STAGE_W * 0.7),
        Phaser.Math.Between(STAGE_H * 0.2, STAGE_H * 0.7),
      );
      this.tweens.add({
        targets: g,
        y: g.y - Phaser.Math.Between(60, 140),
        alpha: 0,
        duration: Phaser.Math.Between(7000, 12000),
        repeat: -1,
        delay: i * 700,
      });
    }
  }
}
