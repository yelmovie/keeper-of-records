/** 설정 모달 — 모든 페이지 공통 (상단 톱니바퀴)
 *  소리 · 학생/교사 가이드 · 자료 출처 · 생성형 AI 고지 · 저작권 ·
 *  영상 다시 보기 · 교사용 도구(가이드 내부) · 기록 초기화
 */
import { el, button } from './dom';
import { openModal, closeModal } from './Modal';
import { AudioManager } from '../core/AudioManager';
import { SaveManager } from '../core/SaveManager';
import { SafeStorage } from '../core/SafeStorage';
import { GameState } from '../core/GameState';
import { Router } from '../core/Router';
import { EventBus } from '../core/EventBus';
import { openSourceModal } from './SourceModal';
import { getClaims } from '../data/loaders';
import { launchCase } from '../core/CaseLauncher';
import { playFinalCinematic, playIntroCinematic } from './cinematics';
import {
  ACTIVE_CASE_COUNT,
  completedActiveCaseCount,
} from '../config/PersonStages';

const TEACHER_KEY = 'keeper-of-records:teacher';
const TEACHER_PASSWORD = 'yelsam'; // 대소문자 구분 없음

export function isTeacherMode(): boolean {
  return SafeStorage.getJSON<boolean>(TEACHER_KEY, false);
}

export function openSettings(onSoundChange?: () => void): void {
  const s = SaveManager.get().settings;

  const sliderRow = (
    label: string,
    value: number,
    onInput: (v: number) => void,
  ) => {
    const range = el('input', {
      class: 'settings-range',
      type: 'range',
      min: '0',
      max: '100',
      value: String(Math.round(value * 100)),
      'aria-label': label,
    }) as HTMLInputElement;
    range.addEventListener('input', () => onInput(Number(range.value) / 100));
    return el('div', { class: 'settings-row' }, [
      el('span', { class: 'settings-row__label', text: label }),
      range,
    ]);
  };

  const muteBtn = button(
    AudioManager.muted ? '소리 켜기' : '소리 끄기',
    () => {
      AudioManager.toggleMute();
      muteBtn.textContent = AudioManager.muted ? '소리 켜기' : '소리 끄기';
      onSoundChange?.();
    },
    { variant: 'ghost', size: 'sm' },
  );

  const menuBtn = (label: string, onClick: () => void, primary = false) =>
    button(label, onClick, {
      variant: primary ? 'primary' : 'default',
      class: 'settings-menu__btn',
    });

  const allPeopleComplete =
    completedActiveCaseCount(SaveManager.get().completedCaseIds) >=
    ACTIVE_CASE_COUNT;
  const certificateBtns: HTMLElement[] = allPeopleComplete
    ? [menuBtn('인증서 출력', () => void goWithCase('certificate'))]
    : [];

  const replayCinematic = (kind: 'intro' | 'final') => {
    closeModal();
    const reopenSettings = () => openSettings(onSoundChange);
    if (kind === 'intro') playIntroCinematic(reopenSettings);
    else playFinalCinematic(reopenSettings);
  };

  const finalReplayBtn = menuBtn(
    allPeopleComplete
      ? '완료 영상 다시 보기'
      : `완료 영상 (인물 ${ACTIVE_CASE_COUNT}명 완료 후)`,
    () => replayCinematic('final'),
  ) as HTMLButtonElement;
  finalReplayBtn.disabled = !allPeopleComplete;

  const menu = el('div', { class: 'settings-menu' }, [
    menuBtn('학생용 가이드', openStudentGuide),
    menuBtn('교사용 가이드', openTeacherGuide),
    // 자료 출처·AI 고지·저작권은 모두 "이 화면의 내용이 어디서 왔는가"에
    // 답하는 안내라 한 버튼에서 함께 보여 준다.
    menuBtn('자료 출처 · 저작권', () => {
      const approved = [...getClaims().values()]
        .filter((c) => c.status === 'approved')
        .map((c) => c.id);
      openSourceModal(approved, '자료 출처 · AI 고지 · 저작권', aiNoticeNodes());
    }),
    menuBtn('기록 초기화', confirmReset),
    ...certificateBtns,
    el('p', { class: 'settings-menu__heading', text: '영상 다시 보기' }),
    menuBtn('시작 영상 다시 보기', () => replayCinematic('intro')),
    finalReplayBtn,
  ]);

  const body = el('div', { class: 'settings-body' }, [
    sliderRow('배경 음악', s.bgm, (v) => AudioManager.setBgmVolume(v)),
    sliderRow('효과음', s.sfx, (v) => AudioManager.setSfxVolume(v)),
    el('div', { class: 'settings-row settings-row--buttons' }, [muteBtn]),
    menu,
    el('p', {
      class: 'settings-note',
      text: '진행 기록은 이 기기에만 저장되며, 개인정보는 저장하지 않습니다.',
    }),
  ]);

  openModal({ title: '설정', body, width: 560 });
}

