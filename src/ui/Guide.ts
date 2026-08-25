/** 조사원 안내 캐릭터 — 별도 힌트 버튼 없이, 캐릭터를 누르면
 *  머리 위 말풍선이 타이핑으로 안내를 말하고, 말이 끝나면 사라진다.
 *  EventBus 'HINT' 문구도 전부 이 말풍선으로 나온다. */
import { el } from './dom';
import { EventBus } from '../core/EventBus';
import { AudioManager } from '../core/AudioManager';
import { AssetMap } from '../config/AssetMap';

export interface GuideOptions {
  /** 캐릭터를 누를 때마다 순서대로 말하는 안내 문구.
   *  함수를 주면 누를 때마다 다시 계산한다 — 지금 화면 상태에 맞는 힌트를 주기 위해서다. */
  hints: string[] | (() => string[]);
  /** 화면 진입 시 자동으로 한 번 말하는 문구 */
  greeting?: string;
  /** n번째 힌트를 말한 뒤 추가 동작 (예: 카메라 이동) */
  onHint?: (index: number) => void;
  /** 말풍선과 다른 패널이 겹치는 화면에서 캐릭터를 오른쪽 아래로 옮긴다 */
  side?: 'left' | 'right';
  /** 밀도 높은 화면에서 캐릭터를 작게 */
  compact?: boolean;
  /** 화면의 탐구 행동에 맞춘 조사원 이미지 */
  imageSrc?: string;
  /** 캐릭터가 학습 영역을 바라보도록 이미지 방향을 맞춘다. */
  facing?: 'left' | 'right';
  /** 기본 84px 조사원 버튼을 168px로 확대 */
  large?: boolean;
  /** 패널·버튼과 겹칠 때 위치 미세 조정 (1600x900 논리 px) */
  offset?: { left?: number; right?: number; bottom?: number };
  /** Phaser가 이미 캐릭터를 그리는 화면: 이미지 없이 그 위에 투명 클릭존만 얹는다.
   *  좌표는 1600x900 논리 무대 기준 px */
  overlayRect?: { left: number; bottom: number; width: number; height: number };
}

const TYPE_MS = 26;
const dwellMs = (text: string) => 1600 + text.length * 40;

export function mountGuide(
  overlay: HTMLElement,
  opts: GuideOptions,
): () => void {
  const root = el('div', {
    class: `guide-char${opts.side === 'right' ? ' guide-char--right' : ''}${opts.compact ? ' guide-char--compact' : ''}${opts.large ? ' guide-char--large' : ''}${opts.facing === 'left' ? ' guide-char--facing-left' : ''}`,
  });
  const textNode = el('span', { class: 'guide-char__text' });
  const bubble = el('div', { class: 'guide-char__bubble', role: 'status' }, [
    textNode,
  ]);
  const btn = el(
    'button',
    {
      class: 'guide-char__btn',
      type: 'button',
      'aria-label': '조사원에게 도움 받기',
    },
    opts.overlayRect
      ? []
      : [
          el('img', {
            class: 'guide-char__img',
            src: opts.imageSrc ?? AssetMap.char.guidePortraitBoy,
            alt: '',
          }),
        ],
  );
  if (opts.offset) {
    if (opts.offset.left !== undefined) root.style.left = `${opts.offset.left}px`;
    if (opts.offset.right !== undefined) root.style.right = `${opts.offset.right}px`;
    if (opts.offset.bottom !== undefined) root.style.bottom = `${opts.offset.bottom}px`;
  }
  if (opts.overlayRect) {
    const r = opts.overlayRect;
    root.classList.add('guide-char--overlay');
    root.style.left = `${r.left}px`;
    root.style.bottom = `${r.bottom}px`;
    btn.style.width = `${r.width}px`;
    btn.style.height = `${r.height}px`;
  }
  root.append(bubble, btn);
  overlay.appendChild(root);

  let typeTimer = 0;
  let hideTimer = 0;
  let full = '';
  let hintIndex = 0;

  const clearTimers = () => {
    window.clearInterval(typeTimer);
    window.clearTimeout(hideTimer);
  };

  const hide = () => bubble.classList.remove('show');

  const say = (text: string) => {
    clearTimers();
    full = text;
    textNode.textContent = '';
    bubble.classList.add('show');
    let i = 0;
    typeTimer = window.setInterval(() => {
      i++;
      textNode.textContent = full.slice(0, i);
      if (i >= full.length) {
        window.clearInterval(typeTimer);
        hideTimer = window.setTimeout(hide, dwellMs(full));
      }
    }, TYPE_MS);
  };

  btn.addEventListener('click', () => {
    AudioManager.sfx('uiTap');
    // 타이핑 도중 다시 누르면 문장 전체를 바로 보여준다
    if (bubble.classList.contains('show') && textNode.textContent !== full) {
      clearTimers();
      textNode.textContent = full;
      hideTimer = window.setTimeout(hide, dwellMs(full));
      return;
    }
    const list = typeof opts.hints === 'function' ? opts.hints() : opts.hints;
    if (list.length === 0) return;
    say(list[hintIndex % list.length]);
    opts.onHint?.(hintIndex);
    hintIndex++;
  });

  const off = EventBus.on('HINT', (t) => say(String(t)));
  if (opts.greeting) {
    const g = opts.greeting;
    hideTimer = window.setTimeout(() => say(g), 700);
  }

  return () => {
    clearTimers();
    off();
    root.remove();
  };
}
