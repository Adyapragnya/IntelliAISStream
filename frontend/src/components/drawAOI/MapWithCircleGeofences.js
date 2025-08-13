import React from 'react';
import PropTypes from 'prop-types';
import { FeatureGroup, Circle, Popup } from 'react-leaflet';

const MapWithCircleGeofences = ({ geofences }) => {
    
    return (
      <FeatureGroup>
        {geofences.map(geofence => {
          if (geofence.LATITUDE && geofence.LONGITUDE && geofence.radius) {
            const { LATITUDE, LONGITUDE, radius } = geofence
            return (
              <Circle
                key={geofence.geofenceId}
                center={[LATITUDE, LONGITUDE]}
                radius={radius}
                color="#E195AB"
                fillColor="#E195AB"
                fillOpacity={0.3}
                weight={2}
                opacity={4} 
              >
                {/* <Popup>
                  <div>
                    <h4>Circle Geofence: {geofence.geofenceName}</h4>
                    
                  </div>
                </Popup> */}
              </Circle>
            );
          }
          return null; // Skip rendering if not a circle
        })}
      </FeatureGroup>
    );
};

MapWithCircleGeofences.propTypes = {
  geofences: PropTypes.array.isRequired,
};

export default MapWithCircleGeofences;
