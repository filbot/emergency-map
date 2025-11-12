/* eslint-disable react/prop-types */
import './details.css';
import { useState, useEffect, useMemo } from 'react';

const buildIncidentKey = (item, prefix, index) => item.cad_event_number
    || item.incident_number
    || item.event_number
    || `${prefix}-${item.datetime ?? item.arrived_time ?? ''}-${item.address ?? item.precinct ?? ''}-${index}`;

const groupIncidents = (collection) => collection.reduce((acc, incident) => {
    if (incident.source === 'fire') {
        acc.fire.push(incident);
    } else if (incident.source === 'police' && acc.police.length < 10) {
        acc.police.push(incident);
    }
    return acc;
}, { fire: [], police: [] });

export default function Details({ dataCollection }) {
    const FIVE_MINUTES_MS = 300000;
    const [countdownMs, setCountdownMs] = useState(FIVE_MINUTES_MS);

    useEffect(() => {
        if (dataCollection.length > 0) {
            setCountdownMs(FIVE_MINUTES_MS); // Reset to 5 minutes when dataCollection is updated
        }
    }, [dataCollection]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCountdownMs(prevCountdown => {
                if (prevCountdown <= 0) {
                    return FIVE_MINUTES_MS;
                }
                return Math.max(prevCountdown - 50, 0);
            });
        }, 50);

        return () => clearInterval(interval);
    }, [FIVE_MINUTES_MS]);

    const formattedCountdown = useMemo(() => {
        const minutes = Math.floor(countdownMs / 60000);
        const seconds = Math.floor((countdownMs % 60000) / 1000);
        const milliseconds = Math.floor((countdownMs % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
    }, [countdownMs]);

    const { fire: fireIncidents, police: policeIncidents } = useMemo(() => groupIncidents(dataCollection), [dataCollection]);

    return (
        <div className="details-container">
            <div className="details-header">
                <p className="incident-count">Incidents in the past 30 minutes: {dataCollection.length}</p>
                <p className="last-updated-count">Next update: {formattedCountdown}</p>
            </div>
            <div className="details">
                {fireIncidents.map((item, index) => (
                    <div key={buildIncidentKey(item, 'fire', index)} className="detail fire">
                        <p className="time">{item.datetime}</p>
                        <p className="type">{item.type}</p>
                        <p className="address">{item.address}</p>
                    </div>
                ))}
                {policeIncidents.map((item, index) => (
                    <div key={buildIncidentKey(item, 'police', index)} className="detail police">
                        <p className="time">{item.arrived_time}</p>
                        <p className="type">{item.final_call_type}</p>
                        <p className="address">{item.precinct}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
