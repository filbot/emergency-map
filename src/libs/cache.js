const STORAGE_PREFIX = 'emergency-map';
const LAST_FETCH_KEY = `${STORAGE_PREFIX}:lastSuccessfulFetch`;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getSessionStorage() {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return undefined;
    }
    return window.sessionStorage;
}

function buildCollectionKey(source) {
    return `${STORAGE_PREFIX}:collection:${source}`;
}

export function readCachedCollection(source, maxAgeMs = CACHE_TTL_MS) {
    const storage = getSessionStorage();
    if (!storage) {
        return undefined;
    }

    try {
        const cachedValue = storage.getItem(buildCollectionKey(source));
        if (!cachedValue) {
            return undefined;
        }

        const { timestamp, data } = JSON.parse(cachedValue);
        if (!Array.isArray(data) || typeof timestamp !== 'number') {
            storage.removeItem(buildCollectionKey(source));
            return undefined;
        }

        if (Date.now() - timestamp > maxAgeMs) {
            storage.removeItem(buildCollectionKey(source));
            return undefined;
        }

        return data;
    } catch {
        storage.removeItem(buildCollectionKey(source));
        return undefined;
    }
}

export function writeCachedCollection(source, data) {
    const storage = getSessionStorage();
    if (!storage || !Array.isArray(data)) {
        return;
    }

    try {
        storage.setItem(buildCollectionKey(source), JSON.stringify({
            timestamp: Date.now(),
            data
        }));
    } catch {
        // Storage might be full or unavailable; fail silently
    }
}

export function readLastFetchTimestamp() {
    const storage = getSessionStorage();
    if (!storage) {
        return undefined;
    }

    const value = storage.getItem(LAST_FETCH_KEY);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        storage.removeItem(LAST_FETCH_KEY);
        return undefined;
    }

    return parsed;
}

export function writeLastFetchTimestamp(timestamp) {
    const storage = getSessionStorage();
    if (!storage || !Number.isFinite(timestamp)) {
        return;
    }

    storage.setItem(LAST_FETCH_KEY, `${timestamp}`);
}
