import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MeasureControl.css'; // Import the custom CSS file
import borders from 'assets/theme/base/borders';

const MeasureControl = () => {
  const map = useMap();
  const [measuring, setMeasuring] = useState(false);
  const [distance, setDistance] = useState(0);
  const [finalDistance, setFinalDistance] = useState(null); // State to hold the final distance
  const polylineRef = useRef(null);
  const tempLineRef = useRef(null); // Reference for the dashed line
  const popupRef = useRef(null);
  const distancePopupsRef = useRef([]); // To keep track of distance popups
  const circleMarkersRef = useRef([]); // To store circle markers

  useEffect(() => {
    if (!map) return;

    L.Control.MeasureControl = L.Control.extend({
      statics: { TITLE: 'Measure distances' },
      options: { position: 'topleft' },
      onAdd: function () {
        const link = L.DomUtil.create('a', 'leaflet-control-measure');
        link.innerHTML = '<img src="/inactive.png" alt="Active Measure" style="width: 30px; height: 30px;" />';
        link.style.width = '30px'; // Set width for the button
        link.style.height = '30px'; // Set height for the button
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.justifyContent = 'center';
        link.style.fontSize = '18px'; // Set icon size
        link.title = 'Measure distances';
    
       
        // Event handler for click
        L.DomEvent.on(link, 'click', (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          toggleMeasuring(link); // Pass link to toggleMeasuring
        });
        
        return link;
      }
    });

    const measureControl = new L.Control.MeasureControl();
    map.addControl(measureControl);

    // Toggle measuring
    const toggleMeasuring = (link) => {
      setMeasuring((prev) => {
        const newMeasuring = !prev;
        if (newMeasuring) {
          startMeasuring(link); // Pass link to startMeasuring
        } else {
          stopMeasuring(link); // Pass link to stopMeasuring
        }
        return newMeasuring;
      });
    };

    const startMeasuring = (link) => {
      console.log('Started measuring');
      polylineRef.current = new L.Polyline([], {
        color: 'red',
        weight: 2,
      }).addTo(map);

      // Add a dashed polyline for the temporary preview
      tempLineRef.current = new L.Polyline([], {
        color: 'red',
        weight: 2,
        dashArray: '5, 10', // Dashed line style
      }).addTo(map);

      setDistance(0); // Reset distance
      setFinalDistance(null); // Reset final distance
      map.on('click', addPoint); // Start listening for map clicks
      map.on('mousemove', moveTempLine); // Listen for mouse move
      map.on('dblclick', endMeasuring); // End measurement on double-click
      // link.style.backgroundImage = 'url("/active.png")'; // Change to active image
      link.innerHTML = '<img src="/active.png" alt="Active Measure" style="width: 30px; height: 30px;" />';
      map.getContainer().classList.add('crosshair'); // Add crosshair class to map
    };

    const stopMeasuring = (link) => {
      console.log('Stopped measuring');
      if (polylineRef.current) {
        finalizeDistance();
        map.off('click', addPoint); // Stop listening to clicks
        map.off('mousemove', moveTempLine); // Stop listening to mouse moves
        map.off('dblclick', endMeasuring); // Stop double-click listener
        link.innerHTML = '<img src="/inactive.png" alt="Active Measure" style="width: 30px; height: 30px;" />';
        map.getContainer().classList.remove('crosshair'); // Remove crosshair class from map
        
        // Remove the polyline, dashed line, and popups
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
        map.removeLayer(tempLineRef.current);
        tempLineRef.current = null;
        clearPopups(); // Clear any distance popups

        // Remove circle markers
        circleMarkersRef.current.forEach(marker => map.removeLayer(marker));
        circleMarkersRef.current = []; // Clear the array
      }
    };

    const addPoint = (e) => {
      const { latlng } = e;
      console.log('Point added:', latlng);

      if (polylineRef.current) {
        polylineRef.current.addLatLng(latlng); // Add point to solid polyline
        tempLineRef.current.setLatLngs([latlng]); // Set the dashed line to start from the last point

        // Create a circle marker at the clicked point
        const circleMarker = L.circle(latlng, {
          color: 'blue',
          fillColor: '#30f', // Fill color
          // fillOpacity: 5,
          radius: 4, // Radius in meters
          
        }).addTo(map);
        circleMarkersRef.current.push(circleMarker); // Store reference to the circle marker

        const latLngs = polylineRef.current.getLatLngs();

        let totalDistance = 0;
        if (latLngs.length > 1) {
          for (let i = 1; i < latLngs.length; i++) {
            totalDistance += latLngs[i - 1].distanceTo(latLngs[i]); // Calculate distance between points
          }
        }
        setDistance(totalDistance); // Set distance in meters

        const distanceInKm = (totalDistance / 1000).toFixed(2);
        const distanceInMiles = (totalDistance * 0.000621371).toFixed(2); // Convert to miles
        const content = `Distance: ${distanceInKm} km (${distanceInMiles} miles)`;

        // Add a popup with the distance for the last added point
        const pointPopup = L.popup().setLatLng(latlng).setContent(content).openOn(map);
        distancePopupsRef.current.push(pointPopup); // Store reference to the popup
      }
    };

    const moveTempLine = (e) => {
      const { latlng } = e;
      if (tempLineRef.current && polylineRef.current) {
        const lastPoint = polylineRef.current.getLatLngs().slice(-1)[0];
        if (lastPoint) {
          tempLineRef.current.setLatLngs([lastPoint, latlng]); // Update dashed line while moving

          // Calculate the cumulative distance
          const latLngs = polylineRef.current.getLatLngs();
          let totalDistance = 0;
          if (latLngs.length > 1) {
            for (let i = 1; i < latLngs.length; i++) {
              totalDistance += latLngs[i - 1].distanceTo(latLngs[i]); // Cumulative distance between points
            }
          }
          const currentSegmentDistance = lastPoint.distanceTo(latlng); // Distance from last point to current mouse position
          const totalDistanceIncludingCurrent = totalDistance + currentSegmentDistance;

          // Convert to km and miles
          const totalDistanceInKm = (totalDistanceIncludingCurrent / 1000).toFixed(2);
          const totalDistanceInMiles = (totalDistanceIncludingCurrent * 0.000621371).toFixed(2);

          // Update the popup content dynamically with the total distance
          const liveContent = `Distance: ${totalDistanceInKm} km (${totalDistanceInMiles} miles)`;

          if (popupRef.current) {
            popupRef.current.setLatLng(latlng).setContent(liveContent).openOn(map);
          } else {
            popupRef.current = L.popup()
              .setLatLng(latlng)
              .setContent(liveContent)
              .openOn(map);
          }
        }
      }
    };

    const endMeasuring = () => {
      finalizeDistance();
      map.off('mousemove', moveTempLine); // Stop mouse move listener
      map.off('click', addPoint); // Stop point adding
      map.off('dblclick', endMeasuring); // Stop double-click listener
    };

    const finalizeDistance = () => {
      if (polylineRef.current) {
        const latLngs = polylineRef.current.getLatLngs();
        if (latLngs.length > 1) {
          let totalDistance = 0;
          for (let i = 1; i < latLngs.length; i++) {
            totalDistance += latLngs[i - 1].distanceTo(latLngs[i]); // Calculate distance between points
          }
          const finalDistanceInKm = (totalDistance / 1000).toFixed(2);
          setFinalDistance(finalDistanceInKm); // Save the final distance
        }
      }
    };

    const clearPopups = () => {
      // Remove all distance popups from the map
      distancePopupsRef.current.forEach(popup => map.removeLayer(popup));
      distancePopupsRef.current = []; // Clear the array
    };

    return () => {
      map.removeControl(measureControl); // Cleanup on unmount
      map.off('click', addPoint); // Remove event listener
      map.off('mousemove', moveTempLine); // Remove mouse move listener
      map.off('dblclick', endMeasuring); // Remove double-click listener
      clearPopups(); // Clean up popups on unmount
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null; // Clear the polyline reference
      }
      if (tempLineRef.current) {
        map.removeLayer(tempLineRef.current);
        tempLineRef.current = null; // Clear the dashed line reference
      }
      if (popupRef.current) {
        map.removeLayer(popupRef.current);
        popupRef.current = null; // Clear the popup reference
      }
      // Remove circle markers on unmount
      circleMarkersRef.current.forEach(marker => map.removeLayer(marker));
      circleMarkersRef.current = []; // Clear the array
    };
  }, [map]);

  return (
    <div className="leaflet-measure-info">
      {measuring && (
        <p>
          {distance > 0 ? `Total Distance: ${(distance / 1000).toFixed(2)} km` : 'Click to start measuring'}
        </p>
      )}
      {finalDistance && (
        <p>
          Final Distance: {finalDistance} km
        </p>
      )}
    </div>
  );
};

export default MeasureControl;