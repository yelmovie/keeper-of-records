# 인물 에셋 대조표

원본은 프로젝트의 `3d assets/`·`assets/` 폴더에 그대로 있고,
변환 규칙은 `scripts/prepare-assets.mjs` 의 IMAGES 표가 기준이다.
아래 4장은 ChatGPT 이미지 생성(2026-08-15)으로 만든 학습용 시각화이며,
실제 초상 사진이 아니다 (앱 화면에도 같은 고지가 있다).

| 원본 (3d assets/) | 인물 | 결과물 |
|---|---|---|
| ChatGPT Image … 오후 05_07_17 (1).png | 안창호 (연설 자세) | person-ahnchangho.webp |
| ChatGPT Image … 오후 05_07_04 (4).png | 안중근 (검은 프록코트) | person-ahnjunggeun.webp |
| ChatGPT Image … 오후 05_07_18 (4).png | 유관순 (태극기) | person-yugwansun.webp |
| ChatGPT Image … 오후 05_07_21 (8).png | 김좌진 (군복·지휘 자세) | person-kimjwajin.webp |
| 한국민족문화대백과사전 선서 사진·공식 영정 참조 | 윤봉길 (1932년식 3피스 양복) | person-yunbonggil-v2.webp |
| ChatGPT Image … 오후 12_08_24 (1).png | 김구 (흰 두루마기·둥근 안경) | person-kimgu.webp |

배경 제거는 `prepare-assets.mjs` 의 `cutoutBackground()` (플러드필)로 자동 처리된다.

윤봉길 v2는 한국민족문화대백과사전의 1932년 한인애국단 선서 사진을
주 얼굴 기준으로, 공식 영정을 보조 기준으로 사용해 생성한 학습용 시각화다.
실제 사진을 그대로 복제한 이미지는 아니다.

여섯 인물 모두 각자의 그림을 쓴다. 그림마다 머리 위 여백이 달라
얼굴이 화면 중앙 패널에 가리는 경우가 있어, `people.json` 의
`illustrationOffsetY` 로 인물별로 올려 준다 (유관순: 태극기를 들어 올린 자세라 -150).

## 아직 안 쓴 원본 (3d assets/)
- 오후 05_07_05 (6).png — 독립군 군복 노년 남성 (태극기 견장)
- 오후 05_07_17 (2).png — 시계를 주고받는 두 남성 (김구·윤봉길 회중시계 장면 후보)
- 오후 05_07_18 (3).png — 걷는 양복 청년 (윤봉길 대체 후보)
- 오후 05_07_19 (5).png — 소총 든 병사 (청산리 장면 후보)
- 오후 05_07_23 (10).png — 책을 든 한복 여성 (유관순 대체 후보)
- 오후 05_07_34.png — 어두운 실내의 두 인물
