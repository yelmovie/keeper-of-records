/** Interaction Registry
 *  Case JSON의 hotspot.interaction 값으로 조작 모듈을 선택한다.
 *  새 조작을 추가할 때 이 파일에 등록만 하면 된다.
 */
import type { InteractionRegistry as Registry } from './types';
import { createDrawer } from './DrawerInteraction';
import { createEnvelope } from './EnvelopeInteraction';
import { createFlip } from './FlipInteraction';
import { createRub } from './RubInteraction';
import { createRotate } from './RotateInteraction';
import { createPuzzle } from './PuzzleInteraction';
import { createTap } from './TapInteraction';
import { createPinch } from './PinchInteraction';

export const InteractionRegistry: Registry = {
  drawer: createDrawer,
  envelope: createEnvelope,
  flip: createFlip,
  rub: createRub,
  rotate: createRotate,
  puzzle: createPuzzle,
  tap: createTap,
  pinch: createPinch,
};

export * from './types';
