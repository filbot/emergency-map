import "./App.css";
import Navbar from './components/navbar.jsx';
import EmergencyMap from './components/map.jsx';
import Details from './components/details.jsx';
import { useEmergencyCalls } from './hooks/useEmergencyCalls.js';
import { useTileCache } from './hooks/useTileCache.js';
import { useWatchdogHeartbeat } from './hooks/useWatchdogHeartbeat.js';

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
            <EmergencyMap dataCollection={combinedData} />
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
