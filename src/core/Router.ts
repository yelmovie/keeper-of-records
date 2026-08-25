/** 10페이지 화면 전환 관리 — DOM overlay + Phaser scene 동기화 */
import Phaser from 'phaser';
import { EventBus } from './EventBus';
import { cleanupModals } from '../ui/Modal';
import { hideToast } from '../ui/Toast';
import { clear } from '../ui/dom';

export type RouteName =
  | 'title'
  | 'archive'
  | 'briefing'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'reward'
  | 'certificate';

export interface Screen {
  /** DOM overlay 구성. Phaser scene key를 반환하면 해당 scene을 시작한다 */
  mount(overlay: HTMLElement, params?: unknown): void | Promise<void>;
  unmount?(): void;
  phaserScene?: string;
}

class RouterImpl {
  private screens = new Map<RouteName, Screen>();
  private current: { name: RouteName; screen: Screen } | null = null;
  private game: Phaser.Game | null = null;
  private overlay!: HTMLElement;
  private veil!: HTMLElement;
  private transitioning = false;

  init(game: Phaser.Game): void {
    this.game = game;
    this.overlay = document.getElementById('ui-overlay')!;
    this.veil = document.getElementById('transition-veil')!;
  }

  register(name: RouteName, screen: Screen): void {
    this.screens.set(name, screen);
  }

  get currentRoute(): RouteName | null {
    return this.current?.name ?? null;
  }

  async go(name: RouteName, params?: unknown, fade = true): Promise<void> {
    if (this.transitioning) return;
    const screen = this.screens.get(name);
    if (!screen) {
      console.error(`[Router] unknown route: ${name}`);
      return;
    }
    this.transitioning = true;

    if (fade) {
      this.veil.classList.add('active');
      await wait(450);
    }

    // 정리
    hideToast();
    cleanupModals();
    this.current?.screen.unmount?.();
    clear(this.overlay);

    // Phaser scene 전환
    if (this.game) {
      const mgr = this.game.scene;
      mgr.getScenes(true).forEach((s) => {
        const key = (s as Phaser.Scene).scene.key;
        if (key !== screen.phaserScene) mgr.stop(key);
      });
      if (screen.phaserScene) {
        if (mgr.isActive(screen.phaserScene)) mgr.stop(screen.phaserScene);
        mgr.start(screen.phaserScene, params as object | undefined);
        // Scene 의 create() 가 끝난 뒤에 DOM 화면을 붙인다.
        // (그러지 않으면 화면이 Scene 객체를 만지다 undefined 를 만난다)
        await this.waitForSceneCreate(screen.phaserScene);
      }
    }

    this.current = { name, screen };
    try {
      await screen.mount(this.overlay, params);
    } catch (err) {
      // 화면이 검게 멈추지 않도록 반드시 veil을 걷는다
      console.error(`[Router] ${name} 화면을 구성하지 못했습니다`, err);
    }
    EventBus.emit('SCENE_CHANGED', { route: name });

    if (fade) {
      await wait(60);
      this.veil.classList.remove('active');
      await wait(300);
    }
    this.transitioning = false;
  }

  private waitForSceneCreate(key: string): Promise<void> {
    const scene = this.game?.scene.getScene(key);
    if (!scene) return Promise.resolve();
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve();
      };
      const timer = window.setTimeout(done, 2000);
      scene.events.once(Phaser.Scenes.Events.CREATE, done);
    });
  }

  getScene(key: string): Phaser.Scene | null {
    return (this.game?.scene.getScene(key) as Phaser.Scene) ?? null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

export const Router = new RouterImpl();
