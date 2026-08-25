/** 최소 DOM 헬퍼 — innerHTML 조립 대신 사용 */

type Attrs = Record<string, string | number | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string | null | undefined)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k.startsWith('data-') || k === 'role' || k === 'aria-label')
      node.setAttribute(k, String(v));
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** 버튼: 루트에 이벤트 등록, 내부 요소는 pointer-events none (components.css) */
export function button(
  label: string,
  onClick: () => void,
  opts: { variant?: 'primary' | 'ghost' | 'default'; size?: 'sm' | 'lg'; class?: string } = {},
): HTMLButtonElement {
  const cls = ['kr-btn'];
  if (opts.variant === 'primary') cls.push('kr-btn--primary');
  if (opts.variant === 'ghost') cls.push('kr-btn--ghost');
  if (opts.size === 'lg') cls.push('kr-btn--lg');
  if (opts.size === 'sm') cls.push('kr-btn--sm');
  if (opts.class) cls.push(opts.class);
  const b = el('button', { class: cls.join(' '), type: 'button' }, [label]);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    onClick();
  });
  return b;
}

/** 인라인 SVG 아이콘 (이모지 금지) */
export function icon(path: string, viewBox = '0 0 24 24'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  svg.appendChild(p);
  return svg;
}

export const ICONS = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  sound: 'M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  mute: 'M4 9v6h4l5 4V5L8 9H4zM17 9.5l4 5M21 9.5l-4 5',
  lens: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4.5 4.5',
  book: 'M4 5.5A2 2 0 0 1 6 3.5h13v15H6a2 2 0 0 0-2 2v-15zM19 18.5H6',
  print: 'M7 9V3.5h10V9M7 17H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M7 14h10v6.5H7z',
  close: 'M6 6l12 12M18 6L6 18',
  archive: 'M3 6.5h18v3H3zM4.5 9.5v10h15v-10M9.5 13.5h5',
  hint: 'M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3zM9.5 20h5',
  back: 'M15 5l-7 7 7 7',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1',
  tap: 'M11.5 12.5V5a1.6 1.6 0 0 1 3.2 0v7l3 .9a2 2 0 0 1 1.4 2.4l-.8 3a3 3 0 0 1-2.9 2.2h-3.5a3 3 0 0 1-2.4-1.2l-3-4a1.4 1.4 0 0 1 2.1-1.8l1.7 1.7zM8.5 6a4.5 4.5 0 0 1 7.6-3',
} as const;
