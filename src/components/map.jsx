import { useEffect, useMemo, useRef, useState } from "react";
import "./map.css";
import { getMapStyleUrl } from '../config/mapConfig.js';
import { escapeHtml } from '../libs/sanitize.js';
import EmptyState from './emptyState.jsx';

const apiKey = import.meta.env.VITE_API_KEY;
const styleUrl = getMapStyleUrl(apiKey);

let maptilerSdkPromise;

/**
 * Lazily loads the MapTiler SDK bundle and configures the API key.
 * @param {string} withApiKey MapTiler API key.
 * @returns {Promise<import('@maptiler/sdk')>}
 */
async function loadMaptilerSdk(withApiKey) {
    if (!maptilerSdkPromise) {
        maptilerSdkPromise = Promise.all([
            import("@maptiler/sdk"),
            import("@maptiler/sdk/dist/maptiler-sdk.css")
        ]).then(([sdk]) => sdk);
    }

    const sdk = await maptilerSdkPromise;
    if (sdk?.config && withApiKey) {
        sdk.config.apiKey = withApiKey;
    }
    return sdk;
}

const FIRE_MARKER_COLOR = "#FF0000";
const POLICE_MARKER_COLOR = "#0057B8";
const DEFAULT_CENTER = Object.freeze({ lng: -122.366951, lat: 47.650298 });
const DEFAULT_ZOOM = 13;

const buildIncidentKey = (item, prefix) => item.cad_event_number
    || item.incident_number
    || item.event_number
    || `${prefix}-${item.datetime ?? item.arrived_time ?? ''}-${item.address ?? item.precinct ?? ''}`;

const parseCoordinate = (value) => {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
    }

    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const isValidCoordinate = (lng, lat) => Number.isFinite(lng)
    && Number.isFinite(lat)
    && lat >= -90
    && lat <= 90
    && lng >= -180
    && lng <= 180;

