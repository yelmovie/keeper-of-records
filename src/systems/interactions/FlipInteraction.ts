/** 사진 뒤집기 — 앞면을 잡고 가로로 돌려야 뒷면 기록이 보인다 */
import Phaser from 'phaser';
import { makeLabel, attachLabelBehavior } from './shared';
import type { InteractionContext, InteractionController } from './types';

export function createFlip(ctx: InteractionContext): InteractionController {
  const { scene, hotspot } = ctx;
  const { x, y, w, h } = hotspot;
  const c = scene.add.container(x, y);

  const card = scene.add.container(w / 2, h / 2);

  // 앞면: 오래된 사진
  const front = scene.add.container(0, 0);
  const photo = scene.add.image(0, 0, hotspot.textureKey ?? 'prop-old-photo');
  photo.setScale(Math.min(w / photo.width, h / photo.height));
  front.add(photo);
  card.add(front);

  // 뒷면: 생성형 이미지로 만든 자료별 실제 뒷면
  const back = scene.add.container(0, 0);
  const backImage = scene.add.image(
    0,
    0,
    hotspot.backTextureKey ?? 'prop-old-photo-back',
  );
  backImage.setScale(Math.min(w / backImage.width, h / backImage.height));
  back.add(backImage);
  back.setScale(0, 1);
  back.setVisible(false);
  card.add(back);
  c.add(card);

  const label = makeLabel(scene, hotspot.label, w, '옆으로 밀거나 눌러 뒤집어요');
  label.setPosition(w / 2, -22);
  c.add(label);

  const zone = scene.add
    .zone(w / 2, h / 2, w, h)
    .setInteractive({ draggable: true, useHandCursor: true });
  c.add(zone);
  attachLabelBehavior(scene, zone, label);

  let flipped = false;
  let startX = 0;

  const finishFlip = () => {
    if (flipped) return;
    flipped = true;
    front.setVisible(false);
    back.setVisible(true);
    scene.tweens.add({
      targets: back,
      scaleX: 1,
      duration: 180,
      ease: 'Sine.out',
    });
    zone.disableInteractive();
    ctx.onReveal(hotspot);
  };

  zone.on('dragstart', (p: Phaser.Input.Pointer) => {
    startX = p.x;
  });

  zone.on('drag', (p: Phaser.Input.Pointer) => {
    if (flipped) return;
    const t = Phaser.Math.Clamp(Math.abs(p.x - startX) / (w * 0.8), 0, 1);
    if (t < 0.5) {
      front.setVisible(true).setScale(1 - t * 2, 1);
      back.setVisible(false);
    } else {
      front.setVisible(false);
      back.setVisible(true).setScale((t - 0.5) * 2, 1);
    }
    card.setData('flipT', t);
  });

  zone.on('dragend', () => {
    if (flipped) return;
    const t = (card.getData('flipT') as number) ?? 0;
    if (t > 0.55) {
      finishFlip();
    } else {
      back.setVisible(false);
      front.setVisible(true);
      scene.tweens.add({
        targets: front,
        scaleX: 1,
        duration: 200,
        ease: 'Sine.out',
      });
    }
  });

  zone.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (flipped) return;
    if (Math.abs(p.x - p.downX) < 6 && Math.abs(p.y - p.downY) < 6) {
      finishFlip();
    }
  });

  return { container: c, destroy: () => c.destroy(true) };
}
