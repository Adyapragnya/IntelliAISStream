import React, { useState, useEffect, useContext, useRef } from "react";
// import { AuthContext } from "../../AuthContext";

import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import axios from "axios";
// import ArgonBox from "components/ArgonBox";
// import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
// import DashboardNavbar from "examples/Navbars/DashboardNavbar";
// import Footer from "examples/Footer";
import MapWithDraw from "../../components/drawAOI/MapWithDraw";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GeoJSON , MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import EditGeofences from '../../components/drawAOI/EditGeofences';
import MapWithFullscreen from '../../components/drawAOI/MapWithFullscreen';
import Autocomplete from "@mui/material/Autocomplete";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import { Button, Box,ListItemText } from "@mui/material";
// import MeasureControl from '../../components/drawAOI/MeasureControl';
// import FlyToPort from "../../components/drawAOI/FlyToPort";
// import MapWithMarkers from '../../components/drawAOI/MapWithMarkers';
// import GeofenceMessage from '../../components/drawAOI/GeofenceMessage';
// import GeofenceHistories from "../../components/drawAOI/GeofenceHistories";
// import MapWithCircleGeofences from "../../components/drawAOI/MapWithCircleGeofences";
// import GeofenceDetails from "../../components/drawAOI/GeofenceDetails.js";
import Swal from 'sweetalert2';
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";

import * as turf from '@turf/turf';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon, lineString } from '@turf/turf';
import 'leaflet.markercluster';
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import '../../components/drawAOI/MyMapComponent.css'; 
import {   LayersControl } from 'react-leaflet';

import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';


import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'leaflet';
import 'leaflet-draw';
import 'leaflet-fullscreen';
import L from 'leaflet';  // before using new L.Icon
import './drawAOI.css'; // Custom styles for the map
// import 'react-leaflet-cluster/styles';
import MarkerClusterGroup from 'react-leaflet-cluster';
const { BaseLayer } = LayersControl;
import UpdateApiKeyModal from '../../components/UpdateApiKeyModal';
import FlyToVessel from "../../components/drawAOI/FlyToVessel";
// import SearchControl from '../../components/drawAOI/SearchControl';

import { createTheme, ThemeProvider } from "@mui/material/styles";
import area from '@turf/area';

const validateImageryPolygon = () => {
  if (!imageryPolygon) return false;
  const polygonArea = area(imageryPolygon); // in square meters
  return polygonArea <= 100000000; // 100 km² in m²
};


