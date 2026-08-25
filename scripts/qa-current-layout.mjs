import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/';
const outDir = join(process.cwd(), 'docs', 'screens', 'current');
const errors = [];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('requestfailed', (request) =>
  errors.push(`request: ${request.url()} (${request.failure()?.errorText})`),
);

const waitForScreen = async (selector) => {
  await page.locator(selector).waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(900);
};

const shot = async (name) => {
  await page.screenshot({ path: join(outDir, `${name}.png`) });
};

const clickFirstDrawer = async () => {
  const canvas = page.locator('#phaser-root canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Phaser canvas is not visible');
  await page.mouse.click(box.x + box.width * 0.3625, box.y + box.height * 0.5);
  await page.locator('.case-detail.show').waitFor({ state: 'visible', timeout: 8000 });
  await page.waitForTimeout(700);
};

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('keeper-of-records:prologue-seen', 'true');
});
await page.reload({ waitUntil: 'networkidle' });
await waitForScreen('.title-screen');
await shot('01-title');

const titleBoxes = await page.evaluate(() => ({
  heading: document.querySelector('.title-heading')?.getBoundingClientRect().toJSON(),
  actions: document.querySelector('.title-actions')?.getBoundingClientRect().toJSON(),
  buttons: [...document.querySelectorAll('.title-actions button')].map((node) =>
    node.getBoundingClientRect().toJSON(),
  ),
}));

await page.locator('.title-actions .kr-btn--primary').click();
await waitForScreen('.archive-screen');
await shot('02-archive');
await clickFirstDrawer();
await shot('03-archive-selected');

const archiveBoxes = await page.evaluate(() => ({
  guide: document.querySelector('.guide-char--compact')?.getBoundingClientRect().toJSON(),
  companion: document.querySelector('.archive-companion__visual')?.getBoundingClientRect().toJSON(),
  detail: document.querySelector('.case-detail')?.getBoundingClientRect().toJSON(),
  previous: document.querySelector('.archive-nav--prev')?.getBoundingClientRect().toJSON(),
  next: document.querySelector('.archive-nav--next')?.getBoundingClientRect().toJSON(),
}));

await page.locator('.case-detail .kr-btn').click();
await waitForScreen('.briefing-screen');
await shot('04-briefing');

const briefingCheck = await page.evaluate(() => {
  const names = ['김구', '윤봉길', '유관순', '안중근', '안창호'];
  const text = document.querySelector('.briefing-screen')?.textContent ?? '';
  return {
    candidateCards: document.querySelectorAll('.candidate-card').length,
    leakedNames: names.filter((name) => text.includes(name)),
    figure: document.querySelector('.unknown-figure')?.getBoundingClientRect().toJSON(),
    documentHeight: document.documentElement.scrollHeight,
  };
});

await page.evaluate(() => {
  const key = 'keeper-of-records:v1';
  const save = JSON.parse(localStorage.getItem(key) ?? '{}');
  const caseId = save.currentCaseId ?? 'case-001';
  save.currentCaseId = caseId;
  save.caseProgress ??= {};
  save.caseProgress[caseId] ??= {};
  save.caseProgress[caseId].stage = 6;
  save.caseProgress[caseId].trackPersonId ??= 'yunbonggil';
  save.caseProgress[caseId].evidenceIds ??= [];
  save.caseProgress[caseId].usedQuestionIds ??= [];
  save.caseProgress[caseId].markedCandidateId ??= null;
  save.caseProgress[caseId].memorySceneSeen ??= true;
  save.caseProgress[caseId].unlockedProfile = true;
  save.completedCaseIds ??= [];
  if (!save.completedCaseIds.includes(caseId)) save.completedCaseIds.push(caseId);
  localStorage.setItem(key, JSON.stringify(save));
});

await page.reload({ waitUntil: 'networkidle' });
await waitForScreen('.title-screen');
await page.getByRole('button', { name: '이어하기' }).click();
await waitForScreen('.archive-screen');
await clickFirstDrawer();
await page.locator('.case-detail .kr-btn').click();
await waitForScreen('.reward-screen');
await page.waitForTimeout(1800);
await shot('05-reward');

const rewardCheck = await page.evaluate(() => ({
  people: [...document.querySelectorAll('.reward-person-chip__name')].map(
    (node) => node.textContent,
  ),
  panel: document.querySelector('.reward-related-people')?.getBoundingClientRect().toJSON(),
  documentHeight: document.documentElement.scrollHeight,
}));

console.log(JSON.stringify({ titleBoxes, archiveBoxes, briefingCheck, rewardCheck, errors }, null, 2));
await browser.close();

if (errors.length) process.exitCode = 1;
