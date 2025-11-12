import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchData, getTimeObject } from '../libs/utilites.js';

const FIVE_MINUTES = 300000;

const DATASETS = {
    fire: {
        endpoint: 'https://data.seattle.gov/resource/kzjm-xkqj.json',
        dateField: 'Datetime'
    },
    police: {
        endpoint: 'https://data.seattle.gov/resource/33kz-ixgy.json',
        dateField: 'cad_event_arrived_time'
    }
};

async function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

export function useEmergencyCalls(pollInterval = FIVE_MINUTES) {
    const [fireDepartmentCallData, setFireDepartmentCallData] = useState([]);
    const [policeDepartmentCallData, setPoliceDepartmentCallData] = useState([]);
    const [refreshTick, setRefreshTick] = useState(0);

    const datasetConfigs = useMemo(() => ([
        { source: 'fire', ...DATASETS.fire, setter: setFireDepartmentCallData },
        { source: 'police', ...DATASETS.police, setter: setPoliceDepartmentCallData }
    ]), []);

    const timeWindow = useMemo(() => getTimeObject(), [refreshTick]);

    const fetchCollection = useCallback(async (config, signal) => {
        const params = new URLSearchParams({
            $where: `${config.dateField} between '${timeWindow.thirtyMinutesAgo}' and '${timeWindow.currentTime}'`
        });

        return fetchData(config.endpoint, params, { signal });
    }, [timeWindow]);

    const fetchWithRetry = useCallback(async (config, signal, retries = 1) => {
        let attempt = 0;
        let delay = 1000;

        while (!signal?.aborted && attempt <= retries) {
            try {
                const data = await fetchCollection(config, signal);
                if (!signal?.aborted) {
                    config.setter(Array.isArray(data) ? data : []);
                }
                return;
            } catch (error) {
                if (signal?.aborted || error.name === 'AbortError') {
                    return;
                }

                if (attempt === retries) {
                    console.error(`Failed to fetch ${config.source} data`, error);
                    return;
                }

                await wait(delay);
                attempt += 1;
                delay *= 2;
            }
        }
    }, [fetchCollection]);

    useEffect(() => {
        const controller = new AbortController();

        const loadCollections = async () => {
            await Promise.all(datasetConfigs.map((config) => fetchWithRetry(config, controller.signal)));
        };

        loadCollections();

        return () => {
            controller.abort();
        };
    }, [datasetConfigs, fetchWithRetry, refreshTick]);

    useEffect(() => {
        if (!pollInterval) {
            return undefined;
        }

        const id = setInterval(() => {
            setRefreshTick((tick) => tick + 1);
        }, pollInterval);

        return () => clearInterval(id);
    }, [pollInterval]);

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
        policeDepartmentCallData
    };
}
