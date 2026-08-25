/** PAGE 9 — 기록 복원 완료
 *  점수·코인·폭죽이 아니라 "이 이름을 기억합니다"로 마무리한다.
 */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { GameState } from '../../core/GameState';
import { SaveManager } from '../../core/SaveManager';
import { AudioManager } from '../../core/AudioManager';
import { openSourceModal, sourceButton } from '../SourceModal';
import { openEvidenceList } from '../EvidenceDrawer';
import { restorationSeal } from '../Seal';
import { playMemoryScene } from '../MemoryScene';
import {
  ACTIVE_CASE_COUNT,
  completedActiveCaseCount,
} from '../../config/PersonStages';
import { playFinalCinematic, prefetchFinalCinematic } from '../cinematics';

let offGuide: (() => void) | null = null;
let stamping = false;
let memoryTimer = 0;

/** 인증서로 넘어가기 전 0.9초 인장 연출. 과장 없이 인장 하나만 찍는다. */
function playSealStamp(after: () => void): void {
  if (stamping) return;
  stamping = true;
  const layer = document.getElementById('modal-layer');
  if (!layer) {
    stamping = false;
    after();
    return;
  }
  layer.style.pointerEvents = 'auto';
  AudioManager.sfx('bukHit');

  const flash = el('div', { class: 'seal-stamp' }, [restorationSeal(150)]);
  layer.appendChild(flash);
  requestAnimationFrame(() => flash.classList.add('show'));

  window.setTimeout(() => {
    flash.remove();
    if (layer.childElementCount === 0) layer.style.pointerEvents = 'none';
    stamping = false;
    after();
  }, 900);
}

export const RewardScreen: Screen = {
  phaserScene: 'RewardScene',

  mount(overlay: HTMLElement): void {
    const c = GameState.caseData;
    if (!c) {
      void Router.go('archive');
      return;
    }
    const person = GameState.people.get(c.solvedPersonId);
    SaveManager.markCaseComplete(c.id, c.solvedPersonId);
    const completedCount = completedActiveCaseCount(
      SaveManager.get().completedCaseIds,
    );
    const allPeopleComplete = completedCount >= ACTIVE_CASE_COUNT;
    AudioManager.playBgm('main');

    mountTopHud(overlay, { title: c.title });

    // 복원 완료 화면은 인물에게 집중하는 순간이라 조사원 캐릭터를 두지 않는다

    const root = el('div', { class: 'reward-screen' });

    root.appendChild(
      el('div', { class: 'reward-headline' }, [
        el('div', { class: 'reward-headline__main', text: '기록 복원 완료' }),
        el('div', { class: 'reward-headline__sub', text: '이 이름을 기억합니다.' }),
      ]),
    );

    // ── 인물 파일
    const file = el('section', { class: 'person-file kr-panel' });
    file.appendChild(
      el('div', { class: 'person-file__name', text: person?.displayName ?? '' }),
    );
    file.appendChild(
      el('div', { class: 'person-file__period', text: person?.lifeText ?? '' }),
    );

    const rows = el('div', { class: 'file-rows' });
    c.epilogue.profileFacts.forEach((f) => {
      const row = el('div', { class: 'file-row' }, [
        el('div', { class: 'file-row__label', text: f.label }),
        el('div', { class: 'file-row__value', text: f.text }),
      ]);
      row.addEventListener('click', () =>
        openSourceModal(f.sourceClaimIds, `${f.label} — 자료 출처`),
      );
      row.style.cursor = 'pointer';
      row.setAttribute('data-interactive', 'true');
      rows.appendChild(row);
    });
    file.appendChild(rows);

    file.appendChild(
      el('p', {
        class: 'visual-note',
        text: '각 항목을 누르면 그 내용을 확인한 자료 출처를 볼 수 있습니다.',
      }),
    );

    // ── 우측: 인장과 의미
    const side = el('section', { class: 'reward-side' });
    side.appendChild(el('div', { class: 'reward-seal' }, [restorationSeal(200)]));
    side.appendChild(
      el('p', { class: 'reward-note', text: c.epilogue.meaningText }),
    );

    const actions = el('div', { class: 'reward-actions' });
    actions.append(
      // 복원이 끝난 화면이므로 이 인물의 기록만 보여 준다. 다른 인물 기록이 섞이면 헷갈린다.
      button('확인한 자료 보기', () => openEvidenceList({ personId: c.solvedPersonId }), {
        variant: 'ghost',
      }),
      sourceButton(
        c.epilogue.profileFacts.flatMap((f) => f.sourceClaimIds),
        '전체 자료 출처',
      ),
      button('기록소로 돌아가기', () => void Router.go('archive'), {
        variant: 'ghost',
      }),
      allPeopleComplete
        ? button(
            '완료 영상 보고 인증서 받기',
            () =>
              playSealStamp(() =>
                playFinalCinematic(() => void Router.go('certificate')),
              ),
            { variant: 'primary', size: 'lg' },
          )
        : button(
            `다음 인물 고르기 (${completedCount}/${ACTIVE_CASE_COUNT} 완료)`,
            () => void Router.go('archive'),
            { variant: 'primary', size: 'lg' },
          ),
    );
    side.appendChild(actions);

    root.append(file, side);
    overlay.appendChild(root);

    // 아이가 인물 파일을 읽는 동안 닫는 영상을 미리 받아 둔다
    if (allPeopleComplete) prefetchFinalCinematic();

    // 기억 조각(시계 교환 장면)을 아직 못 봤다면 배지를 기다리지 않고
    // 인물이 드러난 직후 자동으로 한 번 보여 준다. 건너뛰기는 장면 안에 있다.
    const memory = c.memoryScene;
    if (memory && GameState.has(memory.unlockEvidenceId) && !GameState.memorySceneSeen) {
      memoryTimer = window.setTimeout(() => {
        playMemoryScene(memory, () => AudioManager.playBgm('main'));
      }, 2600);
    }

    requestAnimationFrame(() => {
      window.setTimeout(() => root.classList.add('show'), 1400);
    });
  },

  unmount(): void {
    offGuide?.();
    offGuide = null;
    if (memoryTimer) {
      window.clearTimeout(memoryTimer);
      memoryTimer = 0;
    }
  },
};
