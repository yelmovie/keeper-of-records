/** PAGE 4 — STAGE 1 흔적 탐색
 *  기록보관실 전체 공간을 카메라로 둘러보며 물건을 직접 조작한다.
 *  모든 물건이 단서는 아니며, 반짝임으로 정답을 알려주지 않는다.
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { InteractionRegistry } from '../systems/interactions';
import type { InteractionController } from '../systems/interactions';
import { P } from '../systems/interactions/palette';
import type { ExploreHotspot } from '../data/schemas';
import { TEXTURE_KEYS, type TextureKey } from '../config/AssetMap';

export class Stage1Scene extends BaseScene {
  private world!: Phaser.GameObjects.Container;
  private controllers: InteractionController[] = [];
  private roomWidth = 2800;
  private inspected = new Set<string>();
  private zoneIndex = 0;
  private readonly zoneCount = 3;
  /** 오른쪽 자료 수첩이 가리는 폭만큼 더 이동해 마지막 물건도 온전히 보이게 한다. */
  private readonly railReserve = 360;

  constructor() {
    super('Stage1Scene');
  }

  preload(): void {
    const trackTextureKeys = Array.from(
      new Set(
        (GameState.caseData?.stages.explore.hotspots ?? [])
          .flatMap((hotspot) => [hotspot.textureKey, hotspot.backTextureKey])
          .filter(
            (key): key is TextureKey => Boolean(key && key in TEXTURE_KEYS),
          ),
      ),
    );
    this.loadTextures(
      'bg-stage1',
      'prop-archive-drawer',
      'prop-letter-envelope',
      'prop-sealed-envelope',
      'prop-old-photo',
      'prop-old-photo-back',
      'prop-teacup',
      'prop-dusty-document',
      'prop-oil-lamp',
      'prop-document-cabinet',
      'prop-cabinet-letter',
      'prop-torn-document',
      'prop-inkstone',
      'prop-pocket-watch',
      'prop-pocket-watch-back',
      ...trackTextureKeys,
    );
  }

  create(): void {
    this.registerCleanup();
    this.controllers = [];
    this.inspected = new Set();
    this.zoneIndex = 0;

    const data = GameState.caseData?.stages.explore;
    if (!data) return;
    this.roomWidth = data.roomWidth;

    this.world = this.add.container(0, 0);

    // 배경을 가로로 반복 배치해 넓은 방을 만든다
    const bgKey = 'bg-stage1';
    const tileW = STAGE_W;
    const tiles = Math.ceil(this.roomWidth / tileW) + 1;
    for (let i = 0; i < tiles; i++) {
      const img = this.add.image(i * tileW, 0, bgKey).setOrigin(0, 0);
      img.setDisplaySize(STAGE_W, STAGE_H);
      this.world.add(img);
    }

    // 새 배경은 물건을 놓을 자리를 비워 두었다. 얇은 veil만 사용한다.
    const veil = this.add
      .rectangle(0, 0, this.roomWidth + 400, STAGE_H, 0x0a1020, 0.2)
      .setOrigin(0, 0);
    this.world.add(veil);

    // 바닥 그림자
    const floor = this.add.graphics();
    floor.fillStyle(P.navy950, 0.28);
    floor.fillRect(0, STAGE_H * 0.78, this.roomWidth + 400, STAGE_H * 0.22);
    this.world.add(floor);

    // 조작 물건 배치
    data.hotspots.forEach((hs) => this.buildHotspot(hs));

    this.enablePan();
    EventBus.emit('EXPLORE_ZONE_CHANGED', { index: 0, count: this.zoneCount });
  }

  private buildHotspot(hs: ExploreHotspot): void {
    const factory = InteractionRegistry[hs.interaction] ?? InteractionRegistry.tap;
    if (!factory) return;

    const alreadyFound = hs.evidenceId ? GameState.has(hs.evidenceId) : false;

    // 물건이 배경에 섞이지 않도록 조사 자리 자체를 한 장의 카드처럼 묶는다.
    // 캐비닛은 그림을 핫스팟 사각형보다 위로 크게 그리므로 카드도 그만큼 키운다.
    // (DrawerInteraction 의 visualH 계산과 같은 식)
    const extraTop =
      hs.id === 'hs-cabinet' ? Math.min(260, hs.h * 2.15) - hs.h : 0;
    const station = this.add.graphics();
    station.fillStyle(P.navy950, 0.5);
    station.fillRoundedRect(
      hs.x - 16,
      hs.y - 54 - extraTop,
      hs.w + 32,
      hs.h + 76 + extraTop,
      16,
    );
    station.lineStyle(1.5, P.brassDim, 0.5);
    station.strokeRoundedRect(
      hs.x - 16,
      hs.y - 54 - extraTop,
      hs.w + 32,
      hs.h + 76 + extraTop,
      16,
    );
    this.world.add(station);

    // 물건이 공간에 놓여 있게 보이도록 바닥 그림자를 먼저 깐다
    const shadow = this.add.graphics();
    shadow.fillStyle(0x05070f, 0.42);
    shadow.fillEllipse(
      hs.x + hs.w / 2,
      hs.y + hs.h + 6,
      hs.w * 1.12,
      Math.max(14, hs.h * 0.2),
    );
    this.world.add(shadow);

    const ctrl = factory({
      scene: this,
      hotspot: hs,
      onReveal: (h) => this.handleReveal(h),
      onNotice: (text) => EventBus.emit('HINT', text),
    });
    this.world.add(ctrl.container);
    this.controllers.push(ctrl);

    if (alreadyFound) {
      // 이미 수첩에 있는 시작 자료도 다시 눌러 뜻을 확인할 수 있다.
      ctrl.container.setAlpha(0.82);
    }
  }

  private handleReveal(hs: ExploreHotspot): void {
    if (this.inspected.has(hs.id)) return;
    this.inspected.add(hs.id);

    if (!hs.evidenceId) {
      EventBus.emit('HINT', hs.emptyText ?? '기록과 이어지는 흔적은 안 보여.');
      EventBus.emit('SFX', 'uiTap');
      return;
    }

    const added = GameState.addEvidence(hs.evidenceId);
    if (added) {
      EventBus.emit('SFX', 'evidenceFound');
      this.flashDiscovery(hs);
    } else {
      EventBus.emit('EVIDENCE_INSPECTED', {
        id: hs.evidenceId,
        source: 'stage1',
      });
    }
  }

  /** 발견 순간의 짧은 금빛 — 과장된 폭죽 대신 절제된 확산 */
  private flashDiscovery(hs: ExploreHotspot): void {
    const cx = hs.x + hs.w / 2;
    const cy = hs.y + hs.h / 2;
    const ring = this.add.graphics();
    ring.lineStyle(2, P.brass300, 0.85);
    ring.strokeCircle(0, 0, Math.max(hs.w, hs.h) * 0.5);
    ring.setPosition(cx, cy);
    this.world.add(ring);
    this.tweens.add({
      targets: ring,
      scale: 1.9,
      alpha: 0,
      duration: 780,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });
  }

  /** 힌트: 정답 위치를 직접 보여주지 않고 영역만 약하게 안내 */
  focusHintArea(): void {
    const data = GameState.caseData?.stages.explore;
    if (!data) return;
    const remaining = data.hotspots.filter(
      (h) => h.evidenceId && !GameState.has(h.evidenceId),
    );
    if (remaining.length === 0) return;
    const target = remaining[0];
    const targetX = Phaser.Math.Clamp(
      -(target.x - STAGE_W / 2),
      -this.getMaxScroll(),
      0,
    );
    this.tweens.add({
      targets: this.world,
      x: targetX,
      duration: 900,
      ease: 'Cubic.inOut',
      onComplete: () => this.syncZoneFromWorld(),
    });
    // 넓은 영역만 은은하게
    const halo = this.add.graphics();
    halo.fillStyle(P.brass300, 0.06);
    halo.fillCircle(target.x + target.w / 2, target.y + target.h / 2, 210);
    this.world.add(halo);
    this.tweens.add({
      targets: halo,
      alpha: 0,
      duration: 2600,
      delay: 700,
      onComplete: () => halo.destroy(),
    });
  }

  /** 버튼으로도 기록실을 이동할 수 있게 해 태블릿 스와이프 의존을 없앤다. */
  moveZone(direction: -1 | 1): void {
    this.goToZone(this.zoneIndex + direction);
  }

  goToZone(index: number): void {
    const next = Phaser.Math.Clamp(index, 0, this.zoneCount - 1);
    const maxScroll = this.getMaxScroll();
    const targetX = -(maxScroll * next) / (this.zoneCount - 1);
    this.zoneIndex = next;
    this.tweens.killTweensOf(this.world);
    this.tweens.add({
      targets: this.world,
      x: targetX,
      duration: 420,
      ease: 'Cubic.inOut',
    });
    EventBus.emit('EXPLORE_ZONE_CHANGED', {
      index: this.zoneIndex,
      count: this.zoneCount,
    });
  }

  private syncZoneFromWorld(): void {
    const maxScroll = Math.max(1, this.getMaxScroll());
    const ratio = Phaser.Math.Clamp(-this.world.x / maxScroll, 0, 1);
    this.zoneIndex = Math.round(ratio * (this.zoneCount - 1));
    EventBus.emit('EXPLORE_ZONE_CHANGED', {
      index: this.zoneIndex,
      count: this.zoneCount,
    });
  }

  private getMaxScroll(): number {
    return Math.max(0, this.roomWidth - (STAGE_W - this.railReserve));
  }

  private enablePan(): void {
    let dragging = false;
    let startPointer = 0;
    let startWorld = 0;
    const minX = -this.getMaxScroll();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, objs: unknown[]) => {
      // 물건 위에서 시작한 드래그는 조작으로 넘긴다
      if (objs.length > 0) return;
      dragging = true;
      startPointer = p.x;
      startWorld = this.world.x;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      this.world.x = Phaser.Math.Clamp(
        startWorld + (p.x - startPointer),
        minX,
        0,
      );
    });

    this.input.on('pointerup', () => {
      dragging = false;
      this.syncZoneFromWorld();
    });
  }
}
