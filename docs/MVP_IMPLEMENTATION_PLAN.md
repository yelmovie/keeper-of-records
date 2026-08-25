# 《기록의 주인》 MVP 구현 계획

`docs/MVP_AUDIT.md`의 조사 결과를 전제로 한 구현 계획. 이 문서의 내용은 이미 구현을 마쳤으며, 각 항목 끝에 실제 결과를 적었다.

---

## 0. 판단의 기준

자료가 충돌할 때의 우선순위: **approved 역사 source/claim > PRD > TRD > README > pagesample**.

pagesample에서 가져오는 것은 색감·밀도·hierarchy·구도뿐이다. 이미지 안 한글은 역사 데이터로 쓰지 않는다. 감사 과정에서 샘플 이미지에 "1926 한인애국단 조직"(실제 1931년) 같은 실제 오류가 있음을 확인했으므로 이 원칙은 선택이 아니라 필수다.

## 1. CASE 결정

**Case 001 「상하이에 남은 기록」 / 정답 인물: 윤봉길**

PRD 예시 목록에서 고른 제목이다. 인물명을 노출하지 않는다.

이렇게 정한 근거:

1. **검증 가능한 직접 근거가 6개 확보된다** — 예산 출생, 야학·『농민독본』, 월진회 회장(1929), 혈서 선서문(1932.4.26, 보물), 훙커우 의거(1932.4.29), 가나자와 순국(1932.12.19). 최종 판단에 근거 3개 이상을 요구하려면 이만한 밀도가 필요하다.
2. **공통 자료가 자연스럽게 생긴다** — 상하이, 임시정부, 한인애국단, 회중시계는 김구와 윤봉길 모두에게 걸린다. "한 단서 = 한 인물" 구조를 피하는 데 최적이다.
3. **김구 vs 윤봉길 비교가 서열이 아니라 역할 차이로 성립한다** — 조직을 만든 사람과 조직에 들어가 실행한 사람. "누가 더 위대한가"가 아니라 "이 자료는 누구와 직접 연결되는가"를 묻게 된다.
4. **시계 교환 기억 장면이 이 CASE 안에서 필연적이다** — 저장소에 16:9 시계 교환 이미지가 있고, 교환 사실과 방향이 백과사전 「윤봉길 의사 유품」으로 확인된다.

후보 6인은 PRD 그대로: 김구·윤봉길·유관순·안중근·안창호·김좌진. 기록소의 6개 상자는 모두 처음부터 선택할 수 있으며, 각 상자는 한 인물의 기록 트랙에 연결된다.

**결과:** `public/data/cases/case-001.json` — 근거 17개(direct 10 / shared 6 / context 1).

## 2. 아키텍처

```txt
#app
 └ #stage (1600×900 논리 무대, JS가 transform scale)
    ├ #phaser-root   z-index 1    — 공간·조작·연출
    ├ #ui-overlay    z-index 100  — 텍스트·버튼·패널 (pointer-events: none, 조작 요소만 auto)
    ├ #modal-layer   z-index 1000 — 모달·기억 조각
    └ #transition-veil z-index 1500
```

- **Router**가 10개 route를 관리한다. 화면 전환 시 ① 토스트·모달 정리 → ② 이전 Screen unmount → ③ overlay 비우기 → ④ 이전 Phaser Scene 정지 → ⑤ 새 Scene 시작 → **⑥ Scene의 `create()` 완료를 기다린 뒤** → ⑦ DOM Screen mount 순서로 진행한다. ⑥이 없으면 DOM 화면이 아직 만들어지지 않은 Scene 객체를 건드려 깨진다(실제로 겪었고 이 대기 로직으로 해결했다).
- **EventBus**로만 Phaser ↔ DOM이 통신한다. Scene 안에서 `document.querySelector`나 `innerHTML`을 쓰지 않는다.
- **Phaser input은 `windowEvents: false`** — 기본값(window 단위 수신)이면 Phaser가 `preventDefault()`를 걸어 DOM 오버레이 버튼의 `click`이 사라진다. 실제로 이 문제로 화면 전환이 막혔다.

**결과:** `src/core/{Router,EventBus,GameState,SaveManager,SafeStorage,AudioManager,Viewport,DevHooks}.ts`

## 3. Interaction Registry — 1년 유지 구조의 핵심

Case JSON의 `hotspot.interaction` 문자열로 조작 모듈을 고른다. 새 조작을 추가하려면 파일 하나를 만들고 `src/systems/interactions/index.ts`에 한 줄 등록하면 된다.

