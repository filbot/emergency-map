import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchData, getTimeObject } from '../libs/utilites.js';
import {
    readCachedCollection,
    readLastFetchTimestamp,
    writeCachedCollection,
    writeLastFetchTimestamp
} from '../libs/cache.js';

const FIVE_MINUTES = 300000;

const DATASETS = {
    fire: {
        endpoint: 'https://data.seattle.gov/resource/kzjm-xkqj.json',
        dateField: 'Datetime',
        orderField: 'Datetime',
        limit: 500,
        selectFields: [
            'incident_number',
            'datetime',
            'type',
            'address',
            'longitude',
            'latitude'
        ]
    }
};

async function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Polls emergency datasets, merges them, and exposes derived UI-friendly state.
 * @param {number} [pollInterval=300000] Polling cadence in milliseconds.
 * @returns {{
 *  combinedData: Array<Object>,
 *  fireDepartmentCallData: Array<Object>,
 *  policeDepartmentCallData: Array<Object>,
 *  lastSuccessfulFetch: number,
 *  pollInterval: number,
 *  dataErrors: Array<Object>,
 *  emptyState: {title: string, body?: string, hint?: string, tone?: string, icon?: string}|null,
 *  isFetching: boolean,
 *  lastFetchAttempt: number|null,
 *  isStale: boolean
 * }}
 */
