/** 확보한 기록 서랍 — 모든 Stage에서 공통 사용 */
import { el, button, icon, ICONS } from './dom';
import { openModal, closeModal } from './Modal';
import { GameState } from '../core/GameState';
import { AudioManager } from '../core/AudioManager';
import { sourceButton } from './SourceModal';
import { explainDifficultWords } from './Glossary';
import { getClaims } from '../data/loaders';
import type { EvidenceData, HistoricalClaim } from '../data/schemas';
import { AssetMap } from '../config/AssetMap';
import { EventBus } from '../core/EventBus';

export const KIND_LABEL: Record<EvidenceData['kind'], string> = {
  document: '문서',
  photo: '사진',
  artifact: '물건',
  map: '지도',
  organization: '조직',
  event: '사건',
  place: '장소',
  quote: '기록된 말',
};

const STRENGTH_LABEL: Record<EvidenceData['strength'], string> = {
  context: '배경 자료',
  shared: '여러 인물과 연결',
  direct: '직접 연결 자료',
};

export function evidenceCard(
  e: EvidenceData,
  opts: { draggable?: boolean; onTap?: (e: EvidenceData) => void } = {},
): HTMLElement {
  const visual = evidenceVisual(e);
  const card = el(
    'div',
    {
      class: `evidence-card evidence-card--${e.strength}`,
      'data-evidence-id': e.id,
      'data-interactive': 'true',
    },
    [
      el('div', { class: 'evidence-card__head' }, [
        el('img', {
          class: 'evidence-card__thumb',
          src: visual,
          alt: `${KIND_LABEL[e.kind]} 자료를 나타내는 그림`,
          draggable: 'false',
        }),
        el('div', { class: 'evidence-card__heading' }, [
          el('div', { class: 'evidence-card__kind', text: KIND_LABEL[e.kind] }),
          el('div', { class: 'evidence-card__title', text: e.title }),
        ]),
      ]),
      el('div', { class: 'evidence-card__summary', text: e.summary }),
    ],
  );
  if (opts.draggable === false) card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    opts.onTap ? opts.onTap(e) : openEvidenceDetail(e);
  });
  return card;
}

/** 실제 사료 사진이 아니라 자료 종류와 탐구 행동을 빠르게 구분하는 학습용 그림이다. */
function evidenceVisual(e: EvidenceData): string {
  const title = e.title;
  if (title.includes('시계')) return AssetMap.prop.pocketWatch;
  if (title.includes('사진')) return AssetMap.prop.oldPhoto;
  if (title.includes('봉투') || title.includes('선서')) return AssetMap.prop.letterEnvelope;
  if (title.includes('지도') || e.kind === 'place' || e.kind === 'map') {
    return AssetMap.prop.lensKit;
  }
  if (e.kind === 'organization' || e.kind === 'event') {
    return AssetMap.scene.evidenceRelationship;
  }
  if (e.kind === 'quote') return AssetMap.prop.letterEnvelope;
  if (e.kind === 'artifact') return AssetMap.prop.inkstone;
  if (e.kind === 'photo') return AssetMap.prop.oldPhoto;
  return AssetMap.prop.dustyDocument;
}

