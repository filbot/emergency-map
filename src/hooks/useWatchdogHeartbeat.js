import { useEffect, useRef } from 'react';

const LOG_THROTTLE_MS = 60000;
const DEFAULT_ENDPOINT = import.meta.env.VITE_HEARTBEAT_URL?.trim() || null;

/**
 * Sends a lightweight heartbeat signal so external watchdogs can verify uptime.
 * @param {Object} options Optional overrides for endpoint and timing.
 */
export function useWatchdogHeartbeat(options = {}) {
    const {
        endpoint = DEFAULT_ENDPOINT,
        intervalMs = 2000,
        timeoutMs = 1500,
        enabled = Boolean(endpoint)
    } = options;

    const lastLogRef = useRef(0);

    useEffect(() => {
        if (!enabled || !endpoint || typeof window === 'undefined' || typeof fetch !== 'function') {
            return undefined;
        }

        let cancelled = false;

        const sendHeartbeat = async () => {
            const controller = new AbortController();
            let timedOut = false;
            const timeoutId = window.setTimeout(() => {
                timedOut = true;
                controller.abort();
            }, timeoutMs);

            try {
                await fetch(endpoint, {
                    method: 'GET',
                    cache: 'no-store',
                    keepalive: true,
                    signal: controller.signal
                });
            } catch (error) {
                if (error?.name === 'AbortError' && !timedOut) {
                    return;
                }

                const now = Date.now();
                if (now - lastLogRef.current > LOG_THROTTLE_MS) {
                    if (timedOut) {
                        console.warn('Heartbeat request timed out', endpoint);
                    } else {
                        console.warn('Heartbeat request failed', error);
                    }
                    lastLogRef.current = now;
                }
            } finally {
                window.clearTimeout(timeoutId);
            }
        };

        const intervalId = window.setInterval(() => {
            if (!cancelled) {
                sendHeartbeat();
            }
        }, intervalMs);

        sendHeartbeat();

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [endpoint, enabled, intervalMs, timeoutMs]);
}