export function useEmergencyCalls(pollInterval = FIVE_MINUTES) {
    const lastFetchFromStorage = readLastFetchTimestamp();
    const [fireDepartmentCallData, setFireDepartmentCallData] = useState(() => readCachedCollection('fire') ?? []);
    const [policeDepartmentCallData] = useState([]);
    const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState(() => lastFetchFromStorage ?? (Date.now() - pollInterval));
    const [dataErrors, setDataErrors] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [lastFetchAttempt, setLastFetchAttempt] = useState(lastFetchFromStorage ?? null);
    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);
    const lastFetchRef = useRef(lastFetchFromStorage ?? 0);

    const datasetConfigs = useMemo(() => ([
        {
            source: 'fire',
            friendlyName: 'Seattle Fire 911 feed',
            ...DATASETS.fire,
            setter: setFireDepartmentCallData
        }
    ]), [setFireDepartmentCallData]);

    const clearDatasetError = useCallback((source) => {
        setDataErrors((previous) => previous.filter((entry) => entry.source !== source));
    }, []);

    const recordDatasetError = useCallback((source, friendlyName, error) => {
        const safeFriendlyName = friendlyName ?? 'data feed';
        const friendlyMessage = `We're having trouble reaching the ${safeFriendlyName}. We'll keep using the last good update and try again automatically.`;
        const detail = typeof error?.message === 'string' && error.message.trim().length > 0
            ? error.message.trim()
            : null;

        setDataErrors((previous) => {
            const filtered = previous.filter((entry) => entry.source !== source);
            return [
                ...filtered,
                {
                    id: `dataset-${source}`,
                    source,
                    friendlyName: safeFriendlyName,
                    message: friendlyMessage,
                    detail,
                    timestamp: Date.now(),
                    canRetry: false
                }
            ];
        });
    }, []);

    const fetchCollection = useCallback(async (config, signal) => {
        const timeWindow = getTimeObject();
        const params = new URLSearchParams({
            $where: `${config.dateField} between '${timeWindow.thirtyMinutesAgo}' and '${timeWindow.currentTime}'`
        });

        if (config.limit) {
            params.set('$limit', `${config.limit}`);
        }

        if (config.orderField) {
            params.set('$order', `${config.orderField} DESC`);
        }

        if (Array.isArray(config.selectFields) && config.selectFields.length > 0) {
            params.set('$select', config.selectFields.join(','));
        }

        return fetchData(config.endpoint, params, { signal });
    }, []);

    const fetchWithRetry = useCallback(async (config, signal, retries = 1) => {
        let attempt = 0;
        let delay = 1000;

        while (!signal?.aborted && attempt <= retries) {
            try {
                const data = await fetchCollection(config, signal);
                if (!signal?.aborted) {
                    const collection = Array.isArray(data) ? data : [];
                    config.setter(collection);
                    writeCachedCollection(config.source, collection);
                    clearDatasetError(config.source);
                }
                return true;
            } catch (error) {
                if (signal?.aborted || error.name === 'AbortError') {
                    return false;
                }

                if (attempt === retries) {
                    console.error(`Failed to fetch ${config.source} data`, error);
                    recordDatasetError(config.source, config.friendlyName, error);
                    return false;
                }

                await wait(delay);
                attempt += 1;
                delay *= 2;
            }
        }
        return false;
    }, [fetchCollection, clearDatasetError, recordDatasetError]);

    const fetchAllCollections = useCallback(async (signal) => {
        const results = await Promise.all(datasetConfigs.map((config) => fetchWithRetry(config, signal)));
        return results.some(Boolean);
    }, [datasetConfigs, fetchWithRetry]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        let cancelled = false;

        const scheduleFetch = (delayMs = 0) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = window.setTimeout(async () => {
                if (cancelled) {
                    return;
                }

                setIsFetching(true);
                setLastFetchAttempt(Date.now());
                const controller = new AbortController();
                abortControllerRef.current = controller;
                const success = await fetchAllCollections(controller.signal);
                abortControllerRef.current = null;

                if (success && !cancelled) {
                    const now = Date.now();
                    lastFetchRef.current = now;
                    setLastSuccessfulFetch(now);
                    writeLastFetchTimestamp(now);
                }

                if (!cancelled) {
                    setIsFetching(false);
                }

                if (!cancelled && pollInterval) {
                    scheduleFetch(pollInterval);
                }
            }, Math.max(delayMs, 0));
        };

        const now = Date.now();
        const timeSinceLastFetch = lastFetchRef.current ? now - lastFetchRef.current : Infinity;
        const initialDelay = pollInterval
            ? Math.max(pollInterval - timeSinceLastFetch, 0)
            : 0;

        scheduleFetch(initialDelay);
        return () => {
            cancelled = true;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            abortControllerRef.current?.abort();
        };
    }, [fetchAllCollections, pollInterval]);

    useEffect(() => () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        abortControllerRef.current?.abort();
    }, []);

    const combinedData = useMemo(() => {
        const withSource = (collection, source) => collection.map((item) => {
            if (source === 'police' && !item.arrived_time && item.cad_event_arrived_time) {
                return { ...item, source, arrived_time: item.cad_event_arrived_time };
            }

            return { ...item, source };
        });

        return [
            ...withSource(fireDepartmentCallData, 'fire'),
            ...withSource(policeDepartmentCallData, 'police')
        ];
    }, [fireDepartmentCallData, policeDepartmentCallData]);

    const staleThresholdMs = pollInterval ? pollInterval * 1.5 : FIVE_MINUTES * 1.5;
    const isStale = !lastSuccessfulFetch || (Date.now() - lastSuccessfulFetch) > staleThresholdMs;

    const emptyState = useMemo(() => {
        if (combinedData.length > 0) {
            return null;
        }

        if (isFetching && !lastSuccessfulFetch) {
            return {
                title: 'Syncing live incidents',
                body: 'We are waiting for the first update from the Seattle Fire and Police feeds.',
                hint: 'The map will populate automatically.',
                tone: 'loading',
                icon: '~'
            };
        }

        if (dataErrors.length > 0) {
            return {
                title: 'Data temporarily unavailable',
                body: 'We could not reach the live feeds. The dashboard will retry automatically and continue showing the last good update.',
                hint: 'Standing by for new data...',
                tone: 'warning',
                icon: '!'
            };
        }

        return {
            title: 'No active 911 calls',
            body: 'Seattle Fire and Police reported zero incidents within the last 30 minutes.',
            hint: 'Monitoring for new calls...',
            tone: 'info',
            icon: 'i'
        };
    }, [combinedData.length, dataErrors.length, isFetching, lastSuccessfulFetch]);

    return {
        combinedData,
        fireDepartmentCallData,
        policeDepartmentCallData,
        lastSuccessfulFetch,
        pollInterval,
        dataErrors,
        emptyState,
        isFetching,
        lastFetchAttempt,
        isStale
    };
}
