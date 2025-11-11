import "./App.css";
import Navbar from './components/navbar.jsx';
import Map from './components/map.jsx';
import Details from './components/details.jsx';
import { useEmergencyCalls } from './hooks/useEmergencyCalls.js';
import { useTileCache } from './hooks/useTileCache.js';

function App() {
    const { combinedData } = useEmergencyCalls();
    useTileCache();

    return (
        <div className="App">
            <Navbar />
            <Map dataCollection={combinedData} />
            <Details dataCollection={combinedData} />
        </div>
    );
}

export default App;
