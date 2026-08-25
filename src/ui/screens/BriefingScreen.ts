/** PAGE 3 — 사건 브리핑 DOM overlay
 *  후보 인물은 카드 6장으로 끝나지 않는다. 현재 근거로 확인된 정보만 단계적으로 공개된다.
 */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../core/AudioManager';
import { openEvidenceDetail } from '../EvidenceDrawer';
import { AssetMap } from '../../config/AssetMap';

let offGuide: (() => void) | null = null;

export const BriefingScreen: Screen = {
  phaserScene: 'BriefingScene',

  mount(overlay: HTMLElement): void {
    const c = GameState.caseData;
    if (!c) {
      void Router.go('archive');
      return;
    }
    AudioManager.playBgm('main');
    AudioManager.preload('stage1');
    GameState.setStage(0);

    mountTopHud(overlay, { title: c.title, back: 'archive' });

    offGuide = mountGuide(overlay, {
      compact: true,
      large: true,
      imageSrc: AssetMap.char.guideBriefingGirl,
      // 말풍선이 왼쪽 위 「탐구는 이렇게 진행돼요」 패널을 가리지 않게 조금 내린다
      offset: { left: 16, bottom: 20 },
      greeting: '빛바랜 기록표에 이름이 지워져 있네. 우리 같이 자료를 찾아서 이름을 복원해 보자!',
      hints: [
        '지금 가진 두 자료만으로는 기록의 주인을 알 수 없어.',
        '기록실에서 자료를 찾고, 서로 비교하고, 중요한 문장을 확인해 보자.',
        '준비되면 아래 [흔적 탐색 시작]을 눌러 줘!',
      ],
    });

    const root = el('div', { class: 'briefing-screen' });

    // ── 좌: 탐구 목표
    root.appendChild(
      el('section', { class: 'briefing-goals kr-panel' }, [
        el('div', { class: 'kr-panel__header', text: '탐구는 이렇게 진행돼요' }),
        el('div', { class: 'kr-panel__body' }, [
          el('ul', { class: 'goal-list' }, [
            goalItem(1, AssetMap.prop.archiveDrawer, '기록실에서 단서 찾기'),
            goalItem(2, AssetMap.prop.lensKit, '자료를 비교해 연결 찾기'),
            goalItem(3, AssetMap.scene.recordReading, '중요한 문장 표시하기'),
            goalItem(4, AssetMap.scene.evidenceRelationship, '근거로 인물 좁히기'),
          ]),
        ]),
      ]),
    );

    // ── 중앙: 미확인 인물
    const center = el('section', { class: 'briefing-center' });
    const figure = el('div', { class: 'unknown-figure' });
    const img = el('img', {
      src: AssetMap.ui.silhouetteFrame,
      alt: '성별과 얼굴을 알아볼 수 없고 이름 칸이 지워진 빛바랜 수형 기록표',
    });
    figure.append(
      img,
      el('div', { class: 'unknown-figure__tag', text: '이름이 지워진 기록' }),
    );
    center.appendChild(figure);
    center.appendChild(
      el('p', {
        class: 'briefing-center__caption',
        text: c.teaser,
      }),
    );
    root.appendChild(center);

    // ── 우: 초기 단서
    const clues = el('section', { class: 'briefing-clues kr-panel' }, [
      el('div', { class: 'kr-panel__header', text: '지금 가진 자료' }),
    ]);
    const clueBody = el('div', { class: 'kr-panel__body' });
    const clueGrid = el('div', { class: 'clue-grid' });
    GameState.foundEvidence.forEach((e) => {
      const chip = el('div', { class: 'clue-chip', 'data-interactive': 'true' }, [
        el('div', { class: 'clue-chip__kind', text: kindLabel(e.kind) }),
        el('div', { class: 'clue-chip__title', text: e.title }),
      ]);
      chip.addEventListener('click', () => openEvidenceDetail(e));
      clueGrid.appendChild(chip);
    });
    clueBody.appendChild(clueGrid);
    clueBody.appendChild(
      el('p', {
        class: 'visual-note',
        text: '이 자료만으로는 인물을 정할 수 없어요.',
      }),
    );
    clues.appendChild(clueBody);
    root.appendChild(clues);

    // ── 하단 액션 (뒤로는 상단 HUD가 담당)
    const nav = el('div', { class: 'bottom-nav bottom-nav--end' }, [
      button(
        '흔적 탐색 시작',
        () => {
          AudioManager.sfx('uiTap');
          void Router.go('stage1');
        },
        { variant: 'primary', size: 'lg' },
      ),
    ]);

    overlay.append(root, nav);
  },

  unmount(): void {
    offGuide?.();
    offGuide = null;
  },
};

function goalItem(step: number, imageSrc: string, text: string): HTMLElement {
  return el('li', {}, [
    el('div', { class: 'goal-list__visual' }, [
      el('img', {
        src: imageSrc,
        alt: '',
        draggable: 'false',
        'aria-hidden': 'true',
      }),
      el('span', { class: 'goal-list__mark goal-list__mark--num', text: String(step) }),
    ]),
    el('span', { class: 'goal-list__text', text }),
  ]);
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    document: '문서',
    photo: '사진',
    artifact: '물건',
    map: '지도',
    organization: '조직',
    event: '사건',
    place: '장소',
    quote: '기록된 말',
  };
  return map[kind] ?? '자료';
}
