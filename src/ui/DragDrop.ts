/** DOM 근거 카드 드래그 — 포인터 이벤트 기반, 태블릿 터치 대응 */
import { Viewport } from '../core/Viewport';

export interface DropZone {
  el: HTMLElement;
  id: string;
}

export function makeDraggable(
  card: HTMLElement,
  zones: () => DropZone[],
  onDrop: (zoneId: string | null, card: HTMLElement) => void,
): void {
  let dragging = false;
  let ghost: HTMLElement | null = null;
  let offX = 0;
  let offY = 0;
  let activeZone: DropZone | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true;
    card.setPointerCapture(e.pointerId);

    const rect = card.getBoundingClientRect();
    const scale = Viewport.scale || 1;
    offX = (e.clientX - rect.left) / scale;
    offY = (e.clientY - rect.top) / scale;

    ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add('dragging');
    ghost.style.position = 'absolute';
    ghost.style.width = `${rect.width / scale}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = 'var(--z-drawer)';
    document.getElementById('ui-overlay')?.appendChild(ghost);
    card.style.opacity = '0.28';
    move(e);
  };

  const move = (e: PointerEvent) => {
    if (!dragging || !ghost) return;
    const pt = Viewport.toStage(e.clientX, e.clientY);
    ghost.style.left = `${pt.x - offX}px`;
    ghost.style.top = `${pt.y - offY}px`;

    const found = zones().find((z) => hitTest(z.el, e.clientX, e.clientY));
    if (found !== activeZone) {
      activeZone?.el.classList.remove('drop-active');
      activeZone = found ?? null;
      activeZone?.el.classList.add('drop-active');
    }
  };

  const up = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    try {
      card.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    ghost?.remove();
    ghost = null;
    card.style.opacity = '';
    activeZone?.el.classList.remove('drop-active');
    const zoneId = activeZone?.id ?? null;
    activeZone = null;
    onDrop(zoneId, card);
  };

  card.addEventListener('pointerdown', onDown);
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerup', up);
  card.addEventListener('pointercancel', up);
}

function hitTest(node: HTMLElement, cx: number, cy: number): boolean {
  const r = node.getBoundingClientRect();
  return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
}