/* ── 안내 모달들 ─────────────────────────────── */

function openStudentGuide(): void {
  const body = el('div', {}, [
    el('p', {
      text: '이 게임은 정답을 맞히는 퀴즈가 아닙니다. 남아 있는 기록을 직접 찾고, 서로 비교하고, 연결해서 "이 기록의 주인은 누구인가"를 스스로 밝혀냅니다.',
    }),
    el('ul', { class: 'howto-list' }, [
      el('li', { text: '1. 흔적 탐색 — 기록보관실을 둘러보며 자료를 찾습니다.' }),
      el('li', { text: '2. 자료 분석 — 자료를 겹쳐 보고, 시간 순서로 놓고, 서로 연결합니다.' }),
      el('li', { text: '3. 기록 탐구 — 질문을 골라 기록을 읽고, 중요한 문장에 밑줄을 긋습니다.' }),
      el('li', { text: '4. 기록 복원 — 근거를 모아 사라진 기록을 되살립니다.' }),
    ]),
    el('p', {
      class: 'visual-note',
      text: '막히면 화면 속 조사원을 눌러 보세요. 다섯 인물의 기록을 모두 복원하면 완료 영상과 역사 기록관 인증서를 받을 수 있어요.',
    }),
  ]);
  openModal({ title: '학생용 가이드', body });
}

function openTeacherGuide(): void {
  const body = el('div', {}, [
    el('p', {
      text: '5~6학년 사회(일제의 식민 통치와 저항)·국어(자료의 타당성 평가, 질문하며 탐구하기) 수업에서 1~2차시 분량으로 활용할 수 있습니다.',
    }),
    el('ul', { class: 'howto-list' }, [
      el('li', { text: '진행: 사건 선택 → 브리핑 → 탐색 → 분석 → 기록 탐구 → 기록 복원' }),
      el('li', { text: '핵심 발문: "이 자료는 한 사람으로 좁혀지는가?" — 공통 자료와 직접 자료의 구별이 이 게임의 중심 사고입니다.' }),
      el('li', { text: '화면의 모든 역사 정보는 검증된 출처(공훈전자사료관·독립기념관 등)에서만 가져왔으며, 각 화면에서 [자료 출처]로 확인할 수 있습니다.' }),
      el('li', { text: '인증서는 A4 세로로 인쇄되며 학교·이름 칸은 빈칸으로 나옵니다. 앱은 개인정보를 저장하지 않습니다.' }),
      el('li', { text: '완료 영상과 역사 기록관 인증서는 다섯 인물의 기록을 모두 복원한 뒤에만 열립니다.' }),
      el('li', { text: '수업 시연·검수용 단계 이동은 [교사용 잠금 해제]에서 비밀번호 입력 후 사용할 수 있습니다.' }),
    ]),
    el('div', { class: 'settings-menu settings-menu--teacher-actions' }, [
      button('성취기준 보기', openStandards, {
        class: 'settings-menu__btn',
      }),
      button(
        isTeacherMode() ? '교사용 도구 열기' : '교사용 잠금 해제',
        openTeacherTools,
        { variant: 'primary', class: 'settings-menu__btn' },
      ),
    ]),
  ]);
  openModal({ title: '교사용 가이드', body });
}

function openStandards(): void {
  const body = el('div', {}, [
    el('div', { class: 'paper-card' }, [
      el('p', {}, [
        el('strong', { text: '[6사06-01] ' }),
        '일제의 식민 통치와 이에 대한 저항이 사회와 생활에 미친 영향을 이해한다.',
      ]),
      el('p', {}, [
        el('strong', { text: '[6국02-03] ' }),
        '글이나 자료를 읽고 내용의 타당성과 표현의 적절성을 평가한다.',
      ]),
      el('p', {}, [
        el('strong', { text: '[6국01-03] ' }),
        '주제와 관련하여 궁금한 내용을 질문하며 적극적으로 듣고 말한다.',
      ]),
    ]),
    el('p', {
      class: 'visual-note',
      text: '성취기준은 설명으로 끝나지 않고 게임 조작(자료 비교·밑줄 근거 찾기·질문 선택)으로 구현되어 있습니다.',
    }),
  ]);
  openModal({ title: '성취기준', body });
}

