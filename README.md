# 기록의 주인 | Keeper of Records

> 사라진 기록을 복원하라 — 초등 5~6학년 한국사 기록 복원형 탐구 게임

학생은 미확인 인물이 남긴 문서·사진·물건·조직·사건을 직접 찾고, 비교하고, 연결해서 **"이 기록의 주인은 누구인가"**를 스스로 밝혀낸다. 정답을 맞히는 퀴즈가 아니라, 근거를 모아 기록을 되살리는 탐구다.

```txt
흔적 탐색 → 자료 분석 → 기록 탐구 → 인물 비교 → 기록 복원
        → 인물 파일 해금 + 역사 기록관 인증서 출력
```

## 실행

```bash
npm install
npm run dev      # http://localhost:5641
npm run verify   # test → validate:data → validate:assets → build
npm run build
```

에셋을 다시 만들어야 할 때 (원본 PNG → WebP 변환):

```bash
node scripts/prepare-assets.mjs
```

10페이지를 실제로 주파하며 스크린샷을 남기고 콘솔 오류를 수집:

```bash
node scripts/screenshot.mjs http://localhost:5641 1600 900
```

## 구조

```txt
public/
  assets/{bg,char,scene,prop,ui,reward,audio}/   변환된 사용 에셋만
  data/
    catalog.json            사건 목록
    people.json             인물
    organizations.json      조직
    historical-sources.json HistoricalClaim (출처·검수 상태)
    cases/case-001.json     CASE 데이터
src/
  core/       EventBus · Router · GameState · SaveManager · AudioManager · Viewport
  scenes/     Phaser 9개 (공간·조작·연출)
  ui/
    screens/  DOM 10개 (텍스트·버튼·패널·인증서)
    styles/   tokens · base · components · screens · certificate
  systems/interactions/   조작 모듈 7종 (Interaction Registry)
  data/       schemas.ts · loaders.ts
  config/     AssetMap.ts (에셋 경로 단일 관리)
scripts/      prepare-assets · validate-history · validate-assets · screenshot
docs/         MVP_AUDIT.md · MVP_IMPLEMENTATION_PLAN.md · screens/
```

**Phaser**는 공간·드래그·문지르기·회전·퍼즐·선 연결·타임라인·복원 연출을 맡고,
**DOM/CSS**는 텍스트·버튼·기록 원문·질문·모달·출처·인증서·인쇄를 맡는다.
둘은 `EventBus`로만 통신한다. 텍스트를 이미지에 굽지 않으므로 오타 수정, 역사 검수 반영, 반응형, 접근성이 모두 가능하다.

## 교육과정

| 성취기준 | 게임 안에서 |
|---|---|
| [6사06-01] 일제의 식민 통치와 이에 대한 저항이 사회와 생활에 미친 영향을 이해한다 | 인물의 활동을 업적 목록이 아니라 조직·사건·지역·역할의 관계로 탐구 |
| [6국02-03] 글이나 자료를 읽고 내용의 타당성과 표현의 적절성을 평가한다 | 공통 자료와 결정적 근거를 구별, 자료 간 대조, 출처 확인 |
| [6국01-03] 주제와 관련하여 궁금한 내용을 질문하며 적극적으로 듣고 말한다 | 조사권 3회로 질문 5개 중 3개를 스스로 선택 |

## 역사 데이터 규칙

- 화면에 나가는 모든 역사 정보는 `HistoricalClaim`을 근거로 하며, **`status: "approved"`가 아니면 노출되지 않는다.** 런타임(`SourceModal`)과 검증 스크립트에서 이중으로 막는다.
- 출처는 국가보훈부 공훈전자사료관, 독립기념관, 한국민족문화대백과사전, 국사편찬위원회 우리역사넷, 국가유산청 자료만 사용한다.
- 검증되지 않은 발언은 직접 인용하지 않는다. 확인 중인 항목은 `docs/MVP_AUDIT.md`의 TODO_HISTORY_REVIEW에 남긴다.
- 생성 이미지로 만든 인물 그림은 초상 사진으로 제시하지 않는다. `학습용 시각화`임을 화면에 명시하고 실제 사진의 소재는 출처로 안내한다.
- 일본 제국주의의 침략과 식민 통치라는 맥락을 흐리지 않는다. 동시에 현대 일본인 전체로 확장하지 않는다. 비판 대상은 당시의 침략·탄압 주체로 한정한다.
- 독립운동가에게 `용의자·범인·심문·검거·혐의`를 쓰지 않는다. 검증 스크립트가 이 단어들을 데이터 전체에서 차단한다.

`npm run validate:data`는 참조 무결성과 노출 규칙만 검사한다. **역사적 사실의 진위는 자동 검증되지 않으므로 배포 전 사람의 최종 검수가 필요하다.**

## 저장

`localStorage` 키 `keeper-of-records:v1`. 진행 단계, 확보한 근거, 사용한 질문, 표시한 후보, 설정을 저장한다.
**학생의 이름·학년·반·번호는 저장하지 않는다.** 인증서는 전부 빈칸으로 인쇄된다.

## 새 CASE 추가

`case-00N.json` + 필요한 claim/인물/조직 + 에셋을 추가하고 `catalog.json`을 `available`로 바꾸면 된다. Scene 코드는 재사용하며 인물별 하드코딩은 없다. 자세한 절차는 `docs/MVP_IMPLEMENTATION_PLAN.md` 11절.

---

> 역사는 맞히는 문제가 아니라, 근거를 통해 이해하고 기억하는 기록이다.
