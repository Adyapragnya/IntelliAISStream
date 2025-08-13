import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';

const DrawTool = ({ selectedFeatureGroup, setSelectedFeatureGroup, selectedGeofence, setSelectedGeofence, onGeofenceEdited, onGeofenceDeleted }) => {
  const map = useMap();
  
  
  useEffect(() => {
    if (!map) return;

    // Custom delete button
    const DeleteButton = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function () {
        const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
        btn.innerHTML = '🗑️'; // Trash icon
     
          // Mimic Leaflet's default control button styles
      btn.style.backgroundColor = 'white';
      btn.style.padding = '4px'; // Reduced padding for smaller button
      btn.style.border = '1px solid #ccc'; // Subtle border
      btn.style.cursor = 'pointer';
      btn.style.borderRadius = '4px'; // Slightly rounded corners
      btn.style.width = '32px'; // Match Leaflet's button size
      btn.style.height = '32px';
      btn.style.lineHeight = '22px'; // Adjust icon alignment
      btn.style.fontSize = '14px'; // Match built-in button font size
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';// Subtle shadow for depth
    
      // Hover effect like Leaflet buttons
      btn.onmouseover = () => {
        btn.style.backgroundColor = '#f4f4f4';
      };
      btn.onmouseout = () => {
        btn.style.backgroundColor = 'white';
      };

        btn.onclick = async function () {
          if (selectedFeatureGroup.getLayers().length === 0) {
            Swal.fire('No Geofence Selected', 'Please select a geofence to delete.', 'info');
            return;
          }
        
          Swal.fire({
            title: 'Delete Selected Geofence?',
            text: 'This action cannot be undone!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
          }).then(async (result) => {
            if (result.isConfirmed) {
              try {
                selectedFeatureGroup.eachLayer(async (layer) => {
                  await onGeofenceDeleted(layer.options._id, layer.options.type);
                  selectedFeatureGroup.removeLayer(layer);
                });
        
                Swal.fire('Deleted!', 'Geofence has been removed.', 'success');
              } catch (error) {
                console.error("Error deleting geofence:", error);
                Swal.fire('Error', 'Failed to delete geofence. Please try again.', 'error');
              }
            }
          });
        };
        

        return btn;
      },
    });

    const EditSaveControl = L.Control.extend({
      options: { position: 'topleft' },
    
      onAdd: function () {
        const mainContainer = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'column'; // Stack buttons vertically
        mainContainer.style.alignItems = 'start';
        mainContainer.style.gap = '5px';
        mainContainer.style.border = 'none';
           // First container (Edit & Save)
    const firstContainer = L.DomUtil.create('div', '', mainContainer);
    firstContainer.style.display = 'flex';
    firstContainer.style.gap = '5px';
    firstContainer.style.flexWrap = 'wrap'; // Allow wrapping

    // Second container (Unselect)
    const secondContainer = L.DomUtil.create('div', '', mainContainer);
    secondContainer.style.marginTop = '5px'; // Add spacing

    const createButton = (container, icon, title, onClick) => {
      const btn = L.DomUtil.create('button', 'leaflet-bar', container);
      btn.innerHTML = icon;
      btn.title = title;
    
      // Mimic Leaflet's default control button styles
      btn.style.backgroundColor = 'white';
      btn.style.padding = '4px'; // Reduced padding for smaller button
      btn.style.border = '1px solid #ccc'; // Subtle border
      btn.style.cursor = 'pointer';
      btn.style.borderRadius = '4px'; // Slightly rounded corners
      btn.style.width = '32px'; // Match Leaflet's button size
      btn.style.height = '32px';
      btn.style.lineHeight = '22px'; // Adjust icon alignment
      btn.style.fontSize = '14px'; // Match built-in button font size
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';// Subtle shadow for depth
    
      // Hover effect like Leaflet buttons
      btn.onmouseover = () => {
        btn.style.backgroundColor = '#f4f4f4';
      };
      btn.onmouseout = () => {
        btn.style.backgroundColor = 'white';
      };
    
      btn.onclick = onClick;
      return btn;
    };
    
    
             // Edit Button
             const editBtn = createButton(firstContainer,'✏️', 'Edit Geofence', function () {
              if (selectedFeatureGroup.getLayers().length === 0) {
                Swal.fire('No Geofence Selected', 'Please select a geofence to edit.', 'info');
                return;
              }
    
              selectedFeatureGroup.eachLayer((layer) => {
                if (layer.editing) layer.editing.enable();
              });
    
              saveBtn.style.display = 'block';
            });
          

              // Save Button (Initially Hidden)
          const saveBtn = createButton(firstContainer,'💾', 'Save Geofence', async function () {
            if (selectedFeatureGroup.getLayers().length === 0) {
              Swal.fire('No Geofence Selected', 'Please select a geofence to edit.', 'info');
              return;
            }
          
            Swal.fire({
              title: 'Save Changes',
              text: 'Are you sure you want to update the geofence?',
              icon: 'question',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Yes, Save it!',
            }).then(async (result) => {
              if (result.isConfirmed) {
                try {
                  selectedFeatureGroup.eachLayer(async (layer) => {
                    if (layer.editing) {
                      layer.editing.disable();
            
            
      let updatedGeofence; // Declare variable

      if (layer instanceof L.Circle && layer.options.type === "VesselBuffer") {
        updatedGeofence = {  // Create a new object
          _id: layer.options._id,
          type: layer.options.type,
          IMO: layer.options.IMO,
          NAME: layer.options.NAME,
          TIMESTAMP: layer.options.TIMESTAMP,
          LATITUDE: layer.options.LATITUDE,
          LONGITUDE: layer.options.LONGITUDE,
          radius: layer.getRadius(),
        };
      } else {
        updatedGeofence = {
          _id: layer.options._id,
          geofenceName: layer.options.geofenceName,
          type: layer.options.type,
          seaport: layer.options.seaport,
          geofenceType: layer.options.geofenceType,
          remarks: layer.options.remarks,
          coordinates: [],
        };
          
                      if (layer instanceof L.Polygon ||  layer instanceof L.Rectangle) {
                        const latLngs = layer.getLatLngs();
                        const coordinates = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
                        updatedGeofence.coordinates = coordinates.map((latLng) => ({
                          lat: latLng.lng,
                          lng: latLng.lat,
                        }));
                      }
                      else if (layer instanceof L.Polyline) {
                        const latLngs = layer.getLatLngs();
                        const coordinates = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
                        updatedGeofence.coordinates = coordinates.map((latLng) => ({
                          lat: latLng.lat,
                          lng: latLng.lng,
                        }));
                      }            
                      else if (layer instanceof L.Circle) {
                        const center = layer.getLatLng();
                        updatedGeofence.coordinates = [{ lat: center.lat, lng: center.lng, radius: layer.getRadius() }];
                      }
                    }
          
                    try {
                      await onGeofenceEdited(updatedGeofence);
                      Swal.fire('Saved!', 'The geofence has been updated!', 'success');
                      saveBtn.style.display = 'none';
                    } catch (error) {
                      console.error("Error updating geofence:", error);
                      Swal.fire('Error', 'Failed to update the changes. Please try again.', 'error');
                    }
                    }
                  });
                } catch (error) {
                  console.error("Error updating geofence:", error);
                  Swal.fire('Error', 'Failed to update the changes. Please try again.', 'error');
                }
              }
            });
          });
  
          saveBtn.style.display = 'none';
  
          if (selectedFeatureGroup.getLayers().length !== 0 || selectedGeofence ) {
 // Unselect Button (Placed in second container)
 createButton(secondContainer, '❌', 'Unselect Geofence', function () {
  if (selectedFeatureGroup.getLayers().length === 0) {
     Swal.fire('No Selection', 'No geofence is currently selected.', 'info');
     return;
   }
   setSelectedGeofence(null);
   selectedFeatureGroup.eachLayer((layer) => {
     const defaultColor = layer.options.type === "Advanced" 
     ? 'yellow' 
     : layer.options.type === "VesselBuffer" 
       ? 'gray' 
       : 'blue'; 
   
     layer.setStyle({ color: defaultColor });
     if (layer.editing) layer.editing.disable();
   });
   selectedFeatureGroup.clearLayers();
 });
          }

 return mainContainer;
},
});
     
  


    
    // ✅ Add Edit+Save Control to Map
    const editSaveControl = new EditSaveControl();
    map.addControl(editSaveControl);

    
    // Add the buttons to the toolbar
    const deleteControl = new DeleteButton();
    map.addControl(deleteControl);

 

    return () => {
      map.removeControl(deleteControl);
      map.removeControl(editSaveControl);
    };
  }, [map, selectedFeatureGroup,onGeofenceEdited, onGeofenceDeleted]);

  return null;
};

DrawTool.propTypes = {
  selectedFeatureGroup: PropTypes.object.isRequired,
  setSelectedFeatureGroup:PropTypes.object.isRequired,
  selectedGeofence:PropTypes.object.isRequired,
  setSelectedGeofence:PropTypes.object.isRequired,
  onGeofenceEdited: PropTypes.func.isRequired,
  onGeofenceDeleted: PropTypes.func.isRequired,
};

export default DrawTool;
