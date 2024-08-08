/* eslint-disable react/prop-types */
import './details.css';
import React, { useState, useEffect } from 'react';

export default function Details({ dataCollection }) {
    const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

    useEffect(() => {
        if (dataCollection.length > 0) {
            setCountdown(300); // Reset to 5 minutes when dataCollection is updated
        }
    }, [dataCollection]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdown(prevCountdown => {
                if (prevCountdown <= 1) {
                    return 300; // Reset to 5 minutes
                }
                return prevCountdown - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const formatCountdown = () => {
        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return (
        <div className="details-container">
            <div className="details-header">
                <p className="incident-count">Incidents in the past 30 minutes: {dataCollection.length}</p>
                <p className="last-updated-count">Next update: {formatCountdown()}</p>
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