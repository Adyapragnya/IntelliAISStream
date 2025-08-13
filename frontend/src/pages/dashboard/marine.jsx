import React, { useState, useEffect, useContext } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import axios from "axios";
import { Button, Box,ListItemText } from "@mui/material";

import MyMapComponent from "../../components/marine/MyMapComponent";
// import GeofenceMessage from "./GeofenceMessage";
// import GeofenceList from "./GeofenceList";
import { ToastContainer, toast } from 'react-toastify'; // Import Toast components
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS
// import HistoryTable from "./HistoryTable";
// import GeofenceHistories from './GeofenceHistories';

const cellStyle = {
  padding: '8px',
  textAlign: 'left',
  fontWeight: '600',
  borderBottom: '1px solid #ccc',
  color: '#333'
};

const rowStyle = {
  padding: '8px',
  textAlign: 'left',
  borderBottom: '1px solid #eee',
  color: '#444'
};



function Marine() {

  const baseURL = import.meta.env.VITE_API_BASE_URL;

  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [vesselEntries, setVesselEntries] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]=useState(false);
  const [error, setError ]=useState("");
  const [AOIPolygons, setAOIPolygons] = useState([]);
  const [detectionResults, setDetectionResults] = useState({ polygons: [], points: [] });
  
  const [analysisVessels, setAnalysisVessels] = useState([]);
  const [analysisStats, setAnalysisStats] = useState({
  vesselsInsidePolygons: [],
  redPolygonCount: 0,
  vesselsOutsideCount: 0,
});


 
     const fetchAOIPolygons = async () => {
    try {
      const response = await axios.get(`${baseURL}/api/planets/get-AOI-polygons`);
      setAOIPolygons(response.data);
      console.log(response.data);
      // return response.data.filter(vessel => vessel.loginUserId === userId);
 
    } catch (error) {
      console.error("Error fetching tracked vessels by user:", error);
      return [];
    }
  };

    useEffect(() => {
   fetchAOIPolygons();
   console.log(AOIPolygons);
  }, []);


  useEffect(() => {
  console.log("AOIPolygons updated:", AOIPolygons);
}, [AOIPolygons]);


  const handleRowClick = (vessel) => {
    // console.log('Row click event received with vessel:', vessel); // Log received vessel
    const selected = vessels.find(v => v.name === vessel.name);
    if (selected) {
      setSelectedVessel(selected);
      // console.log("Selected vessel:", selected);
    }
  };
  

