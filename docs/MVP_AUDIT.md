# 《기록의 주인》 MVP 감사 보고서

작성 시점 기준 저장소 전수 조사 결과. 추정이 아니라 실제 파일명을 확인해 작성했다.

---

## 1. 현재 프로젝트 기술 스택

조사 시작 시점의 저장소에는 **코드가 한 줄도 없었다.** 원본 저장소는 다음 7개 항목이 전부였다.

| 항목 | 내용 |
|---|---|
| `data/` | PRD·TRD·README 마크다운 3개 |
| `background/` | 배경 후보 PNG 27개 |
| `assets/` | 캐릭터·소품·보상 후보 PNG 130개 |
| `3d assets/` | 3D 스타일 렌더 PNG 13개 |
| `samplepages/` | 화면 목업 PNG 50개 |
| `sound/` | BGM MP3 6개 (+ 빈 `bfx/` 폴더) |
| `og.png` | 타이틀 키 아트 PNG 1개 (2.29 MB) |

`package.json`, `src/`, `public/`, `node_modules`, `.git`, `README.md`(루트), `docs/`, `scripts/`는 **존재하지 않았다.**
따라서 TRD가 지정한 스택(Vite + TypeScript + Phaser 3 + DOM/CSS Overlay)을 이번에 처음부터 구축했다.

**현재 스택 (구축 후)**

```txt
Vite 6 · TypeScript 5 (strict) · Phaser 3.90 · DOM/CSS Overlay
Vitest (단위 테스트) · Playwright (화면 캡처 QA) · sharp (에셋 변환)
localStorage · WebAudio(합성 SFX) + HTMLAudio(BGM)
백엔드 없음
```

## 2. 현재 실행 가능한 상태