| 키 | 모듈 | 조작 | 랜덤 클릭 방지 |
|---|---|---|---|
| `drawer` | `DrawerInteraction` | 손잡이를 아래로 끌어 당김 | 임계 62% 미만이면 되돌아감. 탭만 하면 조작 방법 안내 |
| `envelope` | `EnvelopeInteraction` | 봉인을 가로로 밀어 뜯음 | 임계 50% |
| `flip` | `FlipInteraction` | 가로로 돌려 뒷면 확인 | scaleX 기반, 55% 넘겨야 확정 |
| `rub` | `RubInteraction` | RenderTexture erase로 실제로 문지름 | 62% 이상 걷어내야 완료 |
| `rotate` | `RotateInteraction` | 좌우로 돌려 반대편 관찰 | 누적 회전량 190 필요 |
| `puzzle` | `PuzzleInteraction` | 조각 4개를 제자리에 스냅 | 4조각 전부 |
| `tap` | `TapInteraction` | 단순 관찰 (단서가 아닌 물건에도 사용) | 400ms 연속 탭 차단 |

공통 규칙: **반짝임으로 정답을 표시하지 않는다.** 이름표는 hover/근접 시에만 뜨고 조작 방법만 알려 준다. 조사한 물건에만 사후 확인 표시가 붙는다.

**결과:** 7개 모듈 구현. `validate-history.mjs`가 CASE마다 서로 다른 조작 3종 이상, 단서가 아닌 물건 1개 이상을 강제한다.

## 4. 페이지별 구성 — 같은 카드 레이아웃을 반복하지 않는다

| Page | Composition | Phaser | DOM |
|---|---|---|---|
| 1 타이틀 | 좌우 인물 + 중앙 제목 | parallax, 기록 조각, 기록 렌즈 반응, 5.4초 기록 소실 프롤로그 | 무궁화 SVG, 제목, 시작/이어하기, 하단 정보 바 |
| 2 기록소 | 가로 회랑 | 카메라 pan, 서랍 열림 tween | 좌측 안내문 + 우측 상세 패널 |
| 3 브리핑 | 3분할 + 하단 인물 열람대 | 조명 흔들림, 안내 인물 | 목표 체크리스트 / 실루엣 / 초기 자료 / 후보 6인 |
| 4 흔적 탐색 | 공간 중심 (가로 2900px) | 카메라 pan + 조작 10개 | 우측 자료 레일, 좌하단 안내 말풍선 |
| 5 자료 분석 | 3분할 분석 데스크 | 겹쳐 보기 · 시간 배치 · 관계 잇기 | 기록 목록 / 탭 / 확인한 사실 |
| 6 기록 탐구 | 읽기 + 질문 | 해금 연출만 | 대형 기록 열람대(밑줄), 조사권 3, 질문 5 |
| 7 인물 비교 | 3 zone + 하단 연결판 | 탐구 연결판 (기둥 3개 + 축) | A / 공통 / B 드롭 존, 자료 트레이 |
| 8 기록 복원 | 3단계 ritual | PHASE A 시간축 · PHASE B 관계망 · 복원 연출 | 단계 레일, PHASE C 5슬롯 |
| 9 복원 완료 | cinematic | 인물 등장, 기록 조각 수렴 | 인물 파일, SVG 인장, 의미 문장 |
| 10 인증서 | 인쇄 문서 | 없음 | A4 인증서 + 출력 옵션 |

**결과:** 페이지마다 grid 구성이 다르다. 반복되는 흰 둥근 카드는 없다.

## 5. 사고 단계 설계

각 Stage는 서로 다른 조작 3개 이상 + 사고 과제 2단계 이상을 갖는다.

| Stage | 조작 | 사고 1 | 사고 2 |
|---|---|---|---|
| 1 | drawer·envelope·flip·rub·rotate·puzzle·tap (7종) | 무엇이 단서이고 무엇이 아닌가 | 찾은 사실이 인물을 특정하는가 |
| 2 | 스크럽 겹치기 · 시간 배치 · 노드 연결 | 두 기록의 공통점 찾기 | 순서와 관계로 이야기 구성 |
| 3 | 질문 선택 · 문장 밑줄 · 근거 해금 | 어떤 질문이 지금 가설을 검증하는가 | 어느 문장이 결정적인가 |
| 4 | 카드 분류 드래그 · 관계판 성장 | 이 자료는 누구와 직접 연결되는가 | 공통 자료와 직접 자료 구별 |
| 5 | 시간축 배치 · 관계 연결 · 슬롯 선택 | 활동의 순서 | 조직을 만든 사람 vs 들어간 사람 |

**핵심 로직 — 사실 ≠ 결정적 근거.** `strength: shared` 자료는 반드시 2명 이상과 연결되고, `direct`는 정확히 1명과 연결된다. 검증 스크립트가 이를 강제한다. 공통 영역에 놓으면 "여러 인물과 연결되는 자료입니다. 추가 근거가 필요합니다."라고 안내한다.

## 6. 역사 데이터 파이프라인

