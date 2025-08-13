import { useState, useEffect } from "react";
import { GeoJSON } from "react-leaflet";

const MapWithLocalGeoJSON = () => {
  const [geojsonData, setGeojsonData] = useState(null);

  useEffect(() => {
    fetch("./Boundary.geojson") // Adjust path accordingly
      .then((response) => response.json())
      .then((data) => {
        console.log("Loaded GeoJSON:", data); // Debugging
        setGeojsonData(data);
      })
      .catch((error) => console.error("Error loading GeoJSON:", error));
  }, []);

  if (!geojsonData) return null; // Prevent rendering until data is loaded

  return <GeoJSON data={geojsonData} />;
};

export default MapWithLocalGeoJSON;
