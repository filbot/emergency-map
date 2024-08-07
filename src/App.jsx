import "./App.css";
import React, { useState, useEffect } from 'react';
import Navbar from './components/navbar.jsx';
import Map from './components/map.jsx';
import Details from './components/details.jsx';

function App() {
    const [fireDepartmentCallData, setFireDepartmentCallData] = useState([]);
    const [policeDepartmentCallData, setPoliceDepartmentCallData] = useState([]);
    const [combinedData, setCombinedData] = useState([]);

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
        const timeObject = getTimeObject();

        async function fetchFireDepartmentCallData() {
            try {
                const response = await fetch(
                    `https://data.seattle.gov/resource/kzjm-xkqj.json?$where=Datetime between '${timeObject.fiveMinutesAgo}' and '${timeObject.currentTime}'`,
                    {
                        headers: {
                            "X-App-Token": import.meta.env.VITE_APP_TOKEN
                        }
                    }
                );
                const data = await response.json();
                setFireDepartmentCallData(data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        async function fetchPoliceDepartmentCallData() {
            try {
                const response = await fetch(
                    `https://data.seattle.gov/resource/33kz-ixgy.json?$where=arrived_time between '2024-08-04T00:00:00.000' and '${timeObject.currentTime}'`,
                    {
                        headers: {
                            "X-App-Token": import.meta.env.VITE_APP_TOKEN
                        }
                    }
                );
                const data = await response.json();
                setPoliceDepartmentCallData(data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        fetchFireDepartmentCallData();
        fetchPoliceDepartmentCallData();

        const intervalId = setInterval(() => {
            fetchFireDepartmentCallData();
            fetchPoliceDepartmentCallData();
        }, 300000); // Fetch every 5 minutes

        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, []);

    useEffect(() => {
        const addIdentifier = (data, identifier) => {
            return data.map(item => ({ ...item, source: identifier }));
        };

        const combined = [
            ...addIdentifier(fireDepartmentCallData, 'fire'),
            ...addIdentifier(policeDepartmentCallData, 'police')
        ];

        setCombinedData(combined);
    }, [fireDepartmentCallData, policeDepartmentCallData]);

    return (
        <div className="App">
            <Navbar />
            <Map dataCollection={combinedData} />
            <Details dataCollection={combinedData} />
        </div>
    );
}

export default App;
