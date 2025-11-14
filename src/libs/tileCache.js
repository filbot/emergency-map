import { DEFAULT_ZOOM_LEVELS, SEATTLE_BOUNDS, TILE_CACHE_NAME, getStyleBaseUrl } from '../config/mapConfig.js';

const DEFAULT_PREFETCH_OPTIONS = {
    bounds: SEATTLE_BOUNDS,
    zoomLevels: DEFAULT_ZOOM_LEVELS,
    cacheName: TILE_CACHE_NAME,
    styleUrl: getStyleBaseUrl()
};

export async function registerTileCacheServiceWorker(swPath = `${import.meta.env.BASE_URL}tile-cache-sw.js`) {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return undefined;
    }

    try {
        const registration = await navigator.serviceWorker.register(swPath, { scope: import.meta.env.BASE_URL });
        return registration;
    } catch (error) {
        console.error('Failed to register tile cache service worker', error);
        return undefined;
    }
}

export async function prefetchTiles(options = {}) {
    if (typeof window === 'undefined' || !('caches' in window)) {
        return;
    }

    const {
        bounds = DEFAULT_PREFETCH_OPTIONS.bounds,
        zoomLevels = DEFAULT_PREFETCH_OPTIONS.zoomLevels,
        cacheName = DEFAULT_PREFETCH_OPTIONS.cacheName,
        styleUrl = DEFAULT_PREFETCH_OPTIONS.styleUrl,
        apiKey = import.meta.env.VITE_API_KEY
    } = options;

    if (!styleUrl || !apiKey) {
        return;
    }

    const cache = await caches.open(cacheName);
    const fullStyleUrl = ensureKey(styleUrl, apiKey);
    const styleResponse = await fetchAndCache(fullStyleUrl, cache);

    if (!styleResponse) {
        return;
    }

    const styleJson = await styleResponse.clone().json().catch(() => undefined);
    if (!styleJson) {
        return;
    }

    const spriteRequests = buildSpriteRequests(styleJson.sprite, apiKey);
    await fetchInBatches(spriteRequests, cache);

    const tileTemplates = await collectTileTemplates(styleJson, apiKey, cache);
    const tileUrls = expandTileTemplates(tileTemplates, bounds, zoomLevels);
    await fetchInBatches(tileUrls, cache);
}

function ensureKey(url, apiKey) {
    if (!apiKey || url.includes('key=')) {
        return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}key=${apiKey}`;
}

async function fetchAndCache(url, cache) {
    const cached = await cache.match(url);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            await cache.put(url, response.clone());
            return response;
        }
    } catch (error) {
        console.error('Prefetch request failed', url, error);
    }

    return undefined;
}

async function fetchInBatches(urls, cache, batchSize = 6) {
    const queue = [...urls];

    while (queue.length > 0) {
        const batch = queue.splice(0, batchSize);
        await Promise.all(batch.map((url) => fetchAndCache(url, cache)));
    }
}

async function collectTileTemplates(styleJson, apiKey, cache) {
    const templates = new Set();

    const sources = Object.values(styleJson.sources || {});
    for (const source of sources) {
        if (Array.isArray(source.tiles)) {
            source.tiles.forEach((template) => templates.add(ensureKey(template, apiKey)));
            continue;
        }

        if (source.url) {
            const tileJsonUrl = ensureKey(source.url, apiKey);
            const tileJsonResponse = await fetchAndCache(tileJsonUrl, cache);
            if (!tileJsonResponse) {
                continue;
            }
            try {
                const tileJson = await tileJsonResponse.clone().json();
                tileJson.tiles?.forEach((template) => templates.add(ensureKey(template, apiKey)));
            } catch (error) {
                console.error('Failed to parse tilejson', error);
            }
        }
    }

    return Array.from(templates);
}

function buildSpriteRequests(spriteBaseUrl, apiKey) {
    if (!spriteBaseUrl) {
        return [];
    }

    const trimmedBase = spriteBaseUrl.replace(/(\.json|\.png)$/i, '');
    return [
        ensureKey(`${trimmedBase}.json`, apiKey),
        ensureKey(`${trimmedBase}.png`, apiKey)
    ];
}

function expandTileTemplates(templates, bounds, zoomLevels) {
    const urls = [];

    for (const template of templates) {
        for (const zoom of zoomLevels) {
            const range = tileRangeForBounds(bounds, zoom);
            for (let x = range.minX; x <= range.maxX; x += 1) {
                for (let y = range.minY; y <= range.maxY; y += 1) {
                    urls.push(template
                        .replace('{z}', `${zoom}`)
                        .replace('{x}', `${x}`)
                        .replace('{y}', `${y}`)
                        .replace('{ratio}', '1')); // ratio placeholder in some templates
                }
            }
        }
    }

    return urls;
}

function tileRangeForBounds(bounds, zoom) {
    const minX = lon2tile(bounds.minLng, zoom);
    const maxX = lon2tile(bounds.maxLng, zoom);
    const minY = lat2tile(bounds.maxLat, zoom);
    const maxY = lat2tile(bounds.minLat, zoom);

    return {
        minX: Math.min(minX, maxX),
        maxX: Math.max(minX, maxX),
        minY: Math.min(minY, maxY),
        maxY: Math.max(minY, maxY)
    };
}

function lon2tile(lon, zoom) {
    return Math.floor(((lon + 180) / 360) * 2 ** zoom);
}

function lat2tile(lat, zoom) {
    const rad = (lat * Math.PI) / 180;
    return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** zoom);
}

export function getTileCacheOptions() {
    const apiKey = import.meta.env.VITE_API_KEY;
    return {
        cacheName: TILE_CACHE_NAME,
        styleUrl: getStyleBaseUrl(),
        apiKey,
        bounds: SEATTLE_BOUNDS,
        zoomLevels: DEFAULT_ZOOM_LEVELS
    };
}
