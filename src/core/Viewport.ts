/** 1600x900 논리 무대 스케일링 + 실제 뷰포트 높이 통일
 *  브라우저별 실제 화면 높이 차이(구글/네이버 QR 등)를 --app-height로 흡수한다.
 */

export const STAGE_W = 1600;
export const STAGE_H = 900;

type ScaleListener = (scale: number) => void;

class ViewportImpl {
  private listeners = new Set<ScaleListener>();
  private stageEl: HTMLElement | null = null;
  private currentScale = 1;
  private rafId = 0;

  init(stageEl: HTMLElement): void {
    this.stageEl = stageEl;
    const apply = () => this.apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    window.visualViewport?.addEventListener('resize', apply);
    // 백그라운드 탭에서는 rAF 콜백이 돌지 않으므로 첫 적용만은 동기로 한다
    this.applyNow();
  }

  get scale(): number {
    return this.currentScale;
  }

  onScale(fn: ScaleListener): () => void {
    this.listeners.add(fn);
    fn(this.currentScale);
    return () => this.listeners.delete(fn);
  }

  /** 리사이즈는 rAF로 묶어 한 프레임에 한 번만 적용 */
  private apply(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => this.applyNow());
  }

  private applyNow(): void {
    const vv = window.visualViewport;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);

    const scale = Math.min(w / STAGE_W, h / STAGE_H);
    this.currentScale = scale;
    if (this.stageEl) {
      this.stageEl.style.transform = `scale(${scale})`;
    }
    this.listeners.forEach((fn) => fn(scale));
  }

  /** 브라우저 좌표 → 무대 논리 좌표 */
  toStage(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.stageEl) return { x: clientX, y: clientY };
    const rect = this.stageEl.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.currentScale,
      y: (clientY - rect.top) / this.currentScale,
    };
  }
}

export const Viewport = new ViewportImpl();
