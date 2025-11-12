/* eslint-disable react/prop-types */
import { useRef, useEffect, useState, useMemo } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "./map.css";
import { getMapStyleUrl } from '../config/mapConfig.js';

const apiKey = import.meta.env.VITE_API_KEY;
const styleUrl = getMapStyleUrl(apiKey);
maptilersdk.config.apiKey = apiKey;

const FIRE_MARKER_COLOR = "#FF0000";
const POLICE_MARKER_COLOR = "#0057B8";

const buildIncidentKey = (item, prefix) => item.cad_event_number
    || item.incident_number
    || item.event_number
    || `${prefix}-${item.datetime ?? item.arrived_time ?? ''}-${item.address ?? item.precinct ?? ''}`;

const createMarkerElement = (type) => {
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

export default function Map({ dataCollection }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const markersRef = useRef(new Map());
    const seattle = { lng: -122.366951, lat: 47.650298 };
    const [zoom] = useState(13);

    const parseCoordinate = (value) => {
        if (value === null || value === undefined) {
            return value;
        }

        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? undefined : parsed;
        }

        return value;
    };

    const isValidCoordinate = (lng, lat) => Number.isFinite(lng)
        && Number.isFinite(lat)
        && lat >= -90
        && lat <= 90
        && lng >= -180
        && lng <= 180;
    
    function formatTime(dateTimeString) {
        const date = new Date(dateTimeString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    useEffect(() => {
        if (map.current) return; // stops map from initializing more than once

        const initializeMap = async () => {
            map.current = new maptilersdk.Map({
                container: mapContainer.current,
                style: styleUrl,
                center: [seattle.lng, seattle.lat],
                zoom: zoom,
            });
        };

        initializeMap();
    }, [seattle.lng, seattle.lat, zoom]);

    const { fireDataCollection, policeDataCollection } = useMemo(() => ({
        fireDataCollection: dataCollection.filter((item) => item.source === 'fire'),
        policeDataCollection: dataCollection.filter((item) => item.source === 'police')
    }), [dataCollection]);

    useEffect(() => {
        if (!map.current) {
            return;
        }

        if (dataCollection.length === 0) {
            markersRef.current.forEach(({ marker }) => marker.remove());
            markersRef.current.clear();
            return;
        }

        const ensureMarker = ({ id, longitude, latitude, popupHtml, color, elementClass }) => {
            const existing = markersRef.current.get(id);
            if (existing) {
                existing.marker.setLngLat([longitude, latitude]);
                existing.popup.setHTML(popupHtml);
                return;
            }

            const popup = new maptilersdk.Popup({ closeButton: false }).setHTML(popupHtml);
            const marker = new maptilersdk.Marker({ color, element: createMarkerElement(elementClass) })
                .setLngLat([longitude, latitude])
                .setPopup(popup)
                .addTo(map.current);

            markersRef.current.set(id, { marker, popup });
        };

        const bounds = new maptilersdk.LngLatBounds();
        const activeMarkerIds = new Set();

        fireDataCollection.forEach((item) => {
                const latitude = parseCoordinate(item.latitude);
                const longitude = parseCoordinate(item.longitude);

                if (!isValidCoordinate(longitude, latitude)) {
                    return;
                }

                const markerId = buildIncidentKey(item, 'fire');
                const popupHtml = `
                        <div class="popup-container">
                            <p className="time">${formatTime(item.datetime)}</p>
                            <p className="type">${item.type}</p>
                            <p className="address">${item.address}</p>
                        </div>`;

                ensureMarker({
                    id: markerId,
                    longitude,
                    latitude,
                    popupHtml,
                    color: FIRE_MARKER_COLOR,
                    elementClass: 'fire'
                });

                activeMarkerIds.add(markerId);
                bounds.extend([longitude, latitude]);
            });

            policeDataCollection.forEach((item) => {
                const latitude = parseCoordinate(item.blurred_latitude);
                const longitude = parseCoordinate(item.blurred_longitude);

                if (!isValidCoordinate(longitude, latitude)) {
                    return;
                }

                const markerId = buildIncidentKey(item, 'police');
                const popupHtml = `
                        <div class="popup-container">
                            <p className="time">${formatTime(item.arrived_time)}</p>
                            <p className="type">${item.final_call_type}</p>
                            <p className="address">${item.precinct}</p>
                        </div>`;

                ensureMarker({
                    id: markerId,
                    longitude,
                    latitude,
                    popupHtml,
                    color: POLICE_MARKER_COLOR,
                    elementClass: 'police'
                });

                activeMarkerIds.add(markerId);
                bounds.extend([longitude, latitude]);
            });

            // Fit the map to the bounds of all markers
            const canvas = map.current.getCanvas();
            const hasSize = canvas && canvas.width > 0 && canvas.height > 0;

            const hasBounds = typeof bounds.isEmpty === 'function' ? !bounds.isEmpty() : activeMarkerIds.size > 0;

            if (hasBounds && hasSize) {
                map.current.fitBounds(bounds, { padding: 100 });
            }

            markersRef.current.forEach((entry, id) => {
                if (!activeMarkerIds.has(id)) {
                    entry.marker.remove();
                    markersRef.current.delete(id);
                }
            });
    }, [dataCollection, fireDataCollection, policeDataCollection]);

    return (
        <div className="map-wrap">
            <div ref={mapContainer} className="map" />
        </div>
    );
}
