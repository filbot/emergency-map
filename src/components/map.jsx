/* eslint-disable react/prop-types */
import { useRef, useEffect, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import "./map.css";

export default function Map({ dataCollection }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [markers, setMarkers] = useState([]);
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
    
    maptilersdk.config.apiKey = import.meta.env.VITE_API_KEY;

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
                style: maptilersdk.MapStyle.DATAVIZ.DARK,
                center: [seattle.lng, seattle.lat],
                zoom: zoom,
            });
        };

        initializeMap();
    }, [seattle.lng, seattle.lat, zoom]);

    useEffect(() => {
        if (map.current && dataCollection.length > 0) {
            // Clear existing markers
            markers.forEach(marker => marker.remove());
            setMarkers([]);

            const bounds = new maptilersdk.LngLatBounds();
            const newMarkers = [];

            const fireDataCollection = dataCollection.filter(item => item.source === "fire");;
            const policeDataCollection = dataCollection.filter(item => item.source === "police");;

            fireDataCollection.forEach((item) => {
                const latitude = parseCoordinate(item.latitude);
                const longitude = parseCoordinate(item.longitude);

                if (!isValidCoordinate(longitude, latitude)) {
                    return;
                }

                const customMarkerElement = document.createElement('div');
                customMarkerElement.innerHTML = `<div class="ripple-container">
  <svg width="20px" height="20px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="15" fill="#FF3434" />
  </svg>
  <div class="ripple fire"></div>
  <div class="ripple fire"></div>
  <div class="ripple fire"></div>
</div>`;
                const marker = new maptilersdk.Marker({ color: "#FF0000", element: customMarkerElement })
                    .setLngLat([longitude, latitude])
                    .setPopup(new maptilersdk.Popup({ closeButton: false }).setHTML(`
                        <div class="popup-container">
                            <p className="time">${formatTime(item.datetime)}</p>
                            <p className="type">${item.type}</p>
                            <p className="address">${item.address}</p>
                        </div>
                    `))
                    .addTo(map.current);

                // marker.togglePopup();
                newMarkers.push(marker);

                // Extend the bounds to include this marker's coordinates
                bounds.extend([longitude, latitude]);
            });

            policeDataCollection.forEach((item) => {
                const latitude = parseCoordinate(item.blurred_latitude);
                const longitude = parseCoordinate(item.blurred_longitude);

                if (!isValidCoordinate(longitude, latitude)) {
                    return;
                }

                const customMarkerElement = document.createElement('div');
                customMarkerElement.innerHTML = `<div class="ripple-container">
              <svg width="30px" height="30px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="15" fill="#0074D9" />
              </svg>
              <div class="ripple police"></div>
              <div class="ripple police"></div>
              <div class="ripple police"></div>
            </div>`;
                const marker = new maptilersdk.Marker({ color: "#FF0000", element: customMarkerElement })
                    .setLngLat([longitude, latitude])
                    .setPopup(new maptilersdk.Popup({ closeButton: false }).setHTML(`
                        <div class="popup-container">
                            <p className="time">${formatTime(item.arrived_time)}</p>
                            <p className="type">${item.final_call_type}</p>
                            <p className="address">${item.precinct}</p>
                        </div>
                    `))
                    .addTo(map.current);
            
                // marker.togglePopup();
                newMarkers.push(marker);
            
                // Extend the bounds to include this marker's coordinates
                bounds.extend([longitude, latitude]);
            });

            // Fit the map to the bounds of all markers
            const canvas = map.current.getCanvas();
            const hasSize = canvas && canvas.width > 0 && canvas.height > 0;

            const hasBounds = typeof bounds.isEmpty === 'function' ? !bounds.isEmpty() : newMarkers.length > 0;

            if (hasBounds && hasSize) {
                map.current.fitBounds(bounds, { padding: 100 });
            }

            // Update the state with new markers
            setMarkers(newMarkers);
        }
    }, [dataCollection]);

    return (
        <div className="map-wrap">
            <div ref={mapContainer} className="map" />
        </div>
    );
}
