/** PAGE 8 — STAGE 4 기록 복원
 *  PHASE A 시간 → PHASE B 관계 → PHASE C 기록 완성
 */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { showMissionIntro } from '../MissionIntro';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../core/AudioManager';
import { showToast } from '../Toast';
import { mountEvidenceButton } from '../EvidenceDrawer';
import { EventBus } from '../../core/EventBus';
import { measure } from './Stage2Screen';
import { showTapCue, hideTapCue } from '../TapCue';
import { mountMemoryBadge, playMemoryScene } from '../MemoryScene';
import { registerStageCompleter } from '../../core/DevHooks';
import type { Stage5Scene } from '../../scenes/Stage5Scene';
import type { RestoreSlotDef } from '../../data/schemas';
import { AssetMap } from '../../config/AssetMap';

// 관계 연결(구 PHASE B)은 뺐다 — 후보 인물(임시정부·김구)도 실제로는 주인과
// 관련이 있어 "직접 연결 아님" 판정이 학생에게 오개념을 줄 수 있어서다.
type Phase = 'A' | 'C';

const PHASE_LABEL: Record<Phase, string> = {
  A: '시간 순서',
  C: '기록 완성',
};

/** 화면에 보여 주는 단계 글자 — 두 단계가 되었으니 A·B로 읽힌다 */
const PHASE_DISPLAY: Record<Phase, string> = { A: 'A', C: 'B' };

const offs: (() => void)[] = [];

