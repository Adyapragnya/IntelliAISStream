import PropTypes from 'prop-types'; // Import PropTypes
import { useEffect } from "react";
import { useMap } from "react-leaflet";

const FlyToPort = ({ selectedPort }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedPort && selectedPort.lat && selectedPort.long) {
      map.flyTo([selectedPort.lat, selectedPort.long], 10, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [selectedPort, map]);

  return null;
};


// ✅ Define prop types for validation
FlyToPort.propTypes = {
  selectedPort: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    long: PropTypes.number.isRequired,
  }),
};

export default FlyToPort;
