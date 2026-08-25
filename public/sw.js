/* 기록의 주인 — 단순 오프라인 캐시 서비스워커 (라이브러리 없음)
 * - 설치 시: 핵심 셸(문서·매니페스트·아이콘) 프리캐시
 * - assets/data 요청: cache-first (한 번 받은 자료는 오프라인에서도 사용)
 * - 그 외 동일 출처 GET: network-first, 실패 시 캐시 폴백
 */
const CACHE = 'keeper-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** 성공 응답만 캐시에 복사 */
function putCopy(request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE).then((c) => c.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/');

  if (isStatic) {
    // cache-first: 에셋·역사 데이터는 바뀔 일이 드물다
    e.respondWith(
      caches
        .match(request)
        .then((hit) => hit || fetch(request).then((res) => putCopy(request, res))),
    );
  } else {
    // 셸·번들: 최신을 먼저 받고, 오프라인이면 캐시로 폴백
    e.respondWith(
      fetch(request)
        .then((res) => putCopy(request, res))
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match('/')),
        ),
    );
  }
});
