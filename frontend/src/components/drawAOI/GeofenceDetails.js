import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './GeofenceDetails.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import Chart from 'chart.js/auto';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

const GeofenceDetails = ({ vesselEntries = {}, vessels = [], onRowClick }) => {
  const [expandedVessel, setExpandedVessel] = useState(null);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [tableLoading, setTableLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  

  useEffect(() => {
    
    if (vesselEntries.length > 0 || vessels.length > 0) {
      setTableLoading(false); // Data is available, stop loading
    }
  }, [vesselEntries, vessels]);

  const entriesArray = Array.isArray(vesselEntries)
    ? vesselEntries
    : Object.entries(vesselEntries || {}).map(([key, value]) => ({ ...value, name: key }));

    const uniqueVessels = Array.from(new Map(vessels.map(v => [v.imo, v])).values());

    const formattedData = uniqueVessels.map(vessel => {
      const entry = entriesArray.find(e => e.name === vessel.name) || {};
      return {
        name: vessel.name,
        geofence: entry.geofence || '-',
        status: entry.status || 'Outside',
        IMO: vessel.imo,
      };
    });
    
      
  const sortedData = [...formattedData].sort((a, b) => {
    if (!sortConfig.key) return 0;
  
    const aVal = a[sortConfig.key]?.toString().toLowerCase() || '';
    const bVal = b[sortConfig.key]?.toString().toLowerCase() || '';
  
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return sortedData;
    const query = searchQuery.toLowerCase();
    return sortedData.filter((v) =>
      Object.values(v).some(val =>
        val?.toString().toLowerCase().includes(query)
      )
    );
  }, [sortedData, searchQuery]);
  
  
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  const handleRowClick = async (vessel) => {
    onRowClick(vessel);

    const isSame = expandedVessel?.name === vessel.name;
    setExpandedVessel(isSame ? null : vessel);

    if (!isSame && !history[vessel.name]) {
      setLoading(true);
      try {
        const baseURL = process.env.REACT_APP_API_BASE_URL;
        const res = await axios.get(`${baseURL}/api/vesselHistoryEvents/${vessel.IMO}`);
        
        console.log("API Response for Vessel History Data:", res.data); // Debugging line

        if (res.data && res.data.events) {
          setHistory(prev => ({ ...prev, [vessel.name]: res.data }));
        } else {
          setHistory(prev => ({
            ...prev,
            [vessel.name]: { error: 'No history data available.' },
          }));
        }
      } catch (err) {
        console.error('Error fetching vessel history:', err);
        setHistory(prev => ({
          ...prev,
          [vessel.name]: { error: 'No history data available.' },
        }));
      } finally {
        setLoading(false);
      }
    }
  };

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  console.log('filteredvessels', filteredData);

  
  // Export Excel Logic //
  const exportToExcel = () => {
    if (!Object.keys(history).length) {
      toast.error("NO HISTORY DATA AVAILABLE. PLEASE SELECT A VESSEL.");
      return;
    }
  
    const wb = XLSX.utils.book_new();
  
    Object.entries(history).forEach(([vesselName, vesselData]) => {
      const events = vesselData?.events;
      if (!events || !events.length) return;
      const sheetRows = [];
  
      // Header with "Status"
      sheetRows.push(['Port Name', '🕓 In', '🚢🚪 Out', '⏳ Duration', '🏁 Status', 'Summary']);
      const sortedEvents = [...events].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
  
      const portVisitCount = {};
      let totalDurationMinutes = 0;
      let validDurations = 0;
  
      // Count visits and duration
      sortedEvents.forEach(event => {
        const port = event.geofenceName;
        if (port) portVisitCount[port] = (portVisitCount[port] || 0) + 1;
  
        if (event.entryTime && event.exitTime) {
          const durationMs = new Date(event.exitTime) - new Date(event.entryTime);
          const durationMins = Math.floor(durationMs / 60000);
          if (durationMins > 0) {
            totalDurationMinutes += durationMins;
            validDurations++;
          }
        }
      });
  
      const totalPorts = Object.keys(portVisitCount).length;
      const frequentPort = Object.entries(portVisitCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      const totalHours = (totalDurationMinutes / 60).toFixed(2);
      const totalDays = (totalDurationMinutes / 1440).toFixed(2);
      const avgMins = validDurations ? (totalDurationMinutes / validDurations).toFixed(2) : 'N/A';
      const avgDays = validDurations ? (avgMins / 1440).toFixed(2) : 'N/A';
  
      // Create rows
      sortedEvents.forEach((event, idx) => {
        const portLabel = `${event.geofenceName || '-'} : ${event.seaport || '-'}`;
        const inTime = event.entryTime ? new Date(event.entryTime).toLocaleString() : '-';
        const outTime = event.exitTime ? new Date(event.exitTime).toLocaleString() : 'Still inside';
        const duration = event.duration || 'N/A';
        const status = event.exitTime ? 'Exited' : 'Still inside';
  
        let summary = '';
        if (idx === 0) summary = `⚓ Total Ports: ${totalPorts}`;
        else if (idx === 1) summary = `🛟 Frequent Port: ${frequentPort}`;
        else if (idx === 2) summary = `⏰ Total Duration: ${totalHours} hrs (${totalDays} days)`;
        else if (idx === 3) summary = `🗓️ Avg Time: ${avgMins} mins (${avgDays} days)`;
  
        sheetRows.push([portLabel, inTime, outTime, duration, status, summary]);
      });
  
      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  
      ws['!cols'] = [
        { wch: 40 }, // Port Name
        { wch: 20 }, // In
        { wch: 20 }, // Out
        { wch: 15 }, // Duration
        { wch: 15 }, // Status
        { wch: 50 }, // Summary
      ];
  
      XLSX.utils.book_append_sheet(wb, ws, vesselName.substring(0, 31));
    });
  
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  
    function s2ab(s) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
      return buf;
    }
  
    saveAs(
      new Blob([s2ab(wbout)], { type: 'application/octet-stream' }),
      'Hyla_Vessel_Geofence_Report.xlsx'
    );
  };
  // End of Export Excel Logic //
  

  return (
    <div style={styles.container}>
      <h3 style={styles.header}><i className='fa-solid fa-ship' style={{color:" #3498db"}}></i>&nbsp;Vessel Geofence Monitor</h3>
      <div style={styles.tableWrapper}>

          <div style={styles.searchExportWrapper}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />

<button
  id="export-report-btn"
  onClick={exportToExcel}
  style={styles.exportButton}
  data-tooltip-id="exportTip"
  data-tooltip-content="Download vessel geofence report as Excel file"
  onMouseOver={(e) => (e.target.style.backgroundColor = '#2980b9')}
  onMouseOut={(e) => (e.target.style.backgroundColor = '#3498db')}
>
  <i className='fa-solid fa-file-excel' style={{ color: "rgb(255, 255, 255)" }}></i>&nbsp; Export Report
</button>

<Tooltip
  id="exportTip"
  place="right"
  style={{
    backgroundColor: '#2c3e50',
    color: '#ecf0f1',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '0.875rem',
  }}
/>
</div>

      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
          <th style={styles.tableHeaderCell} onClick={() => handleSort('name')}>
            Vessel {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={styles.tableHeaderCell} onClick={() => handleSort('geofence')}>
            Geofence {sortConfig.key === 'geofence' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={styles.tableHeaderCell} onClick={() => handleSort('status')}>
            Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map(v => (
            <React.Fragment key={`${v.name}-${v.IMO}`}>
              <tr
                onClick={() => handleRowClick(v)}
                style={{
                  ...styles.tableRow,
                  backgroundColor: expandedVessel?.name === v.name ? ' #e9f7ff' : ' #fff',
                }}
              >
                <td style={styles.tableCell}>
                  <span style={{ marginRight: '8px' }}>
                    {expandedVessel?.name === v.name ? '️⏬' : '⏩'}
                  </span>
                  {v.name}-{v.IMO}
                </td>
                <td className="table-cell" title={v.geofence}  style={styles.tableCell}>{v.geofence}</td>
                <td style={{ ...styles.tableCell, color: v.status === 'Inside' ? 'rgb(10, 219, 66)' : 'rgb(241, 72, 21)' }}>
                  {v.status}
                </td>
              </tr>
              {expandedVessel?.name === v.name && (
                <tr style={styles.historyRow} >
                  <td colSpan={3} style={styles.historyContainer}>
                    {loading ? (
                      <p style={styles.loadingText}>Loading history...</p>
                    ) : history[v.name]?.error ? (
                      <p style={styles.errorText}>{history[v.name].error}</p>
                    ) : (
                        <div className="history-content">
                        {history[v.name]?.events?.map((event, i) => (
                          <div
                            key={i}
                            className="history-card"
                            style={{
                            //   ...styles.historyCard,
                              backgroundColor: i % 2 === 0 ? '#f5f6fa' : '#ffffff',
                            }}
                          >
                            <div style={styles.historyCardContent}>
                              <div style={styles.historyCardTitle}>{event.geofenceName} : {event.seaport}</div>
                              <div style={styles.historyCardDetails}>
                                <span style={styles.boldText}>🕓 In: </span>
                                {new Date(event.entryTime).toLocaleString()}
                              </div>
                              <div style={styles.historyCardDetails}>
                                <span style={styles.boldText}>🚪 Out: </span>
                                {event.exitTime ? new Date(event.exitTime).toLocaleString() : 'Still inside'}
                              </div>
                              <div style={styles.historyCardDetails}>
                                <span style={styles.boldText}>⏳ Duration: </span>
                                {event.duration || 'N/A'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
        {filteredData.length === 0 && (
          <tr>
            <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
              <i className='fa-solid fa-ship' style={{color:"red"}}></i>&nbsp;No vessels match your search.
            </td>
          </tr>
        )}
      </table>
      {filteredData.length > itemsPerPage && (
        <div style={styles.paginationContainer}>
          <button
            style={styles.paginationButton}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <i className='fa-solid fa-arrow-circle-left'></i>&nbsp; Prev
          </button>
          <span style={styles.paginationInfo}>
            Page {currentPage} of {Math.ceil(filteredData.length / itemsPerPage)}
          </span>
          <button
            style={styles.paginationButton}
            disabled={currentPage >= Math.ceil(filteredData.length / itemsPerPage)}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next&nbsp;<i className='fa-solid fa-arrow-circle-right'></i>
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

// Define the styles for the UI elements
const styles = {
  container: {
    padding: '10px',
    margin: '0px', // Ensure no margin is applied
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    backgroundColor: '#f4f7f6',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  header: {
    marginBottom: '16px',
    fontSize: '22px',
    color: '#34495e',
    fontWeight: '600',
  },
  tableWrapper: {
    overflowX: 'auto',
    maxWidth: '100%',
    marginBottom: '16px',
  },
  
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  
  paginationButton: {
    padding: '8px 16px',
    fontSize: '14px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#3498db',
    color: '#fff',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  paginationButtonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed',
  },
  
  paginationButtonHover: {
    backgroundColor: '#2980b9',
  },
  
  paginationInfo: {
    fontSize: '14px',
    color: '#34495e',
    fontWeight: '500',
  },
  
  
  loadingText: {
    margin: 0,
    fontSize: '14px',
    color: '#3498db',
    textAlign: 'center',
    padding: '20px 0',
  },
  
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '15px',
  },
  tableHeader: {
    backgroundColor: '#ecf0f1',
  },
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '500',
    color: '#34495e',
    cursor: 'pointer',

  },
  tableRow: {
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-in-out',
    borderBottom: '1px solid #ecf0f1',
  },
  tableCell: {
    fontSize:'15px',
    fontWeight: '400',
    padding: '12px 16px',
    color: '#333',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '150px',
  },
  
  historyRow: {
    // backgroundColor: 'red',
  },
  historyContainer: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  historyContent: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  historyCard: {
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.3s ease-in-out',
    marginBottom: '12px',
    width: 'calc(33% - 12px)', // Default: 3 cards per row
    cursor: 'pointer',
  },
  historyCardTitle: {
    fontWeight: '600',
    color: '#34495e',
  },
  historyCardContent: {
    fontSize: '14px',
    color: '#7f8c8d',
  },
  historyCardDetails: {
    marginTop: '6px',
  },
  boldText: {
    fontWeight: '600',
    color: '#2c3e50',
  },
  loadingText: {
    margin: 0,
    fontSize: '14px',
    color: '#3498db',
  },
  errorText: {
    margin: 0,
    fontSize: '14px',
    color: '#e74c3c',
  },

  searchExportWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  
  searchInput: {
    padding: '6px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    width: '180px',
    flexShrink: 0,
  },
  
  exportButton: {
    padding: '6px 12px',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.3s ease',
  },
  
  // Media Queries for Responsiveness
  '@media (max-width: 1200px)': {
    historyCard: {
      width: 'calc(50% - 12px)', // 2 cards per row on medium screens
    },
  },
  '@media (max-width: 768px)': {
    historyCard: {
      width: '100%', // 1 card per row on small screens
    },
  },
};

GeofenceDetails.propTypes = {
  vesselEntries: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        geofence: PropTypes.string.isRequired,
        entryTime: PropTypes.string,
        exitTime: PropTypes.string,
      }).isRequired
    ),
    PropTypes.objectOf(
      PropTypes.shape({
        entryTime: PropTypes.string,
        exitTime: PropTypes.string,
        geofence: PropTypes.string,
      }).isRequired
    ),
  ]).isRequired,
  vessels: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      IMO: PropTypes.number.isRequired,
      speed: PropTypes.number,
      heading: PropTypes.number,
      destination: PropTypes.string,
    }).isRequired
  ).isRequired,
  onRowClick: PropTypes.func.isRequired,
};

export default GeofenceDetails;