// Custom icon for port markers
const portIcon = new L.Icon({
  iconUrl: "/anchor-icon.png ", // Example ship icon
  //  https://cdn-icons-png.flaticon.com/512/684/684908.png
  iconSize: [15, 15],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Create a red dot icon
const vesselDotIcon = L.divIcon({
  html: '<div style="width: 10px; height: 10px; background: blue; border-radius: 50%;"></div>',
  className: '', // Important: remove default styling
  iconSize: [5, 5],
});

const thStyle = {
  textAlign: 'left',
  padding: '10px',
  fontWeight: 'bold',
  borderBottom: '1px solid #ddd'
};

const tdStyle = {
  textAlign: 'left',
  padding: '10px',
  borderBottom: '1px solid #eee',
  fontSize: '0.9rem'
};




const DrawAOI = () => {
  const [marineAPIKEY, setMarineAPIKEY] = useState("");
const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  
  const drawnItemsRef = useRef(null);

  const [planetTileUrl, setPlanetTileUrl] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const APIKEY = import.meta.env.VITE_PLANET_KEY;

  
  const [polygonGeoJSON, setPolygonGeoJSON] = useState(null);
const [imageryPolygonGeoJSON, setImageryPolygonGeoJSON] = useState(null);
const [aisPolygonGeoJSON, setAisPolygonGeoJSON] = useState(null);

const [drawImageryMode, setDrawImageryMode] = useState(false);
const [drawAISMode, setDrawAISMode] = useState(false);
// New state to track AIS fetching
const [isFetchingAIS, setIsFetchingAIS] = useState(false);



const planetLayerGroup = useRef(null);
// const [map, setMap] = useState(null);
const mapRef = useRef(null);

const imageryDrawRef = useRef();
const aisDrawRef = useRef();
const [snackbarOpen, setSnackbarOpen] = useState(false);
const [snackbarMessage, setSnackbarMessage] = useState("");


useEffect(() => {
  if (!mapRef.current) return;
  
  imageryDrawRef.current = new L.FeatureGroup();
  aisDrawRef.current = new L.FeatureGroup();
  mapRef.current.addLayer(imageryDrawRef.current);
  mapRef.current.addLayer(aisDrawRef.current);

  return () => {
    if (mapRef.current) {
      mapRef.current.removeLayer(imageryDrawRef.current);
      mapRef.current.removeLayer(aisDrawRef.current);
    }
  };
}, []); // run only once





  
  const getAoiBounds = (geojson) => {
    const feature = geojson.features[0];
    const coords = feature.geometry.coordinates;
    const flatCoords = feature.geometry.type === 'Polygon' ? coords[0] : coords[0][0];
    return flatCoords.map(([lng, lat]) => [lat, lng]);
  };

const socketRef = useRef(null);

const fetchAisVessels = async () => {
  if (!aisPolygonGeoJSON || aisPolygonGeoJSON.features.length === 0) return;

  setIsFetchingAIS(true);

  const coordinates = aisPolygonGeoJSON.features[0].geometry.coordinates[0];
  let lons = coordinates.map(p => p[0]);
  let lats = coordinates.map(p => p[1]);
  const bbox = {
    minLat: Math.min(...lats),
    minLon: Math.min(...lons),
    maxLat: Math.max(...lats),
    maxLon: Math.max(...lons),
  };
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  console.log("Fetching AIS vessels with bbox:", bbox);

  // Start loader with Stop button
  let vesselCount = 0;

Swal.fire({
  title: 'Fetching AIS Vessels…',
  html: `
    <div style="
      display:flex; 
      align-items:center; 
      justify-content:space-between; 
      width:100%; 
      font-family:sans-serif;
    ">
      <div style="font-size:14px; color:#555;">
        Vessels: 
        <span id="vessel-count" style="font-size:16px; font-weight:bold; color:#222;">0</span>
      </div>
      <button id="stop-fetch" 
        style="
          background-color:#ff4d4f;
          color:#fff;
          border:none;
          border-radius:4px;
          padding:5px 10px;
          font-size:13px;
          cursor:pointer;
          transition: background-color 0.2s ease;
        "
        onmouseover="this.style.backgroundColor='#d9363e'"
        onmouseout="this.style.backgroundColor='#ff4d4f'"
      >
        Stop
      </button>
    </div>
  `,
  width: '300px',
  padding: '15px',
  position: 'center',
  showConfirmButton: false,
  allowOutsideClick: false,
  allowEscapeKey: true,
  backdrop: true,
  background: '#fff',
  didOpen: () => {
    Swal.showLoading(); // ✅ SweetAlert2 built-in loader
    document.getElementById('stop-fetch').addEventListener('click', () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      Swal.close();
      setIsFetchingAIS(false);
    });
  }
});




  const socket = new WebSocket(
    `${baseURL.replace("https", "ws")}/ws/vessels?minLat=${bbox.minLat}&minLon=${bbox.minLon}&maxLat=${bbox.maxLat}&maxLon=${bbox.maxLon}`
  );
  socketRef.current = socket;

  socket.onopen = () => {
    console.log('Connected to WebSocket');
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.cached) {
        setVessels(prev => {
          const combined = [...prev, ...data.cached];
          const unique = combined.filter(
            (v, i, arr) => arr.findIndex(x => x.mmsi === v.mmsi) === i
          );
          vesselCount = unique.length;
          updateVesselCount(vesselCount);
          return unique;
        });
      } else {
        setVessels(prev => {
          const exists = prev.some(v => v.mmsi === data.mmsi);
          if (!exists) {
            vesselCount++;
            updateVesselCount(vesselCount);
            return [...prev, data];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket closed');
    Swal.close();
    setIsFetchingAIS(false);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    Swal.close();
    setIsFetchingAIS(false);
  };
};

function updateVesselCount(count) {
  const countEl = document.getElementById('vessel-count');
  if (countEl) {
    countEl.textContent = count;
  }
}



const stopAisVessels = () => {
  if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
    socketRef.current.send("STOP");
    console.log("Sent stop command — backend will now replay cached vessels.");
   setIsFetchingAIS(false); 
  }
};



// Function to add new markers to the map (using ref to avoid re-render)
const addMarkerToMap = (vessel) => {
  if (mapRef.current) {
    const marker = L.marker([vessel.Latitude, vessel.Longitude]);
    marker.addTo(mapRef.current);
  }
};

const commonTileOptions = {
  updateWhenIdle: true,      // Only load new tiles after interactions finish
  updateWhenZooming: false,  // Prevent reload during zoom animations
  updateInterval: 200,       // Throttle tile requests during interaction
  // reuseTiles: true,          // Reuse off-screen tiles to reduce memory churn
  // unloadInvisibleTiles: true, // Remove tiles no longer visible to free memory
  keepBuffer: 1, // Reduce number of off-screen tiles

};


const fetchScenes = async () => {
  
  setPlanetTileUrl(null);
  // setDetectionResults({ polygons: [], points: [] });
  
  if (!mapRef.current) {
    console.warn("Map not ready yet; fetchScenes aborted.");
    return;
  }
  const map = mapRef.current;
  // Step 1: Find AOI polygon by selected place
  // const selectedAOI = AOIPolygons.find(p => p.place === selectedPlace);

if (!imageryPolygonGeoJSON || imageryPolygonGeoJSON.features.length === 0) {
  Swal.fire('Error', 'No AOI polygon found for selected place.', 'error');
  return;
}


  
  // Calculate area in square kilometers
  const areaSqMeters = turf.area(imageryPolygonGeoJSON.features[0]);
  const areaSqKm = areaSqMeters / 1_000_000;

  if (areaSqKm > 1000) {
    Swal.fire('Error', 'Imagery polygon area must be less than 100 km².', 'error');
    return;
  }

    Swal.fire({
    title: 'Loading Planet imagery…',
    // html: 'Using Planet API to retrieve satellite tile',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const selectedFeature = imageryPolygonGeoJSON.features[0];
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
          // "gte": `${selectedDate}T00:00:00Z`,
          // "lte": `${selectedDate}T23:59:59Z`
          "gte": `${dayjs(selectedDate).format("YYYY-MM-DD")}T00:00:00Z`,
          "lte": `${dayjs(selectedDate).format("YYYY-MM-DD")}T23:59:59Z`
        }
      },
      {
        "type": "RangeFilter",
        "field_name": "cloud_cover",
        "config": {
          "lte": 0.1
        }
      },
      // {
      //   "type": "GeometryFilter",
      //   "field_name": "geometry",
      //   "relation": "contains",
      //   "config": {
      //     "type": "Polygon",
      //     "coordinates": coordinates
      //   }
      // }
    ]
  }
}

  try {

      // Now fetch AIS vessels
  // await fetchAisVessels();

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
      // setAnalysisVessels([]);
      // setAnalysisStats({
      // vesselsInsidePolygons: [],
      // redPolygonCount: 0,
      // vesselsOutsideCount: 0,
      // });
      Swal.close();
      Swal.fire('No imagery', 'No valid scenes found. Try another date or AOI.', 'warning');
      return;
    }

if (!planetLayerGroup.current) {
  planetLayerGroup.current = L.layerGroup().addTo(map);
} else {
  planetLayerGroup.current.clearLayers();
}


data.features.forEach((f, idx) => {

  map.createPane('imageryPane');
map.getPane('imageryPane').style.zIndex = 450; // Above overlayPane (≈400)
  const tileUrl = `https://tiles{s}.planet.com/data/v1/PSScene/${f.id}/{z}/{x}/{y}.png?api_key=${APIKEY}`;
  L.tileLayer(tileUrl, {
    pane: 'imageryPane',
    subdomains: '0123',
    attribution: '© Planet Labs',
    maxZoom: 18,
    ...commonTileOptions
  })
  .on('load', () => { if (idx === 0) Swal.close(); })
  .addTo(planetLayerGroup.current);
});

    map.flyToBounds(getAoiBounds(imageryPolygonGeoJSON), { padding: [20, 20], duration: 1.5 });

    Swal.fire({
      title: 'Imagery loaded!',
      html: `Loaded  ${data.features.length} scene(s) covering your AOI.`,
    });


  } catch (error) {
    console.error('Scene fetch failed:', error);
    Swal.fire('Error', 'Failed to load imagery.', 'error');
  }
};


    const [vessels, setVessels] = useState([]);
    const [selectedVessel, setSelectedVessel] = useState(null);
    const handleRowClick = (vessel) => {
      setSelectedVessel(vessel);
    };
   





  
 

  
