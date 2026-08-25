/** 조작 모듈 공통 유틸 */
import Phaser from 'phaser';
import { P, cssColor } from './palette';

/** 조작 대상 물건의 이름표 — 조작 방식은 알려주되 정답 여부는 알려주지 않는다 */
export function makeLabel(
  scene: Phaser.Scene,
  text: string,
  w: number,
  actionText = '눌러서 조사해요',
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const t = scene.add
    .text(0, -10, text, {
      fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: cssColor(P.hanji100),
    })
    .setOrigin(0.5);
  const action = scene.add
    .text(0, 12, actionText, {
      fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
      fontSize: '16px',
      color: cssColor(P.brass300),
    })
    .setOrigin(0.5);
  const pad = 14;
  const bw = Math.max(t.width, action.width) + pad * 2;
  const bh = 52;
  const bg = scene.add.graphics();
  bg.fillStyle(P.navy950, 0.94);
  bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
  bg.lineStyle(1.5, P.brass500, 0.78);
  bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
  c.add([bg, t, action]);
  c.setSize(bw, bh);
  c.setData('labelWidth', w);
  c.setAlpha(1);
  return c;
}

/** 이름표는 태블릿에서도 늘 보이고, hover는 약한 강조만 더한다. */
export function attachLabelBehavior(
  scene: Phaser.Scene,
  zone: Phaser.GameObjects.Zone,
  label: Phaser.GameObjects.Container,
): void {
  zone.on('pointerover', () => {
    scene.tweens.add({ targets: label, scale: 1.035, duration: 160 });
  });
  zone.on('pointerout', () => {
    scene.tweens.add({ targets: label, scale: 1, duration: 180 });
  });
}

/** 나무 패널 (서랍/책상용) */
export function woodPanel(
  scene: Phaser.Scene,
  w: number,
  h: number,
  radius = 6,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(P.wood700, 1);
  g.fillRoundedRect(0, 0, w, h, radius);
  g.fillStyle(P.wood600, 0.5);
  g.fillRoundedRect(3, 3, w - 6, h * 0.42, radius);
  g.lineStyle(1.5, P.wood900, 0.9);
  g.strokeRoundedRect(0, 0, w, h, radius);
  return g;
}

/** 한지 문서 */
export function paperSheet(
  scene: Phaser.Scene,
  w: number,
  h: number,
  lines = 5,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(P.hanji200, 1);
  g.fillRoundedRect(0, 0, w, h, 3);
  g.lineStyle(1, P.hanji300, 1);
  g.strokeRoundedRect(0, 0, w, h, 3);
  g.lineStyle(1.5, P.dust, 0.45);
  const step = (h - 20) / (lines + 1);
  for (let i = 1; i <= lines; i++) {
    const y = 10 + step * i;
    const len = w - 24 - (i % 3) * 14;
    g.beginPath();
    g.moveTo(12, y);
    g.lineTo(12 + len, y);
    g.strokePath();
  }
  return g;
}

export function pulseOnce(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Container,
): void {
  scene.tweens.add({
    targets: target,
    scale: { from: 1, to: 1.03 },
    duration: 160,
    yoyo: true,
    ease: 'Sine.inOut',
  });
}
