import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

// Helper to create custom vessel icon
const createCustomIcon = (heading, width, height, iconType) => {
  const iconUrls = {
    small: '/ship-popup.png',
    medium: '/ship-popup.png',
    large: '/ship-popup.png',
    'extra-large': '/BERTH-ICON.PNG',
  };

  const iconUrl = iconUrls[iconType] || iconUrls.small;

  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="transform: rotate(${heading}deg); width: ${width}px; height: ${height}px;">
             <img src="${iconUrl}" style="width: 100%; height: 100%;" />
           </div>`,
    iconSize: [width, height],
  });
};

// Helper to create a simple point icon
const createPointIcon = (width, height) =>
  L.divIcon({
    className: 'point-icon',
    html: `<div style="width: ${width}px; height: ${height}px; background-color: red; border-radius: 50%;"></div>`,
    iconSize: [width, height],
  });

// Helper to determine icon parameters based on zoom level
const getIconForZoom = (zoom) => {
  if (zoom > 23) return { width: 50, height: 120, type: 'extra-large' };
  if (zoom > 20) return { width: 60, height: 80, type: 'extra-large' };
  if (zoom > 17.75) return { width: 60, height: 120, type: 'large' };
  if (zoom > 16.75) return { width: 45, height: 120, type: 'large' };
  if (zoom > 16) return { width: 35, height: 120, type: 'large' };
  if (zoom > 15.75) return { width: 25, height: 70, type: 'large' };
  if (zoom > 14.75) return { width: 15, height: 40, type: 'large' };
  if (zoom > 13.75) return { width: 10, height: 35, type: 'large' };
  if (zoom > 12.75) return { width: 10, height: 35, type: 'large' };
  if (zoom > 11.5) return { width: 9, height: 25, type: 'large' };
  if (zoom > 10.75) return { width: 8, height: 15, type: 'large' };
  if (zoom > 9.75) return { width: 8, height: 15, type: 'large' };
  if (zoom > 8.75) return { width: 8, height: 14, type: 'large' };
  if (zoom > 7) return { width: 8, height: 8, type: 'large' };
  if (zoom > 6) return { width: 8, height: 8, type: 'large' };
  if (zoom > 4) return { width: 8, height: 8, type: 'point' };
  if (zoom > 2) return { width: 7, height: 7, type: 'point' };
  return { width: 6, height: 6, type: 'point' };
};

// Helper to generate popup content HTML
const generatePopupContent = (vessel) =>
  `<div class="popup-container">
     <div class="popup-header">
       <h3 class="popup-title">${vessel.name || 'No name'} <span class="popup-imo">${vessel.imo || 'N/A'}</span></h3>
     </div>
     <div class="popup-details">
       <div class="popup-detail"><strong>TYPE :</strong><span class="popup-value time">${vessel.SpireTransportType || '-'}</span></div>
       <div class="popup-detail"><span class="popup-value">${vessel.heading ? vessel.heading + '°' : '-'} | ${vessel.speed ? vessel.speed + ' kn' : '-'}</span></div>
       <div class="popup-detail"><strong>DESTN :</strong><span class="popup-value time">${vessel.destination || '-'}</span></div>
       <div class="popup-detail"><strong>ETA :</strong><span class="popup-value time">${vessel.eta || '-'}</span></div>
     </div>
     <div class="popup-footer">
       <a href="/dashboard/${vessel.name}" class="view-more-link">++View More</a>
     </div>
   </div>`;

const MapWithMarkers = ({ vessels, selectedVessel }) => {
  const map = useMap();
  const markerClusterGroupRef = useRef(null);
  const markersRef = useRef({});
  const prevVesselsRef = useRef([]);
  const prevSelectedVesselRef = useRef(null);

  // Update marker icons based on the current zoom level
  const updateIconsForZoom = useCallback(() => {
    if (!map || !markerClusterGroupRef.current) return;
    
    const currentZoom = map.getZoom();
    const { width, height, type } = getIconForZoom(currentZoom);
  
    // Clear cluster and re-add markers to ensure visibility
    markerClusterGroupRef.current.clearLayers();
  
    Object.values(markersRef.current).forEach((marker) => {
      const vessel = marker.options.vesselData;
      const isSelected = selectedVessel && vessel.name === selectedVessel.name;
  
      const newIcon =
        isSelected
          ? createCustomIcon(vessel.heading, width, height, type)
          : type === 'point'
          ? createPointIcon(width, height)
          : createCustomIcon(vessel.heading, width, height, type);
  
      marker.setIcon(newIcon);
      
      // Re-add marker to cluster after updating icon
      markerClusterGroupRef.current.addLayer(marker);
      
      if (isSelected) {
        marker.openPopup();
      }
    });
  
  }, [map, selectedVessel]);
  

  // Fly to selected vessel and open a popup on selection change
  const flyToVessel = useCallback(() => {
    if (selectedVessel && selectedVessel !== prevSelectedVesselRef.current) {
      const { width, height, type } = getIconForZoom(map.getZoom());
      const customIcon = createCustomIcon(selectedVessel.heading, width, height, type);

      // Create a temporary marker for the selected vessel
      const tempMarker = L.marker(
        [selectedVessel.lat, selectedVessel.lng],
        { icon: customIcon }
      )
        // .addTo(map)
        .bindPopup(generatePopupContent(selectedVessel))
        .openPopup();

      map.flyTo([selectedVessel.lat, selectedVessel.lng], 8, {
        animate: true,
        duration: 1,
      });

      // Keep the popup open even if it is closed manually
      tempMarker.on('popupclose', () => {
        tempMarker.openPopup();
      });

      // prevSelectedVesselRef.current = selectedVessel;
    }
  }, [map, selectedVessel]);

  useEffect(() => {
    if (!map) return;
  
    if (!markerClusterGroupRef.current) {
      markerClusterGroupRef.current = L.markerClusterGroup({
        maxClusterRadius: 30,
      });
      map.addLayer(markerClusterGroupRef.current);
    }
  
    // Function to reload markers on zoom change
    const reloadMarkers = () => {
      markerClusterGroupRef.current.clearLayers();
      markersRef.current = {}; // Reset marker reference
  
      vessels.forEach((vessel) => {
        const key = vessel.name || `${vessel.lat}-${vessel.lng}`;
        const { width, height, type } = getIconForZoom(map.getZoom());
        const icon =
          type === 'point'
            ? createPointIcon(width, height)
            : createCustomIcon(vessel.heading, width, height, type);
  
        const marker = L.marker([vessel.lat, vessel.lng], {
          icon,
          vesselData: vessel,
        });
  
        marker.bindPopup(generatePopupContent(vessel));
        markerClusterGroupRef.current.addLayer(marker);
        markersRef.current[key] = marker;
      });
    };

    // Fly to selected vessel if applicable
    flyToVessel();
    reloadMarkers(); // Call on component mount
     // Listen for zoom changes and reload markers
  map.on('zoomend', reloadMarkers);

  return () => {
    map.off('zoomend', reloadMarkers);
  };
}, [map, vessels, selectedVessel, updateIconsForZoom, flyToVessel]);

  return null;
};

MapWithMarkers.propTypes = {
  vessels: PropTypes.arrayOf(
    PropTypes.shape({
      caseid: PropTypes.number,
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      name: PropTypes.string,
      imo: PropTypes.number,
      speed: PropTypes.number,
      heading: PropTypes.number,
      SpireTransportType: PropTypes.string,
      eta: PropTypes.string,
      destination: PropTypes.string,
    }).isRequired
  ).isRequired,
  selectedVessel: PropTypes.shape({
    SpireTransportType: PropTypes.string,
    name: PropTypes.string.isRequired,
    imo: PropTypes.number,
    speed: PropTypes.number,
    caseid: PropTypes.number,
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
    heading: PropTypes.number,
    eta: PropTypes.string,
    destination: PropTypes.string,
  }),
};

export default MapWithMarkers;
