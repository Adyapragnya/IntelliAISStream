import React from 'react';
import PropTypes from 'prop-types';
import { FeatureGroup, Circle, Popup } from 'react-leaflet';

const MapWithCircleGeofences = ({ geofences }) => {
    console.log('Rendering Circle Geofences:', geofences); // Log geofences
  
    return (
      <FeatureGroup>
        {geofences.map(geofence => {
          if (geofence.coordinates.length > 0 && geofence.coordinates[0].radius > 0) {
            const { lat, lng, radius } = geofence.coordinates[0];
            return (
              <Circle
                key={geofence.geofenceId}
                center={[lat, lng]}
                radius={radius}
                color="grey"
                fillColor="grey"
                fillOpacity={0.3}
                weight={2}
                opacity={4} 
              >
                <Popup>
                  <div>
                    <h4>Circle Geofence: {geofence.geofenceName}</h4>
                    
                  </div>
                </Popup>
              </Circle>
            );
          }
          return null; // Skip rendering if not a circle
        })}
      </FeatureGroup>
    );
};

MapWithCircleGeofences.propTypes = {
  geofences: PropTypes.arrayOf(
    PropTypes.shape({
      geofenceId: PropTypes.string.isRequired,
      geofenceName: PropTypes.string.isRequired, // Make sure to include geofenceName
      coordinates: PropTypes.arrayOf(
        PropTypes.shape({
          lat: PropTypes.number.isRequired,
          lng: PropTypes.number.isRequired,
          radius: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
};

export default MapWithCircleGeofences;