export function openEvidenceDetail(e: EvidenceData): void {
  AudioManager.sfx('paper');
  // 자료 설명에 어려운 낱말이 있으면 조사원이 뜻을 알려 준다
  explainDifficultWords(`${e.title} ${e.summary} ${e.detail ?? ''}`);
  const body = el('div', {});

  body.appendChild(
    el('div', {
      class: 'evidence-card__kind',
      text: `${KIND_LABEL[e.kind]} · ${STRENGTH_LABEL[e.strength]}`,
    }),
  );

  const paper = el('div', { class: 'paper-card evidence-detail__paper' }, [
    el('p', { text: e.detail ?? e.summary }),
  ]);
  body.appendChild(paper);

  // "확인된 사실" — approved claim 문장 리스트 + 직접 인용 강조
  const claims = getClaims();
  const facts = e.sourceClaimIds
    .map((id) => claims.get(id))
    .filter((c): c is HistoricalClaim => !!c && c.status === 'approved');

  if (facts.length > 0) {
    // 해결 전에는 인물 이름을 가린다 — 출처가 정답을 미리 말해 버리면 탐구가 죽는다
    const mask = (t: string) => GameState.maskSpoilers(t);
    const list = el('ul', { class: 'evidence-facts__list' });
    facts.forEach((c) => {
      const item = el('li', { class: 'evidence-facts__item', text: mask(c.claim) });
      if (c.directQuote && c.quoteText) {
        item.appendChild(
          el('blockquote', { class: 'evidence-quote' }, [
            el('p', { class: 'evidence-quote__text', text: mask(c.quoteText) }),
            el('cite', { class: 'evidence-quote__ref', text: mask(c.sourceName) }),
          ]),
        );
      }
      list.appendChild(item);
    });
    body.appendChild(
      el('div', { class: 'evidence-facts' }, [
        el('div', { class: 'evidence-facts__heading', text: '확인된 사실' }),
        list,
      ]),
    );
  }

  if (e.strength === 'shared') {
    body.appendChild(
      el('p', {
        class: 'visual-note',
        text: '여러 인물과 연결되는 자료입니다. 추가 근거가 필요합니다.',
      }),
    );
  }
  if (e.visualization) {
    body.appendChild(
      el('p', {
        class: 'visual-note',
        text: '자료를 바탕으로 구성한 학습용 시각화입니다.',
      }),
    );
  }

  openModal({
    title: e.title,
    body,
    footer: [sourceButton(e.sourceClaimIds)],
  });
}

/** 하단 좌측 "확보한 기록" 버튼 + 목록 모달 */
export function mountEvidenceButton(container: HTMLElement): HTMLElement {
  const btn = el('button', {
    class: 'kr-btn kr-btn--ghost',
    type: 'button',
    'data-interactive': 'true',
  });
  const label = el('span', { class: 'evidence-button__label' });
  const refresh = () => {
    label.textContent = `확보한 기록 ${GameState.foundEvidence.length}`;
  };
  btn.append(icon(ICONS.archive), label);
  refresh();

  let off = () => {};
  off = EventBus.on('EVIDENCE_FOUND', () => {
    if (!btn.isConnected) {
      off();
      return;
    }
    refresh();
  });

  btn.addEventListener('click', () => {
    AudioManager.sfx('uiTap');
    openEvidenceList();
  });

  container.appendChild(btn);
  return btn;
}

/**
 * 확보한 기록 목록.
 * @param opts.personId 주면 그 인물과 이어지는 기록만 보여 준다.
 *   복원이 끝난 뒤에는 다른 인물의 기록이 섞이면 아이가 헷갈리므로 걸러 낸다.
 */
export function openEvidenceList(opts: { personId?: string } = {}): void {
  const all = GameState.foundEvidence;
  const list = opts.personId
    ? all.filter((e) => e.relatedPersonIds.includes(opts.personId as string))
    : all;
  const grid = el('div', { class: 'evidence-grid' });

  if (list.length === 0) {
    grid.appendChild(
      el('p', { class: 'visual-note', text: '아직 확보한 기록이 없습니다.' }),
    );
  } else {
    list.forEach((e) => grid.appendChild(evidenceCard(e, { draggable: false })));
  }

  // 끝까지 내리면 아래쪽 흐림을 걷어 "더 없다"를 알린다
  requestAnimationFrame(() => {
    const box = grid.closest('.modal-box__body') as HTMLElement | null;
    if (!box) return;
    const sync = () => {
      const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
      box.classList.toggle('is-scrolled-end', atEnd);
    };
    box.addEventListener('scroll', sync, { passive: true });
    sync();
  });

  openModal({
    title: `확보한 기록 (${list.length})`,
    body: grid,
    width: 900,
    footer: [button('닫기', () => closeModal())],
  });
}