useEffect(() => {
  const fetchApiKey = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL;
      const resp = await axios.get(`${base}/api/maritime-api-key/planet`);
      setMarineAPIKEY(resp.data.key);
    } catch (e) {
      console.log("No API key found:", e.response?.data?.detail);
    }
  };
  fetchApiKey();
}, []);

const marineKeyRef = useRef("");

useEffect(() => {
  marineKeyRef.current = marineAPIKEY;
}, [marineAPIKEY]);

const handleApiKeyUpdate = () => {
  setApiKeyModalOpen(true);
};
const saveNewApiKey = async (newKey) => {
  if (!newKey || newKey === marineAPIKEY) return;

  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL;
    await axios.post(`${baseURL}/api/update-maritime-api-key`, {
      key: newKey,
      source: "planet",
    });
    toast.success("API Key updated successfully");
    setMarineAPIKEY(newKey);
    setPlanetTileUrl(null);
  } catch {
    toast.error("Error updating API Key");
  }
};

const blueDot = L.divIcon({
  className: 'blue-dot',
  iconSize: [12, 12],
  iconAnchor: [6, 6], // Center the dot
});

useEffect(() => {
  console.log('imageryPolygonGeoJSON updated ->', imageryPolygonGeoJSON);
}, [imageryPolygonGeoJSON]);

