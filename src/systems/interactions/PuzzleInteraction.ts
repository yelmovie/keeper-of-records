/** 찢어진 문서 조각 맞추기 — 누를 때마다 조각이 한 장씩 제자리에 붙는다.
 *  드래그 없음: 태블릿에서 드래그가 어려운 학생도 같은 속도로 진행할 수 있다.
 */
import Phaser from 'phaser';
import { P } from './palette';
import { makeLabel, attachLabelBehavior } from './shared';
import type { InteractionContext, InteractionController } from './types';

export function createPuzzle(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);

  // 빈 자리 (문서 윤곽)
  const outline = scene.add.graphics();
  outline.fillStyle(P.navy950, 0.55);
  outline.fillRoundedRect(0, 0, w, h, 3);
  outline.lineStyle(1.5, P.brassDim, 0.55);
  outline.strokeRoundedRect(0, 0, w, h, 3);
  c.add(outline);

  const label = makeLabel(scene, hotspot.label, w, '눌러서 조각을 맞춰요');
  label.setPosition(w / 2, -22);
  c.add(label);

  const pw = w / 2;
  const ph = h / 2;
  const slots = [
    { sx: 0, sy: 0 },
    { sx: pw, sy: 0 },
    { sx: 0, sy: ph },
    { sx: pw, sy: ph },
  ];

  // 찢어진 느낌: 각 조각을 제 사분면에서 바깥으로 살짝 벌리고 조금 기울인다.
  // (서로 자리를 바꾸면 겹쳐 보여서 흐름이 어색했다 — 벌어진 문서로 보이게만 한다)
  const spread = Math.min(pw, ph) * 0.22;
  const scatter = [
    { x: -spread, y: -spread * 0.7, rot: -0.07 },
    { x: pw + spread * 0.8, y: -spread * 0.5, rot: 0.06 },
    { x: -spread * 0.8, y: ph + spread * 0.5, rot: 0.05 },
    { x: pw + spread * 0.6, y: ph + spread * 0.7, rot: -0.06 },
  ];

  const textureKey = hotspot.textureKey ?? 'prop-torn-document';
  const source = scene.textures
    .get(textureKey)
    .getSourceImage() as HTMLImageElement;
  const sourcePieceW = source.width / 2;
  const sourcePieceH = source.height / 2;

  const pieces: Phaser.GameObjects.Container[] = [];

  slots.forEach((_slot, i) => {
    const home = scatter[i];
    const sourceCol = i % 2;
    const sourceRow = Math.floor(i / 2);
    const piece = scene.add.container(home.x, home.y);
    piece.setRotation(home.rot);

    const image = scene.add.image(0, 0, textureKey).setOrigin(0, 0);
    image.setCrop(
      sourceCol * sourcePieceW,
      sourceRow * sourcePieceH,
      sourcePieceW,
      sourcePieceH,
    );
    image.setScale(pw / sourcePieceW, ph / sourcePieceH);
    // Phaser crop keeps the source rectangle's offset in the rendered image.
    // Cancel it so every cropped quadrant starts at its piece container's origin.
    image.setPosition(-sourceCol * pw, -sourceRow * ph);
    piece.add(image);

    c.add(piece);
    pieces.push(piece);
  });

  // 조각이 벌어진 범위까지 포함해 누를 수 있게 한다
  const pad = spread + 8;
  const zone = scene.add
    .zone(w / 2, h / 2, w + pad * 2, h + pad * 2)
    .setInteractive({ useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  let settled = 0;
  let done = false;

  zone.on('pointerup', () => {
    if (done || settled >= pieces.length) return;
    const i = settled++;
    const piece = pieces[i];
    c.bringToTop(piece);
    scene.tweens.add({
      targets: piece,
      x: slots[i].sx,
      y: slots[i].sy,
      rotation: 0,
      duration: 220,
      ease: 'Back.out',
      onComplete: () => {
        piece.setPosition(slots[i].sx, slots[i].sy);
        piece.setRotation(0);
        if (settled === pieces.length && !done) {
          done = true;
          scene.time.delayedCall(160, () => ctx.onReveal(hotspot));
        }
      },
    });
    if (settled < pieces.length) {
      ctx.onNotice?.(`조각 ${settled}/${pieces.length} — 계속 눌러서 마저 맞춰 봐!`);
    }
  });

  return {
    container: c,
    destroy: () => {
      c.destroy(true);
    },
  };
}
