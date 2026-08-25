/** 상단 HUD — 왼쪽: 뒤로/홈 · 가운데: 제목·단계 · 오른쪽: 소리/설정
 *  모든 페이지 공통. */
import { el, icon, ICONS, button } from './dom';
import { AudioManager } from '../core/AudioManager';
import { Router, type RouteName } from '../core/Router';
import { openModal, closeModal } from './Modal';
import { openSettings } from './Settings';

export const STAGE_LABELS = [
  '흔적 탐색',
  '자료 분석',
  '기록 탐구',
  '기록 복원',
] as const;

export interface TopHudOptions {
  title: string;
  /** 1~4. 없으면 단계 표시를 숨긴다 */
  stage?: number;
  /** 뒤로 버튼이 이동할 곳. 없으면 뒤로 버튼을 숨긴다 */
  back?: RouteName;
  showHome?: boolean;
}

function iconButton(
  label: string,
  path: string,
  onClick: () => void,
): HTMLButtonElement {
  const b = el('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': label,
  });
  b.appendChild(icon(path));
  b.addEventListener('click', onClick);
  return b;
}

export function mountTopHud(
  overlay: HTMLElement,
  opts: TopHudOptions,
): HTMLElement {
  const hud = el('div', { class: 'top-hud' });

  // ── 왼쪽: 뒤로 / 홈
  const left = el('div', { class: 'top-hud__group' });
  if (opts.back) {
    const backTo = opts.back;
    left.appendChild(
      iconButton('이전 화면으로', ICONS.back, () => {
        AudioManager.sfx('uiTap');
        void Router.go(backTo);
      }),
    );
  }
  if (opts.showHome !== false) {
    left.appendChild(
      iconButton('처음 화면으로', ICONS.home, () => {
        AudioManager.sfx('uiTap');
        openModal({
          title: '처음 화면으로',
          body: el('p', {
            text: '지금까지의 진행은 저장됩니다. 처음 화면으로 돌아갈까요?',
          }),
          footer: [
            button('계속 탐구하기', () => closeModal(), { variant: 'ghost' }),
            button(
              '처음으로',
              () => {
                closeModal();
                void Router.go('title');
              },
              { variant: 'primary' },
            ),
          ],
        });
      }),
    );
  }
  hud.appendChild(left);

  if (opts.title) {
    hud.appendChild(el('div', { class: 'top-hud__title', text: opts.title }));
  }

  if (opts.stage) {
    const dots = el('div', { class: 'stage-progress' }, [
      el('span', {
        class: 'stage-progress__label',
        text: `${opts.stage}. ${STAGE_LABELS[opts.stage - 1]}`,
      }),
    ]);
    for (let i = 1; i <= STAGE_LABELS.length; i++) {
      const cls =
        i < opts.stage
          ? 'stage-progress__dot done'
          : i === opts.stage
            ? 'stage-progress__dot current'
            : 'stage-progress__dot';
      dots.appendChild(el('span', { class: cls, 'aria-label': `${i}단계` }));
    }
    hud.appendChild(dots);
  }

  hud.appendChild(el('div', { class: 'top-hud__spacer' }));

  // ── 오른쪽: 소리 / 설정
  const right = el('div', { class: 'top-hud__group' });

  const soundBtn = el('button', {
    class: 'icon-btn',
    type: 'button',
    'aria-label': '소리 켜기/끄기',
  });
  const renderSound = () => {
    soundBtn.replaceChildren(
      icon(AudioManager.muted ? ICONS.mute : ICONS.sound),
    );
  };
  renderSound();
  soundBtn.addEventListener('click', () => {
    AudioManager.toggleMute();
    renderSound();
  });
  right.appendChild(soundBtn);

  right.appendChild(
    iconButton('설정', ICONS.gear, () => {
      AudioManager.sfx('uiTap');
      openSettings(renderSound);
    }),
  );
  hud.appendChild(right);

  overlay.appendChild(hud);
  return hud;
}
