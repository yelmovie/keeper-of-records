/** 발견 연출 — 기록 확보 인장이 "쾅" 찍히는 풀스크린 리빌 */
import { el } from './dom';
import { AudioManager } from '../core/AudioManager';
import { KIND_LABEL } from './EvidenceDrawer';
import type { EvidenceData } from '../data/schemas';
import { P, cssColor } from '../systems/interactions/palette';

const NS = 'http://www.w3.org/2000/svg';

/** CSS와 동기화: seal-drop delay 0.3s + duration 0.4s */
const SEAL_LAND_MS = 700;
const AUTO_CLOSE_MS = 6000;
const FADE_MS = 250;

let current: HTMLElement | null = null;
let timers: number[] = [];

function clearTimers(): void {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
}

/** 붉은 원형 "기록 확보" 인장 (Seal.ts의 전각 도장 스타일 참고) */
function foundSeal(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 160 160');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '기록 확보 인장');

  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', 'translate(80 80)');

  const outer = document.createElementNS(NS, 'circle');
  outer.setAttribute('r', '72');
  outer.setAttribute('fill', 'none');
  outer.setAttribute('stroke', cssColor(P.redMuted));
  outer.setAttribute('stroke-width', '6');
  g.appendChild(outer);

  const inner = document.createElementNS(NS, 'circle');
  inner.setAttribute('r', '62');
  inner.setAttribute('fill', 'rgba(156, 59, 52, 0.14)');
  inner.setAttribute('stroke', 'rgba(156, 59, 52, 0.55)');
  inner.setAttribute('stroke-width', '1.6');
  g.appendChild(inner);

  // 테두리 눈금 — 각인 느낌
  for (let i = 0; i < 16; i++) {
    const tick = document.createElementNS(NS, 'line');
    tick.setAttribute('x1', '0');
    tick.setAttribute('y1', '-68');
    tick.setAttribute('x2', '0');
    tick.setAttribute('y2', '-63');
    tick.setAttribute('stroke', 'rgba(156, 59, 52, 0.5)');
    tick.setAttribute('stroke-width', '2');
    tick.setAttribute('stroke-linecap', 'round');
    tick.setAttribute('transform', `rotate(${i * 22.5})`);
    g.appendChild(tick);
  }

  const lines: [string, string][] = [
    ['기록', '-8'],
    ['확보', '38'],
  ];
  lines.forEach(([txt, y]) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', '38');
    t.setAttribute('letter-spacing', '4');
    t.setAttribute('font-family', "'Noto Serif KR', 'Batang', serif");
    t.setAttribute('font-weight', '700');
    t.setAttribute('fill', '#7a2b26');
    t.textContent = txt;
    g.appendChild(t);
  });

  svg.appendChild(g);
  return svg;
}

/** 기록 확보 리빌 — 약 2.4초 뒤 자동 제거, 탭하면 즉시 닫힘 */
export function showEvidenceReveal(
  e: EvidenceData,
  context: { objectLabel?: string; objectImage?: string } = {},
): void {
  // 연속 호출: 이전 것 즉시 제거
  clearTimers();
  current?.remove();
  current = null;

  const layer = document.getElementById('modal-layer');
  if (!layer) return;

  const card = el('div', { class: 'paper-card evidence-reveal__card' });
  if (context.objectImage) {
    card.appendChild(
      el('img', {
        class: 'evidence-reveal__object',
        src: context.objectImage,
        alt: context.objectLabel ? `${context.objectLabel} 그림` : '조사한 물건 그림',
      }),
    );
  }
  card.append(
    el('div', {
      class: 'evidence-reveal__found-from',
      text: context.objectLabel
        ? `${context.objectLabel}에서 찾았어요`
        : '새 자료를 찾았어요',
    }),
    el('div', { class: 'evidence-reveal__kind', text: `${KIND_LABEL[e.kind]} 자료` }),
    el('div', { class: 'evidence-reveal__title', text: e.title }),
    el('div', { class: 'evidence-reveal__why', text: '이 자료로 알 수 있는 점' }),
    el('div', { class: 'evidence-reveal__summary', text: e.summary }),
    el('div', { class: 'evidence-reveal__continue', text: '자료 수첩에 넣었어요 · 눌러서 계속 찾기' }),
  );

  const seal = foundSeal();
  seal.classList.add('evidence-reveal__seal');

  const stack = el('div', { class: 'evidence-reveal__stack' }, [card]);
  stack.appendChild(seal);

  const overlay = el(
    'div',
    { class: 'evidence-reveal', role: 'status', 'aria-live': 'polite' },
    [stack],
  );
  layer.appendChild(overlay);
  current = overlay;

  const dismiss = () => {
    if (current !== overlay) return;
    clearTimers();
    current = null;
    overlay.classList.remove('show');
    window.setTimeout(() => overlay.remove(), FADE_MS);
  };

  overlay.addEventListener('click', dismiss);
  requestAnimationFrame(() => overlay.classList.add('show'));

  timers.push(
    window.setTimeout(() => {
      // 인장 착지 — 카드 흔들림 + 도장 소리
      card.classList.add('evidence-reveal__card--thud');
      AudioManager.sfx('slotOk');
    }, SEAL_LAND_MS),
    window.setTimeout(dismiss, AUTO_CLOSE_MS),
  );
}
