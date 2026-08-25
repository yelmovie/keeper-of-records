/** 어려운 낱말 풀이 — 자동으로 말풍선을 띄우지 않는다.
 *  기록에서 만난 낱말을 대기열에 담아 두고, 학생이 조사원을 누르면
 *  그때 한 개씩 설명한다. 같은 낱말은 세션에서 한 번만.
 */

const WORDS: Record<string, string> = {
  순국: "'순국'은 나라를 위해 싸우다 목숨을 잃었다는 뜻이야.",
  의거: "'의거'는 나라를 되찾으려고 목숨을 걸고 벌인 일이야.",
  회칙: "'회칙'은 모임의 약속과 규칙을 적어 놓은 글이야.",
  의병: "'의병'은 나라가 위험할 때 백성들이 스스로 만든 군대야.",
  야학: "'야학'은 낮에 일하는 사람들을 위해 밤에 여는 학교야.",
  선서: "'선서'는 여러 사람 앞에서 굳게 약속하는 일이야.",
  유묵: "'유묵'은 돌아가신 분이 남긴 붓글씨야.",
  수형기록표: "'수형기록표'는 감옥에서 사람의 사진과 정보를 적어 둔 카드야.",
  주석: "'주석'은 임시정부를 이끄는 가장 높은 자리야.",
  총사령관: "'총사령관'은 군대 전체를 이끄는 우두머리야.",
  임시정부: "'임시정부'는 나라를 빼앗긴 동안 나라를 대신해 세운 정부야.",
};

const queued = new Set<string>();
const pending: string[] = [];

/** 글 속의 어려운 낱말을 대기열에 담는다 (말풍선을 직접 띄우지 않는다) */
export function explainDifficultWords(text: string): void {
  for (const [word, meaning] of Object.entries(WORDS)) {
    if (queued.has(word) || !text.includes(word)) continue;
    queued.add(word);
    pending.push(meaning);
  }
}

/** 조사원을 눌렀을 때 설명할 낱말 풀이 하나를 꺼낸다. 없으면 null */
export function takeGlossaryHint(): string | null {
  return pending.shift() ?? null;
}
