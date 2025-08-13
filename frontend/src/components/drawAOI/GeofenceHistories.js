import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { MaterialReactTable } from 'material-react-table';
import axios from 'axios';
import { Box } from '@mui/material';

// Define columns for the Material React Table
const columns = [
  { accessorKey: 'AISName', header: 'Vessel Name' },
  { accessorKey: 'GeofenceName', header: 'Geofence Name' },
  { accessorKey: 'geofenceFlag', header: 'Status' },
  { accessorKey: 'GeofenceInsideTime', header: 'Arrival' },
  { accessorKey: 'GeofenceExitTime', header: 'Departure' },
];

const formatEntries = (vesselHistories = []) => {
  let previousEntry = null; // Track the previous entry to compare
  const entries = vesselHistories.flatMap(history => 
    history.history.map(entry => {
      const currentEntry = {
        AISName: history.vesselName, // Use the vessel name from the history
        GeofenceName: entry.geofenceName || 'N/A', // Display geofence name
        geofenceFlag: entry.geofenceFlag || 'N/A', // Display geofence flag (Inside/Outside)
        GeofenceInsideTime: entry.entryTime ? entry.entryTime : 'N/A', // Format entry time
        GeofenceExitTime: entry.exitTime ? entry.exitTime : 'N/A', // Format exit time or show 'N/A'
      };

      // Skip rows where GeofenceName is 'N/A'
      if (currentEntry.GeofenceName === 'N/A') {
        return null; // Skip this row
      }

      // Compare the current row with the previous row
      if (JSON.stringify(currentEntry) === JSON.stringify(previousEntry)) {
        return null; // Skip row if it matches the previous one
      }

      // Update the previous entry for the next comparison
      previousEntry = currentEntry;

      return currentEntry;
    })
  );

  // Filter out null rows (where data was skipped)
  return entries.filter(entry => entry !== null);
};

const GeofenceHistories = ({ vesselEntries = {}, vessels = [], onRowClick }) => {
  const [dataSource, setDataSource] = useState([]);

  // Fetch vessel histories when the component is mounted
  useEffect(() => {
    const fetchVesselHistories = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_BASE_URL;
        const response = await axios.get(`${baseURL}/api/get-vessel-histories`);
        const formattedData = formatEntries(response.data);
        setDataSource(formattedData);
        console.log(response.data); // Optional: To inspect API response data
      } catch (error) {
        console.error('Error fetching vessel histories:', error);
      }
    };

    fetchVesselHistories();
  }, []);

  const handleRowClick = (rowData) => {
    const selectedVesselName = rowData.AISName ? rowData.AISName.trim() : '';
    console.log('Selected vessel name:', selectedVesselName); // Log vessel name
  
    if (!selectedVesselName) {
      console.warn('AISName is undefined or empty in rowData:', rowData);
      return;
    }
  
    const selectedVesselData = vessels.find(vessel => vessel.name.trim() === selectedVesselName);
    
    if (selectedVesselData) {
      console.log("Row clicked from GeofenceHistories:", selectedVesselData);
      onRowClick(selectedVesselData); // Send data to parent
    } else {
      console.warn(`Vessel data not found for: ${selectedVesselName}`);
      console.log('Available vessels:', vessels.map(v => v.name));
    }
  };

  return (
    <Box className="geofence-histories" sx={{ padding: 2 }}>
      {dataSource.length === 0 ? (
        <p>No vessel histories to display</p>
      ) : (
        <MaterialReactTable
          columns={columns}
          data={dataSource}
          initialState={{ pagination: { pageIndex: 0, pageSize: 10 },
          sorting: [{ desc: false }],
          density: 'compact', }}
          enableColumnFilter={false}
          enableColumnSorting
          enableColumnResizing
          enableGrouping
          enablePagination
          enableColumnPinning
          enableColumnOrdering
          enableColumnDragging
          enableExport
          enableDensityToggle
          onRowClick={handleRowClick} // Trigger row click handler
          sx={{
            '& .MuiTable-root': {
              tableLayout: 'fixed', // Ensures fixed table layout
              width: '100%',
            },
            '& .MuiTableCell-root': {
              whiteSpace: 'nowrap', // Prevents text overflow
              overflow: 'hidden', // Hides overflow content
              textOverflow: 'ellipsis', // Adds ellipsis for overflow text
            },
            '& .MuiTableHead-root': {
              backgroundColor: '#f0f0f0', // Header background color
            },
            '& .MuiTableCell-head': {
              textAlign: 'center', // Center align the header text
            },
            '& .MuiTableBody-root': {
              textAlign: 'left', // Left align the data in the table body
            },
          }}
        />
      )}
    </Box>
  );
};

GeofenceHistories.propTypes = {
  vesselEntries: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  vessels: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      lat: PropTypes.number.isRequired,
      lng: PropTypes.number.isRequired,
      speed: PropTypes.number,
      heading: PropTypes.number,
      destination: PropTypes.string,
    }).isRequired
  ).isRequired,
  onRowClick: PropTypes.func.isRequired,
};

export default GeofenceHistories;
