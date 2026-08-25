/** PAGE 4 — STAGE 1 흔적 탐색 DOM overlay */
import { el, button, icon, ICONS } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { showMissionIntro } from '../MissionIntro';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../core/AudioManager';
import { EventBus } from '../../core/EventBus';
import { showEvidenceReveal } from '../EvidenceReveal';
import { KIND_LABEL, mountEvidenceButton, openEvidenceDetail } from '../EvidenceDrawer';
import type { Stage1Scene } from '../../scenes/Stage1Scene';
import { AssetMap, TEXTURE_KEYS, type TextureKey } from '../../config/AssetMap';
import type { ExploreHotspot } from '../../data/schemas';

const offs: (() => void)[] = [];

function hotspotImage(hotspot: ExploreHotspot | undefined): string {
  if (!hotspot) return AssetMap.prop.dustyDocument;
  if (hotspot.textureKey && hotspot.textureKey in TEXTURE_KEYS) {
    return TEXTURE_KEYS[hotspot.textureKey as TextureKey];
  }
  const byId: Record<string, string> = {
    'hs-drawer-left': AssetMap.prop.archiveDrawer,
    'hs-envelope': AssetMap.prop.sealedEnvelope,
    'hs-photo': AssetMap.prop.oldPhoto,
    'hs-teacup': AssetMap.prop.teacup,
    'hs-dusty-doc': AssetMap.prop.dustyDocument,
    'hs-lamp': AssetMap.prop.oilLamp,
    'hs-cabinet': AssetMap.prop.documentCabinet,
    'hs-watch': AssetMap.prop.pocketWatch,
    'hs-torn': AssetMap.prop.tornDocument,
    'hs-inkstone': AssetMap.prop.inkstone,
  };
  return byId[hotspot.id] ?? AssetMap.prop.dustyDocument;
}

