/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useMemo  } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
// At the top of your map component file
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import L from 'leaflet';
import 'leaflet-defaulticon-compatibility';


import axios from 'axios';
import Swal from 'sweetalert2';
// import MapWithGeofences from './MapWithGeofences';
// import MapWithMarkers from './MapWithMarkers';
import MapWithFullscreen from './MapWithFullscreen';
// import MapWithDraw from './MapWithDraw';
import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon, lineString } from '@turf/turf';
import 'leaflet.markercluster';
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
// import MapWithPolylineGeofences from './MapWithPolylineGeofences';
// import MapWithCircleGeofences from './MapWithCircleGeofences';
import './MyMapComponent.css'; // Import CSS file for styling
import MeasureControl from './MeasureControl';

// import AYDEN from './AYDEN.geojson';

import { GeoJSON } from "react-leaflet";

function FlyToAOI({ selectedAOI }) {
  const map = useMap();

  useEffect(() => {
    if (selectedAOI) {
      const geojsonLayer = L.geoJSON(selectedAOI);
      const bounds = geojsonLayer.getBounds();
      map.flyToBounds(bounds, { duration: 1.5 }); // smooth fly with animation
    }
  }, [selectedAOI, map]);

  return null;
}


const MyMapComponent = ({ AOIPolygons,setAnalysisVessels ,setAnalysisStats, vessels, selectedVessel, setVesselEntries }) => {

const [selectedPlace, setSelectedPlace] = useState('');
const [uniquePlaces, setUniquePlaces] = useState([]);
const [dateOptions, setDateOptions] = useState([]);
const [detectionResults, setDetectionResults] = useState({ polygons: [], points: [] });

const baseURL = import.meta.env.VITE_API_BASE_URL;
      
const [loading, setLoading] = useState(false);

useEffect(() => {
  if (detectionResults.polygons.length === 0 || detectionResults.points.length === 0) {

    setAnalysisStats({
      vesselsInsidePolygons: [],
      redPolygonCount: detectionResults.polygons.length,
      vesselsOutsideCount: detectionResults.points.length,
    });
    return;
  }

  const vesselsInside = [];
  const vesselsOutside = [];

  detectionResults.points.forEach(vessel => {
    const vesselPoint = point([vessel.latitude, vessel.Longitude]);
    const inside = detectionResults.polygons.some(polygon =>
      booleanPointInPolygon(vesselPoint, polygon)
    );

    if (inside) {
      vesselsInside.push(vessel);
    } else {
      vesselsOutside.push(vessel);
    }
  });

  const redPolygons = detectionResults.polygons.filter(polygon => {
    const anyInside = detectionResults.points.some(vessel =>
      booleanPointInPolygon(point([vessel.latitude, vessel.Longitude]), polygon)
    );
    return !anyInside;
  });
  setAnalysisVessels(detectionResults.points);
  // Set the result to the parent
  setAnalysisStats({
    vesselsInsidePolygons: vesselsInside,
    redPolygonCount: redPolygons.length,
    vesselsOutsideCount: vesselsOutside.length,
  });
}, [detectionResults]);


useEffect(() => {
  if (!selectedPlace || !AOIPolygons) {
    setDateOptions([]);
    return;
  }
  // Filter polygons for the chosen place
  const matching = AOIPolygons.filter(p => p.place === selectedPlace);
  // Extract unique dates and format as YYYY‑MM‑DD
const dates = Array.from(
  new Set(
    matching.map(p => p.date.slice(0, 10)) // directly slice the string
  )
).sort((a, b) => b.localeCompare(a));

  console.log('qqq',dates);
  setDateOptions(dates);
  if (dates.length > 0) setSelectedDate(dates[0]);
}, [selectedPlace, AOIPolygons]);


  useEffect(() => {
  if (AOIPolygons && AOIPolygons.length > 0) {
    const places = [...new Set(AOIPolygons.map(p => p.place).filter(Boolean))];
    setUniquePlaces(places);
  }
}, [AOIPolygons]);

useEffect(() => {
  const selected = AOIPolygons.find(p => p.place === selectedPlace);
  if (selected && selected.features?.[0] && mapRef.current) {
    const coords = selected.features[0].geometry.coordinates[0];
    const bounds = coords.map(([lng, lat]) => [lat, lng]);

    // Smooth fly-to with padding and duration
    setTimeout(() => {
      mapRef.current.flyToBounds(bounds, {
        padding: [40, 40],
        duration: 1.8
      });
    }, 100); // slight delay ensures map is ready
  }
}, [selectedPlace]);

useEffect(() => {
  setPlanetTileUrl(null); // Clear tile on new place
}, [selectedPlace]);

const selectedAOI = useMemo(() => {
  return AOIPolygons.find(p => p.place === selectedPlace);
}, [selectedPlace, AOIPolygons]);

const APIKEY = import.meta.env.VITE_PLANET_KEY;

const featureGroupRef = useRef(null);

const [planetTileUrl, setPlanetTileUrl] = useState(null);
const [vesselPolygons, setVesselPolygons] = useState([]);
const [selectedDate, setSelectedDate] = useState(null);
const mapRef = useRef(null);

const getAoiBounds = (geojson) => {
  const feature = geojson.features[0];
  const coords = feature.geometry.coordinates;
  const flatCoords = feature.geometry.type === 'Polygon' ? coords[0] : coords[0][0];
  return flatCoords.map(([lng, lat]) => [lat, lng]);
};


// const fetchScenes = async () => {

//   setPlanetTileUrl(null);
//   setDetectionResults({ polygons: [], points: [] });
  


//   // Step 1: Find AOI polygon by selected place
//   const selectedAOI = AOIPolygons.find(p => p.place === selectedPlace);

//   if (!selectedAOI || !selectedAOI.features || selectedAOI.features.length === 0) {
//     Swal.fire('Error', 'No AOI polygon found for selected place.', 'error');
//     return;
//   }

//   const selectedFeature = selectedAOI.features[0];
//   const coordinates = selectedFeature.geometry.coordinates;

// const searchBody = {
//   "item_types": ["PSScene"],
//   "filter": {
//     "type": "AndFilter",
//     "config": [
//       {
//         "type": "GeometryFilter",
//         "field_name": "geometry",
//         "config": {
//           "type": "Polygon",
//           "coordinates": coordinates
//         }
//       },
//       {
//         "type": "DateRangeFilter",
//         "field_name": "acquired",
//         "config": {
//           "gte": `${selectedDate}T00:00:00Z`,
//           "lte": `${selectedDate}T23:59:59Z`
//         }
//       },
//       {
//         "type": "RangeFilter",
//         "field_name": "cloud_cover",
//         "config": {
//           "lte": 0.1
//         }
//       }
//     ]
//   }
// }

//         // Show first alert: Imagery loading
// await Swal.fire({
//   title: 'Imagery loading…',
//   html: 'Fetching satellite imagery…',
//   allowOutsideClick: false,
//   showConfirmButton: false,
//   didOpen: () => Swal.showLoading(),
// });

//   try {



// const res = await fetch('https://api.planet.com/data/v1/quick-search', {
//   method: 'POST',
//   headers: {
//     Authorization: `Basic ${btoa(APIKEY + ':')}`,
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify(searchBody)
// });

// const data = JSON.parse(await res.text());

//     if (!data.features?.length) {
//     Swal.getPopup()?.style.setProperty('animation-duration', '0ms');
//   Swal.close();
//   return Swal.fire('No imagery found', 'Try a different date or AOI.', 'warning');
// }

//     const sceneId = data.features[0].id;

//     const tileUrl = `https://tiles{s}.planet.com/data/v1/PSScene/${sceneId}/{z}/{x}/{y}.png?api_key=${APIKEY}`;
//     setPlanetTileUrl(tileUrl);
//     // console.log('Planet tile URL:', tileUrl);
//     // Fly to AOI after tile is set
//     // const bounds = getAoiBounds(selectedAOI);
//     // setTimeout(() => {
//     //   if (mapRef.current) {
//     //     mapRef.current.flyToBounds(bounds, { padding: [20, 20], duration: 1.5 });
//     //   }
//     // }, 500);

// await new Promise(r => setTimeout(r, 50));
// if (Swal.isVisible()) {
//   Swal.getPopup()?.style.setProperty('animation-duration', '0ms');
//   Swal.close();
// }
// await Swal.fire('Imagery loaded!', `Scene ID: ${sceneId}`, 'success');

//       // Then show loading for vessel detection
// await Swal.fire({
//   title: 'Analyzing detection…',
//   html: 'Identifying vessel polygons…',
//   allowOutsideClick: false,
//   showConfirmButton: false,
//   didOpen: () => Swal.showLoading(),
// });

//     const resp = await axios.post(`${baseURL}/api/detect-vessels-nodejs`, {
//       place: selectedPlace,
//       date: selectedDate,
//       geometry: selectedAOI.features[0].geometry.coordinates
//     });
//     // console.log('Detection response:', resp.data);
//     setDetectionResults({
//       polygons: resp.data.detected_polygons,
//       points: resp.data.detected_points,
//     });

// await new Promise(r => setTimeout(r, 50));
// if (Swal.isVisible()) {
//   Swal.getPopup()?.style.setProperty('animation-duration', '0ms');
//   Swal.close();
// }
// await Swal.fire('Detection complete!', '', 'success');

//   } catch (error) {
//     console.error('Scene fetch failed:', error);
//     Swal.fire('Error', 'Failed to load imagery.', 'error');
//   }
// };


async function fetchScenes() {
  setPlanetTileUrl(null);
  setDetectionResults({ polygons: [], points: [] });

  // Basic validation
  if (!selectedAOI) {
    Swal.fire('Error', 'No AOI polygon found for selected place.', 'error');
    return;
  }

  // 1. Show loading dialog for imagery
  Swal.fire({
    title: 'Loading Planet imagery…',
    // html: 'Using Planet API to retrieve satellite tile',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

    const selectedFeature = selectedAOI.features[0];
  const coordinates = selectedFeature.geometry.coordinates;

const searchBody = {
  "item_types": ["PSScene"],
  "filter": {
    "type": "AndFilter",
    "config": [
      {
        "type": "GeometryFilter",
        "field_name": "geometry",
        "config": {
          "type": "Polygon",
          "coordinates": coordinates
        }
      },
      {
        "type": "DateRangeFilter",
        "field_name": "acquired",
        "config": {
          "gte": `${selectedDate}T00:00:00Z`,
          "lte": `${selectedDate}T23:59:59Z`
        }
      },
      {
        "type": "RangeFilter",
        "field_name": "cloud_cover",
        "config": {
          "lte": 0.1
        }
      }
    ]
  }
}

  try {
    // Call Planet API
const res = await fetch('https://api.planet.com/data/v1/quick-search', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${btoa(APIKEY + ':')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(searchBody)
});
 const text = await res.text();
    console.error('Planet response status:', res.status, 'body:', text);
    const data = JSON.parse(text);

    if (!data.features?.length) {
      setAnalysisVessels([]);
      setAnalysisStats({
      vesselsInsidePolygons: [],
      redPolygonCount: 0,
      vesselsOutsideCount: 0,
      });
      Swal.close();
      Swal.fire('No imagery', 'No valid scenes found. Try another date or AOI.', 'warning');
      return;
    }

    const sceneId = data.features[0].id;
    const tileUrl = `https://tiles{s}.planet.com/data/v1/PSScene/${sceneId}/{z}/{x}/{y}.png?api_key=${APIKEY}`;
    setPlanetTileUrl(tileUrl);

    // 2. Update modal to finished imagery
    Swal.update({
      title: 'Imagery loaded!',
      html: `Scene ID: <strong>${sceneId}</strong>`,
    });
    // smooth fly to AOI after tile set…
    setTimeout(() => {
      mapRef.current?.flyToBounds(getAoiBounds(selectedAOI), { padding: [20,20], duration: 1.5 });
    }, 500);

    // 3. Start vessel detection analysis phase
    Swal.update({
      title: 'Analysis and vessel identification…',
      html: 'Sending geometry & date for vessel detection',
    });
    Swal.showLoading();
    console.log('Detection selectedPlace:', selectedPlace);
    console.log('Detection selectedDate:', selectedDate);
    console.log('Detection geo:', selectedAOI.features[0].geometry.coordinates);
  
const jsonString = JSON.stringify({
  file_name: `${selectedPlace}`,
  date: selectedDate,
  geometry: selectedAOI.features[0].geometry.coordinates
});

const resp = await axios.post(`${baseURL}/api/detect-vessels`, jsonString, {
  headers: {
    'Content-Type': 'application/json'
  }
});

    console.log('Detection response:', resp.data);
    setDetectionResults({
      polygons: resp.data.polygons,
      points: resp.data.points,
    });

    // 4. Show final result
await new Promise(r => setTimeout(r, 100)); // Optional slight delay
if (Swal.isVisible()) {
  Swal.getPopup()?.style.setProperty('animation-duration', '0ms');
  Swal.close();
}

await Swal.fire({
  icon: 'success',
  title: 'Detection complete!',
  html: `Detected <b>${resp.data.points.length}</b> vessels.`,
  timer: 2000,
  timerProgressBar: true,
  showConfirmButton: false,
});


  } catch (error) {
    console.error('Scene fetch/detection failed:', error);
    Swal.close();
    Swal.fire('Error', 'Failed to load imagery or analyze detection.', 'error');
  }
}

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const planetDate = `${year}_${month}_${day}`;
  
  // 
  
// useEffect(() => {
//   const vesselGeoJSONFiles = [
//     'AYDEN.geojson',
//     'BBCEMERALD.geojson',
//     'DAWNHARIDWAR.geojson',
//     'NOBLE.geojson',
//     'SEAFIDELITY.geojson',
//     'YUNGHANGWEIYE.geojson'
//   ];

//   Promise.all(
//     vesselGeoJSONFiles.map(file =>
//       fetch(`/vesselspolygon/${file}`).then(res => res.json())
//     )
//   )
//     .then(dataArray => {
//       setVesselPolygons(dataArray);
//     })
//     .catch(error => {
//       console.error("Failed to load one or more vessel polygons:", error);
//     });
// }, []);


const [aoiGeoJSON, setAoiGeoJSON] = useState({
  type: "FeatureCollection",
  name: "AOI",
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: [
    {
      type: "Feature",
      properties: { id: 1 },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [80.003703136216558, 5.988962282671883],
              [80.05282687584527, 5.957706072043221],
              [80.03030445622241, 5.863109316826128],
              [79.943058478474796, 5.879679104801435],
              [79.954204439301634, 5.937102452176196],
              [80.003703136216558, 5.988962282671883],
            ],
          ],
        ],
      },
    },
  ],
});

