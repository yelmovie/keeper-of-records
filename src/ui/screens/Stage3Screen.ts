/** PAGE 6 — STAGE 3 기록 탐구
 *  질문을 고르면 기록이 한 글자씩 열리고, 핵심 문장에 직접 밑줄을 그어야 근거가 확보된다.
 *  횟수 제한은 두지 않는다. 책을 읽듯 원하는 만큼 열어 보게 한다.
 */
import { el, button } from '../dom';
import { Router, type Screen } from '../../core/Router';
import { mountTopHud } from '../TopHud';
import { mountGuide } from '../Guide';
import { showMissionIntro } from '../MissionIntro';
import { GameState } from '../../core/GameState';
import { AudioManager } from '../../core/AudioManager';
import { EventBus } from '../../core/EventBus';
import { showToast } from '../Toast';
import { mountEvidenceButton } from '../EvidenceDrawer';
import { playQuoteScene } from '../QuoteScene';
import { explainDifficultWords, takeGlossaryHint } from '../Glossary';
import { getClaims } from '../../data/loaders';
import { measure } from './Stage2Screen';
import type { Stage3Scene } from '../../scenes/Stage3Scene';
import type { InquiryQuestion } from '../../data/schemas';
import { AssetMap } from '../../config/AssetMap';

const CATEGORY_LABEL: Record<InquiryQuestion['category'], string> = {
  place: '지역',
  organization: '조직',
  event: '사건',
  record: '기록',
  relationship: '인물 관계',
};

let offGuide: (() => void) | null = null;