const formatTime = (dateTimeString) => {
    if (!dateTimeString) {
        return '--:--';
    }
    const date = new Date(dateTimeString);
    if (Number.isNaN(date.getTime())) {
        return '--:--';
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const isAbortError = (error) => {
    if (!error) {
        return false;
    }
    if (error.name === 'AbortError') {
        return true;
    }

    if (typeof error.message === 'string' && error.message.toLowerCase().includes('aborted')) {
        return true;
    }

    return false;
};

const createMarkerElement = (type) => {
    if (typeof document === 'undefined') {
        return null;
    }

    const element = document.createElement('div');
    const isFire = type === 'fire';
    const size = isFire ? 20 : 30;
    const fill = isFire ? '#FF3434' : '#0074D9';
    const rippleClass = isFire ? 'fire' : 'police';
    element.innerHTML = `<div class="ripple-container">
  <svg width="${size}px" height="${size}px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="15" fill="${fill}" />
  </svg>
    <div class="ripple ${rippleClass}"></div>
    <div class="ripple ${rippleClass}"></div>
    <div class="ripple ${rippleClass}"></div>
</div>`;
    return element;
};

const getCoordinates = (incident, type) => {
    if (type === 'fire') {
        return {
            lng: parseCoordinate(incident.longitude),
            lat: parseCoordinate(incident.latitude)
        };
    }

    return {
        lng: parseCoordinate(incident.blurred_longitude ?? incident.longitude),
        lat: parseCoordinate(incident.blurred_latitude ?? incident.latitude)
    };
};

const buildPopupHtml = (incident, type) => {
    if (type === 'fire') {
        const time = escapeHtml(formatTime(incident.datetime));
        const incidentType = escapeHtml(incident.type ?? '');
        const address = escapeHtml(incident.address ?? '');
        return `
            <div class="popup-container">
                <p class="time">${time}</p>
                <p class="type">${incidentType}</p>
                <p class="address">${address}</p>
            </div>`;
    }

    const time = escapeHtml(formatTime(incident.arrived_time));
    const callType = escapeHtml(incident.final_call_type ?? '');
    const location = escapeHtml(incident.precinct ?? incident.district_sector ?? '');
    return `
            <div class="popup-container">
                <p class="time">${time}</p>
                <p class="type">${callType}</p>
                <p class="address">${location}</p>
            </div>`;
};

/**
 * Displays the realtime incident map and overlays empty-state messaging when needed.
 * @param {Object} props React props.
 * @param {Array<Object>} [props.dataCollection=[]] Combined incident collection.
 * @param {{title:string, body?:string, hint?:string, tone?:string, icon?:string}|null} [props.emptyState=null]
 * Contextual empty-state metadata passed from the data hook.
 * @returns {JSX.Element}
 */
export default function EmergencyMap({ dataCollection = [], emptyState = null } = {}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef(new Map());
    const sdkRef = useRef(null);
    const styleUrlRef = useRef(styleUrl);
    const [mapReadyVersion, setMapReadyVersion] = useState(0);

    styleUrlRef.current = styleUrl;

    const groupedIncidents = useMemo(() => dataCollection.reduce((acc, item) => {
        if (item.source === 'fire') {
            acc.fire.push(item);
        } else if (item.source === 'police') {
            acc.police.push(item);
        }
        return acc;
    }, { fire: [], police: [] }), [dataCollection]);

    const { fire: fireIncidents, police: policeIncidents } = groupedIncidents;
    const mappableFireIncidents = useMemo(() => fireIncidents.filter((incident) => {
        const { lng, lat } = getCoordinates(incident, 'fire');
        return isValidCoordinate(lng, lat);
    }), [fireIncidents]);

    const mappablePoliceIncidents = useMemo(() => policeIncidents.filter((incident) => {
        const { lng, lat } = getCoordinates(incident, 'police');
        return isValidCoordinate(lng, lat);
    }), [policeIncidents]);

    const hasAnyIncidents = fireIncidents.length > 0 || policeIncidents.length > 0;
    const mappableIncidentCount = mappableFireIncidents.length + mappablePoliceIncidents.length;
    const hasMappableIncidents = mappableIncidentCount > 0;
    const awaitingCoordinates = hasAnyIncidents && !hasMappableIncidents;

    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) {
            return undefined;
        }

        let cancelled = false;
        let cleanup = () => {};

        (async () => {
            try {
                const sdk = await loadMaptilerSdk(apiKey);
                if (!sdk || cancelled || !mapContainerRef.current || mapRef.current) {
                    return;
                }

                sdkRef.current = sdk;

                const mapInstance = new sdk.Map({
                    container: mapContainerRef.current,
                    style: styleUrlRef.current,
                    center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
                    zoom: DEFAULT_ZOOM,
                });

                const handleError = (event) => {
                    const error = event?.error;
                    if (!error || isAbortError(error)) {
                        return;
                    }
                    console.error('Map rendering error', error);
                };

                mapInstance.on('error', handleError);
                mapRef.current = mapInstance;
                setMapReadyVersion((value) => value + 1);
                const markersForCleanup = markersRef.current;

                cleanup = () => {
                    mapInstance.off('error', handleError);
                    markersForCleanup.forEach(({ marker }) => marker.remove());
                    markersForCleanup.clear();
                    if (mapRef.current === mapInstance) {
                        mapRef.current = null;
                    }

                    const finalizeRemoval = () => {
                        try {
                            mapInstance.remove();
                        } catch (error) {
                            if (!isAbortError(error)) {
                                console.error('Failed to remove map instance', error);
                            }
                        }
                    };

                    const loaded = typeof mapInstance.loaded === 'function'
                        ? mapInstance.loaded()
                        : mapInstance.isStyleLoaded?.();

                    if (loaded) {
                        finalizeRemoval();
                        return;
                    }

                    let resolved = false;
                    const cleanupDeferred = () => {
                        if (resolved) {
                            return;
                        }
                        resolved = true;
                        finalizeRemoval();
                    };

                    const timeoutId = window.setTimeout(cleanupDeferred, 3000);
                    mapInstance.once('load', () => {
                        window.clearTimeout(timeoutId);
                        cleanupDeferred();
                    });
                    mapInstance.once('error', (event) => {
                        if (isAbortError(event?.error)) {
                            return;
                        }
                        window.clearTimeout(timeoutId);
                        cleanupDeferred();
                    });
                };
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to initialize map', error);
                }
            }
        })();

        return () => {
            cancelled = true;
            cleanup();
        };
    }, []);

    useEffect(() => {
        const mapInstance = mapRef.current;
        const sdk = sdkRef.current;
        if (!mapInstance || !sdk) {
            return;
        }

        if (!hasMappableIncidents) {
            markersRef.current.forEach(({ marker }) => marker.remove());
            markersRef.current.clear();
            mapInstance.easeTo({
                center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
                zoom: DEFAULT_ZOOM,
                duration: 0
            });
            return;
        }

        const bounds = new sdk.LngLatBounds();
        const activeMarkerIds = new Set();
        let lastCoordinate = null;

        const upsertMarker = (incident, type) => {
            const { lng, lat } = getCoordinates(incident, type);
            if (!isValidCoordinate(lng, lat)) {
                return;
            }

            const markerId = buildIncidentKey(incident, type);
            const popupHtml = buildPopupHtml(incident, type);
            if (!popupHtml) {
                return;
            }

            const existing = markersRef.current.get(markerId);
            if (existing) {
                existing.marker.setLngLat([lng, lat]);
                existing.popup.setHTML(popupHtml);
            } else {
                const element = createMarkerElement(type);
                const color = type === 'fire' ? FIRE_MARKER_COLOR : POLICE_MARKER_COLOR;
                const markerOptions = element ? { element } : { color };
                const popup = new sdk.Popup({ closeButton: false }).setHTML(popupHtml);
                const marker = new sdk.Marker(markerOptions)
                    .setLngLat([lng, lat])
                    .setPopup(popup)
                    .addTo(mapInstance);

                markersRef.current.set(markerId, { marker, popup });
            }

            activeMarkerIds.add(markerId);
            bounds.extend([lng, lat]);
            lastCoordinate = [lng, lat];
        };

        mappableFireIncidents.forEach((incident) => upsertMarker(incident, 'fire'));
        mappablePoliceIncidents.forEach((incident) => upsertMarker(incident, 'police'));

        const hasBounds = typeof bounds.isEmpty === 'function' ? !bounds.isEmpty() : activeMarkerIds.size > 0;

        let pendingLoadHandler = null;

        const fitToMarkers = () => {
            const canvas = mapInstance.getCanvas();
            if (!canvas || canvas.width === 0 || canvas.height === 0) {
                return;
            }
            if (activeMarkerIds.size <= 1 && lastCoordinate) {
                const maxZoom = typeof mapInstance.getMaxZoom === 'function'
                    ? mapInstance.getMaxZoom()
                    : 20;
                const targetZoom = Math.min(Math.max(DEFAULT_ZOOM + 2, 15), maxZoom);
                mapInstance.easeTo({
                    center: lastCoordinate,
                    zoom: targetZoom,
                    duration: 0
                });
                return;
            }

            const cloneBounds = typeof bounds.clone === 'function' ? bounds.clone() : bounds;
            const paddedBounds = typeof cloneBounds.pad === 'function'
                ? cloneBounds.pad(0.005)
                : cloneBounds;
            const padding = 56;
            const camera = typeof mapInstance.cameraForBounds === 'function'
                ? mapInstance.cameraForBounds(paddedBounds, { padding })
                : null;

            if (camera) {
                const maxZoom = typeof mapInstance.getMaxZoom === 'function'
                    ? mapInstance.getMaxZoom()
                    : 20;
                const zoom = Math.min(camera.zoom ?? DEFAULT_ZOOM, maxZoom);
                mapInstance.easeTo({
                    ...camera,
                    zoom,
                    duration: 0
                });
                return;
            }

            mapInstance.fitBounds(paddedBounds, {
                padding,
                duration: 0
            });
        };

        if (hasBounds) {
            const isLoaded = typeof mapInstance.loaded === 'function'
                ? mapInstance.loaded()
                : mapInstance.isStyleLoaded?.();

            if (isLoaded) {
                fitToMarkers();
            } else {
                pendingLoadHandler = () => {
                    fitToMarkers();
                };
                mapInstance.once('load', pendingLoadHandler);
            }
        }

        const staleIds = [];
        markersRef.current.forEach((_, id) => {
            if (!activeMarkerIds.has(id)) {
                staleIds.push(id);
            }
        });

        staleIds.forEach((id) => {
            const entry = markersRef.current.get(id);
            if (entry) {
                entry.marker.remove();
            }
            markersRef.current.delete(id);
        });

        return () => {
            if (pendingLoadHandler) {
                mapInstance.off('load', pendingLoadHandler);
            }
        };
    }, [hasMappableIncidents, mapReadyVersion, mappableFireIncidents, mappablePoliceIncidents]);

    let overlay = null;
    if (!hasAnyIncidents && emptyState) {
        overlay = (
            <EmptyState
                title={emptyState.title}
                body={emptyState.body}
                hint={emptyState.hint}
                icon={emptyState.icon}
                tone={emptyState.tone}
                context="map"
            />
        );
    } else if (awaitingCoordinates) {
        overlay = (
            <EmptyState
                title="Awaiting map coordinates"
                body="The latest incidents have not published latitude/longitude yet."
                hint="Markers will appear automatically once the feed includes coordinates."
                icon="?"
                tone="warning"
                context="map"
            />
        );
    }

    return (
        <div className="map-wrap">
            <div ref={mapContainerRef} className="map" />
            {overlay}
        </div>
    );
}
