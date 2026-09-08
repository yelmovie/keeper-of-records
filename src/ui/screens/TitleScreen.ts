/** PAGE 1 — 타이틀 DOM overlay
 *  좌우 캐릭터 + 제목/소제목 + 시작·이어하기만 둔다.
 *  가이드·출처·초기화 등은 전부 우상단 설정(톱니바퀴)으로 옮겼다.
 */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { SaveManager } from '../../core/SaveManager';
import { AudioManager } from '../../core/AudioManager';
import { GameState } from '../../core/GameState';
import { openModal, closeModal } from '../Modal';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { AssetMap } from '../../config/AssetMap';
import { playIntroCinematic, prefetchIntroCinematic } from '../cinematics';
import type { TitleScene } from '../../scenes/TitleScene';

let offGuide: (() => void) | null = null;

export const TitleScreen: Screen = {
  phaserScene: 'TitleScene',

  mount(overlay: HTMLElement): void {
    AudioManager.playBgm('main');

    // 우상단 소리·설정만. 타이틀에는 홈/뒤로가 필요 없다.
    mountTopHud(overlay, { title: '', showHome: false });

    const root = el('div', { class: 'title-screen' });

    const heading = el('div', { class: 'title-heading' }, [
      el('img', {
        class: 'title-heading__art',
        src: AssetMap.ui.titleLockup,
        alt: '기록의 주인 — 사라진 기억을 복원하라',
        draggable: 'false',
      }),
    ]);

    const hasSave = SaveManager.hasProgress();
    // 진행 중이던 사건이 있으면(새로고침 등) 이어하기를 주 버튼으로 강조한다
    const save = SaveManager.get();
    const resuming =
      hasSave &&
      (save.currentCaseId !== null ||
        Object.values(save.caseProgress).some(
          (p) => p.stage > 0 && p.stage < 6,
        ));
    let starting = false;

    // 새 탐험: (이전 기록이 있으면 지우고) 종이 쪽지 프롤로그 → 시작 영상 → 기록소.
    // 영상은 타이틀에서 이미 prefetch 중이므로 쪽지 연출 동안 버퍼링을 이어 간다.
    const beginNewGame = () => {
      if (starting) return;
      starting = true;
      startBtn.disabled = true;
      continueBtn.disabled = true;
      offGuide?.();
      offGuide = null;

      // "새로 시작하기"인데 이전 회차(복원 완료 인물 등)가 그대로 남아 보이던
      // 문제: 저장 데이터와 메모리 상태를 반드시 비운 뒤 기록소로 들어간다.
      SaveManager.resetProgress();
      GameState.reset();

      root.classList.add('is-prologue');
      const playVideo = () =>
        playIntroCinematic(() => {
          void Router.go('archive');
        });
      const scene = Router.getScene('TitleScene') as TitleScene | null;
      if (scene) scene.playPrologue(playVideo);
      else playVideo();
    };

    const startBtn = button(
      hasSave ? '새로 시작하기' : '기록 탐험 시작',
      () => {
        if (starting) return;
        AudioManager.sfx('uiTap');
        if (!hasSave) {
          beginNewGame();
          return;
        }
        // 이전 기록이 있으면 지워도 되는지 한 번 확인한다(되돌릴 수 없으므로).
        openModal({
          title: '새로 시작하기',
          body: el('p', {
            text: '지금까지 복원한 기록이 모두 지워지고 처음부터 시작합니다. 이어서 하려면 "이어하기"를 눌러 주세요.',
          }),
          footer: [
            button('취소', () => closeModal(), { variant: 'ghost' }),
            button(
              '처음부터 시작',
              () => {
                AudioManager.sfx('uiTap');
                closeModal();
                beginNewGame();
              },
              { variant: 'primary' },
            ),
          ],
          width: 520,
        });
      },
      { variant: resuming ? 'default' : 'primary', size: 'lg' },
    );

    const continueBtn = button(
      '이어하기',
      () => {
        AudioManager.sfx('uiTap');
        void Router.go('archive');
      },
      { variant: resuming ? 'primary' : 'default', size: 'lg' },
    );
    continueBtn.disabled = !hasSave;
    if (!hasSave) continueBtn.title = '진행 중인 기록이 없습니다';

    const actions = el('div', { class: 'title-actions' }, [
      startBtn,
      continueBtn,
    ]);

    // 건너뛰기는 여는 영상 위에 Cinematic 이 직접 얹는다.
    root.append(heading, actions);
    overlay.appendChild(root);

    // 타이틀 렌더를 막지 않는 prefetch로 시작 버튼 이후의 대기만 줄인다.
    prefetchIntroCinematic();

    // 왼쪽·오른쪽 조사원(Phaser가 그림)을 누르면 각자 말풍선 안내
    const offGirl = mountGuide(overlay, {
      // 말풍선이 캐릭터 머리에 닿지 않게 높이를 여유 있게 잡는다
      overlayRect: { left: 128, bottom: 0, width: 240, height: 630 },
      hints: [
        '이 기록보관소에는 이름이 지워진 기록들이 잠들어 있어.',
        '기록을 찾고, 비교하고, 연결하면 지워진 이름을 밝힐 수 있어!',
        '준비됐으면 아래 시작 버튼을 눌러 줘!',
      ],
    });
    const offBoy = mountGuide(overlay, {
      side: 'right',
      overlayRect: { left: 1240, bottom: 0, width: 240, height: 630 },
      hints: [
        '단서들을 다 찾아서 꼭 기록의 주인을 밝혀낼 거야!',
        '지워진 이름에도 주인이 있어. 우리가 찾아 주자!',
        '어느 기록부터 복원할지 같이 골라 보자!',
      ],
    });
    offGuide = () => {
      offGirl();
      offBoy();
    };
  },

  unmount(): void {
    offGuide?.();
    offGuide = null;
  },
};
