/** 스테이지 진입 미션 카드 — "지금 뭘, 왜 하는지"를 먼저 보여준다.
 *  같은 세션에서 같은 스테이지에 다시 들어오면 띄우지 않는다. */
import { el, button } from './dom';
import { AudioManager } from '../core/AudioManager';

interface MissionCopy {
  eyebrow: string;
  goal: string;
  why: string;
  how: string[];
}

const MISSIONS: Record<number, MissionCopy> = {
  1: {
    eyebrow: '1단계 — 흔적 탐색',
    goal: '기록실에 숨은 자료를 찾아요',
    why: '자료가 모여야 이름이 지워진 기록의 주인이 누구인지 밝힐 수 있어요.',
    how: [
      '아래 구역 버튼으로 기록실을 둘러봐요',
      '물건은 끌어도 되고 한 번 눌러도 돼요',
      '찾은 자료의 그림·제목·뜻을 함께 읽어요',
    ],
  },
  2: {
    eyebrow: '2단계 — 자료 분석',
    goal: '찾은 자료를 분석해 숨은 사실을 확인해요',
    why: '자료를 서로 비교해야 어떤 인물과 이어지는지 알 수 있어요.',
    how: [
      '두 기록을 겹쳐서 같은 부분을 찾아요',
      '자료를 시간 순서대로 놓아 봐요',
      '문서·조직·사건을 선으로 이어요',
    ],
  },
  3: {
    eyebrow: '3단계 — 기록 탐구',
    goal: '질문을 골라 기록을 읽어요',
    why: '질문마다 열리는 기록이 달라요. 궁금한 건 몇 개든 열어 읽어도 괜찮아요.',
    how: [
      '지금 가진 근거로 확인하고 싶은 질문을 골라요',
      '열린 기록을 읽고 중요한 문장에 밑줄을 그어요',
      '밑줄이 맞으면 새 자료가 열려요',
    ],
  },
  4: {
    eyebrow: '4단계 — 기록 복원',
    goal: '모은 근거로 지워진 기록을 복원해요',
    why: '시간과 관계를 맞추고 근거 3개가 모이면, 드디어 이름을 되살릴 수 있어요.',
    how: [
      'A. 카드 아래 연도를 보고 오래된 순서로 놓아요',
      'B. 인물·조직·사건의 관계를 이어요',
      'C. 기록의 다섯 칸을 채우고 [기록 복원]!',
    ],
  },
};

const seenKey = (stage: number) => `keeper:mission-seen:${stage}`;

export function showMissionIntro(stage: number): void {
  const copy = MISSIONS[stage];
  if (!copy) return;
  try {
    if (sessionStorage.getItem(seenKey(stage))) return;
    sessionStorage.setItem(seenKey(stage), '1');
  } catch {
    /* sessionStorage 불가 환경이면 매번 보여줘도 무방 */
  }

  const layer = document.getElementById('modal-layer');
  if (!layer) return;

  const card = el('div', { class: 'mission-intro__card' }, [
    el('div', { class: 'mission-intro__eyebrow', text: copy.eyebrow }),
    el('h2', { class: 'mission-intro__goal', text: copy.goal }),
    el('p', { class: 'mission-intro__why', text: copy.why }),
    el(
      'ul',
      { class: 'mission-intro__how' },
      copy.how.map((h) => el('li', {}, [el('span', { class: 'mission-intro__mark' }), el('span', { text: h })])),
    ),
  ]);

  const backdrop = el('div', { class: 'mission-intro' }, [card]);

  const close = () => {
    backdrop.classList.remove('show');
    window.setTimeout(() => backdrop.remove(), 300);
  };

  card.appendChild(
    button(
      '탐구 시작',
      () => {
        AudioManager.sfx('uiTap');
        close();
      },
      { variant: 'primary', size: 'lg', class: 'mission-intro__btn' },
    ),
  );

  layer.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));
}
