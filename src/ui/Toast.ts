/** 힌트·피드백 토스트 — "틀렸습니다" 대신 관찰 안내 문구 */
import { el } from './dom';

let current: HTMLElement | null = null;
let timer = 0;

export function showToast(
  message: string,
  opts: { kind?: 'hint' | 'feedback'; duration?: number } = {},
): void {
  const overlay = document.getElementById('ui-overlay');
  if (!overlay) return;

  hideToast();

  const node = el('div', {
    class: `hint-toast${opts.kind === 'feedback' ? ' hint-toast--feedback' : ''}`,
    text: message,
  });
  overlay.appendChild(node);
  current = node;
  requestAnimationFrame(() => node.classList.add('show'));

  window.clearTimeout(timer);
  timer = window.setTimeout(hideToast, opts.duration ?? 3600);
}

export function hideToast(): void {
  window.clearTimeout(timer);
  const node = current;
  current = null;
  if (!node) return;
  node.classList.remove('show');
  window.setTimeout(() => node.remove(), 320);
}
