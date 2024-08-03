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

            dataCollection.forEach((item) => {
                const marker = new maptilersdk.Marker({ color: "#FF0000" })
                    .setLngLat([item.longitude, item.latitude])
                    .setPopup(new maptilersdk.Popup({ closeButton: false }).setHTML(`
                        <div class="popup-container">
                            <p className="time">${formatTime(item.datetime)}</p>
                            <p className="type">${item.type}</p>
                            <p className="address">${item.address}</p>
                        </div>
                    `))
                    .addTo(map.current);

                marker.togglePopup();
                newMarkers.push(marker);

                // Extend the bounds to include this marker's coordinates
                bounds.extend([item.longitude, item.latitude]);
            });

            // Fit the map to the bounds of all markers
            map.current.fitBounds(bounds, { padding: 20 });

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
