/** 영상 연출 두 편의 대본
 *  자막은 특정 인물·연도를 말하지 않는다. 역사 서술은 반드시 검수된 claim 에서만 나오고,
 *  여기서는 "기록을 복원한다"는 활동 자체만 이야기한다.
 */
import { AssetMap } from '../config/AssetMap';
import { playCinematic, prefetchCinematic, type CinematicCue } from './Cinematic';

/** intro.mp4 길이 16.3초 기준 */
const INTRO_CUES: CinematicCue[] = [
  { at: 0.4, text: '오래된 기록 하나가, 아직 이름을 되찾지 못했습니다.' },
  { at: 4.2, text: '누군가 이름을 지웠지만, 기록이 모두 사라진 것은 아니에요.' },
  { at: 8.0, text: '흩어진 자료를 찾고, 견주어 보고, 이어 붙이면' },
  { at: 11.6, text: '지워진 이름이 다시 떠오릅니다.' },
  { at: 14.4, text: '이제, 여러분이 기록의 주인입니다.' },
];

/** final.mp4 길이 17.1초 기준 */
const FINAL_CUES: CinematicCue[] = [
  { at: 0.4, text: '닫혀 있던 기록의 문이 열렸습니다.' },
  { at: 3.6, text: '여러분이 찾아낸 자료가 지워진 이름을 되살렸어요.' },
  { at: 7.2, text: '이 이름은 이제 다시 기록으로 남습니다.' },
  { at: 11.0, text: '기록을 지킨다는 것은, 그 사람을 기억한다는 뜻이에요.' },
  { at: 14.4, text: '축하합니다. 여러분은 기록의 주인입니다.' },
];

/** 타이틀에서 기록보관소로 들어가기 직전 — 몰입 */
export function playIntroCinematic(onDone: () => void): void {
  playCinematic({
    src: AssetMap.video.intro,
    poster: AssetMap.video.introPoster,
    label: '기록의 주인 시작 영상',
    cues: INTRO_CUES,
    tone: 'intro',
    skipLabel: '시작 영상 건너뛰기',
    onDone,
  });
}

/** 복원 완료 인장을 찍고 인증서로 넘어가기 직전 — 성취 */
export function playFinalCinematic(onDone: () => void): void {
  playCinematic({
    src: AssetMap.video.final,
    poster: AssetMap.video.finalPoster,
    label: '기록 복원 완료 영상',
    cues: FINAL_CUES,
    tone: 'final',
    skipLabel: '완료 영상 건너뛰기',
    onDone,
  });
}

export function prefetchIntroCinematic(): void {
  prefetchCinematic(AssetMap.video.intro);
}

export function prefetchFinalCinematic(): void {
  prefetchCinematic(AssetMap.video.final);
}