```txt
공훈전자사료관 / 독립기념관 / 한국민족문화대백과사전 / 우리역사넷 / 국가유산청
    ↓ 직접 조회
HistoricalClaim (id, claim, source, status)
    ↓ status === 'approved' 만
EvidenceData.sourceClaimIds → 학생 화면
```

- `status !== 'approved'`인 claim은 화면에 나가지 않는다. `SourceModal`이 런타임에서 한 번 더 거른다.
- `directQuote: true`인 claim은 `quoteText`와 출처가 반드시 있어야 한다.
- 모든 evidence·epilogue 항목은 출처 claim을 1개 이상 가져야 한다.

**결과:** claim 45건(approved 43). 검증 스크립트가 위 3가지를 전부 검사하고 위반 시 빌드를 막는다.

## 7. 감정선

BGM: main(기억) → stage1(탐색) → stage2(분석) → stage3(성찰) → stage4(결의) → stage5(복원).

복원 순간 연출 (`Stage5Scene.playRestoration`):

```txt
0.0s  화면이 어두워진다
0.7s  0.5초 정적 뒤 깊은 북 한 번 (72Hz+48Hz 합성) + 미세한 화면 진동
1.0s  기록 조각 34개가 화면 밖에서 중앙으로 모인다
2.9s  금빛이 퍼지며 조각이 하나로 사라진다
4.6s  화면이 완전히 덮이고 복원 완료 화면으로
```

폭죽·코인·별 3개는 쓰지 않는다. 보상은 인물 파일 해금 + 기록 복원 인장 + 인증서다.

**기억 조각(시계 교환)** — Stage 3의 인물 관계 질문 또는 Stage 4 완료로 `ev-sigye-gyohwan`을 얻으면 해금된다. 2.5D parallax + camera push-in(7.5초, transform-origin을 시계 위치로). 내레이션은 확인된 사실 4줄뿐이고 창작 대사는 없다. 하단에 [자료 출처 보기]를 제공하며, 언제든 [건너뛰기]로 빠져나올 수 있다.

## 8. 반응형

- 논리 무대 1600×900 고정 + `transform: scale(min(w/1600, h/900))`. 4:3에서는 레터박스가 생기고 UI는 잘리지 않는다.
- `--app-height`를 `visualViewport.height` 기준으로 갱신해 브라우저별 실제 높이 차이를 흡수한다.
- 세로 모드에서는 `#rotate-guard`가 가로 전환을 안내한다.
- 터치 타깃 최소 44px (`--touch-min`), 주요 버튼 48~58px.

## 9. 검증

```bash
npm run verify   # test → validate:data → validate:assets → build
```

`validate-history.mjs`가 검사하는 것: claim/인물/조직/근거 참조 무결성, approved 노출 규칙, 직접 인용 형식, 금지 표현(용의자·범인·심문·검거·혐의), "틀렸습니다" 형태 피드백, shared/direct 인물 수 규칙, 조작 3종 이상, 단서 아닌 물건 존재, 조사권 < 질문 수, 질문별 해금 자료 상이, timeline 정답 구성 일치, connect 오답 짝 존재, 슬롯별 정답 1개·오답 피드백 필수, 정답 인물 direct 근거 수 ≥ minEvidenceCount.

`validate-assets.mjs`: AssetMap 경로 실재 확인, 배경 400 KB·캐릭터 300 KB 상한, 첫 화면 에셋 합계 상한.

`scripts/screenshot.mjs`: Playwright로 10페이지를 실제로 주파하며 스크린샷을 남기고 콘솔 오류·실패 요청을 수집한다.

## 10. 이번 MVP 범위 밖

| 항목 | 사유 |
|---|---|
| CASE 002~006 본편 | 하나를 깊게 만드는 편이 낫다. 데이터 기반 잠금 상태로 등록 |
| 인물 도감 20~30명 | 데이터 구조는 열려 있으나 화면은 미구현 |
| 교사용 수업 모드 | 별도 요구사항 |
| GLB 3D | 2.5D로 충분하다고 판단. TRD도 MVP에서는 회전 프레임으로 충분하다고 명시 |
| pinch 조작 | Registry 자리는 있으나 모듈 미구현. 해당 근거는 다른 경로로 획득 가능 |

## 11. 새 CASE 추가 절차

1. `public/data/cases/case-00N.json` 작성
2. 필요한 claim을 `historical-sources.json`에 추가 (`status: approved`)
3. 인물·조직이 없으면 `people.json` / `organizations.json`에 추가
4. `catalog.json`에서 해당 항목을 `available`로
5. 새 이미지가 필요하면 `scripts/prepare-assets.mjs`에 한 줄 + `AssetMap.ts`에 등록
6. `npm run verify`

**Scene 코드는 건드리지 않는다.** 인물별 하드코딩은 없다.
