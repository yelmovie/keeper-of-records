/** PAGE 10 — 역사 기록관 인증서
 *  개인정보는 저장하지 않는다. 학년·반·번호·이름은 모두 빈칸으로 인쇄한다.
 */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../core/AudioManager';
import { AssetMap } from '../../config/AssetMap';
import { SaveManager } from '../../core/SaveManager';
import {
  ACTIVE_CASE_COUNT,
  completedActiveCaseCount,
} from '../../config/PersonStages';

let offGuide: (() => void) | null = null;

/** 이름은 sessionStorage에만 둔다 — 탭을 닫으면 사라지고 localStorage에는 남지 않는다 */
const CERT_NAME_KEY = 'keeper-cert-name';

export const CertificateScreen: Screen = {
  mount(overlay: HTMLElement): void {
    const c = GameState.caseData;
    if (
      !c ||
      completedActiveCaseCount(SaveManager.get().completedCaseIds) <
        ACTIVE_CASE_COUNT
    ) {
      void Router.go('archive');
      return;
    }
    AudioManager.playBgm('main');
    mountTopHud(overlay, { title: '역사 기록관 인증서', back: 'reward' });

    offGuide = mountGuide(overlay, {
      compact: true,
      hints: [
        '인쇄하기를 누르면 A4 세로로 나와요. 이름은 미리 적거나, 인쇄한 뒤 직접 써도 돼요.',
        '기록을 끝까지 복원한 사람만 받는 인증서예요. 축하해요!',
      ],
    });

    const cert = buildCertificate();

    // 인쇄 전용 루트에도 같은 인증서를 넣는다
    const printRoot = document.getElementById('certificate-print-root');
    if (printRoot) {
      printRoot.replaceChildren(buildCertificate());
    }

    // 이름 미리 넣기(선택) — 세션에만 두고 localStorage에는 저장하지 않는다
    const nameInput = el('input', {
      class: 'cert-name-input',
      type: 'text',
      maxlength: '12',
      placeholder: '이름 (선택)',
      'aria-label': '인증서에 표시할 이름',
      autocomplete: 'off',
    });
    nameInput.value = sessionStorage.getItem(CERT_NAME_KEY) ?? '';
    const applyName = () => {
      const v = nameInput.value.trim();
      document
        .querySelectorAll('.cert-field--name .cert-field__blank')
        .forEach((blank) => {
          blank.textContent = v;
        });
    };
    nameInput.addEventListener('input', () => {
      try {
        sessionStorage.setItem(CERT_NAME_KEY, nameInput.value);
      } catch {
        /* 시크릿 모드 등 저장 불가 시 무시 */
      }
      applyName();
    });

    const options = el('aside', { class: 'cert-options' }, [
      el('div', { class: 'cert-options__title', text: '인증서 출력' }),
      el('p', {
        class: 'cert-options__desc',
        text: 'A4 세로로 인쇄돼요. 학교·학년·반·번호는 인쇄한 뒤 인증서에 직접 적어 주세요.',
      }),
      nameInput,
      el('p', {
        class: 'cert-options__note',
        text: '이름은 저장되지 않아요. 이 화면에서만 잠깐 쓰여요.',
      }),
      button(
        '인쇄하기',
        () => {
          AudioManager.sfx('uiTap');
          window.print();
        },
        { variant: 'primary', size: 'lg' },
      ),
      button('다음 기록 고르기', () => void Router.go('archive')),
      button('처음으로', () => void Router.go('title'), { variant: 'ghost' }),
    ]);

    const root = el('div', { class: 'certificate-screen' }, [
      options,
      el('div', { class: 'cert-preview-wrap' }, [cert]),
    ]);

    overlay.appendChild(root);
    // 세션에 남아 있던 이름을 미리보기·인쇄본 양쪽에 반영
    applyName();
  },

  unmount(): void {
    offGuide?.();
    offGuide = null;
    document.getElementById('certificate-print-root')?.replaceChildren();
  },
};

function buildCertificate(): HTMLElement {
  const cert = el('div', { class: 'certificate' });
  cert.appendChild(
    el('img', {
      class: 'certificate__frame',
      src: AssetMap.ui.certificateFrame,
      alt: '',
      draggable: 'false',
      'aria-hidden': 'true',
    }),
  );

  cert.appendChild(
    el('div', { class: 'certificate__title', text: '역사 기록관 인증서' }),
  );
  cert.appendChild(
    el('div', { class: 'certificate__subtitle', text: '기록의 주인' }),
  );
  cert.appendChild(el('div', { class: 'certificate__rule' }));

  // 빈칸
  const fields = el('div', { class: 'certificate__fields' }, [
    certField('학교', 'school'),
    certField('학년', 'grade'),
    certField('반', 'class'),
    certField('이름', 'name'),
    certField('번호', 'number'),
  ]);
  cert.appendChild(fields);

  cert.appendChild(
    el('div', { class: 'certificate__body' }, [
      el('p', { text: '위 학생은 《기록의 주인》의 다섯 인물 탐구를 모두 마치고,' }),
      el('p', { text: '여러 자료를 스스로 비교하고 연결하여 지워졌던 기록의 주인들을' }),
      el('p', { text: '근거를 바탕으로 복원하였기에 이 인증서를 드립니다.' }),
    ]),
  );

  // 복원한 다섯 인물 — 이름과 핵심 한 줄만
  const people = el('div', { class: 'certificate__people' });
  people.appendChild(
    el('div', { class: 'certificate__people-heading', text: '복원한 다섯 인물' }),
  );
  PERSON_HIGHLIGHTS.forEach(({ id, core }) => {
    const p = GameState.people.get(id);
    people.appendChild(
      el('div', { class: 'certificate__person-row' }, [
        el('strong', { class: 'certificate__person-name', text: p?.displayName ?? '' }),
        el('span', { class: 'certificate__person-life', text: p?.lifeText ?? '' }),
        el('span', { class: 'certificate__person-core', text: core }),
      ]),
    );
  });
  cert.appendChild(people);

  cert.appendChild(
    el('div', { class: 'certificate__foot' }, [
      el('div', { class: 'certificate__issuer', text: '기록의 주인 · 역사 기록관' }),
    ]),
  );

  return cert;
}

/** 인증서에 적는 인물별 핵심 한 줄 (탐구 순서대로) */
const PERSON_HIGHLIGHTS: { id: string; core: string }[] = [
  { id: 'yunbonggil', core: '야학과 월진회, 훙커우공원 의거 (1932)' },
  { id: 'kimgu', core: '임시정부 첫 경무국장에서 1940년 주석까지' },
  { id: 'yugwansun', core: '아우내 장터 만세 시위와 옥중 만세 (1919~1920)' },
  { id: 'ahnjunggeun', core: '하얼빈역 의거와 『동양평화론』 (1909~1910)' },
  { id: 'ahnchangho', core: '신민회·대성학교·흥사단 — 사람을 기른 힘' },
];

function certField(
  label: string,
  size: 'school' | 'grade' | 'class' | 'name' | 'number',
): HTMLElement {
  return el('div', { class: `cert-field cert-field--${size}` }, [
    el('span', { class: 'cert-field__label', text: label }),
    el('span', { class: 'cert-field__blank' }),
  ]);
}
