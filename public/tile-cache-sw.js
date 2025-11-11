const CACHE_NAME = 'seattle-map-tiles-v1';
const TILE_HOSTNAMES = ['api.maptiler.com'];

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key.startsWith('seattle-map-tiles') && key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);
    if (!shouldCache(url)) {
        return;
    }

    event.respondWith(cacheFirst(request));
});

self.addEventListener('message', (event) => {
    const { data } = event;
    if (!data || data.type !== 'PREFETCH_TILE_URLS' || !Array.isArray(data.urls)) {
        return;
    }

    event.waitUntil(prefetchUrls(data.urls));
});

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response && response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return cached || Response.error();
    }
}

async function prefetchUrls(urls = []) {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(urls.map(async (url) => {
        const match = await cache.match(url);
        if (match) {
            return;
        }

        try {
            const response = await fetch(url, { mode: 'cors' });
            if (response.ok) {
                await cache.put(url, response.clone());
            }
        } catch (error) {
            console.error('Prefetch failed for', url, error);
        }
    }));
}

function shouldCache(url) {
    return TILE_HOSTNAMES.some((host) => url.hostname === host);
}
