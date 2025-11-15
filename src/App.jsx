import { Suspense, lazy, useCallback, useMemo } from 'react';
import "./App.css";
import Navbar from './components/navbar.jsx';
import Details from './components/details.jsx';
import StatusBanner from './components/statusBanner.jsx';
import { useEmergencyCalls } from './hooks/useEmergencyCalls.js';
import { useTileCache } from './hooks/useTileCache.js';
import { useWatchdogHeartbeat } from './hooks/useWatchdogHeartbeat.js';

const EmergencyMap = lazy(() => import('./components/map.jsx'));

function MapFallback() {
    return (
        <div className="map-wrap">
            <div className="map-loading" role="status" aria-live="polite">
                Loading map...
            </div>
        </div>
    );
}

function App() {
    const {
        combinedData,
        fireDepartmentCallData,
        policeDepartmentCallData,
        lastSuccessfulFetch,
        pollInterval: pollIntervalMs,
        dataErrors
    } = useEmergencyCalls();
    const {
        isPrefetching: isTileCachePrefetching,
        error: tileCacheError,
        retry: retryTileCachePrefetch
    } = useTileCache();
    useWatchdogHeartbeat();

    const activeErrors = useMemo(() => {
        const merged = Array.isArray(dataErrors) ? [...dataErrors] : [];
        if (tileCacheError) {
            merged.push({ ...tileCacheError, isRetrying: isTileCachePrefetching });
        }
        return merged;
    }, [dataErrors, tileCacheError, isTileCachePrefetching]);

    const handleRetryRequest = useCallback((error) => {
        if (!error) {
            return;
        }

        if (error.source === 'tile-cache') {
            retryTileCachePrefetch();
        }
    }, [retryTileCachePrefetch]);

    return (
        <div className="App">
            <Navbar />
            <StatusBanner errors={activeErrors} onRetry={handleRetryRequest} />
            <Suspense fallback={<MapFallback />}>
                <EmergencyMap dataCollection={combinedData} />
            </Suspense>
            <Details
                fireIncidents={fireDepartmentCallData}
                policeIncidents={policeDepartmentCallData}
                totalIncidents={combinedData.length}
                lastUpdated={lastSuccessfulFetch}
                refreshIntervalMs={pollIntervalMs}
            />
        </div>
    );
}

export default App;
