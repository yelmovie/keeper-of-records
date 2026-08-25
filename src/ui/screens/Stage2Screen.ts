/** PAGE 5 — STAGE 2 자료 분석 DOM overlay
 *  3 zone: 기록 목록 / 분석 작업면 / 확인한 사실
 */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { showMissionIntro } from '../MissionIntro';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../core/AudioManager';
import { EventBus } from '../../core/EventBus';
import { showToast } from '../Toast';
import { evidenceCard } from '../EvidenceDrawer';
import { registerStageCompleter } from '../../core/DevHooks';
import { showTapCue, hideTapCue } from '../TapCue';
import type { Stage2Scene } from '../../scenes/Stage2Scene';
import type { AnalyzeTask } from '../../data/schemas';
import { AssetMap } from '../../config/AssetMap';
import { isTeacherMode } from '../Settings';

const offs: (() => void)[] = [];

export const Stage2Screen: Screen = {
  phaserScene: 'Stage2Scene',

  mount(overlay: HTMLElement): void {
    const c = GameState.caseData;
    if (!c) {
      void Router.go('archive');
      return;
    }
    AudioManager.playBgm('stage2');
    AudioManager.preload('stage3');
    GameState.setStage(2);

    mountTopHud(overlay, { title: '자료 분석', stage: 2, back: 'stage1' });
    showMissionIntro(2);

    offs.push(
      mountGuide(overlay, {
        compact: true,
        large: true,
        imageSrc: AssetMap.char.guideStage2Girl,
        offset: { left: 24, bottom: 110 },
        hints: [
          '두 기록을 겹쳐 보면 같은 곳이 나오는지 비교할 수 있어.',
          '자료를 시간 순서로 놓으면 활동의 흐름이 보여.',
          '한 자료가 여러 인물과 이어질 수도 있어. 아직 단정하지 말자.',
        ],
      }),
    );

    const tasks = c.stages.analyze.tasks;
    const teacherPreview = isTeacherMode();
    const findings: string[] = teacherPreview
      ? tasks.map((t) => `${t.title} 정답 화면을 확인할 수 있어요.`)
      : [];
    const doneIds = new Set<string>(teacherPreview ? tasks.map((t) => t.id) : []);

    const root = el('div', { class: 'analyze-screen' });

    // ── 좌: 기록 목록
    const list = el('section', { class: 'analyze-list kr-panel' }, [
      el('div', { class: 'kr-panel__header', text: '확보한 기록' }),
    ]);
    const listItems = el('div', { class: 'analyze-list__items' });
    const renderList = () => {
      listItems.replaceChildren();
      GameState.foundEvidence.forEach((e) =>
        listItems.appendChild(evidenceCard(e, { draggable: false })),
      );
    };
    renderList();
    list.appendChild(listItems);

    // ── 중앙: 작업면
    const work = el('section', { class: 'analyze-work kr-panel' });
    const tabs = el('div', { class: 'analyze-tabs' });
    const head = el('div', { class: 'analyze-work__head' });
    const title = el('div', { class: 'analyze-work__title' });
    const inst = el('div', { class: 'analyze-work__inst' });
    head.append(title, inst);
    const canvasArea = el('div', { class: 'analyze-work__canvas' });
    work.append(tabs, head, canvasArea);

    // ── 우: 확인한 사실
    const side = el('section', { class: 'analyze-side kr-panel' }, [
      el('div', { class: 'kr-panel__header', text: '확인한 사실' }),
    ]);
    const sideBody = el('div', { class: 'kr-panel__body' });
    const findingList = el('ul', { class: 'finding-list' });
    const emptyNote = el('p', {
      class: 'visual-note',
      text: '작업을 마치면 확인한 사실이 여기에 쌓여요.',
    });
    sideBody.append(findingList, emptyNote);
    if (teacherPreview) {
      emptyNote.style.display = 'none';
      findings.forEach((message) => findingList.appendChild(el('li', { text: message })));
    }
    side.appendChild(sideBody);

    root.append(list, work, side);
    overlay.appendChild(root);

    // ── 하단 내비
    const nextBtn = button(
      '기록 탐구로',
      () => {
        AudioManager.sfx('uiTap');
        void Router.go('stage3');
      },
      { variant: 'primary', size: 'lg' },
    );
    // 하단 바가 3분할 grid를 가리지 않도록 우측 패널 아래에 배치
    side.appendChild(el('div', { class: 'analyze-side__foot' }, [nextBtn]));

    const updateNext = () => {
      const ready = doneIds.size >= tasks.length;
      const becameReady = ready && nextBtn.disabled;
      nextBtn.disabled = !ready;
      nextBtn.textContent = ready
        ? '기록 탐구로'
        : `분석 ${tasks.length - doneIds.size}개 남음`;
      // 세 가지를 다 마친 순간, 다음에 누를 곳을 손가락으로 짚어 준다
      if (becameReady) showTapCue(nextBtn, { label: '여기를 눌러 다음으로' });
    };
    updateNext();

    // ── 탭 구성
    const scene = Router.getScene('Stage2Scene') as Stage2Scene | null;
    const tabBtns: HTMLElement[] = [];
    let selectionVersion = 0;
    let currentTaskIndex = 0;
    offs.push(() => {
      selectionVersion++;
    });

    const selectTask = (i: number) => {
      const task = tasks[i];
      currentTaskIndex = i;
      const version = ++selectionVersion;
      tabBtns.forEach((b, bi) => b.classList.toggle('active', bi === i));
      title.textContent = task.title;
      inst.textContent =
        task.type === 'connect'
          ? '왼쪽 출발 카드와 같은 기록에 함께 나온 오른쪽 카드를 한 번 눌러요. 끌 필요 없어요.'
          : task.instruction;
      // 작업면 좌표를 Scene에 전달 (논리 좌표)
      requestAnimationFrame(() => {
        if (version !== selectionVersion) return;
        const rect = measure(canvasArea);
        scene?.setWorkRect(rect);
        scene?.showTask(task, isTeacherMode());
      });
    };

    const taskVisuals = [
      AssetMap.prop.lensKit,
      AssetMap.prop.journal,
      AssetMap.scene.evidenceRelationship,
    ];
    tasks.forEach((task, i) => {
      const b = el(
        'button',
        {
          class: 'analyze-tab',
          type: 'button',
          'data-interactive': 'true',
          'aria-label': `${i + 1}. ${task.title}`,
        },
        [
          el('img', {
            class: 'analyze-tab__visual',
            src: taskVisuals[i] ?? AssetMap.prop.documents,
            alt: '',
            draggable: 'false',
            'aria-hidden': 'true',
          }),
          el('span', { text: `${i + 1}. ${task.title}` }),
        ],
      );
      b.addEventListener('click', () => {
        AudioManager.sfx('uiTap');
        selectTask(i);
      });
      tabs.appendChild(b);
      tabBtns.push(b);
      if (doneIds.has(task.id)) b.classList.add('done');
    });

    selectTask(0);

    registerStageCompleter(() => {
      tasks.forEach((t) =>
        EventBus.emit('COMPARE_UPDATED', {
          taskId: t.id,
          message: `${t.title} 작업을 마쳤어요.`,
        }),
      );
    });

    // ── 이벤트
    offs.push(
      EventBus.on('COMPARE_UPDATED', (payload) => {
        const p = payload as { taskId: string; message: string };
        if (doneIds.has(p.taskId)) return;
        doneIds.add(p.taskId);
        findings.push(p.message);
        emptyNote.style.display = 'none';
        findingList.appendChild(el('li', { text: p.message }));
        const idx = tasks.findIndex((t: AnalyzeTask) => t.id === p.taskId);
        if (idx >= 0) tabBtns[idx].classList.add('done');
        // 다음에 눌러야 할 탭을 화살표로 짚어 준다 — 어디로 갈지 헤매지 않게
        const nextIdx = tasks.findIndex((t: AnalyzeTask) => !doneIds.has(t.id));
        if (nextIdx >= 0) {
          const cueTimer = window.setTimeout(
            () =>
              showTapCue(tabBtns[nextIdx], {
                label: `다음: ${nextIdx + 1}. ${tasks[nextIdx].title}`,
              }),
            1500,
          );
          offs.push(() => window.clearTimeout(cueTimer));
        }
        AudioManager.sfx('evidenceLinked');
        // 완료 안내는 씬 안의 패널(겹쳐 보기·시간 순서)이나 중앙 문구(관계 잇기)가
        // 보여 주고, 내용은 오른쪽 「확인한 사실」에 쌓인다. 토스트는 띄우지 않는다.
        renderList();
        updateNext();

        // 완료 뒤 활동을 마음대로 바꾸지 않는다. 아이가 현재 화면을 확인한 뒤
        // 원하는 탭을 직접 고르게 해 예기치 않은 「두 기록 겹쳐 보기」 전환을 막는다.
        if (doneIds.size >= tasks.length) {
          // 안내하는 말은 조사원 말풍선으로 보낸다
          EventBus.emit(
            'HINT',
            '세 가지 분석을 다 마쳤어! 오른쪽 아래 [기록 탐구로]를 눌러 줘.',
          );
        }
      }),
      EventBus.on('EVIDENCE_FOUND', (payload) => {
        const ev = GameState.getEvidence((payload as { id: string }).id);
        if (ev) showToast(`새 기록을 얻었어요 — ${ev.title}`, { kind: 'feedback' });
        renderList();
      }),
      EventBus.on('SFX', (k) => AudioManager.sfx(k as 'uiTap')),
      EventBus.on('STAGE_COMPLETE', (payload) => {
        if (!(payload as { teacher?: boolean } | undefined)?.teacher) return;
        tasks.forEach((task, i) => {
          doneIds.add(task.id);
          tabBtns[i]?.classList.add('done');
        });
        emptyNote.style.display = 'none';
        findingList.replaceChildren(
          ...tasks.map((task) =>
            el('li', { text: `${task.title} 정답 화면을 확인할 수 있어요.` }),
          ),
        );
        updateNext();
        selectTask(currentTaskIndex);
      }),
    );
  },

  unmount(): void {
    hideTapCue();
    offs.forEach((f) => f());
    offs.length = 0;
    registerStageCompleter(null);
    (Router.getScene('Stage2Scene') as Stage2Scene | null)?.clearWork();
  },
};

/** #stage 기준 논리 좌표 (transform scale 영향 없음) */
export function measure(node: HTMLElement): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = node;
  while (cur && cur.id !== 'stage') {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { x, y, w: node.offsetWidth, h: node.offsetHeight };
}
