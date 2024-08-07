import "./App.css";
import React, { useState, useEffect } from 'react';
import Navbar from './components/navbar.jsx';
import Map from './components/map.jsx';
import Details from './components/details.jsx';
import { getTimeObject, fetchData } from "./libs/utilites.js";

function App() {
    const [fireDepartmentCallData, setFireDepartmentCallData] = useState([]);
    const [policeDepartmentCallData, setPoliceDepartmentCallData] = useState([]);
    const [combinedData, setCombinedData] = useState([]);

    useEffect(() => {
        const timeObject = getTimeObject();

        async function fetchFireDepartmentCallData() {
            const query = `$where=Datetime between '${timeObject.fiveMinutesAgo}' and '${timeObject.currentTime}'`;
            await fetchData('https://data.seattle.gov/resource/kzjm-xkqj.json', query, setFireDepartmentCallData);
        }

        async function fetchPoliceDepartmentCallData() {
            const query = `$where=arrived_time between '2024-08-04T00:00:00.000' and '${timeObject.currentTime}'`;
            await fetchData('https://data.seattle.gov/resource/33kz-ixgy.json', query, setPoliceDepartmentCallData);
        }

        fetchFireDepartmentCallData();
        // fetchPoliceDepartmentCallData();

        const intervalId = setInterval(() => {
            fetchFireDepartmentCallData();
            // fetchPoliceDepartmentCallData();
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
