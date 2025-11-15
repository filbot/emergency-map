import './details.css';
import { memo, useEffect, useMemo, useState } from 'react';
import EmptyState from './emptyState.jsx';

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

/**
 * Lists incidents for both departments.
 * @param {Object} props React props.
 * @param {Array<Object>} props.fireIncidents Fire incidents to render.
 * @param {Array<Object>} props.policeIncidents Police incidents to render.
 * @returns {JSX.Element}
 */
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

/**
 * Displays a live countdown for the next refresh.
 * @param {Object} props React props.
 * @param {number} [props.lastUpdated] Timestamp of the last successful poll.
 * @param {number} props.refreshIntervalMs Polling cadence.
 * @returns {JSX.Element}
 */
function RefreshCountdown({ lastUpdated, refreshIntervalMs }) {
    const countdown = useRefreshCountdown(lastUpdated, refreshIntervalMs);
    return <p className="last-updated-count">Next update: {countdown}</p>;
}

/**
 * Presents the textual incident list and handles zero-state messaging.
 * @param {Object} props React props.
 * @returns {JSX.Element}
 */
export default function Details({
    fireIncidents = [],
    policeIncidents = [],
    totalIncidents = 0,
    lastUpdated,
    refreshIntervalMs = 300000,
    emptyState = null
}) {
    const limitedPolice = useMemo(
        () => policeIncidents.slice(0, MAX_POLICE_ITEMS),
        [policeIncidents]
    );
    const shouldShowEmptyState = totalIncidents === 0 && emptyState;

    return (
        <div className={`details-container${shouldShowEmptyState ? ' details-container--empty' : ''}`}>
            <div className="details-header">
                <p className="incident-count">Incidents in the past 30 minutes: {totalIncidents}</p>
                <RefreshCountdown lastUpdated={lastUpdated} refreshIntervalMs={refreshIntervalMs} />
            </div>
            {shouldShowEmptyState ? (
                <EmptyState
                    title={emptyState.title}
                    body={emptyState.body}
                    hint={emptyState.hint}
                    icon={emptyState.icon}
                    tone={emptyState.tone}
                    context="panel"
                />
            ) : (
                <IncidentList fireIncidents={fireIncidents} policeIncidents={limitedPolice} />
            )}
        </div>
    );
}
