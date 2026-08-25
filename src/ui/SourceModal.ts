/** 자료 출처 보기 — approved 상태 claim만 노출.
 *  사건 해결 전에는 인물 이름을 ○○○로 가려 정답이 새지 않게 한다. */
import { el, button } from './dom';
import { openModal } from './Modal';
import { getClaims } from '../data/loaders';
import { GameState } from '../core/GameState';
import type { HistoricalClaim } from '../data/schemas';

function claimNode(c: HistoricalClaim): HTMLElement {
  const mask = (t: string) => GameState.maskSpoilers(t);
  const ref = mask([c.sourceName, c.dateText].filter(Boolean).join(' · '));
  const children: HTMLElement[] = [
    el('div', { class: 'source-item__claim', text: mask(c.claim) }),
  ];

  if (c.directQuote && c.quoteText) {
    const q = el('blockquote', { class: 'paper-card' }, [mask(c.quoteText)]);
    q.style.margin = 'var(--space-sm) 0';
    q.style.fontSize = 'var(--font-size-sub)';
    children.push(q);
  }

  const refLine = el('div', { class: 'source-item__ref' }, [ref]);
  // 원문 링크는 기관 페이지 제목에 이름이 그대로 나오므로 해결 후에만 연다
  if (c.sourceUrl && GameState.caseSolved) {
    const a = el('a', { href: c.sourceUrl, target: '_blank', rel: 'noopener' }, [
      ' 원문 보기',
    ]);
    a.style.color = 'var(--brass-300)';
    refLine.appendChild(a);
  }
  children.push(refLine);

  return el('div', { class: 'source-item' }, children);
}

/** claimIds에 해당하는 approved claim들을 모달로 표시 */
export function openSourceModal(
  claimIds: string[],
  title = '자료 출처',
  /** 출처 목록 앞에 붙일 안내 (예: 생성형 AI 고지) */
  preface: HTMLElement[] = [],
): void {
  const all = getClaims();
  const items = claimIds
    .map((id) => all.get(id))
    .filter((c): c is HistoricalClaim => !!c && c.status === 'approved');

  const body = el('div', {});
  preface.forEach((node) => body.appendChild(node));

  if (items.length === 0) {
    body.appendChild(
      el('p', {
        class: 'visual-note',
        text: '검수가 완료된 출처 자료가 아직 연결되지 않았습니다.',
      }),
    );
  } else {
    items.forEach((c) => body.appendChild(claimNode(c)));
  }

  if (!GameState.caseSolved && items.length > 0) {
    body.appendChild(
      el('p', {
        class: 'visual-note',
        text: '○○○ 표시는 아직 밝혀지지 않은 인물의 이름입니다. 기록을 복원하면 모두 공개됩니다.',
      }),
    );
  }

  body.appendChild(
    el('p', {
      class: 'visual-note',
      text: '화면의 인물·공간 그림은 자료를 바탕으로 구성한 학습용 시각화입니다.',
    }),
  );

  openModal({ title, body });
}

/** 출처 보기 버튼 */
export function sourceButton(
  claimIds: string[],
  label = '자료 출처 보기',
): HTMLButtonElement {
  return button(label, () => openSourceModal(claimIds), {
    variant: 'ghost',
    size: 'sm',
  });
}
