// FlyToVessel.jsx

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const FlyToVessel = ({ vessel }) => {
  const map = useMap();

  useEffect(() => {
    if (vessel && map) {
      const { latitude, longitude, ship_name, mmsi, sog } = vessel;

      map.flyTo([ latitude , longitude ], 17, { duration: 1.5 });

      L.popup()
        .setLatLng([latitude , longitude])
        .setContent(`
          <strong>Ship Name:</strong> ${ship_name || 'Unknown'}<br/>
          <strong>MMSI:</strong> ${mmsi}<br/>
          <strong>Speed (SOG):</strong> ${sog != null ? sog + ' kn' : 'N/A'}
        `)
        .openOn(map);
    }
  }, [vessel, map]);

  return null;
};

export default FlyToVessel;
