/** 봉투 봉인 밀어 열기 — 가로 스와이프로 봉인을 뜯는다 */
import Phaser from 'phaser';
import { makeLabel, attachLabelBehavior } from './shared';
import type { InteractionContext, InteractionController } from './types';

export function createEnvelope(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);

  // 봉인이 벗겨지면 아래의 열린 편지봉투가 드러난다.
  const inner = scene.add.image(w / 2, h / 2, 'prop-letter-envelope');
  inner.setScale(Math.min(w / inner.width, h / inner.height));
  inner.setAlpha(0);
  c.add(inner);

  // 봉인 덮개
  const flap = scene.add.container(0, 0);
  const sealed = scene.add.image(
    w / 2,
    h / 2,
    hotspot.textureKey ?? 'prop-sealed-envelope',
  );
  sealed.setScale(Math.min(w / sealed.width, h / sealed.height));
  flap.add(sealed);
  c.add(flap);

  const label = makeLabel(scene, hotspot.label, w, '옆으로 밀거나 눌러 열어요');
  label.setPosition(w / 2, -22);
  c.add(label);

  const zone = scene.add
    .zone(w / 2, h / 2, w, h)
    .setInteractive({ draggable: true, useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  let opened = false;
  let startX = 0;

  const finishOpen = () => {
    if (opened) return;
    opened = true;
    scene.tweens.add({
      targets: flap,
      x: w * 1.05,
      alpha: 0,
      duration: 260,
      ease: 'Sine.out',
      onComplete: () => flap.setVisible(false),
    });
    scene.tweens.add({ targets: inner, alpha: 1, duration: 280 });
    zone.disableInteractive();
    ctx.onReveal(hotspot);
  };

  zone.on('dragstart', (p: Phaser.Input.Pointer) => {
    startX = p.x;
  });

  zone.on('drag', (p: Phaser.Input.Pointer) => {
    if (opened) return;
    const dx = Phaser.Math.Clamp(p.x - startX, 0, w);
    flap.x = dx;
    flap.setAlpha(1 - (dx / w) * 0.85);
    inner.setAlpha(Phaser.Math.Clamp(dx / (w * 0.7), 0, 1));
  });

  zone.on('dragend', () => {
    if (opened) return;
    if (flap.x > w * 0.5) {
      finishOpen();
    } else {
      scene.tweens.add({ targets: flap, x: 0, alpha: 1, duration: 220 });
      scene.tweens.add({ targets: inner, alpha: 0, duration: 200 });
    }
  });

  zone.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (opened) return;
    if (Math.abs(p.x - p.downX) < 6 && Math.abs(p.y - p.downY) < 6) {
      finishOpen();
    }
  });

  return { container: c, destroy: () => c.destroy(true) };
}
