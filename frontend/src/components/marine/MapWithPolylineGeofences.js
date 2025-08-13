import React from 'react';
import PropTypes from 'prop-types';
import { Polyline, Popup } from 'react-leaflet';

// Function to convert coordinates for Leaflet
const convertCoordinates = (coordinates) => {
  return coordinates.map(coord => [coord.lat, coord.lng]);
};

const MapWithPolylineGeofences = ({ geofences }) => {
  return (
    <>
      {geofences.map((geofence) => {
        const coordinates = convertCoordinates(geofence.coordinates);
        return (
          <Polyline
            key={geofence.geofenceId} // Use geofenceId for unique key
            positions={coordinates}
            color="#FF0000" // Customize color as needed
            weight={2} // Customize weight
            opacity={4} // Customize opacity
          >
            <Popup>
              <div>
                <h4>polyline:{geofence.geofenceName}</h4>
            
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
};

MapWithPolylineGeofences.propTypes = {
  geofences: PropTypes.arrayOf(
    PropTypes.shape({
      geofenceId: PropTypes.string.isRequired,
      geofenceName: PropTypes.string.isRequired,
      geofenceType: PropTypes.string.isRequired,
      date: PropTypes.string.isRequired,
      remarks: PropTypes.string.isRequired,
      coordinates: PropTypes.arrayOf(
        PropTypes.shape({
          lat: PropTypes.number.isRequired,
          lng: PropTypes.number.isRequired,
        }).isRequired
      ).isRequired
    }).isRequired
  ).isRequired,
};

export default MapWithPolylineGeofences;
