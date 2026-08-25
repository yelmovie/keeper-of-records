import Phaser from 'phaser';
import '@fontsource/jua';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/components.css';
import './ui/styles/screens.css';
import './ui/styles/certificate.css';
import './ui/styles/fx-discovery.css';
import './ui/styles/fx-climax.css';
import './ui/styles/fx-story.css';
import './ui/styles/fx-cinematic.css';
import './ui/styles/fx-tapcue.css';
import './ui/styles/kidflow-a.css';
import './ui/styles/kidflow-b.css';

import { STAGE_W, STAGE_H, Viewport } from './core/Viewport';
import { Router } from './core/Router';
import { AudioManager } from './core/AudioManager';
import { loadClaims } from './data/loaders';
import { installDevHooks } from './core/DevHooks';

import { TitleScene } from './scenes/TitleScene';
import { ArchiveScene } from './scenes/ArchiveScene';
import { BriefingScene } from './scenes/BriefingScene';
import { Stage1Scene } from './scenes/Stage1Scene';
import { Stage2Scene } from './scenes/Stage2Scene';
import { Stage3Scene } from './scenes/Stage3Scene';
import { Stage5Scene } from './scenes/Stage5Scene';
import { RewardScene } from './scenes/RewardScene';

import { TitleScreen } from './ui/screens/TitleScreen';
import { ArchiveScreen } from './ui/screens/ArchiveScreen';
import { BriefingScreen } from './ui/screens/BriefingScreen';
import { Stage1Screen } from './ui/screens/Stage1Screen';
import { Stage2Screen } from './ui/screens/Stage2Screen';
import { Stage3Screen } from './ui/screens/Stage3Screen';
import { Stage5Screen } from './ui/screens/Stage5Screen';
import { RewardScreen } from './ui/screens/RewardScreen';
import { CertificateScreen } from './ui/screens/CertificateScreen';

function showFatal(message: string): void {
  const overlay = document.getElementById('ui-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'fatal-error';
  box.innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = '자료를 불러오지 못했습니다';
  const p = document.createElement('p');
  p.textContent = message;
  const btn = document.createElement('button');
  btn.className = 'kr-btn kr-btn--primary';
  btn.textContent = '다시 시도';
  btn.addEventListener('click', () => window.location.reload());
  box.append(h, p, btn);
  overlay.appendChild(box);
}

async function boot(): Promise<void> {
  const stage = document.getElementById('stage');
  if (!stage) return;
  Viewport.init(stage);

  // 첫 사용자 입력에서 오디오 활성화
  const unlock = () => {
    AudioManager.unlock();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Phaser 캔버스 텍스트가 폴백 폰트로 굳지 않게, 폰트 로드를 잠깐 기다린다 (최대 2초)
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('20px Pretendard'),
        document.fonts.load('20px Jua'),
      ]),
      new Promise((r) => window.setTimeout(r, 2000)),
    ]);
  } catch {
    /* 폰트 실패 시 폴백으로 진행 */
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'phaser-root',
    width: STAGE_W,
    height: STAGE_H,
    backgroundColor: '#0a1020',
    transparent: false,
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
    // 캔버스에서만 입력을 받는다. window 단위로 받으면 Phaser가 preventDefault 를 걸어
    // DOM 오버레이 버튼의 click 이벤트가 사라진다.
    input: { windowEvents: false, activePointers: 3 },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: [
      TitleScene,
      ArchiveScene,
      BriefingScene,
      Stage1Scene,
      Stage2Scene,
      Stage3Scene,
      Stage5Scene,
      RewardScene,
    ],
  });

  await new Promise<void>((resolve) => game.events.once('ready', () => resolve()));

  Router.init(game);
  Router.register('title', TitleScreen);
  Router.register('archive', ArchiveScreen);
  Router.register('briefing', BriefingScreen);
  Router.register('stage1', Stage1Screen);
  Router.register('stage2', Stage2Screen);
  Router.register('stage3', Stage3Screen);
  Router.register('stage4', Stage5Screen);
  Router.register('reward', RewardScreen);
  Router.register('certificate', CertificateScreen);

  try {
    await loadClaims();
  } catch (err) {
    showFatal(
      err instanceof Error ? err.message : '역사 출처 데이터를 읽을 수 없습니다.',
    );
    return;
  }

  installDevHooks();
  await Router.go('title', undefined, false);
}

boot().catch((err) => {
  console.error(err);
  showFatal(err instanceof Error ? err.message : String(err));
});