const isVesselInsidePolygon = (vessel, geojson) => {
  if (!geojson ) return false;
  
  const vesselPoint = point([vessel.Longitude, vessel.latitude]);

  
  return booleanPointInPolygon(vesselPoint, geojson);
};

const getPolygonColor = (polygon, vessels) => {
  const hasVesselInside = vessels.some(vessel => {
    const vesselPoint = point([vessel.latitude , vessel.Longitude]);
    return booleanPointInPolygon(vesselPoint, polygon);
  });
  return hasVesselInside ? '#18EA23' : 'red';
};

// useEffect(() => {
//   if (vessels.length > 0 && aoiGeoJSON?.features?.length > 0) {
//     const updatedVessels = vessels.map(vessel => {
//       const inside = isVesselInsideAOI(vessel, aoiGeoJSON);
//       return {
//         ...vessel,
//         insideAOI: inside,
//       };
//     });

    

//     setVesselTableData(updatedVessels); // reuse this for rendering
//   }
// }, [vessels, aoiGeoJSON]);







  const ensureClosedPolygon = (coordinates) => {
    if (coordinates.length > 0) {
      const firstPoint = coordinates[0];
      const lastPoint = coordinates[coordinates.length - 1];
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates.push([firstPoint[0], firstPoint[1]]);
      }
    }
    return coordinates;
  };

