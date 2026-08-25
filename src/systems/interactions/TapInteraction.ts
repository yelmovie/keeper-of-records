/** 단순 관찰 — 단서가 아닌 물건에도 쓰인다 (모든 물건이 단서는 아니다) */
import { P } from './palette';
import { makeLabel, attachLabelBehavior, pulseOnce } from './shared';
import type { InteractionContext, InteractionController } from './types';

export function createTap(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);

  const textureById: Record<string, string> = {
    'hs-teacup': 'prop-teacup',
    'hs-lamp': 'prop-oil-lamp',
    'hs-inkstone': 'prop-inkstone',
  };
  const texture = hotspot.textureKey ?? textureById[hotspot.id];
  if (texture) {
    const image = scene.add.image(w / 2, h / 2, texture);
    image.setScale(Math.min(w / image.width, h / image.height));
    c.add(image);
  } else {
    const g = scene.add.graphics();
    g.fillStyle(P.wood700, 0.9);
    g.fillRoundedRect(0, 0, w, h, 5);
    g.lineStyle(1.2, P.wood900, 0.9);
    g.strokeRoundedRect(0, 0, w, h, 5);
    g.fillStyle(P.brassDim, 0.5);
    g.fillRoundedRect(w * 0.2, h * 0.32, w * 0.6, h * 0.14, 3);
    c.add(g);
  }

  const label = makeLabel(scene, hotspot.label, w, '눌러서 살펴봐요');
  // 라벨판이 물건 그림 윗부분을 덮지 않게 조금 더 위로 띄운다
  label.setPosition(w / 2, -34);
  c.add(label);

  const zone = scene.add
    .zone(w / 2, h / 2, w, h)
    .setInteractive({ useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  let inspected = false;
  let lastTap = 0;

  zone.on('pointerup', () => {
    const now = scene.time.now;
    // 연속 탭 방지
    if (now - lastTap < 400) return;
    lastTap = now;
    pulseOnce(scene, c);
    if (inspected) return;
    inspected = true;
    ctx.onReveal(hotspot);
  });

  return { container: c, destroy: () => c.destroy(true) };
}
