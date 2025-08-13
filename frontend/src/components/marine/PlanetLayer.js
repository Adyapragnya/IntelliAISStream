/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import Swal from 'sweetalert2';
import MapWithGeofences from './MapWithGeofences';
import MapWithMarkers from './MapWithMarkers';
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
import MapWithPolylineGeofences from './MapWithPolylineGeofences';
import MapWithCircleGeofences from './MapWithCircleGeofences';
import './MyMapComponent.css'; // Import CSS file for styling
import MeasureControl from './MeasureControl';

// import AYDEN from './AYDEN.geojson';

import { GeoJSON } from "react-leaflet";



const MyMapComponent = ({ vessels, selectedVessel, setVesselEntries }) => {
  // 
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const planetDate = `${year}_${month}_${day}`;

  // 


const [planetTileUrl, setPlanetTileUrl] = useState(null);

const [vesselPolygons, setVesselPolygons] = useState([]);

useEffect(() => {
  const vesselGeoJSONFiles = [
    'AYDEN.geojson',
    'BBCEMERALD.geojson',
    'DAWNHARIDWAR.geojson',
    'NOBLE.geojson',
    'SEAFIDELITY.geojson',
    'YUNGHANGWEIYE.geojson'
  ];

  Promise.all(
    vesselGeoJSONFiles.map(file =>
      fetch(`/vesselspolygon/${file}`).then(res => res.json())
    )
  )
    .then(dataArray => {
      setVesselPolygons(dataArray);
    })
    .catch(error => {
      console.error("Failed to load one or more vessel polygons:", error);
    });
}, []);

const APIKEY = 'PLAK09a935f52aef40f6960cf51bbfd959db'; // Replace with your actual API key

// useEffect(() => {
//   const fetchLatestMosaic = async () => {
//     const allMosaics = [];
//     let nextUrl = 'https://api.planet.com/basemaps/v1/mosaics';

//     try {
//       while (nextUrl) {
//         const response = await fetch(nextUrl, {
//           headers: {
//             Authorization: `Basic ${btoa(APIKEY + ':')}`,
//           },
//         });

//         const data = await response.json();
//         allMosaics.push(...data.mosaics);

//         nextUrl = data._links?._next ?? null;
//       }

//       const visualMosaics = allMosaics.filter((mosaic) =>
//         mosaic.id.startsWith('planet_medres_visual')
//       );

//       const sorted = visualMosaics.sort(
//         (a, b) => new Date(b.first_acquired) - new Date(a.first_acquired)
//       );

//       const latestMosaicId = sorted[0]?.id;

//       if (latestMosaicId) {
//         const tileUrl = `https://tiles.planet.com/basemaps/v1/planet-tiles/${latestMosaicId}/gmap/{z}/{x}/{y}.png?api_key=${APIKEY}`;
//         setPlanetTileUrl(tileUrl);
//       } else {
//         console.warn('No visual mosaics found.');
//       }
//     } catch (err) {
//       console.error('Error fetching mosaics:', err);
//     }
//   };

//   fetchLatestMosaic();
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

const isVesselInsideAOI = (vessel, geojson) => {
  const vesselPoint = point([vessel.lng, vessel.lat]);
  
  // Assuming single multipolygon feature in AOI
  const multiPolygon = geojson.features[0].geometry;
  const turfPolygon = {
    type: 'Feature',
    geometry: multiPolygon,
  };

  return booleanPointInPolygon(vesselPoint, turfPolygon);
};

useEffect(() => {
  if (vessels.length > 0 && aoiGeoJSON) {
    const updatedVessels = vessels.map(vessel => {
      const inside = isVesselInsideAOI(vessel, aoiGeoJSON);
      return {
        ...vessel,
        insideAOI: inside,
      };
    });

    // Optionally log:
    updatedVessels.forEach(v => {
      // console.log(`Vessel ${v.name} is ${v.insideAOI ? 'INSIDE' : 'OUTSIDE'} the AOI.`);
    });

    setVesselTableData(updatedVessels); // reuse this for rendering
  }
}, [vessels, aoiGeoJSON]);



  const [polygonGeofences, setPolygonGeofences] = useState([]);
  const [polylineGeofences, setPolylineGeofences] = useState([]);
  const [circleGeofences, setCircleGeofences] = useState([]);
  const [terrestrialGeofences, setTerrestrialGeofences] = useState([]);
  const [breakwatersLineGeofences, setBreakwatersLineGeofences] = useState([]);

  const [testTer, setTestTer] = useState([]);
  const [inportTerrestrialGeofences, setInportTerrestrialGeofences] = useState([]);
  const [buttonControl, setButtonControl] = useState(false);
  const [vesselTableData, setVesselTableData] = useState([]);
  const [vesselHistory, setVesselHistory] = useState([]);

  const handleButtonControl = () => {
    setButtonControl(prev => !prev);
  };




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


  
  return (


      // <MapContainer center={[0, 0]} minZoom={1.5} zoom={1.5} maxZoom={18} 
      //               maxBounds={[[85, -180], [-85, 180]]} // Strict world bounds to prevent panning
      //               maxBoundsViscosity={8} // Makes the map rigid
      //              style={{ height: '70vh', width: '100%', backgroundColor: 'rgba(170,211,223,255)'}}>
      //   {/* <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" noWrap={true} /> */}
      //   {/* <TileLayer
      //     url={tileUrl}
      //     attribution="&copy; <a href='https://www.planet.com'>Planet Labs</a>"
      //     noWrap={true}

      //   /> */}
      //  {planetTileUrl && (
      //     <TileLayer
      //       url={planetTileUrl}
      //       attribution="&copy; <a href='https://www.planet.com'>Planet Labs</a>"
      //       noWrap={true}
      //     />
      //   )}



      //   <GeoJSON data={aoiGeoJSON} style={{ color: 'red', weight: 2, fillOpacity: 0.2 }} />
      //   {vesselPolygons.map((geojson, idx) => (
      //     geojson?.type === 'FeatureCollection' ? (
      //       <GeoJSON
      //         key={`vessel-polygon-${idx}`}
      //         data={geojson}
      //         style={{ color: 'blue', weight: 2, fillOpacity: 0.1 }}
      //       />
      //     ) : null
      //   ))}

      //   <MapWithMarkers vessels={vesselTableData} selectedVessel={selectedVessel} />
      //   {/* <MapWithPorts ports={ports} /> */}

      //   <MapWithFullscreen />
      //   {/* <MapWithDraw /> */}
      //   {/* <MapWithGeofences geofences={polygonGeofences} />
      //   <MapWithPolylineGeofences geofences={polylineGeofences} />
      //   <MapWithCircleGeofences geofences={circleGeofences} /> */}
       
      //   <MeasureControl/>
      // </MapContainer>
  
      <MapContainer
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

  <GeoJSON data={aoiGeoJSON} style={{ color: 'red', weight: 2, fillOpacity: 0.2 }} />
  {vesselPolygons.map((geojson, idx) =>
    geojson?.type === 'FeatureCollection' ? (
      <GeoJSON
        key={`vessel-polygon-${idx}`}
        data={geojson}
        style={{ color: 'blue', weight: 2, fillOpacity: 0.1 }}
      />
    ) : null
  )}

  <MapWithMarkers vessels={vesselTableData} selectedVessel={selectedVessel} />
  <MapWithFullscreen />
  <MeasureControl />
</MapContainer>

  );
};



MyMapComponent.propTypes = {
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
