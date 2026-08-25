# 생성 이미지 에셋 목록

2026-08-24 내장 이미지 생성 도구로 제작하고 투명 WebP로 최적화한 사용본입니다. 모든 경로는 `src/config/AssetMap.ts`에서 관리합니다.

| 파일 | 사용 화면 | 용도 |
|---|---|---|
| `public/assets/ui/title-lockup-v2.webp` | 첫 화면 | 첨부 제목 그림을 배경과 부드럽게 혼합한 타이틀 로크업 |
| `public/assets/ui/character-platform-v2.webp` | 첫 화면 | 여자·남자 조사원의 발 높이를 맞추는 동일한 목제 발판 |
| `public/assets/ui/unknown-prison-record-v2.webp` | 사건 브리핑 | 성별과 얼굴을 알 수 없는 실루엣과 지워진 이름 칸이 남은 빛바랜 수형 기록표 |
| `public/assets/bg/archive-drawer-hall-v2.webp` | 사건 기록소 | 수많은 독립운동가의 기록 중 몇 개를 골라 여는 끝없는 서랍 회랑 배경 |
| `public/assets/bg/stage1-investigation-v2.webp` | 흔적 탐색 | 물건과 자료 카드가 또렷하게 보이도록 여백을 둔 기록 조사실 배경 |
| `public/assets/scene/record-reading-v2.webp` | 기록 탐구 | 바둑판 배경을 제거한 기록 열람대 그림 |
| `public/assets/scene/evidence-relationship-v2.webp` | 자료 분석·인물 비교·기록 복원 | 바둑판 배경을 제거한 자료 관계 연결판 |
| `public/assets/prop/memo-note.webp` | 메인 | 떠다니는 기록 메모와 프롤로그 문서 |
| `public/assets/prop/archive-drawer-v2.webp` | 사건 기록소·흔적 탐색 | 기록 서랍 앞판 |
| `public/assets/prop/letter-envelope.webp` | 흔적 탐색 | 열린 편지봉투·서랍 속 기록 |
| `public/assets/prop/sealed-envelope-v2.webp` | 흔적 탐색 | 밀어서 여는 봉인 봉투 |
| `public/assets/prop/old-photo.webp` | 흔적 탐색 | 뒤집어 확인하는 낡은 사진 |
| `public/assets/prop/teacup.webp` | 흔적 탐색 | 조사 가능한 찻잔 |
| `public/assets/prop/dusty-document.webp` | 흔적 탐색 | 문질러 확인하는 먼지 덮인 문서 |
| `public/assets/prop/oil-lamp.webp` | 흔적 탐색 | 조사 가능한 등잔 |
| `public/assets/prop/document-cabinet.webp` | 흔적 탐색 | 문서 캐비닛 |
| `public/assets/prop/torn-document.webp` | 흔적 탐색 | 네 조각 맞추기 문서 |
| `public/assets/prop/inkstone.webp` | 흔적 탐색 | 조사 가능한 벼루 |
| `public/assets/prop/pocket-watch.webp` | 흔적 탐색 | 회전 조사하는 작은 금속 물건 |
| `public/assets/prop/taegeukgi.webp` | 흔적 탐색 배경 | 반복 경계에 한 번씩 배치하는 정상 태극기 |

## 화면별 에셋 배치

| 화면 | 배치한 에셋 | 학습 기능 |
|---|---|---|
| 첫 화면·공통 도움말 | `investigator-girl.webp`, `investigator-boy.webp` | 첫 화면에는 여자·남자 조사원을 함께 배치하고, 도움말은 같은 남자 조사원이 안내 |
| 사건 브리핑 | `archive-drawer-v2.webp`, `lens-kit.webp`, `record-reading.webp`, `evidence-relationship.webp` | 앞으로 할 네 가지 활동을 그림으로 예고 |
| 자료 분석 | `lens-kit.webp`, `journal.webp`, `evidence-relationship.webp` | 비교·시간 순서·관계 잇기 탭을 그림으로 구분 |
| 기록 탐구 | `record-reading.webp` | 질문을 골라 기록을 읽는 행동을 안내 |
| 인물 비교 | 인물 그림, `evidence-relationship.webp` | 인물별 자료와 공통 자료 칸을 시각적으로 구분 |
| 기록 복원 | `pocket-watch.webp`, `evidence-relationship.webp`, `torn-document.webp` | 시간·관계·완성의 세 복원 단계를 표시 |
| 복원 완료 | `medal.webp`, 한글 기록 복원 인장 | 완료 의미를 분명히 표시 |
| 인증서 | `certificate-frame.webp` | 인쇄 화면과 미리보기에 같은 인증서 테두리 적용 |

## 공통 생성 프롬프트 방향

- 어두운 남색 기록 보관소, 한지·호두나무·황동 중심의 반실사 3D 페인팅 게임 에셋
- 초등 고학년용으로 세련되고 역사적 분위기를 유지하되 실사·공포 표현은 제외
- 이미지 한 장당 소품 하나, 투명 배경, 글자·UI·워터마크 없음
- 태극기는 중앙 태극과 건·곤·감·리 네 괘가 온전히 보이는 표준 구성

## 흔적 탐색 배경 v2

- 내장 `imagegen`으로 생성한 16:9 반실사 3D 기록 조사실 배경
- 물건·종이·사진·봉투·시계·문구는 넣지 않고, 중앙과 작업대에 UI용 여백을 확보
- 짙은 남색, 호두나무, 황동 조명으로 기존 세계관을 유지하고 1600×900 WebP로 최적화
