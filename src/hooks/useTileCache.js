import { useEffect, useMemo } from 'react';
import { DEFAULT_ZOOM_LEVELS, SEATTLE_BOUNDS, TILE_CACHE_NAME, getStyleBaseUrl } from '../config/mapConfig.js';
import { prefetchTiles, registerTileCacheServiceWorker } from '../libs/tileCache.js';

export function useTileCache(options = {}) {
    const {
        bounds = SEATTLE_BOUNDS,
        zoomLevels = DEFAULT_ZOOM_LEVELS,
        enabled = true,
        cacheName = TILE_CACHE_NAME,
        styleUrl = getStyleBaseUrl(),
        apiKey = import.meta.env.VITE_API_KEY
    } = options;

    const memoizedOptions = useMemo(() => ({ bounds, zoomLevels, cacheName, styleUrl, apiKey }), [
        bounds,
        zoomLevels,
        cacheName,
        styleUrl,
        apiKey
    ]);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') {
            return undefined;
        }

        let cancelled = false;

        const registerAndPrefetch = async () => {
            await registerTileCacheServiceWorker();
            if (cancelled) {
                return;
            }
            try {
                await prefetchTiles(memoizedOptions);
            } catch (error) {
                console.error('Tile prefetch failed', error);
            }
        };

        registerAndPrefetch();

        return () => {
            cancelled = true;
        };
    }, [enabled, memoizedOptions]);
}