useEffect(() => {
  console.log('aisPolygonGeoJSON updated ->', aisPolygonGeoJSON);
}, [aisPolygonGeoJSON]);


  return (
     <div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      {/* <DashboardNavbar vesselEntries={vesselEntries} /> */}
      {/* <ArgonBox py={3}> */}

 <Snackbar
  open={snackbarOpen}
  autoHideDuration={4000}
  onClose={() => setSnackbarOpen(false)}
  anchorOrigin={{ vertical: "top", horizontal: "right" }}
>
  <Alert
    onClose={() => setSnackbarOpen(false)}
    severity="error"
    variant="filled"
    sx={{ width: "100%" }}
  >
    {snackbarMessage}
  </Alert>
</Snackbar>

             <UpdateApiKeyModal
  open={isApiKeyModalOpen}
  onClose={() => setApiKeyModalOpen(false)}
  currentKey={marineAPIKEY}
  onSave={saveNewApiKey}
/>

          
  

{/* Always-visible API key button */}
<Box my={2} display="flex" justifyContent="flex-end">
  <Button
    variant="outlined"
    sx={{ fontSize: '0.85rem', textTransform: 'none', height: '36px' }}
    onClick={handleApiKeyUpdate}
  >
    Add / Update API Key
  </Button>
</Box>

{/* Initial Controls */}
 {/* Drawing Modes */}
{(drawImageryMode || drawAISMode) && (
  <Box display="flex" gap={2} my={2}>
    {drawImageryMode && (
      <Button
        variant="outlined"
        onClick={() => {
          setDrawImageryMode(false);
          setImageryPolygonGeoJSON(null);
          setDrawAISMode(true); // Switch to AIS mode directly
          setAisPolygonGeoJSON(null);
        }}
      >
        Switch to Draw AIS Polygon
      </Button>
    )}
    {drawAISMode && (
      <Button
        variant="outlined"
        onClick={() => {
          setDrawAISMode(false);
          setAisPolygonGeoJSON(null);
          setDrawImageryMode(true); // Switch to Imagery mode directly
          setImageryPolygonGeoJSON(null);
        }}
      >
        Switch to Draw Imagery Polygon
      </Button>
    )}
    <Button
      variant="outlined"
      color="error"
      onClick={() => {
        // Exit any draw mode
        setDrawImageryMode(false);
        setDrawAISMode(false);
      }}
    >
      Cancel Drawing
    </Button>
  </Box>
)}

{/* Drawing controls */}
{!drawImageryMode && !drawAISMode && !imageryPolygonGeoJSON && !aisPolygonGeoJSON && (
  // INITIAL MODE SELECTION
  <Box display="flex" gap={2} my={2}>
    <Button
      variant="outlined"
      onClick={() => {
        setDrawImageryMode(true);
        setDrawAISMode(false);
        setImageryPolygonGeoJSON(null);
        setAisPolygonGeoJSON(null);
      }}
    >
      Draw Imagery Polygon
    </Button>
    <Button
      variant="outlined"
      onClick={() => {
        setDrawAISMode(true);
        setDrawImageryMode(false);
        setAisPolygonGeoJSON(null);
        setImageryPolygonGeoJSON(null);
      }}
    >
      Draw AIS Polygon
    </Button>
  </Box>
)}

{imageryPolygonGeoJSON && !drawImageryMode && (
  <Box my={2} display="flex" alignItems="center" gap={2}>
    {/* Date picker */}
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        value={selectedDate}
        onChange={(newValue) => setSelectedDate(newValue)}
        slotProps={{
          textField: {
            size: 'small',
            variant: 'outlined',
            sx: { fontSize: '0.9rem', minWidth: 180 }
          }
        }}
      />
    </LocalizationProvider>

    {/* Load Imagery button */}
    <Button variant="contained" onClick={fetchScenes}>
      Load Imagery
    </Button>

    {/* Redraw button */}
    <Button
      variant="outlined"
      color="secondary"
      onClick={() => {
        setImageryPolygonGeoJSON(null);
        setDrawImageryMode(true); 
      }}
    >
      Redraw Imagery Polygon
    </Button>
  </Box>
)}



{/* AIS Actions */}
 {aisPolygonGeoJSON && !drawAISMode && (
        <Box my={2} display="flex" gap={2}>
          <Button variant="contained" onClick={fetchAisVessels}>
            Fetch AIS Vessels
          </Button>
         {isFetchingAIS && (
  <Button variant="outlined" color="error" onClick={stopAisVessels}>
    Stop Fetchi Vessels
  </Button>
)}

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              setAisPolygonGeoJSON(null);
              setDrawAISMode(true);
            }}
          >
            Redraw AIS Polygon
          </Button>
        </Box>
      )}




              <Box
  sx={{
    height: '80vh',
    width: '100%',
    borderRadius: '18px',
    overflow: 'hidden', // ✅ Important to clip the rounded corners
    backgroundColor: '#f1f1f1', // ✅ Fallback background for loading tiles
    boxShadow: '0 4px 18px rgba(0,0,0,0.12)', // ✅ Subtle elevation
  }}
