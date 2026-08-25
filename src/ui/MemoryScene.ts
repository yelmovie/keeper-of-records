/** 기억 조각 — 2.5D parallax + camera push-in
 *  게임 아이템 교환 연출이 아니라, 짧은 기억 장면으로 다룬다.
 */
import { el, button } from './dom';
import { AssetMap } from '../config/AssetMap';
import { AudioManager } from '../core/AudioManager';
import { GameState } from '../core/GameState';
import { openSourceModal } from './SourceModal';
import type { MemorySceneData } from '../data/schemas';

export function mountMemoryBadge(
  overlay: HTMLElement,
  memory: MemorySceneData,
  onOpen: () => void,
): HTMLElement {
  const badge = el('div', { class: 'memory-unlock-badge', 'data-interactive': 'true' }, [
    el('div', {}, [
      el('div', { class: 'memory-unlock-badge__label', text: '기억 조각이 열렸어!' }),
      el('div', { class: 'memory-unlock-badge__title', text: memory.title }),
    ]),
  ]);
  badge.addEventListener('click', () => {
    AudioManager.sfx('uiTap');
    badge.remove();
    onOpen();
  });
  overlay.appendChild(badge);
  return badge;
}

export function playMemoryScene(
  memory: MemorySceneData,
  onClose: () => void,
): void {
  const layer = document.getElementById('modal-layer');
  if (!layer) return;
  layer.style.pointerEvents = 'auto';

  // 줄이 많아지면 한 줄당 간격을 줄여 장면이 늘어지지 않게 한다
  const stepMs = memory.narration.length > 4 ? 1800 : 2300;
  const totalMs = 1100 + memory.narration.length * stepMs;

  AudioManager.duck(totalMs + 1500);

  const overlay = el('div', { class: 'memory-overlay' });

  // 이미지 레이어 (push-in)
  const stageBox = el('div', { class: 'memory-stage' });
  const inner = el('div', { class: 'memory-stage__inner' }, [
    el('img', {
      class: 'memory-stage__img',
      src: AssetMap.scene.memoryWatch,
      alt: '두 사람이 시계를 주고받는 장면을 그린 학습용 시각화',
    }),
  ]);
  const vignette = el('div', { class: 'memory-stage__vignette' });
  const focus = el('div', { class: 'memory-stage__focus' });
  stageBox.append(inner, vignette, focus);

  const narration = el('div', { class: 'memory-narration' });
  const actions = el('div', { class: 'memory-actions' });

  overlay.append(stageBox, narration, actions);
  layer.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  // 내레이션을 한 줄씩
  memory.narration.forEach((line, i) => {
    const p = el('p', { text: line });
    p.style.animationDelay = `${(1100 + i * stepMs) / 1000}s`;
    narration.appendChild(p);
  });

  // 시계 쪽으로 카메라 밀어 넣기
  window.setTimeout(() => inner.classList.add('push-in'), 900);
  window.setTimeout(() => focus.classList.add('show'), 2600);

  const close = () => {
    overlay.classList.remove('show');
    window.setTimeout(() => {
      overlay.remove();
      if (layer.childElementCount === 0) layer.style.pointerEvents = 'none';
      onClose();
    }, 800);
  };

  // 언제든 빠져나올 수 있게 (수업 시간 관리)
  const skip = button('건너뛰기', close, { variant: 'ghost', size: 'sm' });
  skip.classList.add('memory-skip');
  overlay.appendChild(skip);

  window.setTimeout(() => {
    skip.remove();
    actions.append(
      button('자료 출처 보기', () => openSourceModal(memory.sourceClaimIds, memory.title), {
        variant: 'ghost',
      }),
      button('기록으로 돌아가기', close, { variant: 'primary' }),
    );
  }, Math.min(totalMs, 11000));

  GameState.setMemorySceneSeen();
}
