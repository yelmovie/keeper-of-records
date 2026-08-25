/** 손가락 신호 — 다음에 눌러야 할 버튼을 가리킨다.
 *  아이가 "다 맞췄는데 이제 뭘 하지?" 하고 멈추는 지점에서만 쓴다.
 *  버튼을 가리기만 하고 클릭은 가로채지 않는다(pointer-events: none).
 */
import { el } from './dom';
import { Viewport, STAGE_W, STAGE_H } from '../core/Viewport';

/** 이 시간이 지나면 스스로 사라진다 */
const AUTO_HIDE_MS = 20000;

let current: (() => void) | null = null;

/** 아래를 가리키는 화살표 — 버튼 바로 위에서 콕콕 내려찍는다 */
function arrowIcon(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 32 44');
  svg.setAttribute('class', 'tap-cue__arrow');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M16 2v24M4 20l12 20 12-20');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'rgba(232,211,163,0.95)');
  path.setAttribute('stroke-width', '6');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

/**
 * 대상 버튼 옆에 손가락 신호를 띄운다.
 * 버튼을 누르면 사라진다. 이미 떠 있는 신호는 먼저 걷는다.
 * @returns 직접 걷어내는 함수
 */
export function showTapCue(
  target: HTMLElement,
  opts: { label?: string } = {},
): () => void {
  hideTapCue();

  const overlay = document.getElementById('ui-overlay');
  if (!overlay) return () => undefined;

  const cue = el('div', { class: 'tap-cue', 'aria-hidden': 'true' }, [
    el('span', { class: 'tap-cue__ring' }),
    arrowIcon(),
  ]);
  if (opts.label) {
    cue.appendChild(el('span', { class: 'tap-cue__label', text: opts.label }));
  }
  overlay.appendChild(cue);

  const place = (): void => {
    const r = target.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    // 버튼 위 가운데에서 아래로 가리킨다. 화면 밖으로 나가지 않게 안쪽으로 죈다.
    const clamp = (v: number, lo: number, hi: number) =>
      Math.min(Math.max(v, lo), hi);
    const p = Viewport.toStage(r.left + r.width * 0.5, r.top + 6);
    cue.style.left = `${clamp(p.x, 130, STAGE_W - 130)}px`;
    cue.style.top = `${clamp(p.y, 110, STAGE_H - 40)}px`;
  };
  place();

  const offScale = Viewport.onScale(() => place());
  const raf = requestAnimationFrame(() => place());

  let hidden = false;
  const hide = (): void => {
    if (hidden) return;
    hidden = true;
    cancelAnimationFrame(raf);
    offScale();
    window.clearTimeout(timer);
    target.removeEventListener('click', hide);
    cue.classList.remove('show');
    window.setTimeout(() => cue.remove(), 320);
    if (current === hide) current = null;
  };

  const timer = window.setTimeout(hide, AUTO_HIDE_MS);
  target.addEventListener('click', hide);
  requestAnimationFrame(() => cue.classList.add('show'));

  current = hide;
  return hide;
}

/** 떠 있는 손가락 신호를 걷는다 */
export function hideTapCue(): void {
  current?.();
  current = null;
}
