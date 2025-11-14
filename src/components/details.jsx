import './details.css';
import { memo, useEffect, useMemo, useState } from 'react';

const COUNTDOWN_INTERVAL_MS = 50;
const MAX_POLICE_ITEMS = 10;

const buildIncidentKey = (item, prefix, index) => item.cad_event_number
    || item.incident_number
    || item.event_number
    || `${prefix}-${item.datetime ?? item.arrived_time ?? ''}-${item.address ?? item.precinct ?? ''}-${index}`;

const formatCountdown = (remainingMs) => {
    const safeMs = Math.max(remainingMs, 0);
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);
    const centiseconds = Math.floor((safeMs % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centiseconds).padStart(2, '0')}`;
};

const getRemainingTime = (lastUpdated, refreshIntervalMs) => {
    if (!refreshIntervalMs) {
        return 0;
    }
    const lastUpdateTs = Number.isFinite(lastUpdated) ? lastUpdated : Date.now();
    return Math.max((lastUpdateTs + refreshIntervalMs) - Date.now(), 0);
};

function useRefreshCountdown(lastUpdated, refreshIntervalMs) {
    const [remainingMs, setRemainingMs] = useState(() => getRemainingTime(lastUpdated, refreshIntervalMs));

    useEffect(() => {
        setRemainingMs(getRemainingTime(lastUpdated, refreshIntervalMs));
        if (!refreshIntervalMs) {
            return undefined;
        }

        const interval = setInterval(() => {
            setRemainingMs(getRemainingTime(lastUpdated, refreshIntervalMs));
        }, COUNTDOWN_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [lastUpdated, refreshIntervalMs]);

    return useMemo(() => formatCountdown(remainingMs), [remainingMs]);
}

const IncidentList = memo(function IncidentList({ fireIncidents, policeIncidents }) {
    return (
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
    );
});

function RefreshCountdown({ lastUpdated, refreshIntervalMs }) {
    const countdown = useRefreshCountdown(lastUpdated, refreshIntervalMs);
    return <p className="last-updated-count">Next update: {countdown}</p>;
}

export default function Details({
    fireIncidents = [],
    policeIncidents = [],
    totalIncidents = 0,
    lastUpdated,
    refreshIntervalMs = 300000
}) {
    const limitedPolice = useMemo(
        () => policeIncidents.slice(0, MAX_POLICE_ITEMS),
        [policeIncidents]
    );

    return (
        <div className="details-container">
            <div className="details-header">
                <p className="incident-count">Incidents in the past 30 minutes: {totalIncidents}</p>
                <RefreshCountdown lastUpdated={lastUpdated} refreshIntervalMs={refreshIntervalMs} />
            </div>
            <IncidentList fireIncidents={fireIncidents} policeIncidents={limitedPolice} />
        </div>
    );
}
