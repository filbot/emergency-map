const DEMO_PARAM = 'demo';
let cachedFlags;

function parseFlagsFromLocation() {
    if (typeof window === 'undefined' || typeof window.location === 'undefined') {
        return [];
    }

    const params = new URLSearchParams(window.location.search);
    const values = params.getAll(DEMO_PARAM);
    if (!values.length) {
        return [];
    }

    const tokens = new Set();
    values.forEach((value) => {
        if (!value) {
            return;
        }
        value.split(',').forEach((entry) => {
            const token = entry.trim().toLowerCase();
            if (token) {
                tokens.add(token);
            }
        });
    });

    return Array.from(tokens);
}

/**
 * Returns a cached list of demo flags extracted from the URL query string.
 * @returns {string[]}
 */
export function getDemoFlags() {
    if (!cachedFlags) {
        cachedFlags = parseFlagsFromLocation();
    }
    return cachedFlags;
}

/**
 * Checks whether a given demo flag is present.
 * @param {string} flag Flag name without the demo= prefix.
 * @returns {boolean}
 */
export function hasDemoFlag(flag) {
    if (!flag) {
        return false;
    }
    return getDemoFlags().includes(flag.toLowerCase());
}