| 명령 | 결과 |
|---|---|
| `npm install` | 통과 |
| `npm run dev` | 통과 (http://localhost:5641) |
| `npm run test` | 18/18 통과 |
| `npm run validate:data` | 통과 (TODO 2건 보고) |
| `npm run validate:assets` | 통과 |
| `npm run build` | 통과 (`tsc --noEmit && vite build`) |
| Playwright 10페이지 주파 | 통과, 콘솔 오류 0 · 실패 요청 0 |

## 3. 페이지 / Scene 목록

조사 시점: **0개** (구현 없음).
구축 후 10페이지 / Phaser Scene 9개 / DOM Screen 10개.

| Page | Route | Phaser Scene | DOM Screen |
|---|---|---|---|
| 1 타이틀 | `title` | `TitleScene` | `TitleScreen` |
| 2 사건 기록소 | `archive` | `ArchiveScene` | `ArchiveScreen` |
| 3 사건 브리핑 | `briefing` | `BriefingScene` | `BriefingScreen` |
| 4 Stage 1 흔적 탐색 | `stage1` | `Stage1Scene` | `Stage1Screen` |
| 5 Stage 2 자료 분석 | `stage2` | `Stage2Scene` | `Stage2Screen` |
| 6 Stage 3 기록 탐구 | `stage3` | `Stage3Scene` | `Stage3Screen` |
| 7 Stage 4 인물 비교 | `stage4` | `Stage4Scene` | `Stage4Screen` |
| 8 Stage 5 기록 복원 | `stage5` | `Stage5Scene` | `Stage5Screen` |
| 9 기록 복원 완료 | `reward` | `RewardScene` | `RewardScreen` |
| 10 인증서 | `certificate` | (없음, DOM 전용) | `CertificateScreen` |

## 4. 발견한 배경 이미지 목록 — `background/` 27개 + `og.png`

모두 1672×941 (약 16:9). 두 묶음으로 나뉜다.

**A묶음 (오전 11_51, 10장)** — 회화풍 반실사, 한국색이 뚜렷하다(태극기, 한옥 스카이라인, 한반도 지도). 사용 대상은 전부 여기서 나왔다.

| 원본 파일명 | 내용 | 채택 |
|---|---|---|
| `…오전 11_51_01 (1).png` | 보름달·태극기·한옥 도시 원경, 중앙 하늘이 비어 있음 | ✅ `bg/title.webp` |
| `…오전 11_51_01 (2).png` | 기록보관실 회랑, 조명 받는 빈 벽면 3개 | ✅ `bg/archive.webp` |
| `…오전 11_51_01 (3).png` | 조사실 정면, 자료 책상·붉은 실 연결판·태극기 | ✅ `bg/stage1.webp` |
| `…오전 11_51_29 (4).png` | 밤의 다락 서재, 왼쪽이 비어 있어 대화 영역 확보 | ✅ `bg/briefing.webp` |
| `…오전 11_51_29 (5).png` | 분석실, 빛나는 라이트테이블 | ✅ `bg/stage2.webp` |
| `…오전 11_51_29 (6).png` | 기록 열람 코너, 가장 넓은 빈 벽 | ✅ `bg/stage3.webp` |
| `…오전 11_51_29 (7).png` | 좌우 금테 액자 2개 + 중앙 대장 — 비교 화면용 구도 | ✅ `bg/stage4.webp` |
| `…오전 11_51_29 (9).png` | 헌정 제단, 실루엣 초상, 무궁화 | ✅ `bg/reward.webp` |
| `…오전 11_51_38 (10).png` | 한옥 서재, 대형 빈 한지 판 | ✅ `bg/stage5.webp` |
| `…오전 11_51_29 (8).png` | 궁전 홀 — **중국식 처마·팔각 문양** | ❌ |

**B묶은 (오후 05_05, 10장)** — 애니풍 궁전 도서관. 월문(moon gate)·중국식 처마·회(回)자 격자·술 달린 현수막이 뚜렷해 대부분 배제했다.

| 원본 파일명 | 판정 |
|---|---|
| `…오후 05_05_16 (10).png` | ✅ `bg/certificate.webp` (정면 한지 판, 동아시아 공통 화문 정도) |
| 나머지 9장 | ❌ 중국풍 또는 중복 |

**`og.png`** (1774×887) — "기록의 주인" 금색 제목이 박힌 키 아트. 2.29 MB라 그대로 쓰면 번들에 통째로 들어가므로 1200px PNG로 압축해 `public/og.png`(385 KB)로 재생성했다. OG/썸네일 전용이며 게임 화면에는 쓰지 않는다(제목이 이미지에 박혀 있어 수정·번역이 불가능하기 때문).

## 5. 발견한 캐릭터 에셋 목록

**`3d assets/` 13개** — 3D 렌더 및 2.5D 일러스트.

| 원본 파일명 | 내용 | 채택 |
|---|---|---|
| `…오후 05_07_34.png` | **가로 16:9. 흰 두루마기 노년 + 갈색 정장 청년의 회중시계 전달 장면.** 벽에 태극기, 창밖 1930년대 도시 | ✅ `scene/memory-watch.webp` — 기억 조각 2.5D |
| `…오후 12_08_24 (1).png` | 흰 두루마기 + 둥근 안경 노년 남성, **알파 배경** | ✅ `char/figure-elder.webp` |
| `…오후 12_08_25 (2).png` | 갈색 정장 청년, 중절모, **알파 배경** | ✅ `char/figure-young.webp` |
| `…오후 05_07_23 (10).png` | 흰 저고리·먹색 치마, 문서를 안은 기록 담당자 | ✅ `char/guide-archivist.webp` — 브리핑 안내 인물 |
| `…오후 05_07_17 (2).png` | 세로형 시계 교환 (배경 단색) | 보류 (대체안) |
| `…오후 05_07_04 (4)`, `05_07_05 (6)`, `05_07_18 (3)`, `05_07_21 (8)`, `05_07_18 (4)` | A포즈 참고용 렌더, 만세 장면 | 미사용 |
| `…오후 05_07_20 (6).png` | **중산복(中山服)** 차림 | ❌ 중국풍 |
| `…오후 05_07_19 (5).png` | 국적 불명 군복 + 소총 겨눔 | ❌ (초등 대상 부적절 + 국적 모호) |
| `…오후 05_07_17 (1).png` | 연설 장면 — 손 해부 오류 | ❌ |

**`assets/` 130개 중 캐릭터**

| 원본 파일명 | 내용 | 채택 |
|---|---|---|
| `assets/source/characters/investigator-girl-source.png` | 꽃무늬 한복 차림의 여학생 기록 조사원 | ✅ `char/investigator-girl.webp` |
| `assets/source/characters/investigator-boy-source.png` | 두루마리를 든 남학생 기록 조사원 | ✅ `char/investigator-boy.webp` |

## 6. 발견한 독립운동가 관련 이미지 목록

**중요 — `assets/` 130장 전수 확인 결과, 김구·윤봉길·유관순·안중근·안창호·김좌진 중 어느 한 명을 특정해 그린 초상은 하나도 없다.**
초상처럼 보이는 것은 전부 (a) 가상의 현대 주인공, (b) 의도적 실루엣, (c) 얼굴을 알아볼 수 없는 조선 관리 스케치 셋 중 하나였다.

`3d assets/`의 `12_08_24 (1)`(노년·두루마기·둥근 안경)과 `12_08_25 (2)`(청년·1930년대 정장)는 김구·윤봉길의 상징적 외형과 겹치지만 **AI가 만든 임의의 얼굴**이다.
따라서 이 두 렌더는 **초상 사진으로 제시하지 않는다.** 기록 복원 완료 화면에서만 사용하고, 바로 아래에 다음 문구를 함께 띄운다.

> 가운데 인물 그림은 실제 초상 사진이 아니라, 확인한 자료를 바탕으로 구성한 학습용 시각화입니다.
> 실제 사진은 [전체 자료 출처]에 적힌 기관에서 확인할 수 있습니다.

실제 초상 사진의 소재는 검증 과정에서 확인해 출처 데이터에 기록했다(공훈전자사료관 `mngNo=3732` 윤봉길, 독립기념관 독립운동인명사전 `id=682` 김구). **핫링크하지 않는다.**

## 7. 발견한 UI / 아이콘 목록

`assets/`에는 UI 아이콘 묶음(돋보기·나침반·봉인 두루마리·벼루 등)이 여러 세트 있었으나 **UI에는 하나도 쓰지 않았다.** 프로젝트 원칙상 버튼·메뉴·진행도·모달은 전부 DOM/CSS + 인라인 SVG로 만든다. 아이콘은 `src/ui/dom.ts`의 `ICONS` 상수에 SVG path로 직접 정의했다.

이미지로 채택한 것은 "화면 속 물건"으로 쓰이는 것뿐이다.

| 원본 파일명 | 용도 | 산출물 |
|---|---|---|
| `source/ui/silhouette-frame-source.png` | 미확인 인물 실루엣 액자 | `ui/silhouette-frame.webp` |
| `source/ui/certificate-frame-source.png` | 인증서 장식 틀 (예비) | `ui/certificate-frame.webp` |
| `source/props/envelope-source.png` | 봉투 | `prop/envelope.webp` |
| `source/props/documents-source.png` | 문서 묶음 | `prop/documents.webp` |
| `source/props/journal-source.png` | 기록 수첩 | `prop/journal.webp` |
| `source/props/lens-kit-source.png` | 돋보기·핀셋 도구함 | `prop/lens-kit.webp` |
| `source/props/drawer-source.png` | 서랍장 | `prop/drawer.webp` |
| `source/props/artifact-orb-source.png` | 유물 구슬 | `prop/artifact-orb.webp` |
| `source/props/investigation-board-source.png` | 조사 게시판 | `prop/investigation-board.webp` |

## 8. BGM / SFX 목록

`sound/` 폴더에 MP3 6개. `sound/bfx/`는 **빈 폴더**로 효과음 파일은 하나도 없었다.

| 파일 | 크기 | 배치 |
|---|---|---|
| `maintheme.mp3` | 3.84 MB | 타이틀·기록소·브리핑·복원 완료 |
| `stage1.mp3` | 2.99 MB | Stage 1 흔적 탐색 |
| `stage2.mp3` | 1.89 MB | Stage 2 자료 분석 |
| `stage3.mp3` | 4.02 MB | Stage 3 기록 탐구 |
| `stage4.mp3` | 4.31 MB | Stage 4 인물 비교 |
| `stage5.mp3` | 3.64 MB | Stage 5 기록 복원 |

효과음 파일이 없으므로 **SFX 10종을 WebAudio 합성음으로 직접 만들었다**(`src/core/AudioManager.ts`). 외부 파일 0바이트, 톤은 절제된 사인/삼각파. 복원 순간의 북소리는 72 Hz + 48 Hz 저음에 짧은 노이즈를 얹어 만들었다.

## 9. JSON / data 파일 목록

조사 시점 JSON **0개**. `data/` 폴더에는 마크다운 3개만 있었다.

| 원본 파일명 | 성격 |
|---|---|
| `data/KEEPER_OF_RECORDS_PRD (3).md` | PRD (10페이지 UX, 역사 서술 원칙, 금지 표현) |
| `data/KEEPER_OF_RECORDS_TRD (2).md` | TRD (폴더 구조, 데이터 모델, HistoricalClaim, 검증 스크립트) |
| `data/README(7) (2).md` | README (교육과정 연계, 상호작용 설계) |

구축 후 생성한 데이터(`public/data/`): `catalog.json`, `people.json`, `organizations.json`, `historical-sources.json`, `cases/case-001.json`.

## 10. 역사 출처 데이터 목록

조사 시점 **0건**. approved source, historical claim, review status 어느 것도 존재하지 않았다.

이번에 국가보훈부 공훈전자사료관·독립기념관·한국민족문화대백과사전·국사편찬위원회 우리역사넷·국가유산청 자료를 직접 조회해 **claim 45건**을 작성했다(43건 approved, 2건 미승인 보류). 상세는 `public/data/historical-sources.json`과 아래 19절 참조.

## 11. pagesample 및 mockup 목록 — `samplepages/` 50개

프롬프트 묶음 5개. 앞의 3묶음(11_40·11_46·11_48, 30장)은 **세종대왕/훈민정음 주제**로 이 프로젝트 주제와 무관하다. 레이아웃 참고로만 가치가 있다.

| 묶음 | 주제 | 활용 |
|---|---|---|
| 11_40 / 11_42 (10장) | 세종·훈민정음 | 타이틀 테두리 처리만 참고 |
| 11_46 (10장) | 세종·훈민정음 | 3분할 분석 데스크 패턴 참고 |
| 11_48 (10장) | 세종·훈민정음 | 과장된 금장식 — 반면교사 |
| **11_49 / 11_50 (10장)** | **독립운동 (김구·윤봉길·안중근·유관순)** | 기록소 가로 덱, 3분할 분석 데스크, 조사권 UI 참고 |
| **오후 05_05_30~35 (10장)** | **실제 타이틀 "기록의 주인" + 남녀 2인 + 무궁화** | **주 참고 세트.** 타이틀 구성, 퍼센트 진행 표시, 한지 인증서 테두리 |

**샘플 이미지 안 텍스트를 역사 데이터로 쓰지 않은 이유 — 실제 오류를 확인했다.**

| 파일 | 이미지 속 문구 | 문제 |
|---|---|---|
| `…오후 05_05_34 (9).png` | "1926 한인애국단 조직" | **한인애국단은 1931년 조직.** 명백한 오류 |
| `…오후 05_05_33 (6).png` | "대한광무 3년 관립학교 설립 협의 회의록", "광명학교", "1899년 5월 17일" | 문서·학교명·날짜 전부 창작 |
| `…오전 11_50_22 (8).png` | 안중근 "대한의군부"·"의병장" | 미검증 조어 |
| `…오전 11_48_54 (3).png` | "고종 23년 교지 (1886)" | 미검증 |
| `…오전 11_42_52 (9).png` | "경복궁 근정전 중건 기록", "광해 十년" | 창작 |

→ 샘플은 **색감·밀도·구도·hierarchy만** 가져왔고, 화면에 나가는 역사 문구는 100% 검증된 claim에서만 가져왔다.

## 12. 사용 가능한 에셋 (= 이번 MVP Asset Manifest 대상)

`public/assets/` 아래 34개. 20절 표 참조.

## 13. 중복 에셋

- `background/…오전 11_56_16 (1)~(7).png` **7개는 `11_51_01`·`11_51_29` (1)~(7)과 MD5 동일한 바이트 단위 중복**이다.
- `assets/…오후 12_13_47~14_24 (1)~(10)` **10개는 `assets/…오후 05_06_23~29 (1)~(10)`과 바이트 단위 동일**하다.
- 원본은 지우지 않았다. 원본 폴더(`background/`, `assets/`, `3d assets/`, `samplepages/`)가 그대로 asset-bank 역할을 하고, `.gitignore`로 GitHub 업로드에서 제외한다.

## 14. 사용하면 안 되는 에셋

**중국풍 (프로젝트 금지 항목 직격)**

| 파일 | 사유 |
|---|---|
| `background/…오전 11_51_29 (8).png` | 중국식 처마·팔각 문양·술 달린 현수막 |
| `background/…오후 05_05_11 (1).png`, `05_05_14 (6)`, `05_05_16 (9)` | 월문(moon gate), 중국식 지붕 |
| `3d assets/…오후 05_07_20 (6).png` | 중산복 |
| `assets/…오전 11_59_13 (4).png`, `11_59_15 (10).png` | 용·탑·중국 정크선이 그려진 지도/지구본 |
| `assets/…오후 12_05_51 (4).png` | 중국식 사자상(狛犬) |
| **`assets/…오후 12_13_55 (4).png`** | **채택 후 재검토해 탈락.** 붉은 술·금장 도장으로 중국 판타지/가챠 게임 톤. 대신 `src/ui/Seal.ts`에 절제된 팔레트의 SVG 인장을 직접 그렸다 |
| `assets/source/reward/medal-source.png` | 훈장. 태극·무궁화는 맞으나 채도가 높아 디자인 시스템과 충돌 |

**시대·문화 불일치**

| 파일 | 사유 |
|---|---|
| `assets/…오전 11_59_38 (6).png` | 그리스·로마 신전 홀로그램 |
| `assets/…오전 11_59_39 (9).png` | 유럽 고딕 성당 |
| `assets/…오전 11_59_40 (10).png` | 삼각모·러플 칼라 (18세기 서양) |
| `3d assets/…오후 05_07_19 (5).png` | 국적 불명 군복 + 소총 겨눔 |

**품질 문제**

| 파일 | 사유 |
|---|---|
| `3d assets/…오후 05_07_17 (1).png` | 손가락 해부 오류, 표정 과장 |

## 15. 출처 불명 역사 이미지

**저장소의 역사 관련 이미지는 100% 생성 이미지이며, 실제 사료 사진은 한 장도 없다.**

- 배경에 그려진 벽면 사진·문서는 전부 AI 생성물이며, 확대하면 판독 불가능한 유사 문자다.
- `assets/source/props/documents-source.png` 문서 묶음에는 3·1운동을 연상시키는 군중+태극기 사진이 들어 있으나 특정 인물을 식별할 수 없는 생성 이미지다.
- 따라서 **어떤 이미지도 "당시 사진"으로 제시하지 않는다.** 이미지가 역사 내용을 전달하는 자리에는 반드시 `학습용 시각화` 표기를 붙였고(`evidence.visualization` 플래그 + `.visual-note` 클래스), 실물 사료의 소재는 텍스트 출처로만 안내한다.

## 16. 구현되어 있으나 미완성인 기능

코드가 없었으므로 해당 없음. 이번 구축에서 의도적으로 범위 밖에 둔 것은 22절 참조.

## 17. MVP에 재사용할 수 있는 코드

없음. 전량 신규 작성.

## 18. 기술 부채

| 항목 | 내용 | 위험 |
|---|---|---|
| Phaser 번들 크기 | `phaser-*.js` 1.48 MB (gzip 340 KB) | 중. 별도 청크로 분리해 캐시는 되지만 첫 로드에 필요 |
| BGM 총량 | 20 MB. 현재/다음 Stage만 지연 로드하도록 짰으나 원본이 무겁다 | 중. 128 kbps 재인코딩 또는 OGG 병행 제공 권장 |
| Stage 1 소품 | 서랍·봉투·사진·먼지 등을 Phaser Graphics로 그렸다. 배경의 사실적 밀도에 비해 단순하다 | 하. 알파 컷아웃 소품으로 교체 가능하도록 인터페이스는 열어 뒀다 |
| `pinch` 조작 | Interaction Registry에 등록되지 않아 `tap`으로 대체 동작한다 | 하. `ev-yesan-record`는 Stage 2·3에서 얻으므로 플레이에 영향 없음 |
| 원본 에셋 폴더 | 약 220장 PNG가 저장소에 남아 있다 | 하. `.gitignore` 처리, GitHub에는 올리지 않음 |
| 인쇄 검증 | Print CSS는 작성했으나 실제 프린터 출력은 확인하지 못했다 | 중. 납품 전 실물 출력 확인 필요 |

## 19. 역사 검증이 필요한 데이터

claim 45건 중 **43건 approved**, **2건 미승인(학생 화면 노출 차단)**.

### TODO_HISTORY_REVIEW

| id | 상태 | 내용 | 필요한 조치 |
|---|---|---|---|
| `yunbonggil-sigye-baekbeomilji` | `draft` | 『백범일지』 시계 교환 대목의 **원문 문장**을 승인 기관 URL에서 확보하지 못함 | 백범일지 원문 DB 또는 백범김구기념관 소장본 확인 |
| `yunbonggil-sigye-daehwa` | `reviewed` | 우리역사넷 학생용 서술에 나오는 대화체 문장. 1차 사료 전사가 아니라 재서술이라 직접 인용으로 쓰지 않음 | 1차 사료 확인 후 승인 여부 결정 |

**시계 교환 사실 자체와 방향(윤봉길의 새 시계 → 김구 / 김구의 낡은 시계 → 윤봉길)은 한국민족문화대백과사전 「윤봉길 의사 유품」으로 확인해 approved 처리했다.** 기억 조각 장면의 내레이션은 이 확인된 사실만 사용하고 창작 대사를 넣지 않았다.

### 자료 간 불일치로 표기를 좁힌 항목

| 항목 | 불일치 | 처리 |
|---|---|---|
| 김구 주석 취임 | 백과사전 1940년 3월 / 우리역사넷 1940년 10월 | **"1940년"까지만** 표기 |
| 윤봉길 순국일 | 공훈전자사료관 구 공적조서 "12월 9일 오사카" / 공훈록·독립기념관·백과사전 "12월 19일 가나자와" | **12월 19일 가나자와** 채택, 출처는 독립기념관·백과사전 |
| 훙커우 의거 사상자 | 백과사전 내부 항목 간 생사 서술 불일치 | 개인 이름·생사를 특정하지 않고 **"일본군 지휘부에 큰 타격"**으로 서술 |
| 대성학교 설립 연도 | 백과사전 1907 / 독립기념관 1908로 읽힘 | **연도 없이** "평양에 대성학교를 세웠다" |
| 장제스 발언 숫자 | 같은 기관 자료 안에서 30만 / 백만 / 4억으로 갈림 | **인용 자체를 사용하지 않음** |
| 임시정부 수립일 | 4월 11일(현행) vs 4월 13일(구 표기) | **1919년 4월 11일** |

### 자동 검증으로 잡히지 않는 것

`npm run validate:data`는 참조 무결성·노출 규칙·금지 표현·구조 규칙만 검사한다. **역사적 사실의 진위는 검증하지 않는다.** 배포 전 사람의 최종 검수가 반드시 필요하다.

## 20. 이번 MVP에서 실제 사용할 파일들의 Asset Manifest

원본 → `public/assets/` (WebP 변환, `scripts/prepare-assets.mjs`가 재현). 이미지 합계 **2.55 MB**, 첫 화면 이미지 **254 KB**.

### 배경 (11)

| 산출물 | KB | 원본 |
|---|---|---|
| `bg/title.webp` | 132 | `background/…오전 11_51_01 (1).png` |
| `bg/title-key.webp` | 199 | `og.png` (예비) |
| `bg/archive.webp` | 101 | `background/…오전 11_51_01 (2).png` |
| `bg/briefing.webp` | 141 | `background/…오전 11_51_29 (4).png` |
| `bg/stage1.webp` | 146 | `background/…오전 11_51_01 (3).png` |
| `bg/stage2.webp` | 136 | `background/…오전 11_51_29 (5).png` |
| `bg/stage3.webp` | 86 | `background/…오전 11_51_29 (6).png` |
| `bg/stage4.webp` | 96 | `background/…오전 11_51_29 (7).png` |
| `bg/stage5.webp` | 79 | `background/…오전 11_51_38 (10).png` |
| `bg/reward.webp` | 122 | `background/…오전 11_51_29 (9).png` |
| `bg/certificate.webp` | 89 | `background/…오후 05_05_16 (10).png` |

### 장면 · 캐릭터 (6)

| 산출물 | 원본 | 사용처 |
|---|---|---|
| `scene/memory-watch.webp` | `3d assets/…오후 05_07_34.png` | 기억 조각 2.5D |
| `char/investigator-girl.webp` | `assets/source/characters/investigator-girl-source.png` | 타이틀 |
| `char/investigator-boy.webp` | `assets/source/characters/investigator-boy-source.png` | 타이틀·공통 도움말 |
| `char/guide-archivist.webp` | `3d assets/…오후 05_07_23 (10).png` | 브리핑 |
| `char/figure-elder.webp` | `3d assets/…오후 12_08_24 (1).png` | 복원 완료 (김구 CASE용, 학습용 시각화) |
| `char/figure-young.webp` | `3d assets/…오후 12_08_25 (2).png` | 복원 완료 (윤봉길, 학습용 시각화) |

### UI · 보상 · 소품 (11)

`ui/silhouette-frame.webp`, `ui/certificate-frame.webp`, `reward/seal-stamp.webp`(보류), `reward/medal.webp`(보류), `prop/envelope.webp`, `prop/documents.webp`, `prop/journal.webp`, `prop/lens-kit.webp`, `prop/drawer.webp`, `prop/artifact-orb.webp`, `prop/investigation-board.webp`

### 오디오 (6)

`audio/maintheme.mp3`, `audio/stage1.mp3` ~ `audio/stage5.mp3` — `sound/`에서 무변환 복사.

### 데이터 (5)

`data/catalog.json`, `data/people.json`, `data/organizations.json`, `data/historical-sources.json`, `data/cases/case-001.json`
