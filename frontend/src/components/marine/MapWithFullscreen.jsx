import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet'; // Ensure L is imported

const MapWithFullscreen = () => {
    const map = useMap();

    useEffect(() => {
        if (map) {
            const fullscreenControl = L.control.fullscreen({
                position: 'topright',
                title: 'View Fullscreen',
                titleCancel: 'Exit Fullscreen',
            }).addTo(map);

            const resetViewControl = L.Control.extend({
                options: {
                    position: 'topleft'
                },
                onAdd() {
                    const container = L.DomUtil.create('div', 'leaflet-bar');
                    const button = L.DomUtil.create('a', 'leaflet-bar-part leaflet-reset-view', container);
                    button.title = 'Reset View';
                    button.innerHTML = '<i class="fas fa-sync-alt"></i>';
                    L.DomEvent.on(button, 'click', () => {
                        map.setView([0, 0], 1.5); // Reset to a default view
                    });
                    return container;
                }
            });

            const resetControl = new resetViewControl();
            resetControl.addTo(map);

            // Set scale when entering fullscreen
            const onFullscreenChange = () => {
                if (document.fullscreenElement) {
                    // Change the view/scale when entering fullscreen
                    map.setView([0, 0], 4); // Set your desired latitude, longitude, and zoom level
                } else {
                    // Reset the view when exiting fullscreen if needed
                    map.setView([0, 0], 1.5); // Change this to your default view if desired
                }
            };

            document.addEventListener('fullscreenchange', onFullscreenChange);
            return () => {
                fullscreenControl.remove();
                resetControl.remove();
                document.removeEventListener('fullscreenchange', onFullscreenChange);
            };
        }
    }, [map]);

    return null;
};

export default MapWithFullscreen;
