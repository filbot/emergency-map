import "./App.css";
import { useState, useEffect } from 'react';
import Navbar from "./components/navbar.jsx";
import Map from './components/map.jsx';
import Details from "./components/details.jsx";

function App() {
    const [emergencyResponseData, setEmergencyResponseData] = useState([]);

    function getTimeObject() {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 30 * 60000);

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
            fiveMinutesAgo: formatDateTime(fiveMinutesAgo)
        };
    }

    useEffect(() => {
        async function fetchData() {
            try {
                const timeObject = getTimeObject();
                const response = await fetch(
                    `https://data.seattle.gov/resource/kzjm-xkqj.json?$where=Datetime between '${timeObject.fiveMinutesAgo}' and '${timeObject.currentTime}'`,
                    {
                        headers: {
                            "X-App-Token": import.meta.env.VITE_APP_TOKEN
                        }
                    }
                );
                const data = await response.json();

                setEmergencyResponseData(data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }
        fetchData();

        const intervalId = setInterval(fetchData, 300000); // Fetch every 5 minutes

        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, []);

    return (
        <div className="App">
            <Navbar />
            <Map dataCollection={emergencyResponseData} />
            <Details dataCollection={emergencyResponseData} />
        </div>
    );
}

export default App;
