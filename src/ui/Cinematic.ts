/** 시네마틱 영상 연출 — 인트로(몰입) · 파이널(성취)
 *  영상 자체가 연출이므로 화면 위 장식은 최소로 두고, 자막과 건너뛰기만 얹는다.
 *  영상이 없거나 재생이 막혀도 진행이 멈추면 안 되므로 어떤 실패든 onDone 으로 빠져나간다.
 */
import { el, button } from './dom';

export interface CinematicCue {
  /** 영상 시작 기준 초 */
  at: number;
  text: string;
}

export interface CinematicOptions {
  src: string;
  poster?: string;
  /** 스크린리더용 설명 */
  label: string;
  cues: CinematicCue[];
  tone: 'intro' | 'final';
  skipLabel?: string;
  onDone: () => void;
}

/** 다운로드 또는 메타데이터가 오지 않으면 이 시간 뒤 그냥 넘어간다. */
const METADATA_TIMEOUT_MS = 20000;
/** 재생이 멈춰버린 경우를 대비한 안전 상한 (영상 길이 + 여유) */
const OVERRUN_MS = 6000;

let active = false;
const videoBlobCache = new Map<string, Promise<Blob | null>>();

function fetchVideoBlob(src: string): Promise<Blob | null> {
  const cached = videoBlobCache.get(src);
  if (cached) return cached;
  const request = fetch(src, { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`video ${response.status}`);
      return response.blob();
    })
    .catch(() => null);
  videoBlobCache.set(src, request);
  return request;
}

/** 첫 화면 렌더가 끝난 뒤 낮은 우선순위로 영상을 캐시에 받아 둔다. */
export function prefetchCinematic(src: string): void {
  if (videoBlobCache.has(src)) return;
  const start = () => void fetchVideoBlob(src);
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 1500 });
  } else {
    window.setTimeout(start, 800);
  }
}


export function playCinematic(opts: CinematicOptions): void {
  const layer = document.getElementById('modal-layer');
  if (!layer || active) {
    opts.onDone();
    return;
  }
  active = true;
  layer.style.pointerEvents = 'auto';

  // 원본 영상은 음향이 없는 연출 영상이므로 현재 화면의 BGM을 이어서 사용한다.
  // 별도 음원을 추가로 초기 로드하지 않아 시작 속도에도 영향을 주지 않는다.

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  const video = document.createElement('video');
  video.className = 'cinematic__video';
  if (opts.poster) video.poster = opts.poster;
  video.preload = 'auto';
  video.playsInline = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  // 원본 영상은 무음이며, 소리는 AudioManager의 현재 BGM이 담당한다.
  video.muted = true;

  const captionText = el('span', { class: 'cinematic__caption-text' });
  const caption = el(
    'p',
    { class: 'cinematic__caption', role: 'status', 'aria-live': 'polite' },
    [captionText],
  );
  const loading = el(
    'div',
    { class: 'cinematic__loading', role: 'status', 'aria-live': 'polite' },
    [
      el('span', { class: 'cinematic__spinner', 'aria-hidden': 'true' }),
      el('span', { text: '영상 준비 중…' }),
    ],
  );

  const root = el(
    'div',
    {
      class: `cinematic cinematic--${opts.tone} is-buffering${reduceMotion ? ' is-still' : ''}`,
      role: 'dialog',
      'aria-label': opts.label,
    },
    [
      video,
      el('div', { class: 'cinematic__vignette', 'aria-hidden': 'true' }),
      loading,
      caption,
    ],
  );

  let closed = false;
  let rafId = 0;
  let metaTimer = 0;
  let overrunTimer = 0;
  let cueIndex = -1;
  let playbackStarted = false;
  let objectUrl: string | null = null;

  const cues = [...opts.cues].sort((a, b) => a.at - b.at);

  const finish = (): void => {
    if (closed) return;
    closed = true;
    active = false;
    cancelAnimationFrame(rafId);
    window.clearTimeout(metaTimer);
    window.clearTimeout(overrunTimer);
    document.removeEventListener('keydown', onKey);
    video.pause();
    // 브라우저가 남은 버퍼를 계속 물고 있지 않도록 확실히 끊는다
    video.removeAttribute('src');
    video.load();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }

    root.classList.add('is-leaving');
    window.setTimeout(() => {
      root.remove();
      if (layer.childElementCount === 0) layer.style.pointerEvents = 'none';
      opts.onDone();
    }, 620);
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    }
  };

  const tick = (): void => {
    if (closed) return;
    const t = video.currentTime;
    let next = -1;
    for (let i = 0; i < cues.length; i++) {
      if (cues[i].at <= t) next = i;
      else break;
    }
    if (next !== cueIndex) {
      cueIndex = next;
      captionText.textContent = next >= 0 ? cues[next].text : '';
      caption.classList.remove('show');
      // 다음 프레임에 클래스를 다시 붙여야 페이드가 처음부터 재생된다
      if (next >= 0) requestAnimationFrame(() => caption.classList.add('show'));
    }
    rafId = requestAnimationFrame(tick);
  };

  const startPlayback = (): void => {
    if (closed || playbackStarted) return;
    playbackStarted = true;
    root.classList.remove('is-buffering');
    const ms = Number.isFinite(video.duration) ? video.duration * 1000 : 20000;
    overrunTimer = window.setTimeout(finish, ms + OVERRUN_MS);
    video.play().catch(() => {
      // 소리 있는 재생이 막힌 환경에서는 영상 진행을 우선해 음소거로 재시도한다.
      video.muted = true;
      video.play().catch(finish);
    });
  };

  const tryStartPlayback = (): void => {
    if (!playbackStarted && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      startPlayback();
    }
  };

  video.addEventListener('loadedmetadata', () => {
    window.clearTimeout(metaTimer);
    root.classList.add('is-ready');
    tryStartPlayback();
  });
  video.addEventListener('progress', tryStartPlayback);
  video.addEventListener('canplay', tryStartPlayback);
  video.addEventListener('canplaythrough', tryStartPlayback);
  video.addEventListener('waiting', () => root.classList.add('is-buffering'));
  video.addEventListener('stalled', () => root.classList.add('is-buffering'));
  video.addEventListener('playing', () => root.classList.remove('is-buffering'));
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);

  const skip = button(opts.skipLabel ?? '건너뛰기', finish, {
    variant: 'ghost',
    size: 'sm',
    class: 'cinematic__skip',
  });
  root.appendChild(skip);

  layer.appendChild(root);
  requestAnimationFrame(() => root.classList.add('show'));
  document.addEventListener('keydown', onKey);

  metaTimer = window.setTimeout(finish, METADATA_TIMEOUT_MS);

  // 완전한 Blob을 만든 뒤 재생하므로 네트워크 속도가 흔들려도 중간에 멈추지 않는다.
  void fetchVideoBlob(opts.src).then((blob) => {
    if (closed) return;
    if (blob) {
      objectUrl = URL.createObjectURL(blob);
      video.src = objectUrl;
    } else {
      // 캐시 다운로드 실패 시에만 일반 스트리밍으로 안전하게 대체한다.
      video.src = opts.src;
    }
    video.load();
  });

  rafId = requestAnimationFrame(tick);
}