export const Stage5Screen: Screen = {
  phaserScene: 'Stage5Scene',

  mount(overlay: HTMLElement): void {
    const c = GameState.caseData;
    if (!c) {
      void Router.go('archive');
      return;
    }
    AudioManager.playBgm('stage5');
    GameState.setStage(4);

    const restore = c.stages.restore;
    mountTopHud(overlay, { title: '기록 복원', stage: 4, back: 'stage3' });
    showMissionIntro(4);

    /** 지금 어느 단계에서 무엇이 남았는지 보고 짚어 준다 */
    let hintPhase: Phase = 'A';
    let hintChosen: Map<string, string> | null = null;
    let hintSlots: RestoreSlotDef[] = [];
    const liveHints = (): string[] => {
      if (hintPhase === 'A') {
        // 아직 놓지 않은 카드 중 가장 이른 연도를 알려 준다 (정답 카드를 집어 주지는 않는다)
        const years = restore.timelineCorrectOrder
          .map((id) => restore.timelineDateLabels[id] ?? '')
          .filter(Boolean);
        return [
          `가장 이른 것은 ${years[0]}이야. 그 카드를 1번 칸에 놓아 봐.`,
          '카드 아래 굵은 글씨가 연도야. 작은 숫자부터 왼쪽에 놓으면 돼.',
          '카드를 한 번 누르고, 놓을 칸을 누르면 옮겨져.',
        ];
      }
      // C: 아직 못 고른 칸, 또는 틀린 칸을 짚어 준다
      const empty = hintSlots.filter((s) => !hintChosen?.has(s.slot));
      if (empty.length > 0) {
        return [
          `「${empty[0].label}」 칸이 아직 비어 있어. 보기 중에서 골라 봐.`,
          '고를 때는 지금까지 읽은 기록에 나온 내용인지 떠올려 봐.',
        ];
      }
      const wrong = hintSlots.filter((s) => {
        const id = hintChosen?.get(s.slot);
        return s.options.find((o) => o.id === id)?.correct !== true;
      });
      if (wrong.length > 0) {
        return [
          `「${wrong[0].label}」 칸을 다시 봐. 고른 답이 자료와 맞지 않아.`,
          '자료에 나오지 않은 내용을 고르면 복원할 수 없어.',
        ];
      }
      return [
        '다섯 칸이 다 맞았어! 오른쪽 아래 [기록 복원]을 눌러 줘.',
      ];
    };

    offs.push(
      mountGuide(overlay, {
        compact: true,
        large: true,
        imageSrc: AssetMap.char.guideStage5Boy,
        offset: { left: 24, bottom: 110 },
        hints: liveHints,
      }),
    );

    const root = el('div', { class: 'restore-screen' });

    // 단계 표시
    const rail = el('div', { class: 'phase-rail' });
    const steps: Record<Phase, HTMLElement> = {
      A: phaseStep(PHASE_DISPLAY.A, PHASE_LABEL.A, AssetMap.prop.pocketWatch),
      C: phaseStep(PHASE_DISPLAY.C, PHASE_LABEL.C, AssetMap.prop.tornDocument),
    };
    rail.append(steps.A, steps.C);

    const instruction = el('div', { class: 'phase-instruction' });
    const bodyBox = el('div', { class: 'restore-body' });
    root.append(rail, instruction, bodyBox);

    // 하단
    const foot = el('div', { class: 'restore-foot' });

    const restoreBtn = button(
      '기록 복원',
      () => showNomination(),
      { variant: 'primary', size: 'lg' },
    );
    restoreBtn.disabled = true;

    const leftGroup = el('div', { class: 'restore-foot__left' });
    mountEvidenceButton(leftGroup);

    foot.append(leftGroup, restoreBtn);
    root.appendChild(foot);

    overlay.appendChild(root);

    // 기억 조각 (시계 교환)
    const memory = c.memoryScene;
    if (memory && GameState.has(memory.unlockEvidenceId) && !GameState.memorySceneSeen) {
      mountMemoryBadge(overlay, memory, () =>
        playMemoryScene(memory, () => AudioManager.playBgm('stage5')),
      );
    }

    const scene = () => Router.getScene('Stage5Scene') as Stage5Scene | null;

    let phase: Phase = 'A';
    const doneA = { value: false };
    const chosen = new Map<string, string>();
    const shuffledSlots = restore.slots.map((slot, index) => ({
      ...slot,
      options: shuffleRestoreOptions(
        slot.options,
        `${c.solvedPersonId}:${slot.slot}:${index}`,
      ),
    }));

    const setPhase = (p: Phase) => {
      phase = p;
      hintPhase = p;
      hintChosen = chosen;
      hintSlots = shuffledSlots;
      (Object.keys(steps) as Phase[]).forEach((k) => {
        steps[k].classList.toggle('current', k === p);
        steps[k].classList.toggle('done', k === 'A' && doneA.value);
      });
      render();
    };

    const render = () => {
      bodyBox.replaceChildren();
      if (phase === 'A') {
        instruction.textContent =
          '카드 아래 연도를 보고, 가장 오래된 자료부터 왼쪽에 놓아 보세요.';
        const canvas = el('div', { class: 'restore-canvas' });
        bodyBox.appendChild(canvas);
        requestAnimationFrame(() => {
          scene()?.setWorkRect(measure(canvas));
          scene()?.buildTimeline(
            restore.timelineEvidenceIds,
            restore.timelineCorrectOrder,
            restore.timelineDateLabels,
            () => {
              doneA.value = true;
              showToast('활동의 시간 흐름을 복원했습니다.', { kind: 'feedback' });
              window.setTimeout(() => setPhase('C'), 900);
            },
          );
        });
      } else {
        instruction.textContent =
          '지금까지 모은 근거를 보고 기록의 다섯 칸을 채워 보세요. 근거가 충분히 모여야 복원할 수 있어요.';
        scene()?.clearWork();
        bodyBox.appendChild(buildSlots(shuffledSlots, chosen, updateRestoreBtn));
      }
    };

    const updateRestoreBtn = () => {
      const allChosen = shuffledSlots.every((s) => chosen.has(s.slot));
      const allCorrect = shuffledSlots.every((s) => {
        const id = chosen.get(s.slot);
        return s.options.find((o) => o.id === id)?.correct === true;
      });
      const wasDisabled = restoreBtn.disabled;
      restoreBtn.disabled = !(allChosen && allCorrect);
      restoreBtn.classList.toggle('kr-btn--ready', !restoreBtn.disabled);
      if (wasDisabled && !restoreBtn.disabled) {
        showTapCue(restoreBtn, { label: '여기를 눌러 복원하기' });
      } else if (restoreBtn.disabled) {
        hideTapCue();
      }
    };

    const runRestoration = () => {
      AudioManager.duck(6000);
      restoreBtn.disabled = true;
      root.style.transition = 'opacity 0.6s ease';
      root.style.opacity = '0';
      scene()?.playRestoration(() => {
        void Router.go('reward', undefined, false);
      });
    };

    // ── 기록의 주인 지목 (클라이맥스) ──────────────────
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    let nomination: HTMLElement | null = null;

    const closeNomination = () => {
      if (!nomination) return;
      nomination.remove();
      nomination = null;
      const layer = document.getElementById('modal-layer');
      if (layer && layer.childElementCount === 0)
        layer.style.pointerEvents = 'none';
    };

    const showNomination = () => {
      const layer = document.getElementById('modal-layer');
      if (!layer) {
        runRestoration();
        return;
      }
      layer.style.pointerEvents = 'auto';

      const ov = el('div', { class: 'nominate-overlay' });
      nomination = ov;

      const head = el('div', { class: 'nominate-head' }, [
        el('p', { class: 'nominate-head__lead', text: '모든 근거가 모였습니다.' }),
        el('h2', {
          class: 'nominate-head__title',
          text: '이 기록의 주인은 누구입니까?',
        }),
      ]);

      const grid = el('div', { class: 'nominate-grid' });
      const feedback = el('div', { class: 'nominate-feedback', role: 'status' });
      let locked = false;

      c.candidateIds.forEach((pid) => {
        const p = GameState.people.get(pid);
        if (!p) return;
        const card = el(
          'button',
          { class: 'nominate-card', type: 'button', 'data-interactive': 'true' },
          [
            el('div', { class: 'nominate-card__name', text: p.displayName }),
            el('div', { class: 'nominate-card__life', text: p.lifeText }),
          ],
        );
        card.addEventListener('click', () => {
          if (locked) return;
          if (pid !== c.solvedPersonId) {
            AudioManager.sfx('slotConflict');
            card.classList.remove('shake');
            void card.offsetWidth; /* 애니메이션 재시작 */
            card.classList.add('shake');
            feedback.textContent =
              '선택한 인물과 직접 이어지는 근거가 부족합니다. 확보한 기록을 다시 살펴보세요.';
            return;
          }
          locked = true;
          feedback.textContent = '';
          AudioManager.sfx('bukHit');
          // 정답 카드를 화면 중앙으로 살짝 확대 (0.6s), 나머지는 페이드아웃
          const or = ov.getBoundingClientRect();
          const cr = card.getBoundingClientRect();
          const dx = or.left + or.width / 2 - (cr.left + cr.width / 2);
          const dy = or.top + or.height / 2 - (cr.top + cr.height / 2);
          card.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
          card.classList.add('nominate-card--owner');
          ov.classList.add('resolved');
          later(() => {
            ov.classList.add('closing');
            later(() => {
              closeNomination();
              runRestoration();
            }, 700);
          }, 1400);
        });
        grid.appendChild(card);
      });

      const backBtn = button(
        '다시 확인하기',
        () => {
          AudioManager.sfx('uiTap');
          closeNomination();
        },
        { variant: 'ghost' },
      );
      backBtn.classList.add('nominate-back');

      ov.append(head, grid, feedback, backBtn);
      layer.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('show'));
    };

    offs.push(() => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
      closeNomination();
    });

    offs.push(EventBus.on('SFX', (k) => AudioManager.sfx(k as 'uiTap')));

    setPhase('A');

    registerStageCompleter(() => {
      if (phase === 'A') {
        doneA.value = true;
        setPhase('C');
      } else {
        shuffledSlots.forEach((s) => {
          const correct = s.options.find((o) => o.correct);
          if (correct) chosen.set(s.slot, correct.id);
        });
        bodyBox
          .querySelectorAll('.slot-option')
          .forEach((n) => n.classList.remove('chosen', 'conflict'));
        shuffledSlots.forEach((s, si) => {
          const box = bodyBox.querySelectorAll('.restore-slot')[si];
          const idx = s.options.findIndex((o) => o.correct);
          box?.querySelectorAll('.slot-option')[idx]?.classList.add('chosen');
        });
        updateRestoreBtn();
      }
    });
  },

  unmount(): void {
    hideTapCue();
    offs.forEach((f) => f());
    offs.length = 0;
    registerStageCompleter(null);
    (Router.getScene('Stage5Scene') as Stage5Scene | null)?.clearWork();
  },
};

