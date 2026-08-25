/** 공통 모달 — backdrop, 중복 열림 방지, 닫힐 때 정확히 복구 */
import { el, button, icon, ICONS, clear } from './dom';
import { AudioManager } from '../core/AudioManager';

let openBackdrop: HTMLElement | null = null;

export interface ModalOptions {
  title: string;
  body: HTMLElement;
  footer?: HTMLElement[];
  onClose?: () => void;
  width?: number;
}

export function openModal(opts: ModalOptions): () => void {
  closeModal();

  const layer = document.getElementById('modal-layer');
  if (!layer) return () => {};

  const box = el('div', { class: 'modal-box' });
  if (opts.width) box.style.maxWidth = `${opts.width}px`;

  const closeBtn = el('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': '닫기',
  });
  closeBtn.appendChild(icon(ICONS.close));

  const header = el('div', { class: 'modal-box__header' }, [
    el('div', { class: 'modal-box__title', text: opts.title }),
    closeBtn,
  ]);

  const body = el('div', { class: 'modal-box__body' }, [opts.body]);
  box.append(header, body);

  if (opts.footer?.length) {
    box.appendChild(el('div', { class: 'modal-box__footer' }, opts.footer));
  }

  const backdrop = el('div', { class: 'modal-backdrop' }, [box]);
  layer.appendChild(backdrop);
  layer.style.pointerEvents = 'auto';
  openBackdrop = backdrop;

  const doClose = () => {
    if (openBackdrop !== backdrop) return;
    backdrop.classList.remove('show');
    window.setTimeout(() => {
      backdrop.remove();
      if (layer.childElementCount === 0) layer.style.pointerEvents = 'none';
    }, 250);
    openBackdrop = null;
    opts.onClose?.();
  };

  closeBtn.addEventListener('click', () => {
    AudioManager.sfx('uiTap');
    doClose();
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) doClose();
  });

  requestAnimationFrame(() => backdrop.classList.add('show'));
  return doClose;
}

export function closeModal(): void {
  if (!openBackdrop) return;
  const b = openBackdrop;
  openBackdrop = null;
  b.classList.remove('show');
  window.setTimeout(() => {
    b.remove();
    const layer = document.getElementById('modal-layer');
    if (layer && layer.childElementCount === 0)
      layer.style.pointerEvents = 'none';
  }, 250);
}

export function cleanupModals(): void {
  const layer = document.getElementById('modal-layer');
  if (layer) {
    clear(layer);
    layer.style.pointerEvents = 'none';
  }
  openBackdrop = null;
}

export function confirmFooter(
  label: string,
  onConfirm: () => void,
): HTMLElement[] {
  return [
    button(label, () => {
      closeModal();
      onConfirm();
    }, { variant: 'primary' }),
  ];
}
