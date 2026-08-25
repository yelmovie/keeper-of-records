/** PAGE 2 — 사건 기록소 DOM overlay */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { EventBus } from '../../core/EventBus';
import { AudioManager } from '../../core/AudioManager';
import { showToast } from '../Toast';
import { loadCatalog } from '../../data/loaders';
import { launchCase } from '../../core/CaseLauncher';
import { GameState } from '../../core/GameState';
import { SaveManager } from '../../core/SaveManager';
import type { ArchiveScene } from '../../scenes/ArchiveScene';
import type { CaseCatalogEntry } from '../../data/schemas';
import { AssetMap } from '../../config/AssetMap';

let offEvent: (() => void) | null = null;
let offGuide: (() => void) | null = null;

export const ArchiveScreen: Screen = {
  phaserScene: 'ArchiveScene',

  async mount(overlay: HTMLElement): Promise<void> {
    AudioManager.playBgm('main');
    mountTopHud(overlay, { title: '사건 기록소', back: 'title' });

    offGuide = mountGuide(overlay, {
      compact: true,
      greeting: '다섯 기록을 모두 고를 수 있어요. 원하는 서랍을 눌러 보세요.',
      hints: [
        '화면을 좌우로 밀면 다른 기록 상자도 볼 수 있어요.',
        '상자를 누르면 어떤 기록인지 먼저 읽고 선택할 수 있어요.',
      ],
    });

    const root = el('div', { class: 'archive-screen' });

    root.appendChild(
      el('div', { class: 'archive-lead' }, [
        el('div', { class: 'archive-lead__eyebrow', text: '기록 회랑' }),
        el('h2', {
          class: 'archive-lead__title',
          text: '원하는 기록을\n고르세요',
        }),
        el('p', {
          class: 'archive-lead__desc',
          text: '모든 상자가 열려 있어요. 관심 있는 기록부터 시작하세요.',
        }),
      ]),
    );

    root.appendChild(
      el('img', {
        class: 'archive-companion__visual',
        src: AssetMap.prop.documents,
        alt: '사진과 문서가 묶인 기록 자료',
        draggable: 'false',
      }),
    );

    // 서랍 상세 패널
    const detail = el('div', { class: 'case-detail kr-panel' });
    const detailBody = el('div', { class: 'kr-panel__body' });
    detail.appendChild(detailBody);
    root.appendChild(detail);

    const previous = el('button', {
      class: 'archive-nav archive-nav--prev',
      type: 'button',
      'aria-label': '이전 기록 보기',
      title: '이전 기록',
    });
    previous.addEventListener('click', () => {
      (Router.getScene('ArchiveScene') as ArchiveScene | null)?.moveRail(-1);
    });
    const next = el('button', {
      class: 'archive-nav archive-nav--next',
      type: 'button',
      'aria-label': '다음 기록 보기',
      title: '다음 기록',
    });
    next.addEventListener('click', () => {
      (Router.getScene('ArchiveScene') as ArchiveScene | null)?.moveRail(1);
    });
    root.append(previous, next);

    overlay.appendChild(root);

    // 카탈로그 로드 후 Scene에 전달
    let entries: CaseCatalogEntry[] = [];
    try {
      entries = await loadCatalog();
    } catch {
      showToast('사건 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      return;
    }

    const scene = Router.getScene('ArchiveScene') as ArchiveScene | null;
    scene?.setEntries(entries);

    offEvent = EventBus.on('EVIDENCE_INSPECTED', (payload) => {
      const p = payload as { source?: string; entry?: CaseCatalogEntry };
      if (p?.source !== 'archive' || !p.entry) return;
      renderDetail(detailBody, p.entry);
      detail.classList.add('show');
    });
  },

  unmount(): void {
    offEvent?.();
    offEvent = null;
    offGuide?.();
    offGuide = null;
  },
};

function renderDetail(body: HTMLElement, entry: CaseCatalogEntry): void {
  body.replaceChildren();
  const done = SaveManager.get().completedCaseIds.includes(entry.id);

  body.appendChild(
    el('div', {
      class: 'case-detail__meta',
      text: done ? '기록 복원 완료' : '지금 선택할 수 있는 기록',
    }),
  );
  body.appendChild(el('h3', { class: 'archive-lead__title', text: entry.title }));
  body.appendChild(
    el('p', { class: 'case-detail__teaser', text: entry.teaser }),
  );

  const actions = el('div', { class: 'case-detail__actions' });

  const prog = SaveManager.get().caseProgress[entry.id];
  const doneTracks = SaveManager.completedTracksOf(entry.id);
  const totalTracks = entry.tracks?.length ?? 1;

  if (doneTracks.length > 0) {
    body.appendChild(
      el('p', {
        class: 'case-detail__tracks',
        text: `복원한 기록 ${doneTracks.length} / ${totalTracks}`,
      }),
    );
  }

  const inProgress = Boolean(prog && prog.stage > 0 && prog.stage < 6);
  const currentDone = Boolean(prog && prog.stage >= 6);

  if (inProgress) {
    actions.appendChild(
      button('이어서 탐구하기', () => void startCase(entry.id), {
        variant: 'primary',
      }),
    );
  } else if (currentDone || done) {
    actions.appendChild(
      button('복원 기록 보기', () => void startCase(entry.id), {
        variant: 'primary',
      }),
    );
  } else {
    actions.appendChild(
      button('이 기록 탐구하기', () => void startCase(entry.id), {
        variant: 'primary',
      }),
    );
  }

  body.appendChild(actions);
}

async function startCase(
  caseId: string,
  opts: { newTrack?: boolean } = {},
): Promise<void> {
  AudioManager.sfx('uiTap');
  try {
    await launchCase(caseId, opts);
    const stage = GameState.stage;
    if (stage >= 1 && stage <= 3) {
      await Router.go(`stage${stage}` as 'stage1' | 'stage2' | 'stage3');
    } else if (stage === 4 || stage === 5) {
      // stage 5는 인물 비교 제거 전 저장 데이터의 기록 복원 단계다.
      await Router.go('stage4');
    } else if (stage >= 6) {
      await Router.go('reward');
    } else {
      await Router.go('briefing');
    }
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : '사건 자료를 불러오지 못했습니다.',
    );
  }
}
