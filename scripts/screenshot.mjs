/**
 * 10페이지 화면을 순서대로 진행하며 스크린샷을 찍는다.
 * 실행: node scripts/screenshot.mjs [baseUrl] [width] [height]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:5641';
const W = Number(process.argv[3] ?? 1600);
const H = Number(process.argv[4] ?? 900);
const OUT = join(process.cwd(), 'docs', 'screens', `${W}x${H}`);

const errors = [];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });

  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) =>
    errors.push(`404/실패: ${r.url()} (${r.failure()?.errorText})`),
  );

  const shot = async (name) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(OUT, `${name}.png`) });
    console.log(`  ✓ ${name}`);
  };

  const click = async (text, opts = {}) => {
    const el = page.getByRole('button', { name: text }).first();
    await el.waitFor({ state: 'visible', timeout: 8000 });
    await el.click(opts);
    await page.waitForTimeout(1100);
  };

  /** 스테이지 진입 미션 카드 닫기 (있을 때만) */
  const dismissMission = async () => {
    const btn = page.getByRole('button', { name: '탐구 시작' });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(600);
    }
  };

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await shot('01-title');

  // 프롤로그 건너뛰기 + 캡처 재현성을 위해 윤봉길 트랙 고정
  await page.evaluate(() => {
    localStorage.setItem('keeper-of-records:prologue-seen', 'true');
    localStorage.setItem('keeper:force-track', 'yunbonggil');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  await click('기록 탐험 시작');
  await shot('02-archive-closed');

  // 첫 서랍 열기 (Phaser canvas 클릭)
  const canvas = page.locator('#phaser-root canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.42, box.y + box.height * 0.5);
  await page.waitForTimeout(1200);
  await shot('02-archive-open');

  await click('이 기록 탐구하기');
  await shot('03-briefing');

  await click('흔적 탐색 시작');
  await shot('04-stage1-mission');
  await dismissMission();
  await shot('04-stage1');

  // 조사원 캐릭터를 눌러 말풍선 힌트
  await page.locator('.guide-char__btn').click();
  await page.waitForTimeout(1600);
  await shot('04-stage1-hint');

  // 테스트를 위해 필요한 자료를 직접 확보 (조작은 수동 검증)
  await page.evaluate(() => window.__keeperDebugGrantAll?.());
  await page.waitForTimeout(800);
  await shot('04-stage1-reveal');
  // 획득 연출은 탭하면 닫힌다
  if (await page.locator('.evidence-reveal').count()) {
    await page.mouse.click(1400, 120);
    await page.waitForTimeout(500);
  }
  await shot('04-stage1-found');

  await click('자료 분석으로');
  await dismissMission();
  await shot('05-stage2');

  await page.locator('.analyze-tab').nth(1).click();
  await page.waitForTimeout(900);
  await shot('05-stage2-timeline');

  await page.locator('.analyze-tab').nth(2).click();
  await page.waitForTimeout(900);
  await shot('05-stage2-connect');

  await page.evaluate(() => window.__keeperDebugCompleteStage?.());
  await page.waitForTimeout(600);
  await click('기록 탐구로');
  await dismissMission();
  await shot('06-stage3');

  await page.locator('.question-node').first().click();
  await page.waitForTimeout(900);
  await shot('06-stage3-record');

  await click('인물 비교로');
  await dismissMission();
  await shot('07-stage4');

  await page.evaluate(() => window.__keeperDebugCompleteStage?.());
  await page.waitForTimeout(700);
  await shot('07-stage4-sorted');

  await click('기록 복원으로');
  await dismissMission();
  await shot('08-stage5-phaseA');

  await page.evaluate(() => window.__keeperDebugCompleteStage?.());
  await page.waitForTimeout(1200);
  await shot('08-stage5-phaseB');

  await page.evaluate(() => window.__keeperDebugCompleteStage?.());
  await page.waitForTimeout(1200);
  await shot('08-stage5-phaseC');

  // 기억 조각
  const badge = page.locator('.memory-unlock-badge');
  if (await badge.count()) {
    await badge.click();
    await page.waitForTimeout(4200);
    await shot('08b-memory-scene');
    await page.waitForTimeout(4200);
    await shot('08c-memory-source');
    const back = page.getByRole('button', { name: '기록으로 돌아가기' });
    if (await back.count()) {
      await back.click();
      await page.waitForTimeout(1400);
    }
  }

  await page.evaluate(() => window.__keeperDebugCompleteStage?.());
  await page.waitForTimeout(900);
  await click('기록 복원');
  await page.waitForTimeout(900);
  await shot('08d-nomination');

  // 기록의 주인 지목 → 복원 연출
  await page.locator('.nominate-overlay').getByText('윤봉길').first().click();
  await page.waitForTimeout(8800);
  await shot('09-reward');

  await click('이 이름을 기억하겠습니다');
  await page.waitForTimeout(2200);
  await shot('10-certificate');

  await browser.close();

  console.log(`\n스크린샷 저장: ${OUT}`);
  if (errors.length) {
    console.error(`\n콘솔/네트워크 오류 ${errors.length}건:`);
    [...new Set(errors)].forEach((e) => console.error(`  x ${e}`));
    process.exitCode = 1;
  } else {
    console.log('콘솔 오류 없음, 실패한 요청 없음.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
