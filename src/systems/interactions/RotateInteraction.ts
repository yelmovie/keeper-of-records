/** 물건 회전 관찰 — 한 바퀴 가까이 돌려야 반대편의 새김이 보인다 */
import Phaser from 'phaser';
import { makeLabel, attachLabelBehavior } from './shared';
import type { InteractionContext, InteractionController } from './types';

export function createRotate(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);
  const r = Math.min(w, h) / 2;

  const obj = scene.add.container(w / 2, h / 2);

  // 앞면: 생성형 이미지로 만든 작은 황동 회중시계
  const body = scene.add.image(0, 0, hotspot.textureKey ?? 'prop-pocket-watch');
  body.setScale((r * 2) / Math.max(body.width, body.height));
  obj.add(body);

  // 뒷면: 생성형 이미지로 만든 물건별 금속 뒷면
  const backImage = scene.add.image(
    0,
    0,
    hotspot.backTextureKey ?? 'prop-pocket-watch-back',
  );
  backImage.setScale((r * 2) / Math.max(backImage.width, backImage.height));
  backImage.setVisible(false);
  obj.add(backImage);
  c.add(obj);

  const label = makeLabel(scene, hotspot.label, w, '좌우로 돌리거나 눌러 봐요');
  label.setPosition(w / 2, -22);
  c.add(label);

  const zone = scene.add
    .zone(w / 2, h / 2, w, h)
    .setInteractive({ draggable: true, useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  let totalRotation = 0;
  let lastX = 0;
  let done = false;

  const finishRotation = () => {
    if (done) return;
    done = true;
    backImage.setVisible(true);
    body.setVisible(false);
    scene.tweens.add({
      targets: obj,
      scaleX: 1,
      duration: 220,
      ease: 'Sine.out',
    });
    zone.disableInteractive();
    ctx.onReveal(hotspot);
  };

  zone.on('dragstart', (p: Phaser.Input.Pointer) => {
    lastX = p.x;
  });

  zone.on('drag', (p: Phaser.Input.Pointer) => {
    if (done) return;
    const dx = p.x - lastX;
    lastX = p.x;
    totalRotation += Math.abs(dx);
    // 가로 회전을 scaleX로 표현 (2.5D 회전감)
    const phase = (totalRotation / 130) % 2;
    const t = phase < 1 ? 1 - phase : phase - 1;
    const showBack = phase >= 0.5 && phase < 1.5;
    backImage.setVisible(showBack);
    body.setVisible(!showBack);
    obj.setScale(Math.max(0.08, Math.abs(t * 2 - 1)), 1);

    if (totalRotation > 190) {
      finishRotation();
    }
  });

  zone.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (done) return;
    if (Math.abs(p.x - p.downX) < 6 && Math.abs(p.y - p.downY) < 6) {
      finishRotation();
    }
  });

  return { container: c, destroy: () => c.destroy(true) };
}
