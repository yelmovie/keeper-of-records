/** BGM(HTMLAudio) + 절제된 합성 SFX(WebAudio) 중앙 관리
 *  - 사용자 첫 입력 이후에만 재생 (자동재생 정책 대응)
 *  - 현재 트랙 + 예고 트랙만 로드
 */
import { SaveManager } from './SaveManager';
import { AssetMap } from '../config/AssetMap';

export type BgmKey =
  | 'main'
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'stage5';

export type SfxKey =
  | 'evidenceFound'
  | 'evidenceLinked'
  | 'sharedEvidence'
  | 'questionUnlock'
  | 'slotOk'
  | 'slotConflict'
  | 'restoreComplete'
  | 'bukHit'
  | 'uiTap'
  | 'paper';

const BGM_FILES: Record<BgmKey, string> = AssetMap.audio;

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private currentBgm: HTMLAudioElement | null = null;
  private currentKey: BgmKey | null = null;
  private unlocked = false;
  private fadeTimer: number | null = null;
  private cache = new Map<BgmKey, HTMLAudioElement>();

  /** 첫 사용자 입력에서 호출 */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
    if (this.currentKey) {
      const key = this.currentKey;
      this.currentKey = null;
      this.playBgm(key);
    }
  }

  get muted(): boolean {
    return SaveManager.get().settings.muted;
  }

  toggleMute(): boolean {
    const s = SaveManager.get().settings;
    s.muted = !s.muted;
    SaveManager.save();
    if (this.currentBgm) {
      this.currentBgm.volume = s.muted ? 0 : s.bgm;
    }
    return s.muted;
  }

  private getAudio(key: BgmKey): HTMLAudioElement {
    let el = this.cache.get(key);
    if (!el) {
      el = new Audio(BGM_FILES[key]);
      el.loop = true;
      el.preload = 'auto';
      this.cache.set(key, el);
    }
    return el;
  }

  /** 다음 Stage BGM 미리 로드 */
  preload(key: BgmKey): void {
    this.getAudio(key);
  }

  playBgm(key: BgmKey, fadeMs = 900): void {
    if (this.currentKey === key) return;
    this.currentKey = key;
    if (!this.unlocked) return;

    const next = this.getAudio(key);
    const targetVol = this.muted ? 0 : SaveManager.get().settings.bgm;
    const prev = this.currentBgm;
    this.currentBgm = next;

    if (this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }

    next.volume = 0;
    void next.play().catch(() => {
      /* 재생 실패해도 앱 계속 */
    });

    const steps = 18;
    const stepMs = fadeMs / steps;
    let i = 0;
    this.fadeTimer = window.setInterval(() => {
      i++;
      const t = i / steps;
      next.volume = targetVol * t;
      if (prev && prev !== next) prev.volume = Math.max(0, targetVol * (1 - t));
      if (i >= steps) {
        if (this.fadeTimer !== null) window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        if (prev && prev !== next) {
          prev.pause();
          prev.currentTime = 0;
        }
      }
    }, stepMs);
  }

  setBgmVolume(v: number): void {
    const s = SaveManager.get().settings;
    s.bgm = Math.min(1, Math.max(0, v));
    SaveManager.save();
    if (this.currentBgm && !this.muted) this.currentBgm.volume = s.bgm;
  }

  setSfxVolume(v: number): void {
    const s = SaveManager.get().settings;
    s.sfx = Math.min(1, Math.max(0, v));
    SaveManager.save();
  }

  /** 복원 직전 정적 연출: BGM 을 부드럽게 낮췄다가 되살린다 (뚝 끊기지 않게) */
  duck(ms = 1600): void {
    const el = this.currentBgm;
    if (!el) return;
    const orig = this.muted ? 0 : SaveManager.get().settings.bgm;
    const FADE_OUT = 600;
    const FADE_IN = 1100;
    const ramp = (from: number, to: number, dur: number, done?: () => void) => {
      const t0 = performance.now();
      const step = (now: number) => {
        if (this.currentBgm !== el) return; // 곡이 바뀌었으면 손대지 않는다
        const p = Math.min(1, (now - t0) / dur);
        el.volume = from + (to - from) * p;
        if (p < 1) requestAnimationFrame(step);
        else done?.();
      };
      requestAnimationFrame(step);
    };
    ramp(el.volume, orig * 0.12, FADE_OUT);
    window.setTimeout(() => {
      if (this.currentBgm === el) ramp(el.volume, orig, FADE_IN);
    }, Math.max(ms - FADE_IN, FADE_OUT));
  }

  stopBgm(): void {
    this.currentKey = null;
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm = null;
    }
  }

  /** 절제된 합성 효과음 — 외부 파일 없이 WebAudio로 생성 */
  sfx(key: SfxKey): void {
    if (!this.ctx || this.muted) return;
    const vol = SaveManager.get().settings.sfx;
    if (vol <= 0) return;
    const c = this.ctx;
    const t0 = c.currentTime;
    const master = c.createGain();
    master.gain.value = vol * 0.5;
    master.connect(c.destination);

    const tone = (
      freq: number,
      dur: number,
      delay = 0,
      type: OscillatorType = 'sine',
      gainMul = 1,
    ) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t0 + delay);
      g.gain.linearRampToValueAtTime(0.6 * gainMul, t0 + delay + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur);
      osc.connect(g).connect(master);
      osc.start(t0 + delay);
      osc.stop(t0 + delay + dur + 0.05);
    };

    const noise = (dur: number, delay = 0, lp = 1200, gainMul = 1) => {
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lp;
      const g = c.createGain();
      g.gain.value = 0.35 * gainMul;
      src.connect(filter).connect(g).connect(master);
      src.start(t0 + delay);
    };

    switch (key) {
      case 'uiTap':
        tone(660, 0.08, 0, 'sine', 0.4);
        break;
      case 'paper':
        noise(0.16, 0, 2400, 0.5);
        break;
      case 'evidenceFound':
        tone(523, 0.18, 0, 'sine');
        tone(784, 0.26, 0.09, 'sine', 0.7);
        break;
      case 'evidenceLinked':
        tone(440, 0.14, 0, 'triangle', 0.6);
        tone(659, 0.2, 0.07, 'triangle', 0.6);
        break;
      case 'sharedEvidence':
        tone(392, 0.22, 0, 'sine', 0.55);
        tone(494, 0.22, 0.0, 'sine', 0.4);
        break;
      case 'questionUnlock':
        tone(587, 0.16, 0, 'sine', 0.6);
        tone(880, 0.3, 0.1, 'sine', 0.5);
        break;
      case 'slotOk':
        tone(523, 0.12, 0, 'triangle', 0.5);
        tone(659, 0.18, 0.06, 'triangle', 0.5);
        break;
      case 'slotConflict':
        tone(233, 0.28, 0, 'sine', 0.5);
        tone(220, 0.3, 0.1, 'sine', 0.4);
        break;
      case 'bukHit':
        // 깊은 북 울림
        tone(72, 0.9, 0, 'sine', 1.4);
        tone(48, 1.2, 0.01, 'sine', 1.1);
        noise(0.1, 0, 500, 0.9);
        break;
      case 'restoreComplete':
        tone(392, 0.5, 0, 'sine', 0.7);
        tone(523, 0.6, 0.18, 'sine', 0.7);
        tone(659, 0.8, 0.36, 'sine', 0.7);
        tone(784, 1.2, 0.54, 'sine', 0.8);
        break;
    }
  }
}

export const AudioManager = new AudioManagerImpl();