export const Stage3Screen: Screen = {
  phaserScene: 'Stage3Scene',

  mount(overlay: HTMLElement): void {
    const c = GameState.caseData;
    if (!c) {
      void Router.go('archive');
      return;
    }
    AudioManager.playBgm('stage3');
    AudioManager.preload('stage5');
    GameState.setStage(3);

    mountTopHud(overlay, { title: '기록 탐구', stage: 3, back: 'stage2' });
    showMissionIntro(3);

    const inquiry = c.stages.inquiry;

    /** 지금 화면 상태를 보고 다음에 할 일을 짚어 준다 */
    let openQuestion: InquiryQuestion | null = null;
    let keysLeft = 0;
    const liveHints = (): string[] => {
      // 기록에서 만난 어려운 낱말이 있으면 그 풀이부터 말해 준다
      const gloss = takeGlossaryHint();
      if (gloss) return [gloss];
      const unread = inquiry.questions.filter(
        (q) => !GameState.usedQuestionIds.includes(q.id),
      );
      // 기록을 펼쳐 놓고 아직 핵심 문장을 못 찾은 상태가 가장 막히는 지점이다
      if (openQuestion && keysLeft > 0) {
        return [
          `지금 펼친 「${openQuestion.recordTitle}」에서 ${keysLeft}문장을 더 찾아야 해.`,
          '사람을 좁혀 주는 문장은 연도·지명·조직 이름이 함께 나오는 문장이야.',
          '문장을 눌러 봐. 안 그러면 밑줄만 그어지고 넘어가.',
        ];
      }
      if (unread.length > 0) {
        return [
          `아직 안 읽은 질문이 ${unread.length}개 있어. 「${unread[0].prompt}」부터 열어 보자.`,
          '질문마다 열리는 기록이 달라. 몇 개든 열어 봐도 괜찮아.',
        ];
      }
      return [
        '질문을 다 읽었어! 오른쪽 아래 [기록 복원으로]를 눌러 다음으로 가자.',
        '읽은 기록은 다시 눌러서 언제든 되읽을 수 있어.',
      ];
    };

    offGuide = mountGuide(overlay, {
      compact: true,
      large: true,
      imageSrc: AssetMap.char.guideStage3Boy,
      offset: { left: 24, bottom: 110 },
      hints: liveHints,
    });
    const root = el('div', { class: 'inquiry-screen' });

    // ── 좌: 기록 읽기
    const reader = el('section', { class: 'record-reader kr-panel' });
    const readerHead = el('div', { class: 'record-reader__head' }, [
      el('div', { class: 'record-reader__title', text: '기록 열람대' }),
    ]);
    const readerBody = el('div', { class: 'record-reader__body' });
    reader.append(readerHead, readerBody);

    // ── 우: 질문 (조사권 제한 없이 원하는 만큼 열어 본다)
    const sideCol = el('section', { class: 'inquiry-side' });

    const qPanel = el('section', { class: 'kr-panel' }, [
      el('div', { class: 'kr-panel__header', text: '무엇을 확인할까요?' }),
    ]);
    const qBody = el('div', { class: 'kr-panel__body' });
    const qList = el('div', { class: 'question-list' });
    qBody.append(
      el('p', {
        class: 'visual-note',
        text: '질문마다 열리는 기록이 달라요. 궁금한 것부터 골라 읽어 보세요.',
      }),
      qList,
    );
    qPanel.appendChild(qBody);

    sideCol.append(qPanel);
    root.append(reader, sideCol);
    overlay.appendChild(root);

    // ── 하단
    const leftGroup = el('div', {});
    leftGroup.style.display = 'flex';
    leftGroup.style.gap = 'var(--space-md)';
    mountEvidenceButton(leftGroup);

    const nextBtn = button(
      '기록 복원으로',
      () => {
        AudioManager.sfx('uiTap');
        void Router.go('stage4');
      },
      { variant: 'primary', size: 'lg' },
    );
    overlay.appendChild(el('div', { class: 'bottom-nav' }, [leftGroup, nextBtn]));

    // ── 렌더
    const renderReaderEmpty = () => {
      readerBody.replaceChildren(
        el('div', { class: 'reader-empty' }, [
          el('img', {
            class: 'reader-empty__visual',
            src: AssetMap.scene.recordReading,
            alt: '기록을 펼쳐 중요한 문장을 찾는 열람대',
            draggable: 'false',
          }),
          el('p', {
            class: 'reader-empty__lead',
            text: '질문을 골라 기록을 열어 보세요.',
          }),
          el('p', {
            class: 'visual-note',
            text: '중요한 문장을 누르면 근거로 표시됩니다.',
          }),
        ]),
      );
    };

    const renderQuestions = () => {
      qList.replaceChildren();
      inquiry.questions.forEach((q) => {
        const used = GameState.usedQuestionIds.includes(q.id);
        const node = el(
          'div',
          {
            class: `question-node${used ? ' used' : ''}`,
            'data-interactive': 'true',
          },
          [
            el('div', {
              class: 'question-node__cat',
              text: used ? `${CATEGORY_LABEL[q.category]} · 읽었어요` : CATEGORY_LABEL[q.category],
            }),
            el('div', { class: 'question-node__prompt', text: q.prompt }),
          ],
        );
        node.addEventListener('click', () => openRecord(q, !used));
        qList.appendChild(node);
      });
      nextBtn.disabled = GameState.usedQuestionIds.length === 0;
      nextBtn.textContent =
        GameState.usedQuestionIds.length === 0
          ? '먼저 질문을 하나 골라 보세요'
          : '기록 복원으로';
    };

    /** 확보한 evidence에 approved 직접 인용(quoteText)이 있으면 듣기 버튼을 만든다.
     *  인용문은 historical-sources.json의 approved claim에서만 가져온다. */
    const quoteButtonFor = (q: InquiryQuestion): HTMLElement | null => {
      const claims = getClaims();
      for (const evId of q.unlockEvidenceIds) {
        if (!GameState.has(evId)) continue;
        const ev = GameState.getEvidence(evId);
        if (!ev) continue;
        for (const claimId of ev.sourceClaimIds) {
          const claim = claims.get(claimId);
          if (
            claim &&
            claim.status === 'approved' &&
            claim.directQuote &&
            claim.quoteText
          ) {
            const quote = GameState.maskSpoilers(claim.quoteText);
            const sourceName = GameState.maskSpoilers(claim.sourceName);
            const title = ev.title;
            return button(
              '기록의 목소리 듣기',
              () => {
                AudioManager.sfx('uiTap');
                playQuoteScene({ title, quote, sourceName });
              },
              { variant: 'ghost', size: 'sm' },
            );
          }
        }
      }
      return null;
    };

    const appendQuoteButton = (q: InquiryQuestion) => {
      if (readerBody.querySelector('.quote-listen')) return;
      const qb = quoteButtonFor(q);
      if (qb) readerBody.appendChild(el('div', { class: 'quote-listen' }, [qb]));
    };

    const openRecord = (q: InquiryQuestion, spend: boolean) => {
      if (spend) {
        GameState.useQuestion(q.id);
        AudioManager.sfx('questionUnlock');
      } else {
        AudioManager.sfx('paper');
      }
      // 기록에 어려운 낱말이 있으면 조사원이 뜻을 알려 준다
      explainDifficultWords(
        q.recordSentences.map((s) => s.text).join(' '),
      );

      readerHead.replaceChildren(
        el('div', { class: 'record-reader__title', text: q.recordTitle }),
        el('div', {
          class: 'evidence-card__kind',
          text: '중요한 문장을 누르면 밑줄이 그어지고 근거로 저장돼요',
        }),
      );

      const paper = el('div', { class: 'paper-card record-paper' });
      let keysFound = 0;
      const keyTotal = q.recordSentences.filter((s) => s.isKey).length;
      openQuestion = q;
      keysLeft = keyTotal;

      // 기록이 한 글자씩 펼쳐지는 동안에는 문장을 고르지 못하게 한다
      let typing = true;
      const spans: HTMLElement[] = [];
      const finishTyping = () => {
        if (!typing) return;
        typing = false;
        window.clearTimeout(typeTimer);
        spans.forEach((sp, i) => {
          sp.textContent = q.recordSentences[i].text;
          sp.classList.remove('is-typing');
        });
        paper.classList.remove('is-typing');
        // 다 펼쳐진 뒤에 첫 문장만 한 번 깜빡여 "누를 수 있다"고 알린다
        spans[0]?.classList.add('record-sentence--nudge');
      };

      q.recordSentences.forEach((s) => {
        const span = el('span', {
          class: 'record-sentence',
          'data-interactive': 'true',
        });
        spans.push(span);
        span.addEventListener('click', () => {
          if (typing) {
            finishTyping();
            return;
          }
          if (span.classList.contains('confirmed')) return;
          if (s.isKey) {
            span.classList.remove('underlined');
            span.classList.add('confirmed');
            keysFound++;
            keysLeft = Math.max(0, keyTotal - keysFound);
            AudioManager.sfx('evidenceLinked');
            if (keysFound >= keyTotal) grantEvidence(q, paper);
          } else {
            span.classList.toggle('underlined');
            AudioManager.sfx('uiTap');
            // 안내하는 말은 조사원 말풍선으로 보낸다
            EventBus.emit(
              'HINT',
              '표시해 뒀어. 그런데 이 문장만으로는 인물을 좁히기 어려워.',
            );
          }
        });
        paper.append(span, document.createTextNode(' '));
      });

      readerBody.replaceChildren(paper);

      // ── 한 글자씩 펼치기. 아무 데나 누르면 바로 다 보여 준다.
      const CHAR_MS = 26;
      let si = 0;
      let ci = 0;
      let typeTimer = 0;
      const step = () => {
        if (!typing) return;
        const sentence = q.recordSentences[si];
        if (!sentence) {
          finishTyping();
          return;
        }
        const span = spans[si];
        span.classList.add('is-typing');
        ci++;
        span.textContent = sentence.text.slice(0, ci);
        if (ci >= sentence.text.length) {
          span.classList.remove('is-typing');
          si++;
          ci = 0;
          typeTimer = window.setTimeout(step, 260);
          return;
        }
        typeTimer = window.setTimeout(step, CHAR_MS);
      };

      paper.classList.add('is-typing');
      paper.addEventListener('click', () => finishTyping());
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishTyping();
      } else {
        typeTimer = window.setTimeout(step, 380);
      }

      appendQuoteButton(q); // 이미 확보한 기록을 다시 열람하는 경우
      renderQuestions();
    };

    const grantEvidence = (q: InquiryQuestion, paper: HTMLElement) => {
      const gained: string[] = [];
      q.unlockEvidenceIds.forEach((id) => {
        if (GameState.addEvidence(id)) {
          const ev = GameState.getEvidence(id);
          if (ev) gained.push(ev.title);
        }
      });

      const rect = measure(paper);
      (Router.getScene('Stage3Scene') as Stage3Scene | null)?.playUnlock(
        rect.x + rect.w / 2,
        rect.y + rect.h / 2,
      );

      AudioManager.sfx('questionUnlock');
      showToast(
        gained.length > 0
          ? `${q.resultSummary} — 새 기록: ${gained.join(', ')}`
          : q.resultSummary,
        { kind: 'feedback', duration: 5200 },
      );

      paper.appendChild(
        el('p', {
          class: 'visual-note',
          text: q.resultSummary,
        }),
      );
      appendQuoteButton(q); // 방금 확보한 기록에 직접 인용이 있으면 노출
      renderQuestions();
    };

    renderReaderEmpty();
    renderQuestions();
  },

  unmount(): void {
    offGuide?.();
    offGuide = null;
  },
};
