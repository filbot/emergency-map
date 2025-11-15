/**
 * Returns ISO-8601 timestamps for the current moment and 30 minutes ago.
 * @returns {{currentTime: string, thirtyMinutesAgo: string}}
 */
export function getTimeObject() {
    const THIRTY_MINUTES = 1800000;
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - THIRTY_MINUTES);

    const formatDateTime = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    return {
        currentTime: formatDateTime(now),
        thirtyMinutesAgo: formatDateTime(thirtyMinutesAgo)
    };
}

/**
 * Fetches JSON data with shared query parameter transformation and headers.
 * @param {string} endpoint Socrata endpoint URL.
 * @param {URLSearchParams|Object} queryParams Query parameters to append.
 * @param {{signal?: AbortSignal}} [options] Fetch options.
 * @returns {Promise<any>}
 */
export async function fetchData(endpoint, queryParams, options = {}) {
    const url = new URL(endpoint);
    const params = queryParams instanceof URLSearchParams
        ? new URLSearchParams(queryParams)
        : new URLSearchParams(queryParams ?? {});

    params.forEach((value, key) => {
        url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
        headers: {
            "X-App-Token": import.meta.env.VITE_APP_TOKEN
        },
        signal: options.signal
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${message}`);
    }

    return response.json();
}
