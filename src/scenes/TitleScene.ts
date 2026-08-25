/** PAGE 1 — 타이틀
 *  Phaser: 배경 parallax, 인물 idle, 기록 조각 파티클, 기록 렌즈 반응, 프롤로그 연출
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { EventBus } from '../core/EventBus';
import { P } from '../systems/interactions/palette';

export class TitleScene extends BaseScene {
  private bg!: Phaser.GameObjects.Image;
  private girlPlatform!: Phaser.GameObjects.Image;
  private boyPlatform!: Phaser.GameObjects.Image;
  private girlPlatformMask!: Phaser.GameObjects.Image;
  private boyPlatformMask!: Phaser.GameObjects.Image;
  private investigatorGirl!: Phaser.GameObjects.Image;
  private investigatorBoy!: Phaser.GameObjects.Image;
  private motes: Phaser.GameObjects.Image[] = [];
  private lens!: Phaser.GameObjects.Container;

  constructor() {
    super('TitleScene');
  }

  preload(): void {
    this.loadTextures(
      'bg-title',
      'char-girl',
      'char-boy',
      'ui-character-platform',
      'prop-memo-note',
    );
  }

  create(): void {
    this.registerCleanup();
    this.motes = [];

    this.bg = this.addBackground('bg-title', { scale: 1.06 });
    this.add.rectangle(STAGE_W / 2, STAGE_H / 2, STAGE_W, STAGE_H, 0x0a1020, 0.42);

    // 아래쪽 어둠 — DOM 타이틀 텍스트 가독성 확보
    const grad = this.add.graphics();
    grad.fillGradientStyle(0x0a1020, 0x0a1020, 0x0a1020, 0x0a1020, 0, 0, 0.9, 0.9);
    grad.fillRect(0, STAGE_H * 0.45, STAGE_W, STAGE_H * 0.55);

    // 현대 기록 조사원 — 배경보다 앞, UI보다 뒤
    this.girlPlatform = this.add
      .image(STAGE_W * 0.14, STAGE_H * 0.995, 'ui-character-platform')
      .setOrigin(0.5, 1)
      .setDisplaySize(STAGE_W * 0.27, STAGE_H * 0.17)
      .setAlpha(0.82);
    this.boyPlatform = this.add
      .image(STAGE_W * 0.86, STAGE_H * 0.995, 'ui-character-platform')
      .setOrigin(0.5, 1)
      .setDisplaySize(STAGE_W * 0.27, STAGE_H * 0.17)
      .setAlpha(0.82);
    this.softenPlatformLights();

    this.investigatorGirl = this.add
      .image(STAGE_W * 0.14, STAGE_H * 0.9, 'char-girl')
      .setOrigin(0.5, 1);
    this.investigatorGirl.setScale(
      (STAGE_H * 0.55) / this.investigatorGirl.height,
    );

    this.investigatorBoy = this.add
      .image(STAGE_W * 0.86, STAGE_H * 0.9, 'char-boy')
      .setOrigin(0.5, 1);
    this.investigatorBoy.setScale(
      (STAGE_H * 0.55) / this.investigatorBoy.height,
    );

    this.tweens.add({
      targets: this.investigatorGirl,
      y: this.investigatorGirl.y - 7,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: this.investigatorBoy,
      y: this.investigatorBoy.y - 7,
      duration: 2350,
      delay: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // 떠다니는 기록 조각
    for (let i = 0; i < 26; i++) this.spawnMote();

    // 기록 렌즈 — 만지면 주변 기록이 잠깐 선명해진다
    this.createLens();

    // 마우스/터치 parallax
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const nx = (p.x / STAGE_W - 0.5) * 2;
      const ny = (p.y / STAGE_H - 0.5) * 2;
      this.bg.x = STAGE_W / 2 - nx * 16;
      this.bg.y = STAGE_H / 2 - ny * 10;
      this.girlPlatform.x = STAGE_W * 0.14 - nx * 4;
      this.boyPlatform.x = STAGE_W * 0.86 - nx * 4;
      this.girlPlatformMask.x = this.girlPlatform.x;
      this.boyPlatformMask.x = this.boyPlatform.x;
      this.investigatorGirl.x = STAGE_W * 0.14 - nx * 8;
      this.investigatorBoy.x = STAGE_W * 0.86 - nx * 8;
    });
  }

  /** 발판 원본 상단의 조명 경계가 직선으로 잘려 보이지 않도록 알파를 부드럽게 감춘다. */
  private softenPlatformLights(): void {
    const key = 'ui-character-platform-soft-mask';
    if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 568, 340);
      if (texture) {
        const ctx = texture.context;
        const fade = ctx.createLinearGradient(0, 0, 0, 112);
        fade.addColorStop(0, 'rgba(255,255,255,0)');
        fade.addColorStop(0.56, 'rgba(255,255,255,0.38)');
        fade.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, 568, 340);
        texture.refresh();
      }
    }

    const createMask = (platform: Phaser.GameObjects.Image) => {
      const maskImage = this.add
        .image(platform.x, platform.y, key)
        .setOrigin(0.5, 1)
        .setDisplaySize(platform.displayWidth, platform.displayHeight)
        .setVisible(false);
      platform.setMask(maskImage.createBitmapMask());
      return maskImage;
    };

    this.girlPlatformMask = createMask(this.girlPlatform);
    this.boyPlatformMask = createMask(this.boyPlatform);
  }

  private spawnMote(): void {
    const g = this.add.image(0, 0, 'prop-memo-note');
    const w = Phaser.Math.Between(14, 34);
    g.setDisplaySize(w, w * (g.height / g.width));
    g.setAlpha(Phaser.Math.FloatBetween(0.14, 0.34));
    g.setPosition(
      Phaser.Math.Between(0, STAGE_W),
      Phaser.Math.Between(0, STAGE_H),
    );
    g.setRotation(Phaser.Math.FloatBetween(-0.5, 0.5));
    this.motes.push(g);

    const dur = Phaser.Math.Between(11000, 20000);
    this.tweens.add({
      targets: g,
      y: g.y - Phaser.Math.Between(180, 340),
      x: g.x + Phaser.Math.Between(-70, 70),
      rotation: g.rotation + Phaser.Math.FloatBetween(-0.7, 0.7),
      alpha: 0,
      duration: dur,
      ease: 'Sine.inOut',
      onComplete: () => {
        g.destroy();
        this.motes = this.motes.filter((m) => m !== g);
        if (this.scene.isActive()) this.spawnMote();
      },
    });
  }

  /** 기록 렌즈: 화면 중앙 아래, 터치하면 빛이 퍼지며 기록 조각이 잠시 또렷해진다 */
  private createLens(): void {
    const c = this.add.container(STAGE_W / 2, STAGE_H * 0.63);
    const ring = this.add.graphics();
    ring.lineStyle(2.5, P.brass500, 0.55);
    ring.strokeCircle(0, 0, 54);
    ring.lineStyle(1.2, P.brass300, 0.32);
    ring.strokeCircle(0, 0, 66);
    const glass = this.add.graphics();
    glass.fillStyle(P.brass300, 0.06);
    glass.fillCircle(0, 0, 52);
    c.add([glass, ring]);
    c.setAlpha(0.5);
    this.lens = c;

    this.tweens.add({
      targets: c,
      scale: { from: 1, to: 1.035 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const zone = this.add
      .zone(STAGE_W / 2, STAGE_H * 0.63, 150, 150)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerover', () =>
      this.tweens.add({ targets: c, alpha: 0.95, duration: 240 }),
    );
    zone.on('pointerout', () =>
      this.tweens.add({ targets: c, alpha: 0.5, duration: 320 }),
    );
    zone.on('pointerdown', () => this.pulseLens());
  }

  private pulseLens(): void {
    const wave = this.add.graphics();
    wave.lineStyle(2, P.brass300, 0.8);
    wave.strokeCircle(0, 0, 54);
    wave.setPosition(this.lens.x, this.lens.y);
    this.tweens.add({
      targets: wave,
      scale: 5.5,
      alpha: 0,
      duration: 1100,
      ease: 'Cubic.out',
      onComplete: () => wave.destroy(),
    });
    this.motes.forEach((m) => {
      this.tweens.add({
        targets: m,
        alpha: 0.85,
        duration: 320,
        yoyo: true,
        hold: 260,
      });
    });
    EventBus.emit('SFX', 'uiTap');
  }

  /** 첫 플레이 프롤로그: 기록이 지워지는 5~7초 연출 */
  playPrologue(onDone: () => void): void {
    const veil = this.add
      .rectangle(STAGE_W / 2, STAGE_H / 2, STAGE_W, STAGE_H, 0x0a1020, 0)
      .setDepth(500);

    const sheets: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 14; i++) {
      const g = this.add.image(0, 0, 'prop-memo-note').setDepth(501);
      g.setDisplaySize(76, 76 * (g.height / g.width));
      g.setPosition(
        STAGE_W * 0.5 + Phaser.Math.Between(-460, 460),
        STAGE_H * 0.52 + Phaser.Math.Between(-200, 200),
      );
      g.setAlpha(0);
      sheets.push(g);
    }

    this.tweens.add({ targets: veil, fillAlpha: 0.86, duration: 900 });

    sheets.forEach((g, i) => {
      this.tweens.add({
        targets: g,
        alpha: 1,
        duration: 500,
        delay: 500 + i * 90,
      });
      // 글자가 지워지듯 흩어진다
      this.tweens.add({
        targets: g,
        alpha: 0,
        scale: 0.55,
        y: g.y - 90,
        rotation: Phaser.Math.FloatBetween(-0.6, 0.6),
        duration: 1500,
        delay: 2400 + i * 110,
        ease: 'Sine.in',
      });
    });

    this.time.delayedCall(5400, () => {
      this.tweens.add({
        targets: veil,
        fillAlpha: 0,
        duration: 800,
        onComplete: () => {
          veil.destroy();
          sheets.forEach((s) => s.destroy());
          onDone();
        },
      });
    });
  }
}
