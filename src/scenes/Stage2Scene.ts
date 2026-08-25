/** PAGE 5 — STAGE 2 자료 분석
 *  세 가지 작업을 한 작업면에서 전환한다.
 *   compare  : 두 기록을 좌우 스크럽으로 겹쳐 보기
 *   timeline : 자료를 시간 순서로 배치
 *   connect  : 인물·조직·사건·지역을 선으로 연결
 */
import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { STAGE_W, STAGE_H } from '../core/Viewport';
import { EventBus } from '../core/EventBus';
import { GameState } from '../core/GameState';
import type { TextureKey } from '../config/AssetMap';
import { P, pairColor } from '../systems/interactions/palette';
import type { AnalyzeTask } from '../data/schemas';

const ANALYSIS_TEXTURE_BY_PERSON: Record<string, TextureKey> = {
  yunbonggil: 'analysis-yunbonggil',
  ahnjunggeun: 'analysis-ahnjunggeun',
  yugwansun: 'analysis-yugwansun',
  kimjwajin: 'analysis-kimjwajin',
  ahnchangho: 'analysis-ahnchangho',
  kimgu: 'analysis-kimgu',
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Stage2Scene extends BaseScene {
  private work!: Phaser.GameObjects.Container;
  private rect: Rect = { x: 292, y: 180, w: 996, h: 700 };
  private completed = new Set<string>();
  private activeTaskId = '';

  constructor() {
    super('Stage2Scene');
  }

  preload(): void {
    this.loadTextures('bg-stage2', ...Object.values(ANALYSIS_TEXTURE_BY_PERSON));
  }

  create(): void {
    this.registerCleanup();
    this.completed = new Set();

    this.addBackground('bg-stage2');
    this.add.rectangle(STAGE_W / 2, STAGE_H / 2, STAGE_W, STAGE_H, 0x0a1020, 0.72);

    this.work = this.add.container(0, 0);
  }

  setWorkRect(rect: Rect): void {
    this.rect = rect;
  }

  isDone(taskId: string): boolean {
    return this.completed.has(taskId);
  }

  clearWork(): void {
    this.activeTaskId = '';
    if (!this.work) return;
    this.work.removeAll(true);
  }

  showTask(task: AnalyzeTask, teacherPreview = false): void {
    this.clearWork();
    this.activeTaskId = task.id;
    switch (task.type) {
      case 'compare':
        this.buildCompare(task);
        break;
      case 'timeline':
        this.buildTimeline(task);
        break;
      case 'connect':
        if (teacherPreview) this.buildConnectAnswerKey(task);
        else this.buildConnectGuided(task);
        break;
    }
  }

  private done(task: AnalyzeTask, message: string): void {
    // 이전 활동에서 늦게 도착한 dragend/delayedCall이 현재 탭을 건드리지 못하게 한다.
    if (this.activeTaskId !== task.id) return;
    if (this.completed.has(task.id)) return;
    this.completed.add(task.id);
    EventBus.emit('SFX', 'evidenceLinked');
    EventBus.emit('COMPARE_UPDATED', { taskId: task.id, message });
  }

  private get analysisTextureKey(): TextureKey {
    return (
      ANALYSIS_TEXTURE_BY_PERSON[GameState.caseData?.solvedPersonId ?? ''] ??
      'analysis-yunbonggil'
    );
  }

  /** 생성 에셋의 좌·우 사료 묶음 중 하나를 종이 안에 비율 유지해 배치한다. */
  private analysisDocumentImage(
    w: number,
    h: number,
    variant: 0 | 1,
  ): Phaser.GameObjects.Image {
    const key = this.analysisTextureKey;
    const source = this.textures.get(key).getSourceImage() as {
      width: number;
      height: number;
    };
    const sourceW = source.width || 1024;
    const sourceH = source.height || 1024;
    const sourceHalfW = sourceW / 2;
    const sourceX = variant * sourceHalfW;
    const scale = Math.min((w - 28) / sourceHalfW, (h - 24) / sourceH);
    const visibleW = sourceHalfW * scale;
    const visibleH = sourceH * scale;
    const image = this.add.image(0, 0, key).setOrigin(0);

    image.setCrop(sourceX, 0, sourceHalfW, sourceH);
    image.setScale(scale);
    // Phaser crop은 원본 프레임의 좌표 오프셋을 유지하므로 그만큼 되돌린다.
    image.setPosition(
      (w - visibleW) / 2 - sourceX * scale,
      (h - visibleH) / 2,
    );
    return image;
  }

  /** 같은 사료 보드에서도 카드마다 다른 단서 구역을 보여 준다. */
  private analysisThumbnail(
    x: number,
    y: number,
    w: number,
    h: number,
    index: number,
    columns: number,
    rows: number,
  ): Phaser.GameObjects.Image {
    const key = this.analysisTextureKey;
    const source = this.textures.get(key).getSourceImage() as {
      width: number;
      height: number;
    };
    const sourceW = source.width || 1024;
    const sourceH = source.height || 1024;
    const cellW = sourceW / columns;
    const cellH = sourceH / rows;
    const column = index % columns;
    const row = Math.floor(index / columns) % rows;
    const sourceX = column * cellW;
    const sourceY = row * cellH;
    const scaleX = w / cellW;
    const scaleY = h / cellH;
    const image = this.add.image(0, 0, key).setOrigin(0);

    image.setCrop(sourceX, sourceY, cellW, cellH);
    image.setScale(scaleX, scaleY);
    image.setPosition(x - sourceX * scaleX, y - sourceY * scaleY);
    return image;
  }

  private comparePaper(
    w: number,
    h: number,
    variant: 0 | 1,
  ): Phaser.GameObjects.Container {
    const paper = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(P.hanji200, 1);
    g.fillRoundedRect(0, 0, w, h, 3);
    g.lineStyle(1, P.hanji300, 1);
    g.strokeRoundedRect(0, 0, w, h, 3);
    paper.add([g, this.analysisDocumentImage(w, h, variant)]);

    const edge = this.add.graphics();
    edge.lineStyle(2, P.brassDim, 0.72);
    edge.strokeRoundedRect(5, 5, w - 10, h - 10, 5);
    paper.add(edge);
    return paper;
  }

  /* ── 1. 두 기록 겹쳐 보기 ─────────────────────────── */
  private buildCompare(task: AnalyzeTask): void {
    const { x, y, w, h } = this.rect;
    const docW = Math.min(560, w - 120);
    const docH = Math.min(480, h - 120);
    const cx = x + w / 2;
    const cy = y + h / 2;

    const ids = task.pairEvidenceIds ?? ['', ''];
    const a = ids[0] ? GameState.getEvidence(ids[0]) : undefined;
    const b = ids[1] ? GameState.getEvidence(ids[1]) : undefined;

    const label = (text: string, px: number) =>
      this.add
        .text(px, cy - docH / 2 - 26, text, {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '16px',
          color: '#d9b878',
        })
        .setOrigin(0.5);

    // 아래층 문서
    const under = this.comparePaper(docW, docH, 0);
    under.setPosition(cx - docW / 2, cy - docH / 2);
    this.work.add(under);
    this.work.add(label(a?.title ?? '기록 A', cx - docW / 4));

    // 위층 문서 (마스크로 잘라 겹침 표현)
    const over = this.comparePaper(docW, docH, 1);
    over.setPosition(cx - docW / 2, cy - docH / 2);
    const overTint = this.add.graphics();
    overTint.fillStyle(P.hanji300, 0.35);
    overTint.fillRect(cx - docW / 2, cy - docH / 2, docW, docH);
    const overGroup = this.add.container(0, 0, [over, overTint]);
    this.work.add(overGroup);
    this.work.add(label(b?.title ?? '기록 B', cx + docW / 4));

    const maskG = this.make.graphics({ x: 0, y: 0 }, false);
    const applyMask = (splitX: number) => {
      maskG.clear();
      maskG.fillStyle(0xffffff);
      maskG.fillRect(splitX, cy - docH / 2, cx + docW / 2 - splitX, docH);
    };
    const mask = maskG.createGeometryMask();
    overGroup.setMask(mask);
    applyMask(cx);

    // 손잡이
    const handle = this.add.container(cx, cy);
    const bar = this.add.graphics();
    bar.fillStyle(P.brass400, 0.95);
    bar.fillRect(-2, -docH / 2, 4, docH);
    const knob = this.add.graphics();
    knob.fillStyle(P.brass500, 1);
    knob.fillCircle(0, 0, 20);
    knob.lineStyle(2, P.hanji100, 0.85);
    knob.strokeCircle(0, 0, 20);
    knob.lineStyle(2, P.navy900, 1);
    knob.beginPath();
    knob.moveTo(-7, -5);
    knob.lineTo(-12, 0);
    knob.lineTo(-7, 5);
    knob.moveTo(7, -5);
    knob.lineTo(12, 0);
    knob.lineTo(7, 5);
    knob.strokePath();
    handle.add([bar, knob]);
    this.work.add(handle);

    const zone = this.add
      .zone(cx, cy, 90, docH)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.work.add(zone);

    let sweptLeft = false;
    let sweptRight = false;

    zone.on('drag', (p: Phaser.Input.Pointer) => {
      const nx = Phaser.Math.Clamp(p.x, cx - docW / 2, cx + docW / 2);
      handle.x = nx;
      zone.x = nx;
      applyMask(nx);
      if (nx < cx - docW * 0.34) sweptLeft = true;
      if (nx > cx + docW * 0.34) sweptRight = true;
      if (sweptLeft && sweptRight && !this.completed.has(task.id)) {
        this.revealCompareInsight(task);
      }
    });

    this.tweens.add({
      targets: knob,
      scale: { from: 1, to: 1.12 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private revealCompareInsight(task: AnalyzeTask): void {
    if (this.completed.has(task.id) || this.activeTaskId !== task.id) return;
    if (task.compareUnlockEvidenceId) {
      GameState.addEvidence(task.compareUnlockEvidenceId);
    }
    const insight =
      task.compareInsightText ?? '두 기록에서 같은 특징을 확인했습니다.';
    this.showInsightPanel('✓ 찾았다! 두 기록의 같은 점', insight);
    this.done(task, insight);
  }

  /** 활동 완료 안내 패널 — 작업면 정중앙, [확인했어요]를 눌러야 닫힌다 */
  private showInsightPanel(headText: string, insight: string): void {
    const { x, y, w, h } = this.rect;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const panelW = Math.min(560, w - 80);

    const head = this.add
      .text(0, 0, headText, {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#8ed2b1',
      })
      .setOrigin(0.5, 0);
    const body = this.add
      .text(0, 34, insight, {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '17px',
        color: '#f4ecdc',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: panelW - 56 },
      })
      .setOrigin(0.5, 0);
    const foot = this.add
      .text(0, 34 + body.height + 14, '확인한 사실에 기록해 두었어요', {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '13px',
        color: '#d5c5a5',
      })
      .setOrigin(0.5, 0);

    // [확인했어요] 버튼 — 이 버튼을 눌러야만 닫힌다
    const btnY = 34 + body.height + 14 + foot.height + 18;
    const btnW = 172;
    const btnH = 46;
    const btnG = this.add.graphics();
    btnG.fillStyle(P.brass400, 1);
    btnG.fillRoundedRect(-btnW / 2, btnY, btnW, btnH, 10);
    btnG.lineStyle(2, P.brass300, 1);
    btnG.strokeRoundedRect(-btnW / 2, btnY, btnW, btnH, 10);
    const btnLabel = this.add
      .text(0, btnY + btnH / 2, '확인했어요', {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#0a1020',
      })
      .setOrigin(0.5);

    const panelH = btnY + btnH + 40;
    const g = this.add.graphics();
    g.fillStyle(P.navy900, 0.94);
    g.fillRoundedRect(-panelW / 2, -20, panelW, panelH, 14);
    g.lineStyle(3, P.brass400, 1);
    g.strokeRoundedRect(-panelW / 2, -20, panelW, panelH, 14);

    const panel = this.add.container(cx, cy - panelH / 2 + 20, [
      g,
      head,
      body,
      foot,
      btnG,
      btnLabel,
    ]);
    panel.setAlpha(0).setScale(0.9);
    this.work.add(panel);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: 'Back.out',
    });

    // 손잡이 드래그를 놓는 순간의 pointerup이 패널을 닫아 버리지 않도록
    // 버튼만 입력을 받고, 잠깐 뒤에 활성화한다.
    const btnZone = this.add
      .zone(0, btnY + btnH / 2, btnW + 20, btnH + 16)
      .setOrigin(0.5);
    panel.add(btnZone);
    this.time.delayedCall(450, () => {
      if (!btnZone.active) return;
      btnZone.setInteractive({ useHandCursor: true });
      btnZone.once('pointerup', () => {
        this.tweens.add({
          targets: panel,
          alpha: 0,
          duration: 180,
          onComplete: () => panel.destroy(true),
        });
      });
    });
  }

  /* ── 2. 시간 순서로 배치 ─────────────────────────── */
  private buildTimeline(task: AnalyzeTask): void {
    const { x, y, w, h } = this.rect;
    const ids = task.timelineEvidenceIds ?? [];
    const correct = task.timelineCorrectOrder ?? [];
    const n = correct.length;
    const slotGap = 18;
    const slotW = Math.min(190, (w - 100) / n - slotGap);
    const slotH = 136;
    const axisY = y + h * 0.55;
    const startX = x + (w - (slotW + slotGap) * n + slotGap) / 2;
    const slotTop = axisY - slotH / 2;

    // 시간축 — 얇은 선 대신 멀리서도 보이는 굵은 금빛 화살표로 방향을 알려 준다.
    const axis = this.add.graphics();
    const axisLineY = axisY + slotH / 2 + 42;
    axis.lineStyle(10, P.brassDim, 0.2);
    axis.beginPath();
    axis.moveTo(x + 44, axisLineY);
    axis.lineTo(x + w - 44, axisLineY);
    axis.strokePath();
    axis.lineStyle(4, P.brass400, 0.95);
    axis.beginPath();
    axis.moveTo(x + 44, axisLineY);
    axis.lineTo(x + w - 58, axisLineY);
    axis.strokePath();
    axis.fillStyle(P.brass400, 0.95);
    axis.fillTriangle(
      x + w - 58,
      axisLineY - 12,
      x + w - 34,
      axisLineY,
      x + w - 58,
      axisLineY + 12,
    );
    this.work.add(axis);
    this.work.add(
      this.add
        .text(x + 46, axisLineY + 14, '먼저 · 이른 시기', {
          fontFamily: 'Pretendard, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#f2cf78',
        })
        .setOrigin(0, 0),
    );
    this.work.add(
      this.add
        .text(x + w - 46, axisLineY + 14, '나중 · 늦은 시기', {
          fontFamily: 'Pretendard, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#f2cf78',
        })
        .setOrigin(1, 0),
    );

    const placeGuide = this.add
      .text(x + w / 2, slotTop - 34, '↓  카드를 끌거나 한 번 눌러 아래 번호 칸에 놓아요  ↓', {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#f2cf78',
        backgroundColor: 'rgba(10,16,32,0.78)',
        padding: { left: 16, right: 16, top: 7, bottom: 7 },
      })
      .setOrigin(0.5);
    this.work.add(placeGuide);

    // 슬롯 — 번호, 채움색, 굵은 테두리와 다음 빈칸 맥박으로 목표를 즉시 보이게 한다.
    const slots: {
      x: number;
      y: number;
      cardId: string | null;
      frame: Phaser.GameObjects.Graphics;
      glow: Phaser.GameObjects.Graphics;
      label: Phaser.GameObjects.Text;
    }[] = [];
    for (let i = 0; i < n; i++) {
      const sx = startX + i * (slotW + slotGap);
      const glow = this.add.graphics();
      glow.lineStyle(9, P.brass300, 0.38);
      glow.strokeRoundedRect(sx - 3, slotTop - 3, slotW + 6, slotH + 6, 12);
      glow.setAlpha(0);

      const frame = this.add.graphics();
      frame.fillStyle(P.brassDim, 0.14);
      frame.fillRoundedRect(sx, slotTop, slotW, slotH, 10);
      frame.lineStyle(3.5, P.brass400, 0.92);
      frame.strokeRoundedRect(sx, slotTop, slotW, slotH, 10);

      const label = this.add
        .text(sx + slotW / 2, slotTop + slotH / 2, `${i + 1}\n여기에 놓기`, {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#f2cf78',
          align: 'center',
          lineSpacing: 7,
        })
        .setOrigin(0.5)
        .setAlpha(0.92);

      this.work.add([glow, frame, label]);
      slots.push({ x: sx, y: slotTop, cardId: null, frame, glow, label });

      if (i < n - 1) {
        this.work.add(
          this.add
            .text(sx + slotW + slotGap / 2, axisY, '→', {
              fontFamily: 'Pretendard, sans-serif',
              fontSize: '22px',
              fontStyle: 'bold',
              color: '#f2cf78',
            })
            .setOrigin(0.5),
        );
      }
    }

    let activeSlot = -1;
    let slotPulse: Phaser.Tweens.Tween | null = null;

    const paintSlots = () => {
      const nextEmpty = slots.findIndex((s) => s.cardId === null);
      slots.forEach((s, i) => {
        s.frame.clear();
        const active = i === activeSlot;
        const guided = activeSlot < 0 && i === nextEmpty;
        s.frame.fillStyle(active ? P.brass400 : P.brassDim, active ? 0.28 : 0.14);
        s.frame.fillRoundedRect(s.x, s.y, slotW, slotH, 10);
        s.frame.lineStyle(active ? 5 : 3.5, active ? P.brass300 : P.brass400, 0.96);
        s.frame.strokeRoundedRect(s.x, s.y, slotW, slotH, 10);
        s.label.setAlpha(s.cardId ? 0 : active || guided ? 1 : 0.82);
      });
    };

    const refreshSlotGuide = () => {
      slotPulse?.remove();
      slotPulse = null;
      slots.forEach((s) => s.glow.setAlpha(0));
      const nextEmpty = slots.findIndex((s) => s.cardId === null);
      if (nextEmpty >= 0) {
        const glow = slots[nextEmpty].glow.setAlpha(0.28);
        slotPulse = this.tweens.add({
          targets: glow,
          alpha: 0.78,
          duration: 760,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      }
      paintSlots();
    };

    const setActiveSlot = (index: number) => {
      if (activeSlot === index) return;
      activeSlot = index;
      slotPulse?.pause();
      slots.forEach((s, i) => s.glow.setAlpha(i === activeSlot ? 1 : 0));
      paintSlots();
    };

    const nearestSlot = (px: number, py: number): number => {
      let best = -1;
      let bestD = Number.POSITIVE_INFINITY;
      slots.forEach((s, i) => {
        const d = Phaser.Math.Distance.Between(px, py, s.x, s.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return bestD < 150 ? best : -1;
    };

    // 카드 (섞인 순서 = JSON에 적힌 순서)
    // 상단 탭·제목 바로 아래에 붙지 않게, 안내 문구 위 빈 띠로 내려 놓는다.
    const trayY = Math.max(y + 24, slotTop - slotH - 60);
    const cards = new Map<string, Phaser.GameObjects.Container>();

    const checkOrder = () => {
      if (slots.some((s) => s.cardId === null)) return;
      const ok = slots.every((s, i) => s.cardId === correct[i]);
      if (ok) {
        slotPulse?.remove();
        slots.forEach((s) => {
          s.glow.setAlpha(0);
          s.frame.clear();
          s.frame.fillStyle(0x6fae8f, 0.16);
          s.frame.fillRoundedRect(s.x, s.y, slotW, slotH, 10);
          s.frame.lineStyle(4, 0x6fae8f, 1);
          s.frame.strokeRoundedRect(s.x, s.y, slotW, slotH, 10);
        });
        const insight =
          task.timelineInsightText ??
          '자료를 시간 순서대로 놓았습니다. 이야기가 이어집니다.';
        this.showInsightPanel('✓ 시간 순서를 복원했어요', insight);
        this.done(task, insight);
      } else {
        EventBus.emit('SFX', 'slotConflict');
        EventBus.emit(
          'HINT',
          '순서가 아직 맞지 않아. 카드 아래 연도를 보고, 가장 작은 연도부터 왼쪽에 놓아 봐.',
        );
      }
    };

    const placeCard = (
      id: string,
      card: Phaser.GameObjects.Container,
      slotIndex: number,
    ) => {
      const currentIndex = slots.findIndex((s) => s.cardId === id);
      const displacedId = slots[slotIndex].cardId;

      if (displacedId && displacedId !== id) {
        const displaced = cards.get(displacedId);
        if (displaced) {
          if (currentIndex >= 0) {
            slots[currentIndex].cardId = displacedId;
            this.tweens.add({
              targets: displaced,
              x: slots[currentIndex].x,
              y: slots[currentIndex].y,
              duration: 180,
              ease: 'Back.out',
            });
          } else {
            const home = displaced.getData('home') as { x: number; y: number };
            this.tweens.add({
              targets: displaced,
              x: home.x,
              y: home.y,
              duration: 180,
              ease: 'Sine.out',
            });
          }
        }
      } else if (currentIndex >= 0 && currentIndex !== slotIndex) {
        slots[currentIndex].cardId = null;
      }

      slots[slotIndex].cardId = id;
      this.tweens.add({
        targets: card,
        x: slots[slotIndex].x,
        y: slots[slotIndex].y,
        duration: 180,
        ease: 'Back.out',
      });
      EventBus.emit('SFX', 'slotOk');
      activeSlot = -1;
      refreshSlotGuide();
      this.time.delayedCall(200, checkOrder);
    };

    ids.forEach((id, i) => {
      const ev = GameState.getEvidence(id);
      const c = this.add.container(startX + i * (slotW + slotGap), trayY);
      const g = this.add.graphics();
      g.fillStyle(P.navy700, 1);
      g.fillRoundedRect(0, 0, slotW, slotH, 6);
      g.lineStyle(1.2, P.brassDim, 0.8);
      g.strokeRoundedRect(0, 0, slotW, slotH, 6);
      c.add(g);
      // 작은 그림 대신 제목을 카드 전체 폭으로 크게 — 멀리서도 읽히게 한다
      c.add(
        this.add
          .text(slotW / 2, 14, ev?.title ?? id, {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#f4ecdc',
            align: 'center',
            wordWrap: { width: slotW - 24 },
            lineSpacing: 5,
            maxLines: 3,
          })
          .setOrigin(0.5, 0),
      );
      const dateText = task.timelineDateLabels?.[id] ?? '연도 미상';
      const dateLabel = this.add
        .text(0, 0, dateText, {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#f2cf78',
        })
        .setOrigin(0.5);
      const dateBadgeW = Math.max(84, dateLabel.width + 24);
      const dateBadge = this.add.graphics();
      dateBadge.fillStyle(P.navy900, 0.92);
      dateBadge.fillRoundedRect((slotW - dateBadgeW) / 2, slotH - 40, dateBadgeW, 30, 15);
      dateBadge.lineStyle(1.5, P.brassDim, 0.9);
      dateBadge.strokeRoundedRect((slotW - dateBadgeW) / 2, slotH - 40, dateBadgeW, 30, 15);
      dateLabel.setPosition(slotW / 2, slotH - 25);
      c.add([dateBadge, dateLabel]);
      c.setData('evidenceId', id);
      c.setData('home', { x: c.x, y: c.y });

      // 카드 안의 작은 자식 Zone이 아니라 카드 전체를 입력 영역으로 쓴다.
      // 화면이 확대·축소되는 태블릿에서도 그림/제목/연도 어디를 눌러도
      // 탭 배치와 드래그가 빠지지 않는다.
      c.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, slotW, slotH),
        Phaser.Geom.Rectangle.Contains,
      );
      this.input.setDraggable(c);
      if (c.input) c.input.cursor = 'pointer';

      let ox = 0;
      let oy = 0;
      let downAt = { x: 0, y: 0 };
      let moved = false;
      let gestureHandled = false;

      c.on('pointerdown', (p: Phaser.Input.Pointer) => {
        downAt = { x: p.x, y: p.y };
        moved = false;
        gestureHandled = false;
      });

      // 드래그가 어려운 학생은 카드를 한 번 눌러 다음 빈칸에 놓을 수 있다.
      c.on('pointerup', () => {
        if (moved || gestureHandled) return;
        gestureHandled = true;
        if (slots.some((s) => s.cardId === id)) {
          EventBus.emit('HINT', '이미 놓은 카드는 끌어서 다른 번호 칸으로 옮길 수 있어.');
          return;
        }
        const nextEmpty = slots.findIndex((s) => s.cardId === null);
        if (nextEmpty >= 0) placeCard(id, c, nextEmpty);
      });

      c.on('dragstart', (p: Phaser.Input.Pointer) => {
        ox = p.x - c.x;
        oy = p.y - c.y;
        this.work.bringToTop(c);
      });
      c.on('drag', (p: Phaser.Input.Pointer) => {
        if (Math.hypot(p.x - downAt.x, p.y - downAt.y) >= 14) moved = true;
        c.x = p.x - ox;
        c.y = p.y - oy;
        setActiveSlot(nearestSlot(c.x, c.y));
      });
      c.on('dragend', () => {
        if (!moved || gestureHandled) return;
        gestureHandled = true;
        const best = nearestSlot(c.x, c.y);
        if (best >= 0) {
          placeCard(id, c, best);
        } else {
          const current = slots.find((s) => s.cardId === id);
          const home = c.getData('home') as { x: number; y: number };
          this.tweens.add({
            targets: c,
            x: current?.x ?? home.x,
            y: current?.y ?? home.y,
            duration: 200,
            ease: 'Sine.out',
          });
          activeSlot = -1;
          refreshSlotGuide();
        }
      });

      cards.set(id, c);
      this.work.add(c);
    });
    refreshSlotGuide();
  }

  /* ── 3. 관계 잇기 — 초등 저학년도 바로 이해하는 한 짝씩 선택 방식 ── */
  private buildConnectAnswerKey(task: AnalyzeTask): void {
    const { x, y, w, h } = this.rect;
    const nodes = task.connectNodes ?? [];
    const answers = task.connectAnswers ?? [];
    const nodeOf = (id: string) => nodes.find((n) => n.id === id);
    const sourceIds = (id: string) => nodeOf(id)?.sourceEvidenceIds ?? [];
    const sharedTitle = (a: string, b: string) => {
      const bIds = new Set(sourceIds(b));
      const shared = sourceIds(a).find((id) => bIds.has(id));
      return shared ? GameState.getEvidence(shared)?.title ?? '공통 기록' : '공통 기록';
    };

    this.completed.add(task.id);
    this.work.add(
      this.add
        .text(x + w / 2, y + 18, '교사용 정답 화면 · 완성된 관계', {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#8ed2b1',
        })
        .setOrigin(0.5, 0),
    );
    this.work.add(
      this.add
        .text(x + w / 2, y + 52, '연결선과 두 카드가 함께 나온 기록을 수업에서 확인할 수 있어요.', {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '15px',
          color: '#d5c5a5',
        })
        .setOrigin(0.5, 0),
    );

    const cardW = Math.min(244, w * 0.27);
    const cardH = 118;
    const leftX = x + w * 0.22;
    const rightX = x + w * 0.78;
    const rowGap = Math.min(220, (h - 150) / Math.max(1, answers.length));
    const firstY = y + 150 + rowGap * 0.25;

    const makeAnswerCard = (id: string, px: number, py: number) => {
      const node = nodeOf(id);
      if (!node) return;
      const idx = Math.max(0, nodes.findIndex((n) => n.id === id));
      const card = this.add.container(px, py);
      const frame = this.add.graphics();
      frame.fillStyle(P.navy700, 1);
      frame.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      frame.lineStyle(4, 0x8ed2b1, 1);
      frame.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 12);
      card.add(frame);
      const imageX = -cardW / 2 + 14;
      card.add(this.analysisThumbnail(imageX, -26, 52, 52, idx, 3, 2));
      card.add(
        this.add.text(imageX + 66, -34, node.kind, {
          fontFamily: 'Pretendard, sans-serif',
          fontSize: '12px',
          color: '#c9a05a',
        }),
      );
      card.add(
        this.add.text(imageX + 66, -12, node.label, {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#f4ecdc',
          wordWrap: { width: cardW - 94 },
          maxLines: 2,
        }),
      );
      card.add(
        this.add
          .text(0, cardH / 2 - 17, '정답 카드', {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#8ed2b1',
          })
          .setOrigin(0.5),
      );
      this.work.add(card);
    };

    answers.forEach(([from, to], i) => {
      const py = firstY + i * rowGap;
      const line = this.add.graphics();
      line.lineStyle(8, 0x8ed2b1, 0.95);
      line.beginPath();
      line.moveTo(leftX + cardW / 2 + 8, py);
      line.lineTo(rightX - cardW / 2 - 8, py);
      line.strokePath();
      line.fillStyle(0x8ed2b1, 1);
      line.fillCircle(x + w / 2, py, 24);
      this.work.add(line);
      this.work.add(
        this.add
          .text(x + w / 2, py - 2, '✓', {
            fontFamily: 'Pretendard, sans-serif',
            fontSize: '25px',
            fontStyle: 'bold',
            color: '#0a1020',
          })
          .setOrigin(0.5),
      );
      this.work.add(
        this.add
          .text(x + w / 2, py + 38, `함께 나온 기록: ${sharedTitle(from, to)}`, {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#f2cf78',
            backgroundColor: 'rgba(10,16,32,0.86)',
            padding: { left: 10, right: 10, top: 4, bottom: 4 },
          })
          .setOrigin(0.5),
      );
      makeAnswerCard(from, leftX, py);
      makeAnswerCard(to, rightX, py);
    });

    const used = new Set(answers.flat());
    const distractors = nodes.filter((n) => !used.has(n.id)).map((n) => n.label);
    if (distractors.length > 0) {
      this.work.add(
        this.add
          .text(x + w / 2, y + h - 22, `연결하지 않는 카드: ${distractors.join(', ')}`, {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '14px',
            color: '#b8aa90',
          })
          .setOrigin(0.5, 1),
      );
    }
  }

  private buildConnectGuided(task: AnalyzeTask): void {
    const { x, y, w, h } = this.rect;
    const nodes = task.connectNodes ?? [];
    const answers = task.connectAnswers ?? [];
    if (nodes.length === 0 || answers.length === 0) return;

    const pairKey = (a: string, b: string) => [a, b].sort().join('|');
    const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
    const nodeOf = (id: string) => nodes.find((n) => n.id === id);
    const sourceIds = (id: string) => nodeOf(id)?.sourceEvidenceIds ?? [];
    const sharedSources = (a: string, b: string) => {
      const bIds = new Set(sourceIds(b));
      return sourceIds(a).filter((id) => bIds.has(id));
    };
    const evidenceTitle = (id: string) => GameState.getEvidence(id)?.title ?? '같은 기록';

    const made = new Set<string>();
    const eliminated = new Set<string>();
    let round = 0;
    let misses = 0;
    let locked = false;
    let roundLayer: Phaser.GameObjects.Container | null = null;

    const headline = this.add
      .text(x + w / 2, y + 12, '같은 기록에 함께 나온 짝을 찾아요', {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '21px',
        fontStyle: 'bold',
        color: '#f4ecdc',
      })
      .setOrigin(0.5, 0);
    const helper = this.add
      .text(
        x + w / 2,
        y + 44,
        '카드를 끌지 않아도 돼요 · 오른쪽에서 카드 하나만 눌러요',
        {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '15px',
          color: '#f2cf78',
          backgroundColor: 'rgba(10,16,32,0.78)',
          padding: { left: 14, right: 14, top: 5, bottom: 5 },
        },
      )
      .setOrigin(0.5, 0);
    const summary = this.add
      .text(x + w / 2, y + h - 18, '', {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '14px',
        color: '#8ed2b1',
        align: 'center',
      })
      .setOrigin(0.5, 1);
    this.work.add([headline, helper, summary]);

    const updateSummary = () => {
      const complete = answers
        .slice(0, round)
        .map((p) => `✓ ${labelOf(p[0])} ↔ ${labelOf(p[1])}`)
        .join('     ');
      summary.setText(complete || `찾을 짝 ${answers.length}개`);
    };

    const renderRound = () => {
      if (this.activeTaskId !== task.id) return;
      roundLayer?.destroy(true);
      roundLayer = this.add.container(0, 0);
      this.work.add(roundLayer);
      eliminated.clear();
      misses = 0;
      locked = false;
      updateSummary();

      if (round >= answers.length) {
        // 완료 문구는 상단 구석이 아니라 작업면 한가운데에 크게 보여 준다
        headline.setText('참 잘했어요! 관계를 모두 찾았어요');
        headline.setFontSize(26);
        headline.setPosition(x + w / 2, y + h * 0.42);
        helper.setText('같은 기록에 나온 이름끼리 연결했어요');
        helper.setPosition(x + w / 2, y + h * 0.42 + 44);
        this.done(task, task.connectInsightText ?? '직접 이어지는 관계를 모두 찾았어요.');
        return;
      }

      const [startId, answerId] = answers[round];
      const startNode = nodeOf(startId);
      if (!startNode) return;

      headline.setText(`${round + 1}번째 짝 · 같은 기록 단서를 찾아요`);
      const startX = x + w * 0.22;
      const centerY = y + h * 0.52;
      const choiceXs = [x + w * 0.62, x + w * 0.84];
      const choiceYs = [y + h * 0.36, y + h * 0.68];
      const candidatePos = new Map<string, { x: number; y: number }>();

      const stepOne = this.add
        .text(startX, y + 92, '① 출발 카드를 확인해요', {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#f2cf78',
        })
        .setOrigin(0.5);
      const stepTwo = this.add
        .text(x + w * 0.73, y + 92, '② 같은 기록이 적힌 카드를 눌러요', {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#f2cf78',
        })
        .setOrigin(0.5);
      roundLayer.add([stepOne, stepTwo]);

      const makeCard = (
        node: (typeof nodes)[number],
        px: number,
        py: number,
        cw: number,
        ch: number,
        role: 'start' | 'choice',
        note: string,
      ) => {
        const card = this.add.container(px, py);
        const frame = this.add.graphics();
        frame.fillStyle(role === 'start' ? P.navy600 : P.navy700, 0.98);
        frame.fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
        frame.lineStyle(role === 'start' ? 5 : 2.5, role === 'start' ? P.brass300 : P.brassDim, 1);
        frame.strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
        card.add(frame);

        const idx = Math.max(0, nodes.findIndex((n) => n.id === node.id));
        const imageSize = role === 'start' ? 68 : 54;
        const imageX = -cw / 2 + 14;
        const imageY = -imageSize / 2 - 10;
        const thumb = this.add.graphics();
        thumb.fillStyle(P.navy900, 0.9);
        thumb.fillRoundedRect(imageX - 4, imageY - 4, imageSize + 8, imageSize + 8, 8);
        card.add(thumb);
        card.add(this.analysisThumbnail(imageX, imageY, imageSize, imageSize, idx, 3, 2));

        const textX = imageX + imageSize + 14;
        const textW = cw - (textX + cw / 2) - 12;
        card.add(
          this.add.text(textX, -ch / 2 + 18, node.kind, {
            fontFamily: 'Pretendard, sans-serif',
            fontSize: '12px',
            color: '#c9a05a',
          }),
        );
        card.add(
          this.add.text(textX, -ch / 2 + 38, node.label, {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: role === 'start' ? '19px' : '16px',
            fontStyle: 'bold',
            color: '#f4ecdc',
            wordWrap: { width: textW },
            maxLines: 2,
          }),
        );
        card.add(
          this.add
            .text(0, ch / 2 - 24, note, {
              fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
              fontSize: role === 'start' ? '13px' : '12px',
              fontStyle: 'bold',
              color: note.includes('없음') ? '#9b8460' : '#f2cf78',
              align: 'center',
              wordWrap: { width: cw - 20 },
              maxLines: 2,
            })
            .setOrigin(0.5),
        );
        roundLayer?.add(card);
        return { card, frame };
      };

      const answerSourceId = sharedSources(startId, answerId)[0];
      const answerSourceTitle = answerSourceId
        ? evidenceTitle(answerSourceId)
        : '같은 기록';
      const startCard = makeCard(
        startNode,
        startX,
        centerY,
        252,
        150,
        'start',
        `찾을 기록: ${answerSourceTitle}`,
      );
      this.tweens.add({
        targets: startCard.card,
        scale: 1.035,
        duration: 850,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });

      const arrow = this.add
        .text(x + w * 0.43, centerY, '→', {
          fontFamily: 'Pretendard, sans-serif',
          fontSize: '54px',
          fontStyle: 'bold',
          color: '#f2cf78',
        })
        .setOrigin(0.5);
      const arrowLabel = this.add
        .text(x + w * 0.43, centerY + 48, '짝 고르기', {
          fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
          fontSize: '14px',
          color: '#d5c5a5',
        })
        .setOrigin(0.5);
      roundLayer.add([arrow, arrowLabel]);

      const candidates = nodes.filter((n) => n.id !== startId);
      const attempt = (toId: string, frame: Phaser.GameObjects.Graphics, card: Phaser.GameObjects.Container) => {
        if (locked || eliminated.has(toId) || this.activeTaskId !== task.id) return;
        if (pairKey(startId, toId) === pairKey(startId, answerId)) {
          locked = true;
          made.add(pairKey(startId, toId));
          frame.clear();
          frame.fillStyle(0x315e52, 1);
          frame.fillRoundedRect(-94, -55, 188, 110, 12);
          frame.lineStyle(5, 0x8ed2b1, 1);
          frame.strokeRoundedRect(-94, -55, 188, 110, 12);
          const target = candidatePos.get(toId);
          if (target) {
            const link = this.add.graphics();
            link.lineStyle(7, 0x8ed2b1, 0.95);
            link.beginPath();
            link.moveTo(startX + 130, centerY);
            link.lineTo(target.x - 100, target.y);
            link.strokePath();
            roundLayer?.add(link);
            roundLayer?.bringToTop(card);
          }
          EventBus.emit('SFX', 'evidenceLinked');
          EventBus.emit('HINT', `맞았어! 「${labelOf(startId)}」와 「${labelOf(toId)}」가 같은 기록에 나와.`);
          round++;
          updateSummary();
          this.time.delayedCall(650, () => {
            if (this.activeTaskId === task.id) renderRound();
          });
          return;
        }

        misses++;
        eliminated.add(toId);
        EventBus.emit('SFX', 'slotConflict');
        this.tweens.add({
          targets: card,
          x: card.x + 8,
          duration: 55,
          yoyo: true,
          repeat: 2,
        });
        card.setAlpha(0.34).disableInteractive();
        const no = this.add
          .text(card.x, card.y, '아니에요', {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#ffb2a9',
            backgroundColor: 'rgba(70,18,18,0.9)',
            padding: { left: 10, right: 10, top: 5, bottom: 5 },
          })
          .setOrigin(0.5);
        roundLayer?.add(no);
        EventBus.emit('HINT', '두 카드 아래의 「함께 나온 기록」을 비교해 봐. 같은 기록 제목이 있는 짝을 누르면 돼.');

        if (misses >= 2) {
          const answerCard = candidates.find((n) => n.id === answerId);
          if (answerCard) {
            const p = candidatePos.get(answerId);
            if (p) {
              const cue = this.add
                .text(p.x, p.y - 70, '같은 기록 제목을 찾아봐!', {
                  fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
                  fontSize: '13px',
                  fontStyle: 'bold',
                  color: '#f2cf78',
                })
                .setOrigin(0.5);
              roundLayer?.add(cue);
            }
          }
        }
      };

      candidates.forEach((node, i) => {
        const px = choiceXs[i % 2];
        const py = choiceYs[Math.floor(i / 2)];
        candidatePos.set(node.id, { x: px, y: py });
        // 출발 카드와 똑같은 기록 제목을 눈으로 찾아 고르게 한다.
        // 오답 카드에는 정답 기록과 다른 대표 기록을 보여 주어 중복 제목으로 헷갈리지 않는다.
        const candidateSource =
          node.id === answerId
            ? answerSourceId
            : sourceIds(node.id).find((id) => id !== answerSourceId);
        const note = candidateSource
          ? `카드의 기록: ${evidenceTitle(candidateSource)}`
          : '카드의 기록: 없음';
        const madeCard = makeCard(node, px, py, 188, 110, 'choice', note);
        madeCard.card.setInteractive(
          new Phaser.Geom.Rectangle(-94, -55, 188, 110),
          Phaser.Geom.Rectangle.Contains,
        );
        if (madeCard.card.input) madeCard.card.input.cursor = 'pointer';
        madeCard.card.on('pointerup', () => attempt(node.id, madeCard.frame, madeCard.card));
      });
    };

    renderRound();
  }

  /* ── 기존 자유 연결 방식(참고용) ─────────────────────────── */
  /** 한 번에 한 짝씩 묻는다. 출발 카드는 미리 정해 주고 아이는 짝만 고르면 된다.
   *  탭과 드래그를 모두 받고, 손을 떼기 전에 어디로 이어질지 보여 준다. */
  /** @deprecated 새 화면은 buildConnectGuided를 사용한다. */
  buildConnect(task: AnalyzeTask): void {
    const { x, y, w, h } = this.rect;
    const nodes = task.connectNodes ?? [];
    const answers = task.connectAnswers ?? [];
    if (nodes.length === 0 || answers.length === 0) return;

    const NODE_W = 208;
    const NODE_H = 92;
    /** 카드보다 넉넉하게 잡는다 — 손가락이 조금 빗나가도 걸린다 */
    const HIT_W = NODE_W / 2 + 34;
    const HIT_H = NODE_H / 2 + 26;
    const CONFIRM = 0x6fae8f;

    // 질문·카운터·「출발」 꼬리표가 앉을 자리를 위쪽에 비워 둔다
    const headH = 96;
    const areaY = y + headH;
    const areaH = h - headH;
    const cx = x + w / 2;
    const cy = areaY + areaH / 2;
    // 카드가 작업면 밖으로 나가지도, 서로 겹치지도 않도록 가로·세로 반지름을 따로 잡는다.
    // 하나로 묶으면 카드 수가 홀수일 때 아래쪽 두 장이 붙어 버린다.
    const rx = Math.max(120, (w - NODE_W) / 2 - 10);
    const ry = Math.max(90, (areaH - NODE_H) / 2 - 10);

    const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
    const pairKey = (a: string, b: string) => [a, b].sort().join('|');
    /** 받침 유무에 따라 조사를 고른다 — 「한인애국단은」/「청산리는」 */
    const josa = (word: string, withBatchim: string, without: string) => {
      const code = word.charCodeAt(word.length - 1);
      const hangul = code >= 0xac00 && code <= 0xd7a3;
      return hangul && (code - 0xac00) % 28 !== 0 ? withBatchim : without;
    };
    const answerKeys = new Set(answers.map((p) => pairKey(p[0], p[1])));
    /** 짝마다 고유한 색 — 선과 카드 두 장의 테두리를 같은 색으로 맞춘다 */
    const colorOfPair = new Map(
      answers.map((p, i) => [pairKey(p[0], p[1]), pairColor(i)]),
    );
    /** 이 카드가 이미 이어진 짝들의 색 (하나가 두 짝에 들어갈 수도 있다) */
    const colorsOfNode = (id: string): number[] =>
      answers
        .filter((p) => p[0] === id || p[1] === id)
        .map((p) => pairKey(p[0], p[1]))
        .filter((k) => made.has(k))
        .map((k) => colorOfPair.get(k) ?? CONFIRM);
    /** 어떤 정답 짝에도 없는 카드 = 확보한 기록에 근거가 없는 방해 카드 */
    const usedInAnswers = new Set<string>(answers.flat());

    /** 이 이름이 나오는 기록 중, 아이가 실제로 확보한 것만 */
    const foundSources = (nodeId: string): string[] =>
      (nodes.find((n) => n.id === nodeId)?.sourceEvidenceIds ?? []).filter(
        (id) => GameState.has(id),
      );
    const declaredSources = (nodeId: string): number =>
      (nodes.find((n) => n.id === nodeId)?.sourceEvidenceIds ?? []).length;
    const sourceTitles = (nodeId: string): string[] =>
      foundSources(nodeId).map((id) => GameState.getEvidence(id)?.title ?? '');

    /** 카드에 적을 한 줄 */
    const sourceLine = (nodeId: string): string => {
      if (declaredSources(nodeId) === 0) return '확보한 기록에 없음';
      const titles = sourceTitles(nodeId);
      if (titles.length === 0) return '기록을 더 찾아보세요';
      return titles.length > 1
        ? `「${titles[0]}」 외 ${titles.length - 1}건`
        : `「${titles[0]}」`;
    };

    const lineLayer = this.add.graphics();
    this.work.add(lineLayer);

    const pos = new Map<string, { x: number; y: number }>();
    const cards = new Map<string, Phaser.GameObjects.Container>();
    const frames = new Map<string, Phaser.GameObjects.Graphics>();
    const made = new Set<string>();
    const mutedIds = new Set<string>();

    let startId = answers[0][0];
    let misses = 0;
    let dragHover: string | null = null;
    let pulse: Phaser.Tweens.Tween | null = null;
    /** Phaser는 제자리 탭에도 dragend를 흘려보낸다. 한 번 누른 동작은 한 번만 처리한다. */
    let gestureHandled = false;
    let downAt = { x: 0, y: 0 };
    /** 이만큼 움직여야 드래그로 본다 */
    const DRAG_MIN = 16;

    const prompt = this.add
      .text(cx, y + 16, '', {
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        fontSize: '20px',
        color: '#f4ecdc',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    const counter = this.add
      .text(cx, y + 50, '', {
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '15px',
        color: '#c9a05a',
      })
      .setOrigin(0.5, 0);
    const startTag = this.add
      .text(0, 0, '출발', {
        fontFamily: 'Pretendard, sans-serif',
        fontSize: '13px',
        color: '#0a1020',
        backgroundColor: '#e8d3a3',
        padding: { left: 8, right: 8, top: 3, bottom: 3 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.work.add(prompt);
    this.work.add(counter);
    this.work.add(startTag);

    type NodeState = 'idle' | 'start' | 'hover' | 'done' | 'muted';

    const remainingFor = (id: string) =>
      answers.filter(
        (p) => (p[0] === id || p[1] === id) && !made.has(pairKey(p[0], p[1])),
      ).length;

    const nodeState = (id: string): NodeState => {
      if (id === startId) return 'start';
      if (dragHover === id) return 'hover';
      if (usedInAnswers.has(id) && remainingFor(id) === 0) return 'done';
      if (mutedIds.has(id)) return 'muted';
      return 'idle';
    };

    const paint = (id: string, state: NodeState): void => {
      const g = frames.get(id);
      if (!g) return;
      g.clear();
      const fill =
        state === 'start' ? P.navy600 : state === 'done' ? P.navy800 : P.navy700;
      g.fillStyle(fill, 1);
      g.fillRoundedRect(-NODE_W / 2, -NODE_H / 2, NODE_W, NODE_H, 10);

      if (state === 'done') {
        // 이어진 카드는 그 짝의 선과 같은 색으로 두른다.
        // 두 짝에 걸친 카드는 안쪽에 두 번째 색을 한 겹 더 그린다.
        const colors = colorsOfNode(id);
        (colors.length > 0 ? colors : [CONFIRM]).forEach((c, i) => {
          const inset = i * 4;
          g.lineStyle(2.8, c, 0.95);
          g.strokeRoundedRect(
            -NODE_W / 2 + inset,
            -NODE_H / 2 + inset,
            NODE_W - inset * 2,
            NODE_H - inset * 2,
            10 - inset,
          );
        });
        return;
      }

      const stroke =
        state === 'start'
          ? P.brass300
          : state === 'hover'
            ? P.brass400
            : P.brassDim;
      const weight = state === 'idle' || state === 'muted' ? 1.4 : 2.8;
      g.lineStyle(weight, stroke, 0.95);
      g.strokeRoundedRect(-NODE_W / 2, -NODE_H / 2, NODE_W, NODE_H, 10);
    };

    const repaint = (): void => {
      nodes.forEach((n) => {
        const state = nodeState(n.id);
        paint(n.id, state);
        // 더 이을 것이 없는 카드는 흐리게 — 아직 할 일이 남은 카드만 또렷하게 남긴다
        const alpha = mutedIds.has(n.id) ? 0.42 : state === 'done' ? 0.5 : 1;
        cards.get(n.id)?.setAlpha(alpha);
      });
    };

    const setPulse = (id: string | null): void => {
      pulse?.remove();
      pulse = null;
      cards.forEach((c) => c.setScale(1));
      if (!id) return;
      const c = cards.get(id);
      if (!c) return;
      pulse = this.tweens.add({
        targets: c,
        scale: 1.045,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    };

    const refresh = (): void => {
      const pending =
        answers.find((p) => !made.has(pairKey(p[0], p[1]))) ?? null;
      startId = pending ? pending[0] : '';
      counter.setText(`이은 관계 ${made.size} / ${answers.length}`);
      if (pending) {
        const from = labelOf(pending[0]);
        prompt.setText(
          `「${from}」${josa(from, '과', '와')} 직접 이어지는 카드를 눌러 보세요.`,
        );
        const p = pos.get(startId);
        if (p) {
          startTag.setPosition(p.x, p.y - NODE_H / 2 - 8).setVisible(true);
        }
      } else {
        prompt.setText('직접 이어지는 관계를 모두 찾았어요.');
        startTag.setVisible(false);
      }
      setPulse(pending ? startId : null);
      repaint();
    };

    const drawLink = (from: string, to: string): void => {
      const a = pos.get(from);
      const b = pos.get(to);
      if (!a || !b) return;
      lineLayer.lineStyle(3.4, colorOfPair.get(pairKey(from, to)) ?? CONFIRM, 0.95);
      lineLayer.beginPath();
      lineLayer.moveTo(a.x, a.y);
      lineLayer.lineTo(b.x, b.y);
      lineLayer.strokePath();
    };

    const shakeCard = (id: string): void => {
      const c = cards.get(id);
      const home = pos.get(id);
      if (!c || !home) return;
      this.tweens.add({
        targets: c,
        x: home.x + 9,
        duration: 55,
        yoyo: true,
        repeat: 2,
        onComplete: () => c.setX(home.x),
      });
    };

    /** 왜 안 되는지를 짝마다 다르게 알려 준다 */
    const missMessage = (from: string, to: string): string => {
      const a = labelOf(from);
      const b = labelOf(to);
      // 카드에 적힌 줄과 어긋나지 않도록 같은 근거로 판단한다
      if (declaredSources(to) === 0) {
        return `「${b}」${josa(b, '은', '는')} 확보한 기록 어디에도 나오지 않아요. 다른 카드를 살펴보세요.`;
      }
      return `「${a}」${josa(a, '과', '와')} 「${b}」${josa(b, '을', '를')} 직접 이어 주는 기록은 아직 없어요.`;
    };

    /** 세 번 빗나가면 답이 아닌 카드를 흐려 범위를 좁혀 준다 (정답을 알려 주지는 않는다) */
    const narrowDown = (): void => {
      const strays = nodes.filter(
        (n) => !usedInAnswers.has(n.id) && declaredSources(n.id) === 0,
      );
      strays.forEach((n) => mutedIds.add(n.id));
      repaint();
      const from = labelOf(startId);
      const titles = sourceTitles(startId);
      // 정답을 알려 주지 않고, 어느 기록을 읽어야 하는지만 짚어 준다
      const where = titles.length
        ? `「${from}」${josa(from, '은', '는')} ${titles.map((t) => `「${t}」`).join(', ')}에 나와요. 그 기록을 왼쪽에서 다시 읽어 보세요.`
        : `「${from}」${josa(from, '이', '가')} 나오는 기록을 왼쪽 목록에서 다시 찾아보세요.`;
      EventBus.emit(
        'HINT',
        strays.length > 0 ? `흐려진 카드는 답이 아니에요. ${where}` : where,
      );
    };

    const attempt = (from: string, to: string): void => {
      if (from === to || !startId) return;
      const key = pairKey(from, to);

      if (made.has(key)) {
        EventBus.emit('HINT', '이미 이어 놓은 짝이에요. 다른 카드를 찾아보세요.');
        return;
      }

      if (answerKeys.has(key)) {
        made.add(key);
        misses = 0;
        mutedIds.clear();
        drawLink(from, to);
        EventBus.emit('SFX', 'evidenceLinked');
        // 앞선 오답 안내가 말풍선에 남아 있지 않게 성공을 알려 준다
        const a = labelOf(from);
        const b = labelOf(to);
        EventBus.emit(
          'HINT',
          `「${a}」${josa(a, '과', '와')} 「${b}」${josa(b, '을', '를')} 이었어요.`,
        );
        refresh();
        if (made.size >= answers.length) {
          this.done(
            task,
            task.connectInsightText ?? '직접 이어지는 관계를 모두 찾았습니다.',
          );
        }
        return;
      }

      misses++;
      EventBus.emit('SFX', 'slotConflict');
      shakeCard(to);
      EventBus.emit('HINT', missMessage(from, to));
      if (misses === 3) narrowDown();
    };

    const nearestNode = (
      px: number,
      py: number,
      exclude: string,
    ): string | null => {
      let best: string | null = null;
      let bestD = Number.POSITIVE_INFINITY;
      pos.forEach((v, k) => {
        if (k === exclude) return;
        const dx = Math.abs(px - v.x);
        const dy = Math.abs(py - v.y);
        if (dx > HIT_W || dy > HIT_H) return;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      return best;
    };

    nodes.forEach((n, i) => {
      const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const nx = cx + Math.cos(a) * rx;
      const ny = cy + Math.sin(a) * ry;
      pos.set(n.id, { x: nx, y: ny });

      const c = this.add.container(nx, ny);
      const g = this.add.graphics();
      c.add(g);
      frames.set(n.id, g);
      cards.set(n.id, c);

      const thumbBack = this.add.graphics();
      thumbBack.fillStyle(P.navy900, 0.9);
      thumbBack.fillRoundedRect(-96, -24, 48, 48, 7);
      c.add(thumbBack);
      c.add(this.analysisThumbnail(-93, -21, 42, 42, i, 3, 2));

      const textX = 26;
      c.add(
        this.add
          .text(textX, -30, n.kind, {
            fontFamily: 'Pretendard, sans-serif',
            fontSize: '12px',
            color: '#c9a05a',
          })
          .setOrigin(0.5),
      );
      c.add(
        this.add
          .text(textX, -8, n.label, {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '16px',
            color: '#f4ecdc',
            align: 'center',
            wordWrap: { width: 138 },
          })
          .setOrigin(0.5),
      );
      // 이 이름이 어느 기록에 나오는지 — 아이가 어디를 읽어야 할지 알려 준다
      c.add(
        this.add
          .text(textX, 24, sourceLine(n.id), {
            fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
            fontSize: '11px',
            color: declaredSources(n.id) === 0 ? '#8a7040' : '#d5c5a5',
            align: 'center',
            wordWrap: { width: 140 },
            maxLines: 2,
            lineSpacing: 1,
          })
          .setOrigin(0.5, 0.5),
      );

      // 탭 영역도 카드보다 크게 — 태블릿에서 누르기 쉽게
      const z = this.add
        .zone(0, 0, NODE_W + 26, NODE_H + 22)
        .setInteractive({ draggable: true, useHandCursor: true });
      c.add(z);
      c.setData('nodeId', n.id);

      let dragLine: Phaser.GameObjects.Graphics | null = null;

      z.on('pointerdown', (p: Phaser.Input.Pointer) => {
        gestureHandled = false;
        downAt = { x: p.x, y: p.y };
      });

      z.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (gestureHandled || !startId) return;
        // 많이 움직였으면 드래그다 — dragend 가 처리한다
        if (Math.hypot(p.x - downAt.x, p.y - downAt.y) >= DRAG_MIN) return;
        gestureHandled = true;
        if (n.id === startId) {
          const from = labelOf(startId);
          EventBus.emit(
            'HINT',
            `「${from}」${josa(from, '이', '가')} 출발 카드예요. 이어질 짝을 눌러 주세요.`,
          );
          return;
        }
        attempt(startId, n.id);
      });

      z.on('dragstart', () => {
        dragLine = this.add.graphics();
        this.work.add(dragLine);
      });

      z.on('drag', (p: Phaser.Input.Pointer) => {
        if (!dragLine) return;
        const hover = nearestNode(p.x, p.y, n.id);
        if (hover !== dragHover) {
          dragHover = hover;
          repaint();
        }
        const target = hover ? (pos.get(hover) ?? { x: p.x, y: p.y }) : { x: p.x, y: p.y };
        dragLine.clear();
        dragLine.lineStyle(
          hover ? 3 : 2,
          hover ? P.brass300 : P.brass400,
          hover ? 0.95 : 0.7,
        );
        dragLine.beginPath();
        dragLine.moveTo(nx, ny);
        dragLine.lineTo(target.x, target.y);
        dragLine.strokePath();
      });

      z.on('dragend', (p: Phaser.Input.Pointer) => {
        dragLine?.destroy();
        dragLine = null;
        dragHover = null;
        repaint();
        // 제자리에서 뗐으면 탭이다 — pointerup 이 처리한다
        if (Math.hypot(p.x - downAt.x, p.y - downAt.y) < DRAG_MIN) return;
        if (gestureHandled) return;
        gestureHandled = true;
        const hit = nearestNode(p.x, p.y, n.id);
        if (!hit) {
          EventBus.emit(
            'HINT',
            '카드에서 조금 벗어났어요. 이을 카드 위에 놓아 주세요.',
          );
          return;
        }
        attempt(n.id, hit);
      });

      this.work.add(c);
    });

    refresh();
  }
}
