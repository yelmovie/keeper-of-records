/** 서랍 밀어 열기 — 실제로 손잡이를 끌어야 열린다 (탭으로는 안 열림) */
import Phaser from 'phaser';
import { P } from './palette';
import { makeLabel, attachLabelBehavior } from './shared';
import type { InteractionContext, InteractionController } from './types';

export function createDrawer(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);
  const isCabinet = hotspot.id === 'hs-cabinet';
  const OPEN_DIST = Math.max(60, h * 1.1);

  // 서랍이 들어있는 캐비닛 구멍
  const slot = scene.add.graphics();
  slot.fillStyle(P.navy950, 0.95);
  slot.fillRoundedRect(0, 0, w, h, 4);
  c.add(slot);

  // 서랍 안 내용 (열려야 보임)
  const inner = scene.add.container(0, 0);
  if (hotspot.textureKey) {
    const evidence = scene.add.image(w / 2, h / 2, hotspot.textureKey);
    const scale = Math.min(
      (w - 20) / evidence.width,
      (h - 14) / evidence.height,
    );
    evidence.setScale(scale);
    inner.add(evidence);
  } else if (isCabinet) {
    const doc = scene.add.image(w / 2, h / 2, 'prop-cabinet-letter');
    doc.setDisplaySize(w - 26, h - 18);
    inner.add(doc);
  } else {
    const letter = scene.add.image(w / 2, h / 2, 'prop-letter-envelope');
    const scale = Math.min((w - 20) / letter.width, (h - 14) / letter.height);
    letter.setScale(scale);
    inner.add(letter);
  }
  inner.setAlpha(0);
  c.add(inner);

  // 서랍 앞판
  const front = scene.add.container(0, 0);
  let zoneY = h / 2;
  let zoneH = h;
  if (isCabinet) {
    const cabinet = scene.add.image(w / 2, h, 'prop-document-cabinet').setOrigin(0.5, 1);
    const visualH = Math.min(260, h * 2.15);
    cabinet.setScale(visualH / cabinet.height);
    front.add(cabinet);
    zoneH = visualH;
    zoneY = h - visualH / 2;
  } else {
    const drawer = scene.add.image(w / 2, h / 2, 'prop-archive-drawer');
    drawer.setDisplaySize(w, h);
    front.add(drawer);
  }
  c.add(front);

  const label = makeLabel(scene, hotspot.label, w, '아래로 끌거나 눌러 열어요');
  label.setPosition(w / 2, isCabinet ? zoneY - zoneH / 2 - 22 : -22);
  c.add(label);

  const zone = scene.add
    .zone(w / 2, zoneY, w, zoneH)
    .setInteractive({ draggable: true, useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  let opened = false;
  let dragStartY = 0;
  let baseY = 0;

  const finishOpen = () => {
    if (opened) return;
    opened = true;
    scene.tweens.add({
      targets: front,
      y: OPEN_DIST,
      duration: 220,
      ease: 'Back.out',
    });
    scene.tweens.add({ targets: inner, alpha: 1, duration: 240 });
    zone.disableInteractive();
    ctx.onReveal(hotspot);
  };

  zone.on('dragstart', (p: Phaser.Input.Pointer) => {
    dragStartY = p.y;
    baseY = front.y;
  });

  zone.on('drag', (p: Phaser.Input.Pointer) => {
    if (opened) return;
    const dy = Phaser.Math.Clamp(baseY + (p.y - dragStartY), 0, OPEN_DIST);
    front.y = dy;
    inner.setAlpha(Phaser.Math.Clamp(dy / OPEN_DIST, 0, 1) * 0.95);
  });

  zone.on('dragend', () => {
    if (opened) return;
    if (front.y > OPEN_DIST * 0.62) {
      finishOpen();
    } else {
      scene.tweens.add({ targets: front, y: 0, duration: 240, ease: 'Sine.out' });
      scene.tweens.add({ targets: inner, alpha: 0, duration: 200 });
    }
  });

  // 작은 손동작이 어려운 학생은 한 번 눌러도 자동으로 열린다.
  zone.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (opened) return;
    if (Math.abs(p.y - p.downY) < 6 && Math.abs(p.x - p.downX) < 6) {
      finishOpen();
    }
  });

  return {
    container: c,
    destroy: () => c.destroy(true),
  };
}