>
                                      <MapContainer
      whenCreated={(mapInstance) => {
        mapRef.current = mapInstance;
      }}
      center={[0, 0]}
      // zoom={3}
      minZoom={1.5}
      zoom={1.5}
        ref={mapRef}
      maxZoom={18}
      maxBounds={[[85, -180], [-85, 180]]}
      maxBoundsViscosity={8}
      style={{ height: '100%', width: '100%' }}
      >

                                   <TileLayer
                                    url={`https://tiles.planet.com/basemaps/v1/planet-tiles/global_monthly_2025_02_mosaic/gmap/{z}/{x}/{y}.png?api_key=${APIKEY}`}
                                    {...commonTileOptions}
                                    attribution="© Planet Labs"
                                    noWrap={true}
                                  />

                                    {selectedVessel && <FlyToVessel vessel={selectedVessel} />}
                                     <MarkerClusterGroup chunkedLoading>
                                    {vessels
                                    .filter(v => v.latitude != null && v.longitude != null)
                                    .map((vessel) => (
                                      <Marker key={vessel._id || vessel.mmsi} position={[vessel.latitude, vessel.longitude]} icon={vesselDotIcon} >
                                        <Popup>
                                          <div>
                                            <strong>Ship Name:</strong> {vessel.ship_name || 'Unknown'}<br />
                                            <strong>MMSI:</strong> {vessel.mmsi}<br />
                                            <strong>Speed (SOG):</strong> {vessel.sog != null ? `${vessel.sog} kn` : 'N/A'}
                                          </div>
                                        </Popup>
                                      </Marker>
                                    ))}
                                    </MarkerClusterGroup>
                                    {planetTileUrl && (
                                    <TileLayer
                                      key={planetTileUrl}
                                      url={planetTileUrl}
                                      subdomains={['0', '1', '2', '3']}
                                      zIndex={1000}
                                      {...commonTileOptions}
                                      attribution="&copy; <a href='https://www.planet.com'>Planet Labs</a>"
                                      noWrap
                                    />
                                  )} 
                                  
                 

                  <MapWithFullscreen />
               
