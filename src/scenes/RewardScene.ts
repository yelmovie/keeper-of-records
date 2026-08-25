/** PAGE 9 — 기록 복원 완료
 *  실루엣에서 인물이 드러나고, 그동안 찾은 기록이 천천히 인물 주변으로 모인다.
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { GameState } from '../core/GameState';
import { P } from '../systems/interactions/palette';

export class RewardScene extends BaseScene {
  constructor() {
    super('RewardScene');
  }

  preload(): void {
    this.loadTextures(
      'bg-reward',
      'char-young',
      'char-elder',
      'char-ahnchangho',
      'char-ahnjunggeun',
      'char-yugwansun',
      'char-yunbonggil',
      'char-kimgu',
      'prop-memo-note',
    );
  }

  create(): void {
    this.registerCleanup();

    const bg = this.addBackground('bg-reward');
    bg.setAlpha(0);
    this.tweens.add({ targets: bg, alpha: 1, duration: 1600 });

    const veil = this.add.rectangle(
      STAGE_W / 2,
      STAGE_H / 2,
      STAGE_W,
      STAGE_H,
      0x0a1020,
      0.68,
    );
    veil.setAlpha(0);
    this.tweens.add({ targets: veil, alpha: 1, duration: 1600 });

    // 흩어져 있던 기록 쪽지들이 인물 주위로 천천히 모여든다
    const cx = STAGE_W * 0.5;
    const cy = STAGE_H * 0.34;
    const count = Math.min(18, Math.max(10, GameState.foundEvidence.length * 2));

    for (let i = 0; i < count; i++) {
      // 첫 화면과 같은 종이 쪽지 그림을 쓴다 (코드로 그린 사각형 대신)
      const g = this.add.image(0, 0, 'prop-memo-note');
      g.setScale(Phaser.Math.FloatBetween(0.05, 0.1));

      const a = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const r = Phaser.Math.Between(340, 620);
      g.setPosition(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7);
      g.setRotation(Phaser.Math.FloatBetween(-0.9, 0.9));
      g.setAlpha(0);

      const delay = 900 + i * 110;
      // 나타나며 팔랑이듯 회전을 풀고 인물 주변 고리로 모인다
      this.tweens.add({ targets: g, alpha: 0.7, duration: 900, delay });
      this.tweens.add({
        targets: g,
        x: cx + Math.cos(a) * Phaser.Math.Between(150, 230),
        y: cy + Math.sin(a) * Phaser.Math.Between(90, 130),
        rotation: Phaser.Math.FloatBetween(-0.18, 0.18),
        duration: 4200,
        delay,
        ease: 'Cubic.inOut',
      });
      // 다 모이면 배경으로 물러나되, 제자리에서 계속 살아 있게 둥실거린다
      this.tweens.add({
        targets: g,
        alpha: 0.26,
        duration: 1600,
        delay: delay + 3600,
      });
      this.tweens.add({
        targets: g,
        y: `-=${Phaser.Math.Between(6, 12)}`,
        rotation: `+=${Phaser.Math.FloatBetween(-0.08, 0.08)}`,
        duration: Phaser.Math.Between(2600, 3600),
        delay: delay + 4200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    // 실루엣 자리에 인물이 천천히 드러난다 (학습용 시각화)
    const person = GameState.caseData
      ? GameState.people.get(GameState.caseData.solvedPersonId)
      : undefined;
    const key = person?.illustrationKey;
    if (key && this.textures.exists(key)) {
      // 가운데는 좌우 패널 사이의 빈 칸이다. 그 폭 안에 들어가게 맞춰
      // 인물이 어디도 가려지지 않고 통째로 보이게 한다.
      // 그림마다 세로 비율이 달라(1:1 ~ 1:1.5) 가로만 맞추면 위쪽 제목을 덮는다.
      // 가로는 빈 칸 폭, 세로는 제목 아래부터 바닥까지에 함께 맞춘다.
      const baseY = STAGE_H * 0.99 + (person?.illustrationOffsetY ?? 0);
      const fig = this.add.image(cx, baseY, key).setOrigin(0.5, 1);
      fig.setScale(Math.min(540 / fig.width, 645 / fig.height));
      fig.setAlpha(0);
      this.tweens.add({
        targets: fig,
        alpha: 0.96,
        duration: 2600,
        delay: 1800,
        ease: 'Sine.inOut',
      });
      this.tweens.add({
        targets: fig,
        y: fig.y - 8,
        duration: 3200,
        delay: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    // 은은한 금빛 — 단색 원은 가장자리가 보이므로, 겹친 동심원으로 부드럽게 퍼뜨린다
    const glow = this.add.graphics();
    const rings: Array<[number, number]> = [
      [320, 0.02],
      [250, 0.025],
      [185, 0.03],
      [125, 0.035],
      [75, 0.04],
    ];
    rings.forEach(([radius, alpha]) => {
      glow.fillStyle(P.brass300, alpha);
      glow.fillCircle(cx, cy, radius);
    });
    glow.setAlpha(0);
    this.tweens.add({ targets: glow, alpha: 1, duration: 2600, delay: 1200 });
    this.tweens.add({
      targets: glow,
      alpha: { from: 1, to: 0.55 },
      duration: 3600,
      delay: 3800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }
}