// Handle row click and zoom in on the selected vessel
// const handleRowClick = (vesselName) => {
//   const selected = vessels.find(v => v.name === vesselName); // Find the vessel by name
//   if (selected) {
//     setSelectedVessel(selected); // Set the selected vessel for zooming
//   }
// };


  const calculateMapCenter = () => {
    if (vessels.length === 0) return [0, 0];
    const latSum = vessels.reduce((sum, vessel) => sum + vessel.lat, 0);
    const lngSum = vessels.reduce((sum, vessel) => sum + vessel.lng, 0);
    return [latSum / vessels.length, lngSum / vessels.length];
  };

  const center = selectedVessel ? [selectedVessel.lat, selectedVessel.lng] : calculateMapCenter();
  const zoom = selectedVessel ? 10 : 6;

  // Helper function to extract organization part
  // const extractOrgPart = (value) => {

  //   let orgId = value.includes('_') ? value.split('_')[1] : value.split('_')[0];
    
  //   return orgId;
  // };
  
   // Helper function to fetch tracked vessels by user
  // const fetchTrackedVesselsByUser = async (userId) => {
  //   try {
  //     const baseURL = process.env.REACT_APP_API_BASE_URL;
  //     const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user`);
  //     // console.log(response);
  //     return response.data.filter(vessel => vessel.loginUserId === userId);
     
      
  //   } catch (error) {
  //     console.error("Error fetching tracked vessels by user:", error);
  //     return [];
  //   }
  // };
 
   // Helper function to fetch tracked vessels by user
  //  const fetchTrackedVesselsByOrg = async (orgId) => {
  //   try {
  //     const baseURL = process.env.REACT_APP_API_BASE_URL;
  //     const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user`);
  //     // console.log(response);
  //     return response.data.filter(vessel => vessel.OrgId === orgId);
     
      
  //   } catch (error) {
  //     console.error("Error fetching tracked vessels by user:", error);
  //     return [];
  //   }
  // };
  
  // new start
  
  // const fetchVesselIMOValues = async (userId) => {
  //   try {
  //     // Extract orgId from userId
  //     let OrgId = userId.includes('_') ? userId.split('_')[1] : userId.split('_')[0];
      
  //     // Define the base URL for the API
  //     const baseURL = process.env.REACT_APP_API_BASE_URL;
  
  //     // Fetch only the relevant vessels from the server based on orgId
  //     const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user-based-on-OrgId`, {
  //       params: {
  //         OrgId: OrgId
  //       }
  //     });
  //     const vesselsFiltered = response.data;  
  //     return vesselsFiltered;
  //   } catch (error) {
  //     console.error("Error fetching IMO values:", error);
  //     return [];
  //   }
  // };

  // new end
  
  // const fetchVesselById = async (userId) => {
  //   try {
    
      
  //     // Define the base URL for the API
  //     const baseURL = process.env.REACT_APP_API_BASE_URL;
  
  //     // Fetch only the relevant vessels from the server based on orgId
  //     const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user-based-on-loginUserId`, {
  //       params: {
  //         loginUserId : userId
  //       }
  //     });
  
     
  
  //     // Extract IMO values from the response
  //     const vesselsFiltered = response.data;
  
   
      
  //     return vesselsFiltered;
  //   } catch (error) {
  //     console.error("Error fetching vessels values:", error);
  //     return [];
  //   }
  // };

  // const fetchVessels = async (role, userId) => {
  //   try {
  //     // Fetch the tracked vessels for the user first
  //     const trackedByUser = await fetchTrackedVesselsByUser(userId);
  //     // console.log(trackedByUser);
  
  //     // Ensure tracked vessels have a valid IMO and extract them
  //     const trackedIMO = trackedByUser.filter(vessel => vessel.IMO).map(vessel => vessel.IMO);
  
  //     const baseURL = process.env.REACT_APP_API_BASE_URL;
  //     // Now fetch all vessels
     
  //     const response = await axios.get(`${baseURL}/api/get-tracked-vessels`);
      
  //     const allVessels = response.data;
      
  //    // Initialize an empty array to store the filtered vessels
  //     const filteredVessels = [];
  
  
  //       if (role === 'hyla admin') {
  //         // For 'hyla admin', return all vessels whose IMO is in the tracked IMO list
  //         filteredVessels.push(...allVessels); // Spread allVessels into filteredVessels to avoid nested array
  //       } else if (role === 'organization admin' || role === 'organizational user') {
        
  
  //         // Now, you need to fetch the IMO values for the user
  //         const vesselsFiltered = await fetchVesselIMOValues(userId); // Await this async function
  
  //         // Check if the vessel IMO is in the fetched IMO values
  //         filteredVessels.push(...vesselsFiltered); // to avoid array inside array nested
         
          
  //       } else if (role === 'guest') {
  //         // For 'guest', filter vessels based on loginUserId
       
  
  //             // Now, you need to fetch the IMO values for the user
  //             const vesselsFiltered = await fetchVesselById(userId); // Await this async function
  //             filteredVessels.push(...vesselsFiltered); // to avoid array inside array nested
  //       }else{
  //         console.log('not found')
  //       }
      
      
  
    
  
  //     // console.log('Filtered Vessels:', finalVessels);
  //     return filteredVessels;
  
  //   } catch (error) {
  //     console.error("Error fetching vessels:", error);
  //     return [];
  //   }
  // };

  // useEffect(() => {
  //   const baseURL = process.env.REACT_APP_API_BASE_URL;
  //   fetchVessels(role, id)
  //     .then(filteredVessels => {
  //       // Process filtered data
  // // console.log(filteredVessels);
  //       const transformedData = filteredVessels.map((vessel) => ({
  //         SpireTransportType: vessel.SpireTransportType|| '',
  //         name: vessel.AIS?.NAME || "-",
  //         imo: vessel.AIS?.IMO || 0,
  //         speed: vessel.AIS?.SPEED || 0,
  //         lat: vessel.AIS?.LATITUDE || 0,
  //         lng: vessel.AIS?.LONGITUDE || 0,
  //         heading: vessel.AIS?.HEADING || 0,
  //         status: vessel.AIS?.NAVSTAT || 0,
  //         eta: vessel.AIS?.ETA || 0,
  //         destination: vessel.AIS?.DESTINATION || '',
  //         zone: vessel.AIS?.ZONE || '',
  //       }));
  //       // console.log(transformedData);
  
  
  //       setVessels(transformedData);
     

  //     })
  //     .catch((err) => {
  //       console.error("Error fetching vessel data:", err);
  //       setError(err.message);
  //     })
  //     .finally(() => {
       
  //     });
  // }, [role,id,vessels]);
  
  

  
  

  // Modify handleNewGeofenceEntry to include the vessel's name and geofence details
  const handleNewGeofenceEntry = (message, vessel) => {
    setNotifications((prev) => [
      ...prev,
      {
        title: `${vessel.name} has entered ${message.title}`,
        date: new Date().toLocaleTimeString(),
        image: <img src={team2} alt="vessel" />,
      }
    ]);
  };

  // Disable keyboard shortcuts and mouse zoom
  useEffect(() => {
    const handleKeyDown = (event) => {
     
      if (event.key.startsWith('F') || (event.ctrlKey && (event.key === '+' || event.key === '-'))) {
        event.preventDefault();
        toast.warning("THIS FUNCTION IS DISABLED"); // Show toast alert
      }
    };

    const handleWheel = (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
        toast.warning("THIS FUNCTION IS DISABLED"); // Show toast alert
      }
    };

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} /> {/* Toast container */}
    
        {/* <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ height: "100%" }}> */}
              {/* <CardContent sx={{ height: "100%" }}> */}
                            <Box
  sx={{
    // height: '70vh',
    // width: '100%',
    borderRadius: '18px',
    overflow: 'hidden', // ✅ Important to clip the rounded corners
    backgroundColor: '#f1f1f1', // ✅ Fallback background for loading tiles
    boxShadow: '0 4px 18px rgba(0,0,0,0.12)', // ✅ Subtle elevation
  }}
