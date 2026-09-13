// ============================================================
// Service Worker — Cache First 策略
// 每次部署更新 CACHE_VERSION 讓手機拿到新版
// ============================================================

const CACHE_VERSION = 'v1.1.2';
const CACHE_NAME = `toefl-app-${CACHE_VERSION}`;

// 相對路徑：GitHub Pages 專案網站是子路徑（/toefl-word-list/），
// 絕對路徑（開頭 /）會被解析成網域根目錄，導致快取到錯誤網址。
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data.js',
  './js/srs.js',
  './js/router.js',
  './js/ui.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
    // 注意：這裡刻意不自動呼叫 self.skipWaiting()。新版裝好後會停在
    // waiting 狀態，等使用者在畫面上點「立即更新」才會接手，避免使用
    // 者練習到一半畫面無預警被換掉。
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      });
    })
  );
});
