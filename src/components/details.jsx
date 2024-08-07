/* eslint-disable react/prop-types */
import "./details.css";
import { useState, useEffect } from 'react';

export default function Details({ dataCollection }) {
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        setLastUpdateTime(Date.now());
    }, [dataCollection]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const getElapsedTime = () => {
        const elapsed = currentTime - lastUpdateTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day(s) ago`;
        if (hours > 0) return `${hours} hour(s) ago`;
        if (minutes > 0) return `${minutes} minute(s) ago`;
        return `${seconds} second(s) ago`;
    }
    return (
        <div className="details-container">
            <div className="details-header">
                <p className="incident-count">Current number of incidents: {dataCollection.length}</p>
                <p className="last-updated-count">Last updated: {getElapsedTime()}</p>
            </div>
            <div className="details">
                {dataCollection.filter(item => item.source === "fire").map((item, index) => (
                    <div key={index} className="detail fire">
                        <p className="time">{item.datetime}</p>
                        <p className="type">{item.type}</p>
                        <p className="address">{item.address}</p>
                    </div>
                ))}
                {dataCollection.filter(item => item.source === "police").slice(0, 10).map((item, index) => (
                    <div key={index} className="detail police">
                        <p className="time">{item.arrived_time}</p>
                        <p className="type">{item.final_call_type}</p>
                        <p className="address">{item.precinct}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}