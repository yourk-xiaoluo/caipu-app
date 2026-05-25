// Development Service Worker for 家常菜谱 PWA
const CACHE_NAME = 'caipu-dev-v1';
const OFFLINE_URL = '/offline.html';

// 核心资源预缓存
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html',
    '/icon-192.png',
    '/icon-512.png'
];

// 安装事件 - 预缓存核心资源
self.addEventListener('install', (event) => {
    console.log('[SW-Dev] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch(err => {
                console.warn('[SW-Dev] Some assets failed to cache:', err);
            });
        })
    );
    self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[SW-Dev] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 请求拦截 - 网络优先策略（开发模式）
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith('http')) return;

    // 对于导航请求，网络优先
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // 其他请求直接走网络，失败时回退到缓存
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