{drawImageryMode && (
  <FeatureGroup ref={imageryDrawRef}>
    <EditControl
      position="topright"
      onCreated={(e) => {
        const drawnGeoJSON = e.layer.toGeoJSON();
        const areaKm2 = turf.area(drawnGeoJSON) / 1_000_000;

        if (areaKm2 > 1000) {
          e.layer.setStyle({ color: "red" });
          setSnackbarMessage(
            `Polygon too large: ${areaKm2.toFixed(2)} km². Max allowed is 1000 km².`
          );
          setSnackbarOpen(true);
          imageryDrawRef.current.addLayer(e.layer);
          return;
        }

        // Clear old polygon
        imageryDrawRef.current.clearLayers();
        imageryDrawRef.current.addLayer(e.layer);

        setImageryPolygonGeoJSON({
          type: "FeatureCollection",
          features: [drawnGeoJSON],
        });

        // setAisPolygonGeoJSON(null);
        setDrawImageryMode(false);

      }}
      draw={{
        rectangle: false,
        circle: false,
        marker: false,
        polyline: false,
        circlemarker: false,
        polygon: {
          allowIntersection: true,
          showArea: true,
          repeatMode: false,
          shapeOptions: { color: "blue" },
        },
      }}
    />
  </FeatureGroup>
)}

{imageryPolygonGeoJSON && (
  <GeoJSON data={imageryPolygonGeoJSON} style={{ color: "blue" }} />
)}

{drawAISMode && (
  <FeatureGroup ref={aisDrawRef}>
    <EditControl
      position="topright"
      onCreated={(e) => {
        aisDrawRef.current.clearLayers();
        aisDrawRef.current.addLayer(e.layer);
        setAisPolygonGeoJSON({
          type: "FeatureCollection",
          features: [e.layer.toGeoJSON()],
        });
        // setImageryPolygonGeoJSON(null);
        setDrawAISMode(false);

      }}
      draw={{
        rectangle: false,
        circle: false,
        marker: false,
        polyline: false,
        circlemarker: false,
        polygon: {
          allowIntersection: true,
          showArea: true,
          repeatMode: false,
          shapeOptions: { color: "red" },
        },
      }}
    />
  </FeatureGroup>
)}

{aisPolygonGeoJSON && <GeoJSON data={aisPolygonGeoJSON} style={{ color: 'red' }} />}


                </MapContainer>
              </Box>  
                {/* </div>
                </div>
               
                </CardContent>
      </Card> */}
    {/* </Grid>
</Grid> */}

        
       
      {/* </ArgonBox> */}
      {/* <Footer /> */}

{vessels.length > 0 && (
  <Box mt={3} p={2} bgcolor="#fff" borderRadius="12px" boxShadow="0 2px 10px rgba(0,0,0,0.1)">
    <Typography variant="h6" gutterBottom>
      AIS Vessels ({vessels.length})
    </Typography>
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr onClick={() => handleRowClick(vessel)} style={{ backgroundColor: '#f5f5f5' }}>
            <th style={thStyle}>Ship Name</th>
            <th style={thStyle}>MMSI</th>
            <th style={thStyle}>Latitude</th>
            <th style={thStyle}>Longitude</th>
            <th style={thStyle}>Speed (kn)</th>
            <th style={thStyle}>COG (°)</th>
            <th style={thStyle}>Navigational Status</th>
          </tr>
        </thead>
        <tbody>
        {vessels.map((vessel, index) => (
          <tr
            key={index}
            style={{
              cursor: 'pointer',
              backgroundColor: selectedVessel === vessel ? '#d0e7ff' : 'transparent',
            }}
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo([vessel.longitude, vessel.latitude], 10, { duration: 1.5 });
              }
              setSelectedVessel(vessel);
            }}
          >
            <td style={tdStyle}>{vessel.ship_name || '—'}</td>
            <td style={tdStyle}>{vessel.mmsi || '—'}</td>
            <td style={tdStyle}>{vessel.latitude?.toFixed(4)}</td>
            <td style={tdStyle}>{vessel.longitude?.toFixed(4)}</td>
            <td style={tdStyle}>{vessel.sog != null ? vessel.sog.toFixed(1) : '—'}</td>
            <td style={tdStyle}>{vessel.cog != null ? vessel.cog.toFixed(1) : '—'}</td>
            <td style={tdStyle}>{vessel.navigational_status || '—'}</td>
          </tr>
        ))}
</tbody>

      </table>
    </Box>
  </Box>
)}

    </div>
  );
};

export {DrawAOI};


