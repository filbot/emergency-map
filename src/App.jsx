import { Suspense, lazy } from 'react';
import "./App.css";
import Navbar from './components/navbar.jsx';
import Details from './components/details.jsx';
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
        pollInterval: pollIntervalMs
    } = useEmergencyCalls();
    useTileCache();
    useWatchdogHeartbeat();

    return (
        <div className="App">
            <Navbar />
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
