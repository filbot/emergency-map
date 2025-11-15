import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_ZOOM_LEVELS, SEATTLE_BOUNDS, TILE_CACHE_NAME, getStyleBaseUrl } from '../config/mapConfig.js';
import { prefetchTiles, registerTileCacheServiceWorker } from '../libs/tileCache.js';
import { hasDemoFlag } from '../config/demoFlags.js';

/**
 * Prefetches and monitors tile caching so the kiosk map can operate offline.
 * @param {Object} options Hook configuration.
 * @returns {{isPrefetching: boolean, lastPrefetch: number|null, error: Object|null, retry: () => Promise<boolean>}}
 */
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

    const [tileCacheState, setTileCacheState] = useState({
        isPrefetching: false,
        lastPrefetch: null,
        error: null
    });

    const isMountedRef = useRef(true);

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const performPrefetch = useCallback(async () => {
        if (!enabled || typeof window === 'undefined') {
            return false;
        }

        if (!isMountedRef.current) {
            return false;
        }

        setTileCacheState((previous) => ({
            ...previous,
            isPrefetching: true
        }));

        try {
            await registerTileCacheServiceWorker();
            const success = await prefetchTiles(memoizedOptions);

            if (!isMountedRef.current) {
                return success;
            }

            if (!success) {
                setTileCacheState({
                    isPrefetching: false,
                    lastPrefetch: null,
                    error: {
                        id: 'tile-cache',
                        source: 'tile-cache',
                        friendlyName: 'Map tiles',
                        message: 'The map is showing saved imagery while we reconnect to the tile service. We\'ll keep trying in the background.',
                        detail: null,
                        timestamp: Date.now(),
                        canRetry: true
                    }
                });
                return false;
            }

            setTileCacheState({
                isPrefetching: false,
                lastPrefetch: Date.now(),
                error: null
            });
            return true;
        } catch (error) {
            if (!isMountedRef.current) {
                return false;
            }

            if (error?.name === 'AbortError') {
                setTileCacheState((previous) => ({
                    ...previous,
                    isPrefetching: false
                }));
                return false;
            }

            console.error('Tile prefetch failed', error);

            const detail = typeof error?.message === 'string' && error.message.trim().length > 0
                ? error.message.trim()
                : null;

            setTileCacheState({
                isPrefetching: false,
                lastPrefetch: null,
                error: {
                    id: 'tile-cache',
                    source: 'tile-cache',
                    friendlyName: 'Map tiles',
                    message: 'The map tiles are offline. We\'ll keep retrying automatically.',
                    detail,
                    timestamp: Date.now(),
                    canRetry: true
                }
            });
            return false;
        }
    }, [enabled, memoizedOptions]);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') {
            if (isMountedRef.current) {
                setTileCacheState((previous) => ({
                    isPrefetching: false,
                    lastPrefetch: previous.lastPrefetch,
                    error: null
                }));
            }
            return undefined;
        }

        performPrefetch();

        return undefined;
    }, [enabled, memoizedOptions, performPrefetch]);

    const retry = useCallback(() => performPrefetch(), [performPrefetch]);

    const demoTileError = useMemo(() => {
        if (!hasDemoFlag('tile-error')) {
            return null;
        }
        return {
            id: 'demo-tile-cache',
            source: 'tile-cache',
            friendlyName: 'Map tiles (demo)',
            message: 'Demo mode: Map tiles are offline. Remove ?demo=tile-error to clear.',
            detail: 'Injected via ?demo=tile-error.',
            timestamp: Date.now(),
            canRetry: false
        };
    }, []);

    return {
        ...tileCacheState,
        error: tileCacheState.error ?? demoTileError,
        retry
    };
}