/** 생성형 AI 고지·저작권 — 자료 출처 목록 위에 함께 붙인다 */
function aiNoticeNodes(): HTMLElement[] {
  return [
    el('p', { class: 'settings-menu__heading', text: '저작권' }),
    el('p', { text: '《기록의 주인》 © 옐샘 & 아이스크림미디어' }),
    el('p', {
      text: '이 프로그램의 구성·화면·데이터의 저작권은 옐샘과 아이스크림미디어에 있습니다. 수업 목적 외의 복제·배포는 허가가 필요합니다.',
    }),
    el('p', { class: 'settings-menu__heading', text: '생성형 AI 사용 고지' }),
    el('p', {
      text: '이 게임의 배경·캐릭터·소품 그림과 일부 연출 이미지는 생성형 AI로 제작한 학습용 시각화이며, 실제 역사 사진이나 사료가 아닙니다.',
    }),
    el('p', {
      text: '화면에 나오는 역사 정보(인물·연도·조직·사건)는 이미지와 무관하게, 아래 출처를 직접 확인해 작성했습니다.',
    }),
    el('p', {
      text: '학생 정보(학교·학년·반·번호·이름)는 앱에 입력하거나 저장하지 않으며, 생성형 AI 이미지 제작에도 사용하지 않습니다.',
    }),
    el('p', {
      class: 'visual-note',
      text: '실제 사료 사진은 아래 기관에서 확인할 수 있습니다.',
    }),
    el('p', { class: 'settings-menu__heading', text: '자료 출처' }),
  ];
}

/* ── 교사용 도구 ─────────────────────────────── */

function openTeacherTools(): void {
  if (isTeacherMode()) {
    void applyTeacherCompletion();
    return;
  }

  const input = el('input', {
    class: 'settings-password',
    type: 'password',
    'aria-label': '교사용 비밀번호',
    placeholder: '비밀번호',
  }) as HTMLInputElement;
  const wrong = el('p', { class: 'settings-note', text: '' });

  const tryUnlock = () => {
    if (input.value.trim().toLowerCase() === TEACHER_PASSWORD) {
      SafeStorage.setJSON(TEACHER_KEY, true);
      void applyTeacherCompletion();
    } else {
      wrong.textContent = '비밀번호가 맞지 않습니다.';
    }
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });

  openModal({
    title: '교사용 잠금 해제',
    body: el('div', { class: 'settings-body' }, [
      el('p', { text: '해제하면 전체 단계가 미션 완료 상태가 되어 모든 화면을 자유롭게 열람할 수 있습니다.' }),
      input,
      wrong,
    ]),
    footer: [
      button('취소', () => closeModal(), { variant: 'ghost' }),
      button('해제', tryUnlock, { variant: 'primary' }),
    ],
    width: 460,
  });
  window.setTimeout(() => input.focus(), 100);
}

/** 해금 즉시 전체 단계를 미션 완료 상태로 만든다 (페이지 선택 없음) */
async function applyTeacherCompletion(): Promise<void> {
  await ensureCaseLoaded();
  GameState.allEvidence.forEach((e) => GameState.addEvidence(e.id));
  const c = GameState.caseData;
  if (c) SaveManager.markCaseComplete(c.id, c.solvedPersonId);
  GameState.persist();
  EventBus.emit('STAGE_COMPLETE', { teacher: true });

  openModal({
    title: '교사용 도구',
    body: el('div', { class: 'settings-body' }, [
      el('p', {
        text: '전체 단계가 미션 완료 상태가 되었습니다. 모든 자료가 확보되었고, 어느 화면이든 자유롭게 열람할 수 있습니다.',
      }),
      el('p', {
        class: 'settings-note',
        text: '설정에서 [인증서 출력]과 [엔딩 다시 보기]를 사용할 수 있습니다. 교사 모드 상태는 이 기기에만 저장됩니다.',
      }),
    ]),
    footer: [
      button(
        '교사 모드 끄기',
        () => {
          SafeStorage.setJSON(TEACHER_KEY, false);
          closeModal();
        },
        { variant: 'ghost' },
      ),
      button('엔딩 화면 보기', () => void goWithCase('reward'), {
        variant: 'primary',
      }),
    ],
    width: 560,
  });
}

async function ensureCaseLoaded(): Promise<void> {
  if (GameState.caseData) return;
  const caseId = SaveManager.get().currentCaseId ?? 'case-001';
  await launchCase(caseId);
}

async function goWithCase(route: 'reward' | 'certificate'): Promise<void> {
  await ensureCaseLoaded();
  closeModal();
  await Router.go(route);
}

function confirmReset(): void {
  openModal({
    title: '기록 초기화',
    body: el('p', {
      text: '이 기기에 저장된 탐구 진행 기록을 모두 지웁니다. 되돌릴 수 없습니다.',
    }),
    footer: [
      button('취소', () => closeModal(), { variant: 'ghost' }),
      button(
        '초기화',
        () => {
          SaveManager.resetAll();
          closeModal();
          void Router.go('title');
        },
        { variant: 'primary' },
      ),
    ],
  });
}