>
                <MyMapComponent
                  zoom={zoom}
                  center={center}
                  AOIPolygons={AOIPolygons}
                  setAnalysisVessels={setAnalysisVessels}
                  setAnalysisStats={setAnalysisStats}
                  vessels={vessels}
                  selectedVessel={selectedVessel}
                  setVesselEntries={setVesselEntries}
                  onNewGeofenceEntry={handleNewGeofenceEntry}
                />
                </Box>
              {/* </CardContent> */}
            {/* </Card>
          </Grid>
        </Grid> */}
        {/* <Grid container spacing={3} mt={1}>
        <Grid item xs={12} md={12}>
            <Card sx={{ height: "auto" }}>
              <CardContent>
              <GeofenceMessage
                  vesselEntries={vesselEntries}
                  vessels={vessels}
                  onRowClick={handleRowClick}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={12}>
            <Card sx={{ height: "auto" }}>
              <CardContent>
              
              <GeofenceHistories
                  vesselEntries={vesselEntries}
                  vessels={vessels}
                  onRowClick={handleRowClick}
              />
              </CardContent>
            </Card>
          </Grid>
         
        </Grid> */}
{analysisVessels.length > 0 || analysisStats.redPolygonCount > 0 ? (
<div style={{
  width: '100%',
  marginTop: '24px',
  padding: '24px',
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  border: '1px solid #e0e0e0',
  boxSizing: 'border-box',
}}>
  <h2 style={{
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    borderBottom: '1px solid #ddd',
    paddingBottom: '8px',
    color: '#222'
  }}>
    🛰 Detection Analysis Summary
  </h2>

  {/* Summary Counts */}
  <div style={{ marginBottom: '20px', lineHeight: '1.6', fontSize: '16px', color: '#444' }}>
    <div><strong>Total Vessels:</strong> {analysisVessels?.length || 0}</div>
    <div><strong>✅ Vessels Inside Polygons:</strong> {analysisStats.vesselsInsidePolygons.length}</div>
    <div><strong>🔴 Red Polygons (No Vessels Found):</strong> {analysisStats.redPolygonCount}</div>
  </div>

  {/* All Vessels */}
  <div style={{ marginBottom: '24px' }}>
    <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#333' }}>📋 All Vessels</h3>
    {analysisVessels.length > 0 ? (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
        backgroundColor: '#fafafa',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={cellStyle}>#</th>
            <th style={cellStyle}>Name</th>
            <th style={cellStyle}>IMO</th>
          </tr>
        </thead>
        <tbody>
          {analysisVessels.map((v, idx) => (
            <tr key={idx}>
              <td style={rowStyle}>{idx + 1}</td>
              <td style={rowStyle}>{v.Vessel_Name || 'N/A'}</td>
              <td style={rowStyle}>{v.IMO || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p style={{ color: '#777' }}>No vessels available.</p>
    )}
  </div>

  {/* Vessels Inside Polygons */}
  <div style={{ marginBottom: '24px' }}>
    <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#333' }}>🚢 Vessels Inside Polygons</h3>
    {analysisStats.vesselsInsidePolygons.length > 0 ? (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '14px',
        backgroundColor: '#fafafa',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={cellStyle}>#</th>
            <th style={cellStyle}>Name</th>
            <th style={cellStyle}>IMO</th>
          </tr>
        </thead>
        <tbody>
          {analysisStats.vesselsInsidePolygons.map((v, idx) => (
            <tr key={idx}>
              <td style={rowStyle}>{idx + 1}</td>
              <td style={rowStyle}>{v.Vessel_Name || 'N/A'}</td>
              <td style={rowStyle}>{v.IMO || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p style={{ color: '#777' }}>No vessels inside polygons.</p>
    )}
  </div>

</div>
): null}



    </div>
  )
}

export {Marine}
