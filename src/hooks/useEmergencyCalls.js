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
    },
    police: {
        endpoint: 'https://data.seattle.gov/resource/33kz-ixgy.json',
        dateField: 'cad_event_arrived_time',
        orderField: 'cad_event_arrived_time',
        limit: 800,
        selectFields: [
            'cad_event_number',
            'event_number',
            'arrived_time',
            'cad_event_arrived_time',
            'final_call_type',
            'precinct',
            'district_sector',
            'longitude',
            'latitude',
            'blurred_latitude',
            'blurred_longitude'
        ]
    }
};

async function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

export function useEmergencyCalls(pollInterval = FIVE_MINUTES) {
    const lastFetchFromStorage = readLastFetchTimestamp();
    const [fireDepartmentCallData, setFireDepartmentCallData] = useState(() => readCachedCollection('fire') ?? []);
    const [policeDepartmentCallData, setPoliceDepartmentCallData] = useState(() => readCachedCollection('police') ?? []);
    const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState(() => lastFetchFromStorage ?? (Date.now() - pollInterval));
    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);
    const lastFetchRef = useRef(lastFetchFromStorage ?? 0);

    const datasetConfigs = useMemo(() => ([
        { source: 'fire', ...DATASETS.fire, setter: setFireDepartmentCallData },
        { source: 'police', ...DATASETS.police, setter: setPoliceDepartmentCallData }
    ]), [setFireDepartmentCallData, setPoliceDepartmentCallData]);

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
                }
                return true;
            } catch (error) {
                if (signal?.aborted || error.name === 'AbortError') {
                    return false;
                }

                if (attempt === retries) {
                    console.error(`Failed to fetch ${config.source} data`, error);
                    return false;
                }

                await wait(delay);
                attempt += 1;
                delay *= 2;
            }
        }
        return false;
    }, [fetchCollection]);

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

    return {
        combinedData,
        fireDepartmentCallData,
        policeDepartmentCallData,
        lastSuccessfulFetch,
        pollInterval
    };
}
