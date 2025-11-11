const DEFAULT_STYLE_BASE_URL = import.meta.env.VITE_MAP_STYLE_URL
    || 'https://api.maptiler.com/maps/dataviz-dark/style.json';

export const SEATTLE_BOUNDS = {
    minLng: -122.459696,
    maxLng: -122.224433,
    minLat: 47.481002,
    maxLat: 47.734136
};

export const DEFAULT_ZOOM_LEVELS = [11, 12, 13, 14];

export const TILE_CACHE_NAME = 'seattle-map-tiles-v1';

export function getMapStyleUrl(apiKey) {
    if (!apiKey || DEFAULT_STYLE_BASE_URL.includes('key=')) {
        return DEFAULT_STYLE_BASE_URL;
    }

    const separator = DEFAULT_STYLE_BASE_URL.includes('?') ? '&' : '?';
    return `${DEFAULT_STYLE_BASE_URL}${separator}key=${apiKey}`;
}

export function getStyleBaseUrl() {
    return DEFAULT_STYLE_BASE_URL;
}