// const handleDrawCreate = async (e) => {
//    console.log('handleDrawCreate fired')
//    console.log("Draw created", e);
//   const layer = e.layer;
//   const geojson = layer.toGeoJSON();

//   try {
//     await axios.post(`${baseURL}/api/planets/save-AOI-polygon`, geojson); // This is your Express API route
//     Swal.fire('Saved!', 'AOI saved to MongoDB.', 'success');

//     // Optionally: reload AOI from DB
//     fetchAOIsFromBackend();

//   } catch (err) {
//     console.error(err);
//     Swal.fire('Error', 'Could not save AOI.', 'error');
//   }
// };

// const fetchAOIsFromBackend = async () => {
//   try {
//     const response = await axios.get(`${baseURL}/api/planets/get-AOI-polygons`); // Get AOIs from Express
//     setAoiGeoJSON({
//       type: "FeatureCollection",
//       features: response.data
//     });
//   } catch (err) {
//     console.error('Failed to fetch AOIs:', err);
//   }
// };

// useEffect(() => {
//   fetchAOIsFromBackend();
// }, []);



  return (

  <>
<div
  style={{
    display: 'flex',
    alignItems: 'center',        // vertical centering
    justifyContent: 'center',    // horizontal centering
    gap: '1rem',
    padding: '0.7rem 1rem',
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    flexWrap: 'wrap',
    margin: '0.2rem auto',
    width: 'fit-content',         // only as wide as needed
    maxWidth: '100%'              // responsive on smaller screens
  }}
>

  <label style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
  Select Place:
  <select
    value={selectedPlace}
    onChange={e => {
    setSelectedPlace(e.target.value);
    setSelectedDate("");
  }}
    style={{
      marginLeft: '0.5rem',
      padding: '0.4rem 0.6rem',
      fontSize: '0.9rem',
      border: '1px solid #ccc',
      borderRadius: '4px'
    }}
  >
    <option value="">-- Select Place--</option>
    {uniquePlaces.map((place, idx) => (
      <option key={idx} value={place}>
        {place}
      </option>
    ))}
  </select>
</label>

  <label style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
    Select Date:
    <select
        value={selectedDate}
        disabled={!selectedPlace || dateOptions.length === 0}
        onChange={e => setSelectedDate(e.target.value)}
      style={{
      marginLeft: '0.5rem',
      padding: '0.4rem 0.6rem',
      fontSize: '0.9rem',
      border: '1px solid #ccc',
      borderRadius: '4px'
      }}
      >
        <option value="">-- Select Date --</option>
        {dateOptions.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
  </label>
          
  <button
    onClick={fetchScenes}
    disabled={!selectedDate || !selectedPlace}
    style={{
      padding: '0.5rem 0.6rem',
      fontSize: '0.95rem',
      backgroundColor: selectedDate ? '#007bff' : '#ccc',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: selectedDate ? 'pointer' : 'not-allowed',
      transition: 'background-color 0.3s ease'
    }}
  >
    Load Imagery
  </button>
</div>
      
      <MapContainer
      whenCreated={(mapInstance) => {
        mapRef.current = mapInstance;
        console.log("Map created:", mapInstance); // DEBUG
      }}
      center={[0, 0]}
      // zoom={3}
      minZoom={1.5}
      zoom={1.5}
      maxZoom={18}
      maxBounds={[[85, -180], [-85, 180]]}
      maxBoundsViscosity={8}
      style={{ height: '70vh', width: '100%' }}
      >
 <TileLayer
  url="https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_2025_02_mosaic/gmap/{z}/{x}/{y}.png?api_key=PLAK09a935f52aef40f6960cf51bbfd959db"
  attribution="&copy; <a href='https://www.planet.com'>Planet Labs</a>"
  noWrap={true}
/>



   {/* <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" noWrap={true} /> */}

    {/* <FeatureGroup ref={featureGroupRef}>
      <EditControl
        position="topright"
        onCreated={handleDrawCreate}
        // onCreated={(e) => console.log("Created:", e)}
        draw={{
          polygon: true,
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false,
          polyline: false
        }}
        edit={{
          remove: true,
          edit: true
        }}
      />
    </FeatureGroup> */}
  {planetTileUrl && (
  <TileLayer
    key={planetTileUrl}
    url={planetTileUrl}
    subdomains={['0', '1', '2', '3']}
    attribution="&copy; <a href='https://www.planet.com'>Planet Labs</a>"
    noWrap
    zIndex={1000} 
  />
)} 


{selectedAOI && (
  <>
  <GeoJSON
    key={`aoi-${selectedPlace}`}
    data={JSON.parse(JSON.stringify(selectedAOI))}
    style={{ color: 'yellow', weight: 1, fillOpacity: 0.1 }}
  />
<FlyToAOI selectedAOI={selectedAOI} />
  </>
)}

{detectionResults.polygons.map((poly, i) => (
  <GeoJSON
    key={`det-poly-${i}`}
    data={poly}
    style={{
      color: getPolygonColor(poly, detectionResults.points),
      weight: 2,
      fillOpacity: 0.4
    }}
  />
))}


{/* {detectionResults.points.length > 0 && (
  <MapWithMarkers vessels={detectionResults.points} selectedVessel={selectedVessel} />
)} */}

{detectionResults.points.length > 0 && (
  detectionResults.points.map((vessel, idx) => (
    <CircleMarker
      key={`vessel-${idx}`}
      center={[vessel.Longitude , vessel.latitude]}
      pathOptions={{ color: '#183FEA', fillColor: '#183FEA', fillOpacity: 7 }}
      radius={3}
    >
      <Popup>
        NAME: <strong>{vessel.Vessel_Name}</strong><br />
        IMO: {vessel.IMO}<br />
        Type: {vessel.Type}
      </Popup>
    </CircleMarker>
  ))
)}




  
  {/* {vesselPolygons.map((geojson, idx) =>
    geojson?.type === 'FeatureCollection' ? (
      <GeoJSON
        key={`vessel-polygon-${idx}`}
        data={geojson}
        style={{ color: 'blue', weight: 2, fillOpacity: 0.1 }}
      />
    ) : null
  )} */}

  {/* <MapWithMarkers vessels={vesselTableData} selectedVessel={selectedVessel} /> */}
  {/* <MapWithGeofences geofences={AOIPolygons} /> */}
  <MapWithFullscreen />
  <MeasureControl />
</MapContainer>

{/* <div style={{
  padding: '1rem',
  margin: '1rem auto',
  maxWidth: '800px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  backgroundColor: '#fefefe',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}}>
  <h3>🛰 Detection Analysis Summary</h3>

  <p><strong>✅ Vessels Detected Inside Polygons:</strong></p>
  <ul>
    {analysisStats.vesselsInsidePolygons.length > 0 ? (
      analysisStats.vesselsInsidePolygons.map((vessel, idx) => (
        <li key={idx}>{vessel.Vessel_Name || `Unnamed Vessel (${vessel.IMO})`}</li>
      ))
    ) : (
      <li>No vessels detected inside any polygon.</li>
    )}
  </ul>

  <p><strong>🔴 Polygons with No Vessels Inside:</strong> {analysisStats.redPolygonCount}</p>
  <p><strong>❌ Vessels Outside All Polygons:</strong> {analysisStats.vesselsOutsideCount}</p>
</div> */}

</>

  );
};

MyMapComponent.propTypes = {
  AOIPolygons: PropTypes.arrayOf().isRequired,
  setAnalysisVessels:  PropTypes.func.isRequired,
  setAnalysisStats: PropTypes.func.isRequired,
  vessels: PropTypes.arrayOf(
    PropTypes.shape({
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      name: PropTypes.string,
      imo: PropTypes.number,
      heading: PropTypes.number,
      eta: PropTypes.string,
      destination: PropTypes.string,
    }).isRequired
  ).isRequired,
  selectedVessel: PropTypes.shape({
    name: PropTypes.string.isRequired,
    imo: PropTypes.number,
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
    heading: PropTypes.number,
  }),
  setVesselEntries: PropTypes.func.isRequired,
};

export default MyMapComponent;