export const Stage1Screen: Screen = {
  phaserScene: 'Stage1Scene',

  mount(overlay: HTMLElement): void {
    const c = GameState.caseData;
    if (!c) {
      void Router.go('archive');
      return;
    }
    AudioManager.playBgm('stage1');
    AudioManager.preload('stage2');
    GameState.setStage(1);

    mountTopHud(overlay, { title: '흔적 탐색', stage: 1, back: 'briefing' });
    showMissionIntro(1);

    offs.push(
      mountGuide(overlay, {
        compact: true,
        large: true,
        imageSrc: AssetMap.char.guideStage1Boy,
        offset: { left: 24, bottom: 132 },
        hints: [
          '빛이 닿는 곳과 서랍 가장자리를 천천히 살펴봐.',
          '찾은 물건은 눌러서 자세히 조사하면 자료 수첩에서 다시 볼 수 있어.',
          '화면 양쪽 화살표를 누르면 다른 구역으로 갈 수 있어.',
        ],
      }),
    );

    const explore = c.stages.explore;
    const required = explore.requiredEvidenceIds;

    // ── 한 화면에 지시문 하나: 물건 → 뜻 → 수첩 흐름
    let hintIndex = 0;
    const hintBtn = button(
      '힌트 보기',
      () => {
        const text = explore.hintTexts[hintIndex % explore.hintTexts.length];
        hintIndex++;
        EventBus.emit('HINT', text);
        if (hintIndex % 3 === 0) {
          (Router.getScene('Stage1Scene') as Stage1Scene | null)?.focusHintArea();
        }
      },
      { variant: 'ghost', size: 'sm', class: 'explore-mission__hint' },
    );
    const mission = el('section', { class: 'explore-mission kr-panel' }, [
      el('div', { class: 'explore-mission__head' }, [
        el('div', {}, [
          el('div', { class: 'explore-mission__eyebrow', text: '1단계 · 자료 찾기' }),
          el('h2', { class: 'explore-mission__title', text: '궁금한 물건을 눌러 조사해요' }),
        ]),
        hintBtn,
      ]),
      el('ol', { class: 'explore-flow', 'aria-label': '자료 찾기 순서' }, [
        el('li', {}, [el('strong', { text: '1' }), el('span', { text: '물건 누르기' })]),
        el('li', {}, [el('strong', { text: '2' }), el('span', { text: '자료 뜻 읽기' })]),
        el('li', {}, [el('strong', { text: '3' }), el('span', { text: '수첩 확인하기' })]),
      ]),
    ]);

    // ── 우측 레일: 물건과 자료의 연결을 보여 주는 자료 수첩
    const rail = el('aside', { class: 'explore-rail kr-panel' });
    const count = el('div', { class: 'explore-rail__count' });
    const progressFill = el('span', { class: 'explore-progress__fill' });
    const progress = el(
      'div',
      {
        class: 'explore-progress',
        role: 'progressbar',
        'aria-label': '꼭 필요한 자료 찾기',
        'aria-valuemin': '0',
        'aria-valuemax': String(required.length),
      },
      [progressFill],
    );
    const foundList = el('div', { class: 'explore-found' });
    rail.append(
      el('div', { class: 'explore-rail__eyebrow', text: '이번 탐색' }),
      el('h2', { class: 'explore-rail__title', text: '자료 수첩' }),
      count,
      progress,
      el('p', {
        class: 'explore-rail__note',
        text: '손가락 표시가 있는 자료를 누르면 내용을 자세히 볼 수 있어요.',
      }),
      foundList,
    );

    const nextBtn = button(
      '자료 분석하기',
      () => {
        AudioManager.sfx('uiTap');
        void Router.go('stage2');
      },
      { variant: 'primary', size: 'lg' },
    );

    const leftGroup = el('div', {});
    leftGroup.style.display = 'flex';
    leftGroup.style.gap = 'var(--space-md)';
    mountEvidenceButton(leftGroup);

    const nav = el('div', { class: 'bottom-nav' }, [leftGroup, nextBtn]);

    const moveZone = (direction: -1 | 1) => {
      AudioManager.sfx('uiTap');
      (Router.getScene('Stage1Scene') as Stage1Scene | null)?.moveZone(direction);
    };

    const prevZoneBtn = button(
      '이전 구역',
      () => moveZone(-1),
      { variant: 'ghost', size: 'sm' },
    );
    const nextZoneBtn = button(
      '다음 구역',
      () => moveZone(1),
      { variant: 'ghost', size: 'sm' },
    );
    const zoneText = el('strong', { class: 'explore-zone-nav__status', text: '구역 1 / 3' });
    const zoneNav = el('nav', { class: 'explore-zone-nav', 'aria-label': '기록실 구역 이동' }, [
      prevZoneBtn,
      zoneText,
      nextZoneBtn,
    ]);

    const prevEdgeBtn = button('', () => moveZone(-1), {
      variant: 'ghost',
      class: 'explore-edge-nav explore-edge-nav--prev',
    });
    prevEdgeBtn.setAttribute('aria-label', '왼쪽 기록실 구역으로 이동');
    prevEdgeBtn.setAttribute('title', '이전 구역으로 이동');
    prevEdgeBtn.replaceChildren(icon(ICONS.back));

    const nextEdgeBtn = button('', () => moveZone(1), {
      variant: 'ghost',
      class: 'explore-edge-nav explore-edge-nav--next',
    });
    nextEdgeBtn.setAttribute('aria-label', '오른쪽 기록실 구역으로 이동');
    nextEdgeBtn.setAttribute('title', '다음 구역으로 이동');
    nextEdgeBtn.replaceChildren(icon(ICONS.back));

    prevZoneBtn.disabled = true;
    prevEdgeBtn.disabled = true;

    overlay.append(mission, rail, prevEdgeBtn, nextEdgeBtn, zoneNav, nav);

    // ── 상태 갱신
    let tapGuideDismissed = false;
    const refresh = () => {
      const foundRequired = required.filter((id) => GameState.has(id)).length;
      const ready = foundRequired >= required.length;
      const exploreIds = new Set(
        explore.hotspots.flatMap((hotspot) => hotspot.evidenceId ?? []),
      );
      const found = GameState.foundEvidence.filter((e) => exploreIds.has(e.id));
      count.replaceChildren(
        el('strong', { text: `${foundRequired}/${required.length}` }),
        el('span', {
          class: ready ? 'explore-count--done' : '',
          text: ready ? '꼭 필요한 자료를 다 찾았어요' : '꼭 필요한 자료',
        }),
      );
      progress.setAttribute('aria-valuenow', String(foundRequired));
      progressFill.style.width = `${(foundRequired / required.length) * 100}%`;
      foundList.replaceChildren();
      if (found.length === 0) {
        foundList.appendChild(
          el('p', { class: 'explore-found__empty', text: '아직 찾은 자료가 없어요. 물건 하나를 눌러 봐요.' }),
        );
      }
      found.forEach((e, index) => {
        const hotspot = explore.hotspots.find((h) => h.evidenceId === e.id);
        const guideFirstCard = index === 0 && !tapGuideDismissed;
        const card = el('button', {
          class: `explore-found__card${guideFirstCard ? ' explore-found__card--guided' : ''}`,
          type: 'button',
          'aria-label': `${e.title} 자료 자세히 보기`,
        }, [
          el('img', {
            class: 'explore-found__image',
            src: hotspotImage(hotspot),
            alt: hotspot ? `${hotspot.label} 그림` : '찾은 자료 그림',
          }),
          el('span', { class: 'explore-found__body' }, [
            el('span', {
              class: 'explore-found__from',
              text: hotspot ? `${hotspot.label}에서 발견` : '탐색에서 발견',
            }),
            el('strong', { class: 'explore-found__title', text: e.title }),
            el('span', { class: 'explore-found__summary', text: `${KIND_LABEL[e.kind]} · ${e.summary}` }),
          ]),
          el('span', { class: 'explore-found__tap-cue', 'aria-hidden': 'true' }, [
            el('span', { class: 'explore-found__tap-hand', text: '👆' }),
            el('span', { text: '눌러 자세히 보기' }),
          ]),
        ]);
        card.addEventListener('click', () => {
          tapGuideDismissed = true;
          foundList.querySelectorAll('.explore-found__card--guided').forEach((guidedCard) => {
            guidedCard.classList.remove('explore-found__card--guided');
          });
          openEvidenceDetail(e);
        });
        foundList.appendChild(card);
      });
      nextBtn.disabled = !ready;
      nextBtn.classList.toggle('kr-btn--ready', ready);
      nextBtn.textContent = ready
        ? '찾기 끝! 자료 분석하기'
        : `자료 ${required.length - foundRequired}개 더 찾기`;
    };
    refresh();

    offs.push(
      EventBus.on('EVIDENCE_FOUND', (payload) => {
        const id = (payload as { id: string }).id;
        const ev = GameState.getEvidence(id);
        AudioManager.sfx('evidenceFound');
        if (ev) {
          const hotspot = explore.hotspots.find((h) => h.evidenceId === id);
          showEvidenceReveal(ev, {
            objectLabel: hotspot?.label,
            objectImage: hotspotImage(hotspot),
          });
        }
        refresh();
      }),
      EventBus.on('EVIDENCE_INSPECTED', (payload) => {
        const review = payload as { id?: string; source?: string };
        if (review.source !== 'stage1' || !review.id) return;
        const ev = GameState.getEvidence(review.id);
        const hotspot = explore.hotspots.find((h) => h.evidenceId === review.id);
        if (!ev) return;
        AudioManager.sfx('paper');
        showEvidenceReveal(ev, {
          objectLabel: hotspot?.label,
          objectImage: hotspotImage(hotspot),
        });
      }),
      EventBus.on('EXPLORE_ZONE_CHANGED', (payload) => {
        const { index, count: zoneCount } = payload as { index: number; count: number };
        zoneText.textContent = `구역 ${index + 1} / ${zoneCount}`;
        prevZoneBtn.disabled = index === 0;
        nextZoneBtn.disabled = index === zoneCount - 1;
        prevEdgeBtn.disabled = index === 0;
        nextEdgeBtn.disabled = index === zoneCount - 1;
      }),
      EventBus.on('SFX', (key) => AudioManager.sfx(key as 'uiTap')),
    );
  },

  unmount(): void {
    offs.forEach((f) => f());
    offs.length = 0;
  },
};
