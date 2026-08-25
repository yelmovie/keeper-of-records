/** 문서 확대 관찰 — 두 손가락으로 벌려 확대해야 작은 글씨가 드러난다.
 *  마우스 환경에서는 휠 또는 위로 드래그로 같은 조작을 대신한다. */
import Phaser from 'phaser';
import { P } from './palette';
import { makeLabel, attachLabelBehavior, paperSheet } from './shared';
import type { InteractionContext, InteractionController } from './types';

const REVEAL_SCALE = 1.7;

export function createPinch(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);

  // 두 번째 터치 포인터 확보 (태블릿 핀치용)
  if (scene.input.manager.pointers.length < 3) scene.input.addPointer(1);

  const obj = scene.add.container(w / 2, h / 2);
  const sheet = paperSheet(scene, w * 0.8, h * 0.8, 6);
  sheet.setPosition(-w * 0.4, -h * 0.4);
  obj.add(sheet);

  // 확대해야 보이는 작은 글씨 (붉은 관인 자국)
  const fine = scene.add.graphics();
  fine.lineStyle(1, P.dust, 0.5);
  for (let i = 0; i < 4; i++) {
    fine.beginPath();
    fine.moveTo(-w * 0.3, -h * 0.28 + i * 7);
    fine.lineTo(w * 0.26, -h * 0.28 + i * 7);
    fine.strokePath();
  }
  fine.fillStyle(0x8a3b32, 0.85);
  fine.fillRoundedRect(w * 0.14, h * 0.14, w * 0.14, w * 0.14, 2);
  fine.setAlpha(0.25);
  obj.add(fine);
  c.add(obj);

  const label = makeLabel(scene, hotspot.label, w, '두 손가락으로 벌리거나 눌러 열어요');
  label.setPosition(w / 2, -22);
  c.add(label);

  const zone = scene.add
    .zone(w / 2, h / 2, w, h)
    .setInteractive({ draggable: true, useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  let scale = 1;
  let pinchDist = 0;
  let done = false;

  const setScale = (next: number) => {
    scale = Phaser.Math.Clamp(next, 1, 2.2);
    obj.setScale(scale);
    fine.setAlpha(0.25 + ((scale - 1) / (REVEAL_SCALE - 1)) * 0.75);
    if (scale >= REVEAL_SCALE && !done) {
      done = true;
      fine.setAlpha(1);
      scene.tweens.add({ targets: obj, scale: 1.25, duration: 260, ease: 'Sine.out' });
      zone.disableInteractive();
      scene.input.off('pointermove', onMove);
      ctx.onReveal(hotspot);
    }
  };

  // 핀치: 두 포인터가 모두 눌린 동안 거리 변화량으로 확대
  const onMove = () => {
    if (done) return;
    const p1 = scene.input.pointer1;
    const p2 = scene.input.pointer2;
    if (!p1?.isDown || !p2?.isDown) {
      pinchDist = 0;
      return;
    }
    const d = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    if (pinchDist > 0) setScale(scale + (d - pinchDist) / 140);
    pinchDist = d;
  };
  scene.input.on('pointermove', onMove);

  // 마우스 대체 조작: 휠 / 위로 드래그
  zone.on('wheel', (_p: Phaser.Input.Pointer, _dx: number, dy: number) => {
    if (!done) setScale(scale - dy / 400);
  });
  let lastY = 0;
  zone.on('dragstart', (p: Phaser.Input.Pointer) => {
    lastY = p.y;
  });
  zone.on('drag', (p: Phaser.Input.Pointer) => {
    if (done || scene.input.pointer2?.isDown) return;
    setScale(scale + (lastY - p.y) / 170);
    lastY = p.y;
  });

  zone.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (done) return;
    if (Math.abs(p.x - p.downX) < 6 && Math.abs(p.y - p.downY) < 6) {
      ctx.onNotice?.('두 손가락으로 벌려 문서를 확대해 보세요.');
    }
  });

  return {
    container: c,
    destroy: () => {
      scene.input.off('pointermove', onMove);
      c.destroy(true);
    },
  };
}
