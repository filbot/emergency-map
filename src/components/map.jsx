/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "./map.css";
import { getMapStyleUrl } from '../config/mapConfig.js';

const apiKey = import.meta.env.VITE_API_KEY;
const styleUrl = getMapStyleUrl(apiKey);
maptilersdk.config.apiKey = apiKey;

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
    const size = type === 'fire' ? 20 : 30;
    const fill = type === 'fire' ? '#FF3434' : '#0074D9';
    element.innerHTML = `<div class="ripple-container">
  <svg width="${size}px" height="${size}px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="15" fill="${fill}" />
  </svg>
  <div class="ripple ${type}"></div>
  <div class="ripple ${type}"></div>
  <div class="ripple ${type}"></div>
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
        return `
            <div class="popup-container">
                <p class="time">${formatTime(incident.datetime)}</p>
                <p class="type">${incident.type ?? ''}</p>
                <p class="address">${incident.address ?? ''}</p>
            </div>`;
    }

    return `
            <div class="popup-container">
                <p class="time">${formatTime(incident.arrived_time)}</p>
                <p class="type">${incident.final_call_type ?? ''}</p>
                <p class="address">${incident.precinct ?? incident.district_sector ?? ''}</p>
            </div>`;
};

export default function EmergencyMap({ dataCollection = [] } = {}) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef(new Map());

    const groupedIncidents = useMemo(() => dataCollection.reduce((acc, item) => {
        if (item.source === 'fire') {
            acc.fire.push(item);
        } else if (item.source === 'police') {
            acc.police.push(item);
        }
        return acc;
    }, { fire: [], police: [] }), [dataCollection]);

    const { fire: fireIncidents, police: policeIncidents } = groupedIncidents;

    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) {
            return undefined;
        }

        const mapInstance = new maptilersdk.Map({
            container: mapContainerRef.current,
            style: styleUrl,
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

        return () => {
            mapInstance.off('error', handleError);
            markersRef.current.forEach(({ marker }) => marker.remove());
            markersRef.current.clear();
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
    }, [styleUrl]);

    useEffect(() => {
        const mapInstance = mapRef.current;
        if (!mapInstance) {
            return;
        }

        const hasIncidents = fireIncidents.length > 0 || policeIncidents.length > 0;
        if (!hasIncidents) {
            markersRef.current.forEach(({ marker }) => marker.remove());
            markersRef.current.clear();
            return;
        }

        const bounds = new maptilersdk.LngLatBounds();
        const activeMarkerIds = new Set();

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
                const popup = new maptilersdk.Popup({ closeButton: false }).setHTML(popupHtml);
                const marker = new maptilersdk.Marker(markerOptions)
                    .setLngLat([lng, lat])
                    .setPopup(popup)
                    .addTo(mapInstance);

                markersRef.current.set(markerId, { marker, popup });
            }

            activeMarkerIds.add(markerId);
            bounds.extend([lng, lat]);
        };

        fireIncidents.forEach((incident) => upsertMarker(incident, 'fire'));
        policeIncidents.forEach((incident) => upsertMarker(incident, 'police'));

        const canvas = mapInstance.getCanvas();
        const hasSize = canvas && canvas.width > 0 && canvas.height > 0;
        const hasBounds = typeof bounds.isEmpty === 'function' ? !bounds.isEmpty() : activeMarkerIds.size > 0;

        if (hasBounds && hasSize) {
            mapInstance.fitBounds(bounds, { padding: 100, maxZoom: Math.max(mapInstance.getZoom(), DEFAULT_ZOOM) });
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
    }, [fireIncidents, policeIncidents]);

    return (
        <div className="map-wrap">
            <div ref={mapContainerRef} className="map" />
        </div>
    );
}
