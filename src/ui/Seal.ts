/** 기록 복원 인장 — 전각 도장을 절제된 팔레트로 그린 SVG.
 *  생성 이미지 보상 에셋(붉은 술 달린 도장·훈장)은 중국 판타지 톤이라 사용하지 않는다.
 */
const NS = 'http://www.w3.org/2000/svg';

export function restorationSeal(size = 190): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '기록 복원 인장');

  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', 'seal-brass');
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0.3');
  grad.setAttribute('y2', '1');
  [
    ['0%', '#f0dcae'],
    ['42%', '#c9a05a'],
    ['100%', '#8a7040'],
  ].forEach(([offset, color]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', 'translate(100 100)');

  // 바깥 놋쇠 테
  const outer = document.createElementNS(NS, 'circle');
  outer.setAttribute('r', '88');
  outer.setAttribute('fill', 'none');
  outer.setAttribute('stroke', 'url(#seal-brass)');
  outer.setAttribute('stroke-width', '5');
  g.appendChild(outer);

  const inner = document.createElementNS(NS, 'circle');
  inner.setAttribute('r', '78');
  inner.setAttribute('fill', 'rgba(156, 59, 52, 0.14)');
  inner.setAttribute('stroke', 'rgba(201, 160, 90, 0.5)');
  inner.setAttribute('stroke-width', '1.4');
  g.appendChild(inner);

  // 테두리 눈금 (전각 도장의 각인 느낌)
  for (let i = 0; i < 24; i++) {
    const tick = document.createElementNS(NS, 'line');
    tick.setAttribute('x1', '0');
    tick.setAttribute('y1', '-83');
    tick.setAttribute('x2', '0');
    tick.setAttribute('y2', i % 6 === 0 ? '-73' : '-78');
    tick.setAttribute('stroke', 'rgba(201, 160, 90, 0.45)');
    tick.setAttribute('stroke-width', '1.6');
    tick.setAttribute('stroke-linecap', 'round');
    tick.setAttribute('transform', `rotate(${i * 15})`);
    g.appendChild(tick);
  }

  // 무궁화 — 다섯 장의 둥근 꽃잎이 고르게 퍼지고, 가운데에 붉은 단심이 있다.
  // (예전에는 꽃잎이 한쪽으로 휘어 바람개비처럼 보였다)
  for (let i = 0; i < 5; i++) {
    const petal = document.createElementNS(NS, 'path');
    petal.setAttribute(
      'd',
      'M0 0 C -13 -13, -21 -30, -12 -42 C -6 -49, 6 -49, 12 -42 C 21 -30, 13 -13, 0 0 Z',
    );
    petal.setAttribute('fill', 'url(#seal-brass)');
    petal.setAttribute('opacity', '0.94');
    petal.setAttribute('transform', `rotate(${i * 72}) translate(0 -4)`);
    g.appendChild(petal);
  }
  // 단심 — 붉은 가운데와 짧게 뻗는 무늬
  for (let i = 0; i < 5; i++) {
    const vein = document.createElementNS(NS, 'line');
    vein.setAttribute('x1', '0');
    vein.setAttribute('y1', '-4');
    vein.setAttribute('x2', '0');
    vein.setAttribute('y2', '-24');
    vein.setAttribute('stroke', '#9c3b34');
    vein.setAttribute('stroke-width', '2.4');
    vein.setAttribute('stroke-linecap', 'round');
    vein.setAttribute('opacity', '0.8');
    vein.setAttribute('transform', `rotate(${i * 72})`);
    g.appendChild(vein);
  }
  const core = document.createElementNS(NS, 'circle');
  core.setAttribute('cy', '-4');
  core.setAttribute('r', '9');
  core.setAttribute('fill', '#9c3b34');
  g.appendChild(core);

  // 아래쪽 글씨
  const label = document.createElementNS(NS, 'text');
  label.setAttribute('y', '52');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '22');
  label.setAttribute('letter-spacing', '5');
  label.setAttribute('font-family', "'Noto Serif KR', 'Batang', serif");
  label.setAttribute('font-weight', '700');
  label.setAttribute('fill', '#e8d3a3');
  label.textContent = '기록 복원';
  g.appendChild(label);

  svg.appendChild(g);
  return svg;
}
