/** Phaser Graphics용 색상 — tokens.css와 같은 팔레트 */
export const P = {
  navy950: 0x0a1020,
  navy900: 0x0e1628,
  navy800: 0x142038,
  navy700: 0x1d2c4a,
  navy600: 0x28395c,
  wood900: 0x241610,
  wood800: 0x332015,
  wood700: 0x4a2f1e,
  wood600: 0x63402a,
  brass500: 0xc9a05a,
  brass400: 0xd9b878,
  brass300: 0xe8d3a3,
  brassDim: 0x8a7040,
  /** 안내 문구·강조용 밝은 금색 (Stage2 등에서 사용) */
  gold300: 0xf2cf78,
  hanji100: 0xf4ecdc,
  hanji200: 0xe8dcc4,
  hanji300: 0xd5c5a5,
  ink900: 0x241d14,
  redMuted: 0x9c3b34,
  jade: 0x4a7a6a,
  dust: 0x6b6152,
} as const;

/** 이어진 짝마다 다른 색.
 *  선 하나와 그 짝인 카드 두 장의 테두리를 같은 색으로 맞춰,
 *  어느 카드끼리 이어졌는지 색만 보고도 알 수 있게 한다.
 *  어두운 남색 배경에서 서로 구별되는 색만 골랐다. */
/** 한 화면에 짝이 최대 5개(기록 복원 관계도)까지 나오므로 6색을 둔다 */
export const PAIR_COLORS = [
  0x6fae8f, // 초록
  0x7fb3d5, // 하늘
  0xc79ad0, // 연보라
  0xdda56a, // 주황
  0xd98f96, // 분홍
  0x9fc46a, // 연두
] as const;

export function pairColor(index: number): number {
  return PAIR_COLORS[((index % PAIR_COLORS.length) + PAIR_COLORS.length) % PAIR_COLORS.length];
}

/** Phaser 색상값을 CSS 문자열로 (텍스트 색에 쓴다) */
export function cssColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}
