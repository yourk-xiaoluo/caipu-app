// Production Service Worker for 家常菜谱 PWA
const CACHE_NAME = 'caipu-v1.0.0';
const OFFLINE_URL = '/offline.html';

// 需要预缓存的资源
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/app.css',
    '/favicon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/offline.html'
];

// 安装事件 - 预缓存核心资源
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pre-caching assets');
            return cache.addAll(PRECACHE_ASSETS);
        }).catch(err => {
            console.error('[ServiceWorker] Pre-cache failed:', err);
        })
    );
    self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
    // 只处理GET请求
    if (event.request.method !== 'GET') return;

    // 跳过chrome扩展等非http请求
    if (!event.request.url.startsWith('http')) return;

    const requestUrl = new URL(event.request.url);

    // 对于导航请求（页面），使用网络优先
    if (requestUrl.pathname.match(/\.(html|\/)$/) || event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // 对于静态资源，使用缓存优先
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((fetchResponse) => {
                // 不缓存非成功的响应
                if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type === 'opaque') {
                    return fetchResponse;
                }

                // 缓存新获取的资源
                const responseClone = fetchResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone).catch(() => {});
                });

                return fetchResponse;
            });
        }).catch(() => {
            // 图片请求失败时返回默认图标
            if (requestUrl.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
                return new Response('', { status: 404 });
            }
            return null;
        })
    );
});

// 推送消息通知
self.addEventListener('push', (event) => {
    let data = { title: '家常菜谱', body: '今日有新的菜谱推荐！' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/icon-72.png',
            vibrate: [200, 100, 200],
            tag: 'caipu-notification'
        })
    );
});