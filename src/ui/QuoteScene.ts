/** 기록의 목소리 — 검수(approved)된 직접 인용문을 한 글자씩 보여주는 연출.
 *  인용문을 여기서 만들지 않는다. 반드시 호출부에서 approved claim의
 *  quoteText와 sourceName을 전달받아 그대로 표시한다.
 */
import { el, button } from './dom';
import { AudioManager } from '../core/AudioManager';

const TYPE_MS = 55;

export function playQuoteScene(opts: {
  title: string;
  quote: string;
  sourceName: string;
  onDone?: () => void;
}): void {
  const layer = document.getElementById('modal-layer');
  if (!layer) {
    opts.onDone?.();
    return;
  }
  layer.style.pointerEvents = 'auto';

  AudioManager.duck(opts.quote.length * TYPE_MS + 3000);
  AudioManager.sfx('paper');

  const textNode = el('span', { class: 'quote-scene__text' });
  const caret = el('span', { class: 'quote-scene__caret', 'aria-hidden': 'true' });
  const quoteBox = el('blockquote', { class: 'quote-scene__quote' }, [
    textNode,
    caret,
  ]);
  const foot = el('div', { class: 'quote-scene__foot' }, [
    el('div', { class: 'quote-scene__source', text: `— ${opts.sourceName}` }),
  ]);
  const hint = el('p', {
    class: 'quote-scene__hint',
    text: '화면을 누르면 전체 문장이 바로 나와요',
  });

  const overlay = el(
    'div',
    { class: 'quote-scene', role: 'dialog', 'aria-label': opts.title },
    [el('div', { class: 'quote-scene__title', text: opts.title }), quoteBox, foot, hint],
  );

  let timer: number | null = null;
  let typed = false;
  let closed = false;

  const stopTimer = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    stopTimer();
    overlay.classList.remove('show');
    window.setTimeout(() => {
      overlay.remove();
      if (layer.childElementCount === 0) layer.style.pointerEvents = 'none';
      opts.onDone?.();
    }, 650);
  };

  const finishTyping = () => {
    if (typed) return;
    typed = true;
    stopTimer();
    textNode.textContent = opts.quote;
    caret.remove();
    hint.remove();
    foot.appendChild(button('계속', close, { variant: 'primary' }));
    foot.classList.add('show');
  };

  const chars = Array.from(opts.quote);
  let idx = 0;
  timer = window.setInterval(() => {
    if (idx >= chars.length) {
      finishTyping();
      return;
    }
    textNode.textContent += chars[idx++];
  }, TYPE_MS);

  overlay.addEventListener('click', () => {
    if (!typed) finishTyping();
  });

  layer.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  // 움직임 최소화 설정이면 타이핑 없이 전체 문장을 바로 보여준다
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishTyping();
  }
}
