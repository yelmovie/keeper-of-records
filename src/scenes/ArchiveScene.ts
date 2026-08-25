/** PAGE 2 — 사건 기록소 (기록 회랑)
 *  카드 그리드가 아니라, 좌우로 미는 기록 서랍장. 서랍을 누르면 앞으로 나오며 열린다.
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { EventBus } from '../core/EventBus';
import { P, cssColor } from '../systems/interactions/palette';
import type { CaseCatalogEntry } from '../data/schemas';

const CAB_W = 320;
const CAB_H = 210;
const GAP = 48;
const START_X = 420;

export class ArchiveScene extends BaseScene {
  private rail!: Phaser.GameObjects.Container;
  private cabinets: Phaser.GameObjects.Container[] = [];
  private minX = 0;
  private selected = -1;
  private entries: CaseCatalogEntry[] = [];

  constructor() {
    super('ArchiveScene');
  }

  preload(): void {
    this.loadTextures('bg-archive', 'prop-archive-drawer');
  }

  create(data: { entries?: CaseCatalogEntry[] } = {}): void {
    this.registerCleanup();
    this.cabinets = [];
    this.selected = -1;
    this.entries = data.entries ?? this.entries;

    this.addBackground('bg-archive');
    this.add.rectangle(STAGE_W / 2, STAGE_H / 2, STAGE_W, STAGE_H, P.navy950, 0.5);

    this.rail = this.add.container(0, 0);
    this.entries.forEach((entry, i) => this.buildCabinet(entry, i));

    const totalW = START_X + this.entries.length * (CAB_W + GAP);
    this.minX = Math.min(0, STAGE_W - totalW - 200);

    this.enableDragPan();
  }

  /** 카탈로그가 나중에 도착했을 때 다시 구성.
   *  Scene의 create() 보다 먼저 불릴 수 있으므로 방어한다. */
  setEntries(entries: CaseCatalogEntry[]): void {
    this.entries = entries;
    if (!this.rail) return; // create()에서 this.entries로 구성된다
    this.selected = -1;
    this.rail.removeAll(true);
    this.cabinets = [];
    entries.forEach((e, i) => this.buildCabinet(e, i));
    const totalW = START_X + entries.length * (CAB_W + GAP);
    this.minX = Math.min(0, STAGE_W - totalW - 200);
  }

  /** 좌우 화살표로 기록 회랑을 한 상자씩 이동한다. */
  moveRail(direction: -1 | 1): void {
    if (!this.rail) return;
    const targetX = Phaser.Math.Clamp(
      this.rail.x - direction * (CAB_W + GAP),
      this.minX,
      0,
    );
    this.tweens.add({
      targets: this.rail,
      x: targetX,
      duration: 380,
      ease: 'Cubic.out',
    });
    EventBus.emit('SFX', 'uiTap');
  }

  private buildCabinet(entry: CaseCatalogEntry, i: number): void {
    const x = START_X + i * (CAB_W + GAP);
    const y = STAGE_H / 2 - CAB_H / 2;
    const c = this.add.container(x, y);
    // 캐비닛 틀
    const frame = this.add.graphics();
    frame.fillStyle(P.navy950, 0.9);
    frame.fillRoundedRect(-10, -10, CAB_W + 20, CAB_H + 20, 8);
    frame.lineStyle(1.5, P.brassDim, 0.6);
    frame.strokeRoundedRect(-10, -10, CAB_W + 20, CAB_H + 20, 8);
    c.add(frame);

    // 서랍 앞판
    const front = this.add.container(0, 0);
    const drawer = this.add.image(CAB_W / 2, CAB_H / 2, 'prop-archive-drawer');
    drawer.setDisplaySize(CAB_W, CAB_H);
    front.add(drawer);

    // 서랍 위 명패 — 상자 밖 위쪽에 두어 항상 읽히게 한다
    const title = this.add
      .text(CAB_W / 2, -40, entry.title, {
        fontFamily: 'Noto Serif KR, Batang, serif',
        fontSize: '24px',
        color: '#e8d9ae',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 2, '#000000', 6);
    c.add(title);

    const stateText = this.add
      .text(CAB_W / 2, CAB_H - 30, '선택 가능', {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '16px',
        color: cssColor(P.brass400),
      })
      .setOrigin(0.5);
    front.add(stateText);

    c.add(front);
    c.setData('front', front);
    c.setData('entry', entry);

    const zone = this.add
      .zone(CAB_W / 2, CAB_H / 2, CAB_W, CAB_H)
      .setInteractive({ useHandCursor: true });
    c.add(zone);

    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.x - p.downX) > 8) return; // 스와이프와 구분
      this.selectCabinet(i);
    });

    this.rail.add(c);
    this.cabinets.push(c);
  }

  private selectCabinet(i: number): void {
    if (this.selected === i) return;

    // 이전 서랍 닫기
    if (this.selected >= 0) {
      const prev = this.cabinets[this.selected];
      const pf = prev?.getData('front') as Phaser.GameObjects.Container;
      if (pf) this.tweens.add({ targets: pf, y: 0, duration: 260, ease: 'Sine.out' });
    }

    this.selected = i;
    const cab = this.cabinets[i];
    const front = cab.getData('front') as Phaser.GameObjects.Container;
    this.tweens.add({
      targets: front,
      y: CAB_H * 0.42,
      duration: 340,
      ease: 'Back.out',
    });

    // 선택한 서랍을 화면 왼쪽 1/3 지점으로 이동
    const targetX = Phaser.Math.Clamp(
      -(START_X + i * (CAB_W + GAP)) + STAGE_W * 0.26,
      this.minX,
      0,
    );
    this.tweens.add({
      targets: this.rail,
      x: targetX,
      duration: 420,
      ease: 'Cubic.out',
    });

    EventBus.emit('SFX', 'paper');
    EventBus.emit('EVIDENCE_INSPECTED', {
      source: 'archive',
      entry: cab.getData('entry'),
    });
  }

  private enableDragPan(): void {
    let dragging = false;
    let startPointer = 0;
    let startRail = 0;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragging = true;
      startPointer = p.x;
      startRail = this.rail.x;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      this.rail.x = Phaser.Math.Clamp(
        startRail + (p.x - startPointer),
        this.minX,
        0,
      );
    });

    this.input.on('pointerup', () => {
      dragging = false;
    });
  }
}
