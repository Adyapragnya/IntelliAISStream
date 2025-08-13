import React, { useEffect, useState, useRef  } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import DrawTool from './DrawTool';
import axios from 'axios';
import PropTypes from 'prop-types';

const EditGeofences = ({ geofences, selectedGeofence, setSelectedGeofence, setGeofences, setFilteredGeofences, handleGeofenceChange   }) => {
  const map = useMap();

  const drawnItems = new L.FeatureGroup();

  const [selectedFeatureGroup, setSelectedFeatureGroup] = useState(new L.FeatureGroup());

    // Function to handle geofence selection from both click & dropdown
    const handleGeofenceSelect = (geofence) => {
      console.log(geofence);
      
      if (!geofence) return;
    
    
      // Reset the previous selected geofence's color
      if (selectedFeatureGroup.getLayers().length > 0) {
        selectedFeatureGroup.getLayers().forEach((layer) => {
            // Reset color to default based on geofence type
            const defaultColor = layer.options.type === "Advanced" 
            ? 'yellow' 
            : layer.options.type === "VesselBuffer" 
              ? 'gray' 
              : 'blue'; 
          
            layer.setStyle({ color: defaultColor });
        });
      }
    
      // Remove previous selection
      selectedFeatureGroup.clearLayers();
      // console.log("After clearing layers:", selectedFeatureGroup.getLayers());
      const drawnItems = drawnItemsRef.current; // ✅ Use persisted reference
    
      // Find the corresponding map layer
      const targetLayer = drawnItems.getLayers().find(
        (layer) => layer.options._id === geofence._id && layer.options.type === geofence.type
      );
    
      if (targetLayer) {
        targetLayer.setStyle({ color: 'red' }); // Highlight selected geofence
        selectedFeatureGroup.addLayer(targetLayer);
        // console.log("New selection layers:", selectedFeatureGroup.getLayers());
    
     
          map.fitBounds(targetLayer.getBounds());
       
      }
    
      setSelectedGeofence(geofence);
      // setSelectedFeatureGroup(selectedFeatureGroup);
    };
    
  
    


    // Function to create map layer from geofence data
    const createLayerFromGeofence = (geofence) => {

      if (geofence.type !== 'VesselBuffer') {
            if (!geofence || !geofence.coordinates || !Array.isArray(geofence.coordinates)) {
              console.error("Invalid geofence data:", geofence);
              return null;
            }
      }
    
      // console.log("Geofence object:", geofence);  // Check if geofenceName exists here
      
      let layer;
      let positions = [];
    
      try {
        // Handle coordinate format based on type
        if (geofence.type === 'Polyline' || geofence.type === 'Polycircle') {
          positions = geofence.coordinates
            .filter(coord => coord.lat !== undefined && coord.lng !== undefined)
            .map(coord => [coord.lat, coord.lng]);  // Use [lng, lat] for Polygon
        } else if (geofence.type === 'Polygon' || geofence.type === 'Advanced') {
          positions = geofence.coordinates
            .filter(coord => coord.lat !== undefined && coord.lng !== undefined)
            .map(coord => [coord.lng, coord.lat]);  // Use [lat, lng] for Polyline & Polycircle
        } else if (geofence.type === 'VesselBuffer') {
          positions = [geofence.LATITUDE ,geofence.LONGITUDE];
        
        } 
    
        if (positions.length === 0) {
          console.error("No valid coordinates found in geofence:", geofence);
          return null;
        }
    
        // Define default options for Leaflet layer
        const options = {
          color: geofence.type === "Advanced" ? 'yellow' : 'blue', //no need of gray color here, as it mentioned below
          _id: geofence._id,
          geofenceName: geofence.geofenceName, // Ensure this is being passed correctly
          geofenceType: geofence.geofenceType,
          type: geofence.type || 'Unknown'
        };
    
        // Handle different geofence types
        if (geofence.type === 'Polycircle' && geofence.coordinates[0].radius) {
          const center = positions[0];
          const radius = geofence.coordinates[0].radius || 100; // Default radius
          layer = L.circle(center, { ...options, radius });
    
        } else if (geofence.type === 'VesselBuffer' && geofence.radius){
          const center = positions;
          const radius = geofence.radius || 0; // Default radius
          const bufferoptions = {
            color: 'gray',
            _id: geofence._id,
            type: geofence.type || 'Unknown',
            IMO: geofence.IMO,
            NAME: geofence.NAME, 
            TIMESTAMP: geofence.TIMESTAMP,
            LATITUDE: geofence.LATITUDE,
            LONGITUDE: geofence.LONGITUDE,
            radius: geofence.radius,
          };
          layer = L.circle(center, { ...bufferoptions, radius });
    
        } else if (geofence.type === 'Polyline') {
          layer = L.polyline(positions, options);
    
        } else if (geofence.type === 'Polygon'){
          layer = L.polygon(positions, options);
    
        } else if (geofence.type === 'Advanced'){
          layer = L.polygon(positions, options);
    
        } 
        else {
          console.warn("Unknown geofence type:", geofence.type, "for geofence:", geofence);
        }
    
        // Add tooltip and click event
        if (layer) {
          // Check if geofenceName exists before binding the tooltip
          if (geofence.geofenceName) {
            layer.bindTooltip(`Name: ${geofence.geofenceName}`, { permanent: false });
          } else if (geofence.NAME) {
            layer.bindTooltip(`Name: ${geofence.NAME}`, { permanent: false });
          }else {
            console.warn("Geofence name is undefined:", geofence);
          }
    
          layer.on('click', () => handleGeofenceSelect(geofence));
        }
      } catch (error) {
        console.error("Error creating layer:", error, "Geofence:", geofence);
      }
    
      return layer;
    };
    
  

  const drawnItemsRef = useRef(new L.FeatureGroup());

  useEffect(() => {
    if (!map) return;
  
    const drawnItems = drawnItemsRef.current;
    map.addLayer(drawnItems);
    drawnItems.clearLayers();
  
    geofences.forEach((geofence) => {
      const layer = createLayerFromGeofence(geofence);
      if (layer) drawnItems.addLayer(layer);
    });
  
    return () => {
      drawnItems.clearLayers();
      map.removeLayer(drawnItems);
    };
  }, [map, geofences]);


   // Handle dropdown selection effect
   useEffect(() => {
    if (selectedGeofence) {
      handleGeofenceSelect(selectedGeofence);
    }else {
      // Unselect geofence if none is selected (this happens after edit or delete)
       // Reset the previous selected geofence's color
       if (selectedFeatureGroup.getLayers().length > 0) {
        selectedFeatureGroup.getLayers().forEach((layer) => {
            // Reset color to default based on geofence type
            const defaultColor = layer.options.type === "Advanced" ? 'yellow' : 'blue'; // If it's Advanced, reset to yellow
            layer.setStyle({ color: defaultColor });
        });
      }
    
      selectedFeatureGroup.clearLayers();
    }
  }, [selectedGeofence]);
 
 
  const updateGeofenceInDB = async (geofence) => {
    if (!geofence) return;

    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL;
      let endpoint = "";

      if (geofence.type === "Polygon") {
        endpoint = `/update-polygon-geofence/${geofence._id}`;
      } else if (geofence.type === "Polyline") {
        endpoint = `/update-polyline-geofence/${geofence._id}`;
      } else if (geofence.type === "Polycircle") {
        endpoint = `/update-polycircle-geofence/${geofence._id}`;
      } else if (geofence.type === "Advanced") {
        endpoint = `/update-terrestrial-advanced-geofence/${geofence._id}`;
      } else if (geofence.type === "VesselBuffer") {
        endpoint = `/update-vessel-buffer-geofence/${geofence._id}`;
      } 
   
      await axios.put(`${baseURL}/api${endpoint}`, geofence);
      

    // Update geofences state to reflect the updated geofence
    // setGeofences((prevGeofences) =>
    //   prevGeofences.map((g) => ((g._id === geofence._id && g.type === geofence.type) ? geofence : g))
    // );

    handleGeofenceChange();

    // Re-add all geofences except the one that is updated
    drawnItemsRef.current.clearLayers();
    geofences.forEach((g) => {
      if (!(g._id === geofence._id && g.type === geofence.type)) {
        const layer = createLayerFromGeofence(g);
        if (layer) drawnItemsRef.current.addLayer(layer);
      }
    });

    // Manually re-add the updated geofence
    const updatedLayer = createLayerFromGeofence(geofence);
    if (updatedLayer) {
      drawnItemsRef.current.addLayer(updatedLayer); // Add the updated geofence layer
    }

    // Clear any previous selections from the map
    setSelectedGeofence(null); // Optionally, keep this or remove it based on the desired behavior
    selectedFeatureGroup.clearLayers(); // Clear previous selection

    // Zoom to the updated geofence if necessary
    if (updatedLayer) {
      map.fitBounds(updatedLayer.getBounds()); // Zoom to the updated geofence
    }

    } catch (error) {
      console.error('Error updating geofence:', error);
    }
  };
 
 
 
  const deleteGeofenceFromDB = async (id, type) => {
    if (!id || !type) return;
  
    try {
      const baseURL = process.env.REACT_APP_API_BASE_URL;
      let endpoint = "";
  
      if (type === "Polygon") {
        endpoint = `/delete-polygon-geofence/${id}`;
      } else if (type === "Polyline") {
        endpoint = `/delete-polyline-geofence/${id}`;
      } else if (type === "Polycircle") {
        endpoint = `/delete-polycircle-geofence/${id}`;
      } else if (type === "Advanced") {
        endpoint = `/delete-terrestrial-advanced-geofence/${id}`;
      } else if (type === "VesselBuffer") {
        endpoint = `/delete-vessel-buffer-geofence/${id}`;
      }
    
      
      await axios.delete(`${baseURL}/api${endpoint}`);
   
      // setGeofences((prevGeofences) => prevGeofences.filter((g) => !(g._id === id && g.type === type)));

      //   // Also update the filteredGeofences state
      // setFilteredGeofences((prevFilteredGeofences) =>
      //   prevFilteredGeofences.filter((g) => !(g._id === id && g.type === type))
      // );

    handleGeofenceChange();


    // Remove the deleted geofence from the map
    drawnItemsRef.current.clearLayers();

     // Add the remaining geofences back to the map
     geofences.forEach((geofence) => {
      // Skip adding the deleted geofence
      if (geofence._id !== id) {
        const layer = createLayerFromGeofence(geofence);
        if (layer) drawnItemsRef.current.addLayer(layer);
      }
    });


    // Unselect geofence after deletion
    setSelectedGeofence(null);
    selectedFeatureGroup.clearLayers(); // Clear the selection on the map


    } catch (error) {
      console.error("Error deleting geofence from DB:", error);
    }
  };

  

  return (
    <DrawTool selectedFeatureGroup={selectedFeatureGroup} setSelectedFeatureGroup={setSelectedFeatureGroup} selectedGeofence={selectedGeofence} setSelectedGeofence={setSelectedGeofence} onGeofenceEdited={updateGeofenceInDB}  onGeofenceDeleted={deleteGeofenceFromDB} />

  );
};

EditGeofences.propTypes = {
  geofences: PropTypes.array.isRequired,
  selectedGeofence: PropTypes.object,
  setSelectedGeofence: PropTypes.func.isRequired,
  setGeofences: PropTypes.func.isRequired,
  setFilteredGeofences: PropTypes.func.isRequired,
  handleGeofenceChange: PropTypes.func.isRequired,
};


export default EditGeofences;
