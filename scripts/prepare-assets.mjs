/**
 * source 폴더의 생성 이미지 중 "실제 사용할 것"만 골라
 * public/assets/ 아래 의미 있는 이름 + WebP로 변환한다.
 *
 * 원본은 삭제하지 않는다. (asset-bank 역할을 원본 폴더가 그대로 수행)
 *
 * 실행: node scripts/prepare-assets.mjs
 */
import { mkdir, copyFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = join(ROOT, 'public', 'assets');

const BG = (n) => join(ROOT, 'background', n);
const A3D = (n) => join(ROOT, '3d assets', n);
const AST = (n) => join(ROOT, 'assets', n);

/** [source, outRelPath, options] */
const IMAGES = [
  // ── 배경 (1600x900, 불투명 → webp q82) ──
  [join(ROOT, 'og.png'), 'bg/title-key.webp', { w: 1774, q: 84 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_01 (1).png'), 'bg/title.webp', { w: 1600, q: 82 }],
  [AST('source/backgrounds/archive-drawer-hall-source.png'), 'bg/archive-drawer-hall-v2.webp', { w: 1600, q: 84 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_29 (4).png'), 'bg/briefing.webp', { w: 1600, q: 82 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_01 (3).png'), 'bg/stage1.webp', { w: 1600, q: 82 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_29 (5).png'), 'bg/stage2.webp', { w: 1600, q: 82 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_29 (6).png'), 'bg/stage3.webp', { w: 1600, q: 82 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_29 (7).png'), 'bg/stage4.webp', { w: 1600, q: 82 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_38 (10).png'), 'bg/stage5.webp', { w: 1600, q: 82 }],
  [BG('ChatGPT Image 2026년 8월 15일 오전 11_51_29 (9).png'), 'bg/reward.webp', { w: 1600, q: 82 }],
  [BG('ChatGPT Image 2026년 8월 15일 오후 05_05_16 (10).png'), 'bg/certificate.webp', { w: 1600, q: 80 }],

  // ── 기억 장면 (2.5D parallax) ──
  [A3D('ChatGPT Image 2026년 8월 15일 오후 05_07_34.png'), 'scene/memory-watch.webp', { w: 1600, q: 86 }],

  // ── 캐릭터 (알파 유지 → webp lossless-ish) ──
  [A3D('ChatGPT Image 2026년 8월 15일 오후 12_08_24 (1).png'), 'char/figure-elder.webp', { w: 720, q: 88, alpha: true }],
  [A3D('ChatGPT Image 2026년 8월 15일 오후 12_08_25 (2).png'), 'char/figure-young.webp', { w: 720, q: 88, alpha: true }],
  [A3D('ChatGPT Image 2026년 8월 15일 오후 05_07_23 (10).png'), 'char/guide-archivist.webp', { w: 640, q: 86 }],

  // ── 복원 대상 인물 초상 (배경 제거 → 알파) ──
  [A3D('ChatGPT Image 2026년 8월 15일 오후 05_07_17 (1).png'), 'char/person-ahnchangho.webp', { w: 720, q: 88, cutout: true }],
  [A3D('ChatGPT Image 2026년 8월 15일 오후 05_07_04 (4).png'), 'char/person-ahnjunggeun.webp', { w: 720, q: 88, cutout: true }],
  [A3D('ChatGPT Image 2026년 8월 15일 오후 05_07_18 (4).png'), 'char/person-yugwansun.webp', { w: 720, q: 88, cutout: true }],
  [A3D('ChatGPT Image 2026년 8월 15일 오후 05_07_21 (8).png'), 'char/person-kimjwajin.webp', { w: 720, q: 88, cutout: true }],
  [A3D('ChatGPT Image 2026년 8월 15일 오후 12_08_25 (2).png'), 'char/person-yunbonggil.webp', { w: 720, q: 88, cutout: true }],
  [A3D('ChatGPT Image 2026년 8월 15일 오후 12_08_24 (1).png'), 'char/person-kimgu.webp', { w: 720, q: 88, cutout: true }],

  // ── 현대 조사원 주인공 2인 ──
  [AST('source/characters/investigator-girl-source.png'), 'char/investigator-girl.webp', { w: 700, q: 88, alpha: true }],
  [AST('source/characters/investigator-boy-source.png'), 'char/investigator-boy.webp', { w: 700, q: 88, alpha: true }],

  // ── UI 소품 ──
  [AST('source/ui/unknown-prison-record-source.png'), 'ui/unknown-prison-record-v2.webp', { w: 720, q: 86 }],
  [AST('source/ui/certificate-frame-source.png'), 'ui/certificate-frame.webp', { w: 900, q: 86 }],
  [AST('source/ui/title-lockup-source.png'), 'ui/title-lockup-v2.webp', { w: 1100, q: 88 }],
  [AST('source/ui/character-platform-source.png'), 'ui/character-platform-v2.webp', { extract: { left: 70, top: 500, width: 1114, height: 650 }, w: 600, q: 88, alpha: true }],

  // ── 보상 ──
  // 중국풍 판정으로 원본이 chinese/로 격리됨. UI는 src/ui/Seal.ts의 SVG 인장을 사용
  [join(ROOT, 'chinese', 'ChatGPT Image 2026년 8월 15일 오후 12_13_55 (4).png'), 'reward/seal-stamp.webp', { w: 480, q: 88 }],
  [AST('source/reward/medal-source.png'), 'reward/medal.webp', { w: 420, q: 88 }],

  // ── 기록 소품 (Stage 1·2에서 사용) ──
  [AST('source/props/envelope-source.png'), 'prop/envelope.webp', { w: 520, q: 86 }],
  [AST('source/props/documents-source.png'), 'prop/documents.webp', { w: 560, q: 86 }],
  [AST('source/props/journal-source.png'), 'prop/journal.webp', { w: 480, q: 86 }],
  [AST('source/props/lens-kit-source.png'), 'prop/lens-kit.webp', { w: 520, q: 86 }],
  [AST('source/props/drawer-source.png'), 'prop/drawer.webp', { w: 480, q: 86 }],
  [AST('source/props/artifact-orb-source.png'), 'prop/artifact-orb.webp', { w: 480, q: 86 }],
  [AST('source/props/investigation-board-source.png'), 'prop/investigation-board.webp', { w: 900, q: 84 }],
];

/**
 * 단색 스튜디오 배경 제거: 가장자리에서 플러드필로 배경만 지운다.
 * 지역 대비(완만한 그라디언트는 통과)와 코너색 거리(피사체에서 정지) 이중 기준.
 * ponytail: 임계값 고정 휴리스틱 — 새 초상이 안 뽑히면 LOCAL/GLOBAL 값부터 조정
 */
async function cutoutBackground(img) {
  const { data, info } = await img
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  const px = (x, y) => (y * w + x) * ch;
  const d2 = (i, j) =>
    (data[i] - data[j]) ** 2 +
    (data[i + 1] - data[j + 1]) ** 2 +
    (data[i + 2] - data[j + 2]) ** 2;
  // 배경은 무채색(회색 스튜디오) — 채도가 있으면 피사체
  const chroma = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
  };

  const LOCAL = 11 * 11;   // 이웃 픽셀과의 허용 차 (완만한 비네트·그림자만 통과)
  const MAXCHROMA = 26;    // 무채색 배경 판정 (피사체 색 진입 차단)

  const visited = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) queue.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) queue.push([0, y], [w - 1, y]);

  while (queue.length) {
    const [x, y] = queue.pop();
    const n = y * w + x;
    if (visited[n]) continue;
    const i = n * ch;
    if (chroma(i) > MAXCHROMA) continue;
    if (!(x === 0 || y === 0 || x === w - 1 || y === h - 1)) {
      // 이미 지워진 이웃 중 색이 이어지는 곳이 있어야 배경으로 인정
      let linked = false;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (visited[ny * w + nx] && d2(i, px(nx, ny)) < LOCAL) { linked = true; break; }
      }
      if (!linked) continue;
    }
    visited[n] = 1;
    data[i + 3] = 0;
    if (x > 0) queue.push([x - 1, y]);
    if (x < w - 1) queue.push([x + 1, y]);
    if (y > 0) queue.push([x, y - 1]);
    if (y < h - 1) queue.push([x, y + 1]);
  }

  // 2차: 피사체에 둘러싸여 가장자리와 안 이어진 배경 주머니 제거
  // (제거된 배경의 중앙값 색과 거의 같은 무채색 고립 영역만)
  {
    const rs = [], gs = [], bs = [];
    for (let n = 0; n < w * h; n += 97) {
      if (visited[n]) { const i = n * ch; rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); }
    }
    const med = (a) => a.sort((x, y) => x - y)[a.length >> 1] ?? 0;
    const mr = med(rs), mg = med(gs), mb = med(bs);
    const SEED = 9 * 9;
    for (let n = 0; n < w * h; n++) {
      const i = n * ch;
      if (visited[n] || chroma(i) > MAXCHROMA) continue;
      if ((data[i] - mr) ** 2 + (data[i + 1] - mg) ** 2 + (data[i + 2] - mb) ** 2 > SEED) continue;
      const stack = [n];
      while (stack.length) {
        const m = stack.pop();
        if (visited[m]) continue;
        const j = m * ch;
        if (chroma(j) > MAXCHROMA) continue;
        if ((data[j] - mr) ** 2 + (data[j + 1] - mg) ** 2 + (data[j + 2] - mb) ** 2 > SEED * 4) continue;
        visited[m] = 1;
        data[j + 3] = 0;
        const x = m % w, y = (m / w) | 0;
        if (x > 0) stack.push(m - 1);
        if (x < w - 1) stack.push(m + 1);
        if (y > 0) stack.push(m - w);
        if (y < h - 1) stack.push(m + w);
      }
    }
  }

  // 경계 부드럽게: 알파 3x3 박스 블러 1회
  const soft = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
          sum += data[(yy * w + xx) * ch + 3]; n++;
        }
      soft[y * w + x] = sum / n;
    }
  for (let n = 0; n < w * h; n++) data[n * ch + 3] = soft[n];

  return sharp(data, { raw: { width: w, height: h, channels: ch } });
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  let ok = 0;
  const missing = [];

  for (const [src, rel, opt] of IMAGES) {
    if (!(await exists(src))) {
      missing.push(src);
      continue;
    }
    const dest = join(OUT, rel);
    await mkdir(dirname(dest), { recursive: true });
    let img = sharp(src);
    if (opt.extract) img = img.extract(opt.extract);
    if (opt.w) img = img.resize({ width: opt.w, withoutEnlargement: true });
    if (opt.cutout) img = await cutoutBackground(img);
    await img.webp({ quality: opt.q ?? 82, alphaQuality: 100 }).toFile(dest);
    ok++;
    console.log(`  ✓ ${rel}`);
  }

  // ── 오디오는 변환 없이 복사 ──
  const audio = ['maintheme', 'stage1', 'stage2', 'stage3', 'stage4', 'stage5'];
  await mkdir(join(OUT, 'audio'), { recursive: true });
  for (const name of audio) {
    const src = join(ROOT, 'sound', `${name}.mp3`);
    if (!(await exists(src))) {
      missing.push(src);
      continue;
    }
    await copyFile(src, join(OUT, 'audio', `${name}.mp3`));
    ok++;
    console.log(`  ✓ audio/${name}.mp3`);
  }

  // ── OG 이미지: 원본 2.3MB PNG 대신 압축본을 public/ 에 둔다 ──
  const ogSrc = join(ROOT, 'og.png');
  if (await exists(ogSrc)) {
    await sharp(ogSrc)
      .resize({ width: 1200, withoutEnlargement: true })
      .png({ quality: 78, compressionLevel: 9 })
      .toFile(join(ROOT, 'public', 'og.png'));
    ok++;
    console.log('  ✓ og.png (압축본)');
  }

  console.log(`\n에셋 준비 완료: ${ok}개`);
  if (missing.length) {
    console.log(`\n찾지 못한 원본 ${missing.length}개:`);
    missing.forEach((m) => console.log(`  - ${m}`));
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
