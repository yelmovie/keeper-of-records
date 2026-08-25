/**
 * 에셋 검증
 *  - AssetMap 이 가리키는 파일이 실제로 public/ 아래 존재하는지
 *  - 배경 이미지 크기와 용량이 기준 안에 있는지
 *  - 초기 로딩 대상이 과도하게 크지 않은지
 */
import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const errors = [];
const rows = [];

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // AssetMap.ts 에서 'assets/...' 경로 문자열을 추출
  const src = await readFile(join(ROOT, 'src', 'config', 'AssetMap.ts'), 'utf8');
  const paths = [...src.matchAll(/'(assets\/[^']+)'/g)].map((m) => m[1]);
  const unique = [...new Set(paths)];

  if (unique.length === 0) {
    errors.push('AssetMap 에서 에셋 경로를 찾지 못했습니다.');
  }

  let total = 0;
  for (const rel of unique) {
    const full = join(PUBLIC, rel);
    if (!(await exists(full))) {
      errors.push(`에셋 없음: ${rel} (scripts/prepare-assets.mjs 를 실행하세요)`);
      continue;
    }
    const s = await stat(full);
    total += s.size;
    rows.push({ rel, kb: Math.round(s.size / 1024) });

    if (rel.startsWith('assets/bg/') && s.size > 400 * 1024) {
      errors.push(`배경 이미지가 너무 큽니다: ${rel} (${Math.round(s.size / 1024)}KB > 400KB)`);
    }
    if (rel.startsWith('assets/char/') && s.size > 300 * 1024) {
      errors.push(`캐릭터 이미지가 너무 큽니다: ${rel} (${Math.round(s.size / 1024)}KB > 300KB)`);
    }
    if (rel.startsWith('assets/video/') && rel.endsWith('.mp4') && s.size > 8 * 1024 * 1024) {
      errors.push(
        `연출 영상이 너무 큽니다: ${rel} (${Math.round(s.size / 1024 / 1024)}MB > 8MB, H.264 1600x900 으로 다시 인코딩하세요)`,
      );
    }
  }

  // data 파일 존재 확인
  for (const p of [
    'data/catalog.json',
    'data/people.json',
    'data/organizations.json',
    'data/historical-sources.json',
  ]) {
    if (!(await exists(join(PUBLIC, p)))) errors.push(`데이터 파일 없음: ${p}`);
  }

  const caseDir = join(PUBLIC, 'data', 'cases');
  if (!(await exists(caseDir))) {
    errors.push('data/cases 폴더가 없습니다');
  } else {
    // 단일 파일 + 트랙 폴더(cases/<id>/track-*.json) 모두 인정
    const entries = await readdir(caseDir, { withFileTypes: true });
    let count = 0;
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.json')) count++;
      else if (e.isDirectory()) {
        count += (await readdir(join(caseDir, e.name))).filter((f) =>
          f.endsWith('.json'),
        ).length;
      }
    }
    if (count === 0) errors.push('case JSON이 하나도 없습니다');
  }

  // 초기 화면에 필요한 최소 에셋 (타이틀 진입 시 로드되는 것)
  const bootAssets = [
    'assets/bg/title.webp',
    'assets/char/investigator-girl.webp',
    'assets/char/investigator-boy.webp',
  ];
  let bootSize = 0;
  for (const rel of bootAssets) {
    const full = join(PUBLIC, rel);
    if (await exists(full)) bootSize += (await stat(full)).size;
  }
  if (bootSize > 2.5 * 1024 * 1024) {
    errors.push(
      `첫 화면 에셋 합계가 큽니다: ${Math.round(bootSize / 1024)}KB (2500KB 이하 권장)`,
    );
  }

  const imageTotal = rows
    .filter(
      (r) =>
        !r.rel.startsWith('assets/audio/') && !r.rel.startsWith('assets/video/'),
    )
    .reduce((a, r) => a + r.kb, 0);
  const audioTotal = rows
    .filter((r) => r.rel.startsWith('assets/audio/'))
    .reduce((a, r) => a + r.kb, 0);
  const videoTotal = rows
    .filter((r) => r.rel.startsWith('assets/video/'))
    .reduce((a, r) => a + r.kb, 0);

  console.log(`에셋 검증`);
  console.log(`  등록된 에셋 ${rows.length}개 · 전체 ${Math.round(total / 1024)}KB`);
  console.log(`  이미지 ${imageTotal}KB · 오디오 ${audioTotal}KB (오디오는 진입 시 지연 로드)`);
  console.log(`  영상 ${videoTotal}KB (연출 직전 prefetch, 초기 로딩에는 포함되지 않음)`);
  console.log(`  첫 화면 이미지 ${Math.round(bootSize / 1024)}KB`);

  if (errors.length) {
    console.error(`\n오류 ${errors.length}건:`);
    errors.forEach((e) => console.error(`  x ${e}`));
    process.exit(1);
  }
  console.log('\n통과: 모든 에셋 경로가 유효합니다.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