function phaseStep(phase: string, label: string, imageSrc: string): HTMLElement {
  return el('div', { class: 'phase-step' }, [
    el('img', {
      class: 'phase-step__visual',
      src: imageSrc,
      alt: '',
      draggable: 'false',
      'aria-hidden': 'true',
    }),
    el('span', { text: `${phase}. ${label}` }),
  ]);
}

function buildSlots(
  slots: RestoreSlotDef[],
  chosen: Map<string, string>,
  onChange: () => void,
): HTMLElement {
  const row = el('div', { class: 'slot-row' });

  slots.forEach((slot) => {
    const box = el('div', { class: 'restore-slot' }, [
      el('div', { class: 'restore-slot__label', text: slot.label }),
    ]);
    const opts = el('div', { class: 'restore-slot__options' });

    slot.options.forEach((opt) => {
      const b = el('button', {
        class: 'slot-option',
        type: 'button',
        'data-interactive': 'true',
        text: opt.text,
      });
      b.addEventListener('click', () => {
        opts.querySelectorAll('.slot-option').forEach((n) => {
          n.classList.remove('chosen', 'conflict');
        });
        chosen.set(slot.slot, opt.id);
        if (opt.correct) {
          b.classList.add('chosen');
          AudioManager.sfx('slotOk');
        } else {
          b.classList.add('conflict');
          AudioManager.sfx('slotConflict');
          // 왜 아닌지 알려 주는 말은 화면 위 띠가 아니라 조사원 말풍선으로 보낸다
          EventBus.emit(
            'HINT',
            opt.feedback ?? '이 자료만으로는 확정하기 어려워. 다시 확인해 봐.',
          );
        }
        onChange();
      });
      opts.appendChild(b);
    });

    box.appendChild(opts);
    row.appendChild(box);
  });

  return row;
}

/** 정답이 늘 첫 칸에 오지 않도록 인물·항목별로 안정적으로 섞는다. */
function shuffleRestoreOptions<T extends { correct?: boolean }>(
  options: T[],
  seedText: string,
): T[] {
  const result = [...options];
  let seed = 2166136261;
  for (const ch of seedText) {
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  }
  for (let i = result.length - 1; i > 0; i--) {
    seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
    const j = Math.abs(seed) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  const correctAt = result.findIndex((option) => option.correct);
  if (result.length > 1 && correctAt === 0) {
    const swapAt = 1 + (Math.abs(seed) % (result.length - 1));
    [result[0], result[swapAt]] = [result[swapAt], result[0]];
  }
  return result;
}
