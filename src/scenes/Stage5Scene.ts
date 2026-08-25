/** PAGE 8 — STAGE 5 기록 복원
 *  PHASE A 시간 배치 → PHASE B 관계 복원 → PHASE C 기록 완성
 *  마지막에 기록 복원 연출(0.5초 정적 → 북 → 조각 모임 → 금빛)을 재생한다.
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { P, cssColor } from '../systems/interactions/palette';
import type { Rect } from './Stage2Scene';

export class Stage5Scene extends BaseScene {
  private work!: Phaser.GameObjects.Container;
  private fx!: Phaser.GameObjects.Container;
  private rect: Rect = { x: 260, y: 240, w: 1080, h: 520 };

  constructor() {
    super('Stage5Scene');
  }

  preload(): void {
    this.loadTextures('bg-stage5', 'prop-memo-note');
  }

  create(): void {
    this.registerCleanup();
    this.addBackground('bg-stage5');
    this.add.rectangle(STAGE_W / 2, STAGE_H / 2, STAGE_W, STAGE_H, P.navy950, 0.7);
    this.work = this.add.container(0, 0);
    this.fx = this.add.container(0, 0).setDepth(900);
  }

  setWorkRect(rect: Rect): void {
    this.rect = rect;
  }

  clearWork(): void {
    if (!this.work) return;
    this.work.removeAll(true);
  }

  /* ── PHASE A — 활동 자료를 시간 흐름에 배치 ─────────── */
  /** 위쪽 자료를 아래 빈 칸에 순서대로 놓는다.
   *  전자칠판 뒷자리에서도 읽히도록 카드·글자를 크게 잡고,
   *  빈 칸은 번호와 두꺼운 테두리로 "여기에 놓는다"가 한눈에 보이게 한다.
   *  끌어서 놓기와 눌러서 놓기를 모두 받는다. */
  buildTimeline(
    ids: string[],
    correct: string[],
    dateLabels: Record<string, string>,
    onDone: () => void,
  ): void {
    this.clearWork();
    const { x, y, w, h } = this.rect;
    const n = correct.length;

    const GAP = 16;
    // 왼쪽 아래 안내 캐릭터의 말풍선이 첫 칸을 덮지 않을 만큼만 비워 둔다
    const LEFT_RESERVE = 110;
    const avail = w - LEFT_RESERVE - 24;
    const cardW = Math.min(232, (avail - GAP * (n - 1)) / n);
    const cardH = Math.min(168, Math.max(124, (h - 210) / 2.4));
    const rowW = cardW * n + GAP * (n - 1);
    const startX = x + LEFT_RESERVE + (avail - rowW) / 2;
    const trayY = y + 18;
    const slotY = y + h - cardH - 104;
    const axisY = slotY + cardH + 30;
    /** 이만큼 움직여야 끌기로 본다 */
    const DRAG_MIN = 14;

    /* ── 시간 축과 방향 안내 ───────────────────────── */
    const axis = this.add.graphics();
    axis.lineStyle(3, P.brass500, 0.75);
    axis.beginPath();
    axis.moveTo(startX - 18, axisY);
    axis.lineTo(startX + rowW + 18, axisY);
    axis.strokePath();
    // 오른쪽 화살촉
    axis.beginPath();
    axis.moveTo(startX + rowW + 8, axisY - 8);
    axis.lineTo(startX + rowW + 18, axisY);
    axis.lineTo(startX + rowW + 8, axisY + 8);
    axis.strokePath();
    this.work.add(axis);

    const axisLabel = (text: string, px: number, align: 0 | 1) =>
      this.work.add(
        this.add
          .text(px, axisY + 14, text, {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '19px',
            fontStyle: 'bold',
            color: cssColor(P.brass400),
          })
          .setOrigin(align, 0),
      );
    axisLabel('← 오래된 일', startX - 14, 0);
    axisLabel('나중 일 →', startX + rowW + 14, 1);

    /* ── 아래: 빈 칸 ───────────────────────────────── */
    type SlotState = 'empty' | 'target' | 'filled';
    interface Slot {
      x: number;
      y: number;
      cardId: string | null;
      frame: Phaser.GameObjects.Graphics;
      hint: Phaser.GameObjects.Text;
      badge: Phaser.GameObjects.Text;
    }
    const slots: Slot[] = [];

    const paintSlot = (i: number, state: SlotState): void => {
      const s = slots[i];
      const g = s.frame;
      g.clear();
      const fill = state === 'target' ? P.navy600 : P.navy900;
      g.fillStyle(fill, state === 'filled' ? 0.25 : 0.55);
      g.fillRoundedRect(s.x, s.y, cardW, cardH, 12);
      const color =
        state === 'target'
          ? P.brass300
          : state === 'filled'
            ? 0x6fae8f
            : P.brass500;
      g.lineStyle(state === 'target' ? 5 : 3.5, color, state === 'filled' ? 0.6 : 0.95);
      g.strokeRoundedRect(s.x, s.y, cardW, cardH, 12);
      // 안쪽 점선 느낌의 보조선 — 빈 칸일 때만
      if (state !== 'filled') {
        g.lineStyle(1.6, P.brass300, 0.4);
        g.strokeRoundedRect(s.x + 8, s.y + 8, cardW - 16, cardH - 16, 8);
      }
      s.hint.setVisible(state !== 'filled');
      s.hint.setColor(state === 'target' ? cssColor(P.hanji100) : cssColor(P.brass500));
      s.badge.setColor(state === 'filled' ? '#6fae8f' : cssColor(P.navy950));
      s.badge.setBackgroundColor(state === 'filled' ? cssColor(P.navy950) : cssColor(P.brass500));
    };

    for (let i = 0; i < n; i++) {
      const sx = startX + i * (cardW + GAP);
      const frame = this.add.graphics();
      this.work.add(frame);
      const badge = this.add
        .text(sx + 12, slotY + 10, String(i + 1), {
          fontFamily: 'Pretendard, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: cssColor(P.navy950),
          backgroundColor: cssColor(P.brass500),
          padding: { left: 11, right: 11, top: 3, bottom: 3 },
        })
        .setOrigin(0, 0);
      const hint = this.add
        .text(sx + cardW / 2, slotY + cardH / 2 + 10, '여기에\n놓아요', {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '18px',
          color: cssColor(P.brass500),
          align: 'center',
          lineSpacing: 4,
        })
        .setOrigin(0.5);
      this.work.add(badge);
      this.work.add(hint);
      slots.push({ x: sx, y: slotY, cardId: null, frame, hint, badge });
      paintSlot(i, 'empty');

      // 빈 칸을 눌러도 놓을 수 있게
      const sz = this.add
        .zone(sx + cardW / 2, slotY + cardH / 2, cardW, cardH)
        .setInteractive({ useHandCursor: true });
      sz.on('pointerup', () => {
        if (selectedId === null) return;
        placeCard(selectedId, i);
      });
      this.work.add(sz);
    }

    /* ── 위: 자료 카드 ─────────────────────────────── */
    interface Card {
      id: string;
      box: Phaser.GameObjects.Container;
      frame: Phaser.GameObjects.Graphics;
      home: { x: number; y: number };
    }
    const cards = new Map<string, Card>();
    let selectedId: string | null = null;

    const paintCard = (id: string, selected: boolean): void => {
      const card = cards.get(id);
      if (!card) return;
      const g = card.frame;
      g.clear();
      g.fillStyle(selected ? P.navy600 : P.navy700, 1);
      g.fillRoundedRect(0, 0, cardW, cardH, 12);
      g.lineStyle(selected ? 4 : 2.2, selected ? P.brass300 : P.brassDim, 0.95);
      g.strokeRoundedRect(0, 0, cardW, cardH, 12);
      card.box.setScale(selected ? 1.05 : 1);
    };

    const refreshSlots = (): void => {
      const firstEmpty = slots.findIndex((s) => s.cardId === null);
      slots.forEach((s, i) => {
        if (s.cardId) paintSlot(i, 'filled');
        else if (selectedId !== null) paintSlot(i, 'target');
        else paintSlot(i, i === firstEmpty ? 'target' : 'empty');
      });
    };

    const select = (id: string | null): void => {
      if (selectedId) paintCard(selectedId, false);
      selectedId = id;
      if (id) paintCard(id, true);
      refreshSlots();
    };

    const placeCard = (id: string, slotIndex: number): void => {
      const slot = slots[slotIndex];
      const card = cards.get(id);
      if (!card || slot.cardId === id) return;
      // 그 칸에 있던 카드는 제자리로 돌려보낸다
      if (slot.cardId) {
        const prev = cards.get(slot.cardId);
        if (prev) {
          this.tweens.add({
            targets: prev.box,
            x: prev.home.x,
            y: prev.home.y,
            duration: 200,
            ease: 'Sine.out',
          });
        }
        slot.cardId = null;
      }
      slots.forEach((s) => {
        if (s.cardId === id) s.cardId = null;
      });
      slot.cardId = id;
      this.work.bringToTop(card.box);
      this.tweens.add({
        targets: card.box,
        x: slot.x,
        y: slot.y,
        duration: 190,
        ease: 'Back.out',
      });
      EventBus.emit('SFX', 'slotOk');
      select(null);
      this.time.delayedCall(240, check);
    };

    const sendHome = (id: string): void => {
      const card = cards.get(id);
      if (!card) return;
      slots.forEach((s) => {
        if (s.cardId === id) s.cardId = null;
      });
      this.tweens.add({
        targets: card.box,
        x: card.home.x,
        y: card.home.y,
        duration: 200,
        ease: 'Sine.out',
      });
      refreshSlots();
    };

    ids.forEach((id, i) => {
      const ev = GameState.getEvidence(id);
      const home = { x: startX + i * (cardW + GAP), y: trayY };
      const box = this.add.container(home.x, home.y);
      const frame = this.add.graphics();
      box.add(frame);

      box.add(
        this.add.text(14, 14, ev?.title ?? id, {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '18px',
          color: cssColor(P.hanji100),
          wordWrap: { width: cardW - 28 },
          lineSpacing: 4,
          maxLines: 3,
        }),
      );
      box.add(
        this.add.text(14, cardH - 36, dateLabels[id] ?? '연도 확인', {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '21px',
          fontStyle: 'bold',
          color: cssColor(P.brass400),
        }),
      );

      cards.set(id, { id, box, frame, home });
      paintCard(id, false);

      const z = this.add
        .zone(cardW / 2, cardH / 2, cardW, cardH)
        .setInteractive({ draggable: true, useHandCursor: true });
      box.add(z);

      let downAt = { x: 0, y: 0 };
      let handled = false;
      let ox = 0;
      let oy = 0;

      z.on('pointerdown', (p: Phaser.Input.Pointer) => {
        downAt = { x: p.x, y: p.y };
        handled = false;
        ox = p.x - box.x;
        oy = p.y - box.y;
      });

      z.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (handled) return;
        if (Math.hypot(p.x - downAt.x, p.y - downAt.y) >= DRAG_MIN) return;
        handled = true;
        // 이미 칸에 놓인 카드를 누르면 다시 집어 든다
        if (slots.some((s) => s.cardId === id)) {
          sendHome(id);
          select(id);
          EventBus.emit('SFX', 'uiTap');
          return;
        }
        select(selectedId === id ? null : id);
        EventBus.emit('SFX', 'uiTap');
      });

      z.on('dragstart', () => {
        this.work.bringToTop(box);
        select(id);
      });

      z.on('drag', (p: Phaser.Input.Pointer) => {
        box.x = p.x - ox;
        box.y = p.y - oy;
        const near = nearestSlot(box.x, box.y);
        slots.forEach((s, si) => {
          if (s.cardId && s.cardId !== id) paintSlot(si, 'filled');
          else paintSlot(si, si === near ? 'target' : 'empty');
        });
      });

      z.on('dragend', (p: Phaser.Input.Pointer) => {
        if (Math.hypot(p.x - downAt.x, p.y - downAt.y) < DRAG_MIN) return;
        handled = true;
        const near = nearestSlot(box.x, box.y);
        if (near >= 0) {
          placeCard(id, near);
        } else {
          sendHome(id);
          select(null);
        }
      });

      this.work.add(box);
    });

    /** 카드 위치에서 가장 가까운 칸. 넉넉하게 잡아 잘 걸리게 한다. */
    const nearestSlot = (px: number, py: number): number => {
      let best = -1;
      let bestD = Number.POSITIVE_INFINITY;
      slots.forEach((s, i) => {
        const d = Phaser.Math.Distance.Between(
          px + cardW / 2,
          py + cardH / 2,
          s.x + cardW / 2,
          s.y + cardH / 2,
        );
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return bestD < cardW * 1.1 ? best : -1;
    };

    refreshSlots();

    const check = () => {
      refreshSlots();
      if (slots.some((s) => s.cardId === null)) return;
      if (slots.every((s, i) => s.cardId === correct[i])) {
        EventBus.emit('SFX', 'evidenceLinked');
        onDone();
      } else {
        EventBus.emit('SFX', 'slotConflict');
        EventBus.emit(
          'HINT',
          '순서가 아직 맞지 않아. 카드 아래 연도를 보고 오래된 것부터 왼쪽에 놓아 봐.',
        );
      }
    };
  }

  /* ── 기록 복원 연출 ─────────────────────────────── */
  playRestoration(onComplete: () => void): void {
    this.clearWork();
    const cx = STAGE_W / 2;
    const cy = STAGE_H * 0.5;

    const dark = this.add
      .rectangle(cx, cy, STAGE_W, STAGE_H, P.navy950, 0)
      .setDepth(890);
    this.tweens.add({ targets: dark, fillAlpha: 0.92, duration: 600 });

    // 0.5초 정적 뒤 북 한 번
    this.time.delayedCall(700, () => {
      EventBus.emit('SFX', 'bukHit');
      const shock = this.add.graphics().setDepth(901);
      shock.lineStyle(3, P.brass300, 0.55);
      shock.strokeCircle(0, 0, 60);
      shock.setPosition(cx, cy);
      this.fx.add(shock);
      this.tweens.add({
        targets: shock,
        scale: 9,
        alpha: 0,
        duration: 1400,
        ease: 'Cubic.out',
        onComplete: () => shock.destroy(),
      });
      this.cameras.main.shake(220, 0.004);
    });

    // 기록 쪽지(첫 화면과 같은 그림)가 화면 밖에서 모여든다
    this.time.delayedCall(1000, () => {
      for (let i = 0; i < 34; i++) {
        const g = this.add.image(0, 0, 'prop-memo-note').setDepth(902);
        g.setScale(Phaser.Math.FloatBetween(0.06, 0.14));
        const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const r = Phaser.Math.Between(560, 980);
        g.setPosition(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.setRotation(Phaser.Math.FloatBetween(-1, 1));
        this.fx.add(g);
        this.tweens.add({
          targets: g,
          x: cx + Phaser.Math.Between(-90, 90),
          y: cy + Phaser.Math.Between(-110, 110),
          rotation: Phaser.Math.FloatBetween(-0.15, 0.15),
          scale: g.scale * 0.75,
          duration: Phaser.Math.Between(1100, 1800),
          delay: i * 26,
          ease: 'Cubic.inOut',
        });
      }
    });

    // 금빛이 퍼지며 기록이 하나로
    this.time.delayedCall(2900, () => {
      const glow = this.add.graphics().setDepth(903);
      glow.fillStyle(P.brass300, 0.9);
      glow.fillCircle(0, 0, 30);
      glow.setPosition(cx, cy);
      this.fx.add(glow);
      this.tweens.add({
        targets: glow,
        scale: 26,
        alpha: 0,
        duration: 1500,
        ease: 'Cubic.out',
      });
      this.fx.list.forEach((obj) => {
        const go = obj as Phaser.GameObjects.Graphics;
        this.tweens.add({
          targets: go,
          alpha: 0,
          scale: 0.2,
          duration: 900,
          ease: 'Sine.in',
        });
      });
    });

    this.time.delayedCall(4600, () => {
      this.tweens.add({
        targets: dark,
        fillAlpha: 1,
        duration: 700,
        onComplete,
      });
    });
  }
}
