/** 먼지 문지르기 — RenderTexture erase 마스크로 실제로 닦아낸다 */
import Phaser from 'phaser';
import { makeLabel, attachLabelBehavior } from './shared';
import type { InteractionContext, InteractionController } from './types';
import { RubCoverage } from './RubCoverage';

const BRUSH_KEY = 'rub-brush';

export function createRub(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);

  // 아래 깔린 문서
  const doc = scene.add.image(
    w / 2,
    h / 2,
    hotspot.textureKey ?? 'prop-dusty-document',
  );
  doc.setScale(Math.min(w / doc.width, h / doc.height));
  c.add(doc);
  const documentWidth = doc.displayWidth;
  const documentHeight = doc.displayHeight;
  const documentX = (w - documentWidth) / 2;
  const documentY = (h - documentHeight) / 2;

  // 브러시 텍스처 준비 (한 번만)
  if (!scene.textures.exists(BRUSH_KEY)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(26, 26, 26);
    g.generateTexture(BRUSH_KEY, 52, 52);
    g.destroy();
  }

  // 덮인 먼지층
  const dust = scene
    .add.renderTexture(documentX, documentY, documentWidth, documentHeight)
    .setOrigin(0, 0);
  const dustFill = scene.make.graphics({ x: 0, y: 0 }, false);
  dustFill.fillStyle(0x4a4133, 1);
  dustFill.fillRect(0, 0, documentWidth, documentHeight);
  // 얼룩 결
  dustFill.fillStyle(0x5d5342, 0.85);
  for (let i = 0; i < 26; i++) {
    dustFill.fillCircle(
      Phaser.Math.Between(0, documentWidth),
      Phaser.Math.Between(0, documentHeight),
      Phaser.Math.Between(6, 20),
    );
  }
  dust.draw(dustFill, 0, 0);
  dustFill.destroy();
  // 생성 이미지의 종이 윤곽과 질감은 보이되, 문질러야 내용이 선명해지도록 한다.
  dust.setAlpha(0.6);
  c.add(dust);

  const label = makeLabel(scene, hotspot.label, w, '문지르거나 눌러 먼지를 닦아요');
  label.setPosition(w / 2, -22);
  c.add(label);

  const zone = scene.add
    .zone(w / 2, h / 2, documentWidth, documentHeight)
    .setInteractive({ draggable: true, useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  const coverage = new RubCoverage(documentWidth, documentHeight);
  let done = false;
  let tapCount = 0;
  let dragged = false;
  let lastPt: { x: number; y: number } | null = null;

  const finishRub = () => {
    if (done) return;
    done = true;
    scene.tweens.add({
      targets: dust,
      alpha: 0,
      duration: 420,
      ease: 'Sine.out',
    });
    zone.disableInteractive();
    ctx.onReveal(hotspot);
  };

  const rubAt = (lx: number, ly: number) => {
    if (done) return;
    const documentLocalX = lx - documentX;
    const documentLocalY = ly - documentY;
    if (
      documentLocalX < 0 ||
      documentLocalX > documentWidth ||
      documentLocalY < 0 ||
      documentLocalY > documentHeight
    ) {
      return;
    }
    dust.erase(BRUSH_KEY, documentLocalX - 26, documentLocalY - 26);
    coverage.markCircle(documentLocalX, documentLocalY, 26);
    if (coverage.isComplete) {
      finishRub();
    }
  };

  zone.on('drag', (p: Phaser.Input.Pointer) => {
    dragged = true;
    const local = c.getWorldTransformMatrix().applyInverse(p.x, p.y);
    const lx = local.x;
    const ly = local.y;
    if (lastPt) {
      // 빠르게 움직여도 끊기지 않게 보간
      const steps = Math.ceil(
        Phaser.Math.Distance.Between(lastPt.x, lastPt.y, lx, ly) / 14,
      );
      for (let i = 1; i <= steps; i++) {
        rubAt(
          Phaser.Math.Linear(lastPt.x, lx, i / steps),
          Phaser.Math.Linear(lastPt.y, ly, i / steps),
        );
      }
    } else {
      rubAt(lx, ly);
    }
    lastPt = { x: lx, y: ly };
  });

  zone.on('dragend', () => {
    lastPt = null;
  });

  zone.on('pointerdown', () => {
    dragged = false;
  });

  zone.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (done) return;
    if (!dragged && Math.abs(p.x - p.downX) < 6 && Math.abs(p.y - p.downY) < 6) {
      tapCount++;
      const spots = [
        [documentX + documentWidth * 0.25, documentY + documentHeight * 0.3],
        [documentX + documentWidth * 0.68, documentY + documentHeight * 0.38],
        [documentX + documentWidth * 0.5, documentY + documentHeight * 0.72],
      ];
      const [sx, sy] = spots[Math.min(tapCount - 1, spots.length - 1)];
      for (let dx = -40; dx <= 40; dx += 20) {
        for (let dy = -30; dy <= 30; dy += 20) rubAt(sx + dx, sy + dy);
      }
      if (!done) {
        const percent = Math.round(coverage.ratio * 100);
        ctx.onNotice?.(
          percent < 50
            ? '좋아! 먼지를 더 털어 볼까? 계속 누르거나 문질러 봐.'
            : '거의 다 보여! 남은 먼지도 마저 털어 내 보자.',
        );
      }
    }
  });

  return {
    container: c,
    destroy: () => {
      dust.destroy();
      c.destroy(true);
    },
  };
}
