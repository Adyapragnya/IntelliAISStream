import React, { useRef,useState,useEffect   } from 'react';

import { FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import Swal from 'sweetalert2';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
// import '../geofence/geofencepopup.css';
import PropTypes from 'prop-types';
// import { Modal, Button, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Modal from "react-modal";
import './MapWithDraw.css'
import Select from 'react-select';
import { Autocomplete, TextField } from "@mui/material";
import { toast } from 'react-toastify'; // Import the toast function

// Make sure to set the app element for accessibility
Modal.setAppElement("#root");

const MapWithDraw = ({vessels, portnames, setGeofences, setFilteredGeofences, handleGeofenceChange, map }) => {
  
  const modalStyles = {
    overlay: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1999,
    },
    content: {
      position: 'relative',
      width: '290px',
      padding: '15px',
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.15)',
      border: '1px solid #ddd',
      fontFamily: 'Arial, sans-serif',
      zIndex: 2000,
      inset: 'auto',
      overflow: 'visible',
    },
  };
  
  const customStyles = {
    paper: {
      zIndex: 2002, // Ensures dropdown appears on top
    },
  };
  
  

  const customSelectStyles = {
    position: 'relative',
    zIndex: 2100, // Higher than the modal's z-index
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  };

  const [mapInstance, setMapInstance] = useState(null);
   
  // Set mapInstance once map is available
  useEffect(() => {
    if (map) {
      console.log("✅ Map instance received in child:", map);
      setMapInstance(map);
    } else {
      console.warn("⚠️ Waiting for map instance...");
    }
  }, [map]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVesselPopupOpen, setIsVesselPopupOpen] = useState(false);

    // Function to open & close modals
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
      // Reset state on modal close if needed
      setIsModalOpen(false);
      setHasModalOpened(false); // Allow modal to be shown again if necessary
    };
    const openVesselBufferPopup = () => setIsVesselPopupOpen(true);
    const closeVesselBufferPopup = () => setIsVesselPopupOpen(false);

  const featureGroupRef = useRef(null);
  // const map = useMap();
  const [isEditing, setIsEditing] = useState(false);
  const [allowDrawing, setAllowDrawing] = useState(false);
  const [currentLayer, setCurrentLayer] = useState(null);
  const [hasModalOpened, setHasModalOpened] = useState(false); // 🆕 Prevents multiple openings
  const allowDrawingRef = useRef(false); // mutable ref for immediate flag
  const swalOpenRef = useRef(false);
  const [polygonModalOpen, setPolygonModalOpen] = useState(false);
const [polygonLayer, setPolygonLayer] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [geofenceData, setGeofenceData] = useState(null);
    const drawControlRef = useRef(null);
    const isAdvancedRef = useRef(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [geofenceTypes, setGeofenceTypes] = useState([]);
  const geofenceTypesRef = useRef(geofenceTypes);
  const advancedOptions = ['inport', 'terrestrial', 'boundary'];
  const [drawnGeofences, setDrawnGeofences] = useState([]);
 // Detects if user clicked Circle
  // const drawControlRef = useRef(null); // Store the draw control reference

  const [vesselError, setVesselError] = useState('');
  const [radiusError, setRadiusError] = useState('');
  
// Define initial state outside the component or within it:
const initialFormState = {
  geofenceName: "",
  geofenceType: "",
  seaport: "",
  remarks: "",
};

// In your component's state initialization:
const [geofenceForm, setGeofenceForm] = useState(initialFormState);



  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setGeofenceForm((prev) => ({ ...prev, [name]: value }));
  };
  useEffect(() => {
    // Fetch geofence types from the server on mount
    const fetchGeofenceTypes = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_BASE_URL;
        const response = await axios.get(`${baseURL}/api/get-geofence-types`);
        console.log(response.data[0].geofenceType);
        // Assuming response.data contains the array of geofence types
        if (response.data.length > 0 && response.data[0].geofenceType) {
          setGeofenceTypes(response.data[0].geofenceType); // Extract the geofenceType array

        } else {
          console.error('No geofence types found in the database.');
        }
      } catch (error) {
        console.error('Error fetching geofence types:', error);
      }
    };

    fetchGeofenceTypes();
  }, []);

  useEffect(() => {
    // Whenever geofenceTypes changes, update the ref to hold the latest value
    geofenceTypesRef.current = geofenceTypes;
  }, [geofenceTypes]);

  const isCircleModeRef = useRef(false);
  const selectedGeofenceModeRef = useRef(null);

    // Keep the ref in sync with state
    useEffect(() => {
      allowDrawingRef.current = allowDrawing;
    }, [allowDrawing]);


  const handleModalClose = () => {
    if (currentLayer) {
      map.removeLayer(currentLayer); // Remove the drawn layer from the map
      setCurrentLayer(null);
    }
  
    setShowModal(false);
    setGeofenceForm(initialFormState); // Reset form state when modal is closed
    setIsEditing(false);
    setAllowDrawing(false); // Reset drawing state
  };


  const handleDrawStart = (e) => {
    if (!mapInstance) return console.error("🚨 Map instance not available.");
    
    // Check the ref value immediately
    if (allowDrawingRef.current) {
      console.log("✅ Drawing already enabled, skipping modal.");
      return;
    }
  
    if (e.layerType === "circle") {
      console.log("⛔ Disabling draw mode to show modal...");
      const drawControl = drawControlRef.current;
      if (drawControl?.["_toolbars"]?.draw?._modes?.circle?.handler) {
        drawControl._toolbars.draw._modes.circle.handler.disable();
      }
      setCurrentLayer(e.layer);
  
      // Open modal only if it hasn't opened yet
      if (!isModalOpen && !hasModalOpened) {
        console.log("🟢 Opening modal...");
        setIsModalOpen(true);
        setHasModalOpened(true);
      }
    }
  };
  

 const validateInputs = (selectedVessel, radiusValue) => {
  let isValid = true;
  if (!selectedVessel) {
    setVesselError('Please select a vessel.');
    isValid = false;
  } else {
    setVesselError('');
  }

  if (!radiusValue || parseFloat(radiusValue) <= 0) {
    setRadiusError('Enter a valid radius.');
    isValid = false;
  } else {
    setRadiusError('');
  }

  return isValid;
};

  
// Handle vessel buffer submission
const handleVesselBufferSubmit = () => {
  const vesselName = document.getElementById("vessel-select").value;
  const radiusValue = document.getElementById("radius-input").value;
  const selectedVessel = vessels.find((v) => v.name === vesselName);

  if (!validateInputs(selectedVessel, radiusValue)) {
    return;
  }

  const radius = parseFloat(radiusValue);
  const formData = {
    type: "VesselBuffer",
    IMO: selectedVessel.imo,
    NAME: selectedVessel.name,
    TIMESTAMP: selectedVessel.timestamp,
    LATITUDE: selectedVessel.lat,
    LONGITUDE: selectedVessel.lng,
    radius,
  };

  console.log(formData);
  axios
    .post(`${process.env.REACT_APP_API_BASE_URL}/api/save-vessel-buffer`, formData)
    .then((response) => {
  
      console.log("Vessel buffer saved:", response.data);

      // Create a Leaflet circle for the vessel buffer
      const vesselCircle = L.circle([selectedVessel.lat, selectedVessel.lng], { radius }).addTo(mapInstance);
      mapInstance.flyToBounds(vesselCircle.getBounds(), { animate: true, duration: 1.5 });

      closeVesselBufferPopup();

         // Show a success toast
    toast.success("Vessel buffer saved successfully!", {
      position: "top-right", // Position of the toast
      autoClose: 5000, // Time in milliseconds before it closes automatically
      hideProgressBar: false, // Show the progress bar
      closeOnClick: true, // Close on click
      pauseOnHover: true, // Pause when hovering over the toast
      draggable: true, // Allow dragging the toast
    });

    })
    .catch((error) => {
      console.error("Error saving vessel buffer:", error);
      alert("Failed to save vessel buffer.");
    });
};


  // const handleDrawStart = (e) => {


  //   if (!allowDrawing && e.layerType === "circle") {
 
  //     const drawControl = drawControlRef.current;
  //     if (drawControl && drawControl._toolbars?.draw?._modes?.circle?.handler) {
  //       drawControl._toolbars.draw._modes.circle.handler.disable();
  //   }
  
  //   setIsEditing(false);
  //   setAllowDrawing(false);
  //   setCurrentLayer(e.layer);
   
  //      // Use the layer's center as the popup anchor
  //      const center = e.layer.getLatLng();

  //     Swal.fire({
  //       title: "Select Circle Geofence Type",
  //       input: "radio",
  //       inputOptions: { normalcircle: "Circle Geofence", vesselbuffer: "Vessel Buffer Geofence " },
  //       inputValidator: (value) => {
  //         if (!value) return "You need to choose an option!";
  //       },
  //       showCancelButton: true,
  //     }).then((result) => {
  //       swalOpenRef.current = false;
  //       if (result.isConfirmed) {
  //         selectedGeofenceModeRef.current = result.value;
  
  //         if (result.value === "normalcircle") {
  //           setAllowDrawing(true);
  //           setTimeout(() => {
  //             if (drawControlRef.current && drawControlRef.current._toolbars?.draw?._modes?.circle?.handler) {
  //                 drawControlRef.current._toolbars.draw._modes.circle.handler.enable();
  //             }
  //         }, 100); 
      
  //           // Let the drawing continue
  //         }  else if (result.value === "vesselbuffer") {
  //           Swal.fire({
  //             title: "Enter Vessel Buffer Details",
  //             html: `<input list="vessel-list" id="vessel-input" class="swal2-input" placeholder="Select Vessel Name">
  //                    <datalist id="vessel-list">
  //                      ${vessels.map(vessel => `<option value="${vessel.name}">`).join('')}
  //                    </datalist>
  //                    <input type="number" id="radius-input" class="swal2-input" placeholder="Enter Radius (meters)" min="1">`,
  //             showCancelButton: true,
  //             confirmButtonText: "Submit",
  //             preConfirm: () => {
  //               const vesselName = document.getElementById("vessel-input").value;
  //               const radius = document.getElementById("radius-input").value;
  //               const selectedVessel = vessels.find(v => v.name === vesselName);
  //               console.log(vesselName,selectedVessel,radius);
  //               if (!selectedVessel ) {
  //                 Swal.showValidationMessage("Please select a vessel !");
  //               }
  //               if ( !radius || radius <= 0 ){
  //                 Swal.showValidationMessage("Please enter a valid radius!");
  //               }
  //               return { vessel: selectedVessel, radius: parseFloat(radius) };
  //             },
  //           }).then((radiusResult) => {
  //             if (radiusResult.isConfirmed) {
  //               const { vessel, radius } = radiusResult.value;
  //               const formData = {
  //                 type: "VesselBuffer",
  //                 IMO: vessel.imo,
  //                 NAME: vessel.name,
  //                 TIMESTAMP: vessel.timestamp,
  //                 LATITUDE: vessel.lat,
  //                 LONGITUDE: vessel.lng,
  //                 radius,
  //               };
  //               console.log(formData);
  //               const baseURL = process.env.REACT_APP_API_BASE_URL;
  //               axios.post(`${baseURL}/api/save-vessel-buffer`, formData)
  //                 .then(response => {
  //                   Swal.fire("Success", "Vessel buffer saved successfully!", "success");
  //                   console.log("Vessel buffer saved:", response.data);

  //                   // setGeofences((prevGeofences) => [...prevGeofences, formData]);
  //                   // setFilteredGeofences((prevGeofences) => [...prevGeofences, formData]);
  //                   handleGeofenceChange();

  //                       // Manually create a Leaflet Circle and fly to it
  //                       const vesselCircle = L.circle([vessel.lat, vessel.lng], { radius }).addTo(map);

  //                       // Fly to the vessel buffer geofence
  //                       map.flyToBounds(vesselCircle.getBounds(),{
  //                         animate: true,
  //                         duration: 1.5,
  //                       });
              
  //                 })
  //                 .catch(error => {
  //                   console.error("Error saving vessel buffer:", error);
  //                   Swal.fire("Error", "Failed to save vessel buffer.", "error");
  //                 });
  //             }
  //           });
  //         }
  //       } 
  //     });
  //   }
  // };
  
  // function openVesselBufferPopup() {
  //   // Assume currentLayer is set to the drawn circle
  //   const center = currentLayer.getLatLng();
  //   const popupContent = `
  //     <div style="text-align: center;">
  //       <p>Enter Vessel Buffer Details:</p>
  //       <input list="vessel-list" id="vessel-input" class="leaflet-popup-input" placeholder="Select Vessel Name" />
  //       <datalist id="vessel-list">
  //         ${vessels.map(vessel => `<option value="${vessel.name}">`).join('')}
  //       </datalist>
  //       <input type="number" id="radius-input" class="leaflet-popup-input" placeholder="Enter Radius (meters)" min="1" style="margin-top:8px;" />
  //       <br/><br/>
  //       <button id="bufferSubmit" style="margin-right:10px;">Submit</button>
  //       <button id="bufferCancel">Cancel</button>
  //     </div>
  //   `;
  
  //   const vesselPopup = L.popup({
  //     closeOnClick: false,
  //     autoClose: false,
  //     closeButton: true,
  //   })
  //     .setLatLng(center)
  //     .setContent(popupContent)
  //     .openOn(map);
  
  //   // Attach event listeners after a short delay
  //   setTimeout(() => {
  //     const btnSubmit = document.getElementById("bufferSubmit");
  //     const btnCancel = document.getElementById("bufferCancel");
  
  //     btnSubmit.addEventListener("click", () => {
  //       const vesselName = document.getElementById("vessel-input").value;
  //       const radiusValue = document.getElementById("radius-input").value;
  //       const selectedVessel = vessels.find(v => v.name === vesselName);
  //       if (!selectedVessel) {
  //         alert("Please select a vessel!");
  //         return;
  //       }
  //       if (!radiusValue || parseFloat(radiusValue) <= 0) {
  //         alert("Please enter a valid radius!");
  //         return;
  //       }
  //       map.closePopup(vesselPopup);
  //       const radius = parseFloat(radiusValue);
  //       const formData = {
  //         type: "VesselBuffer",
  //         IMO: selectedVessel.imo,
  //         NAME: selectedVessel.name,
  //         TIMESTAMP: selectedVessel.timestamp,
  //         LATITUDE: selectedVessel.lat,
  //         LONGITUDE: selectedVessel.lng,
  //         radius,
  //       };
  //       console.log(formData);
  //       const baseURL = process.env.REACT_APP_API_BASE_URL;
  //       axios
  //         .post(`${baseURL}/api/save-vessel-buffer`, formData)
  //         .then(response => {
  //           alert("Vessel buffer saved successfully!");
  //           console.log("Vessel buffer saved:", response.data);
  //           handleGeofenceChange();
  //           // Create a Leaflet circle for the vessel buffer and fly to it
  //           const vesselCircle = L.circle([selectedVessel.lat, selectedVessel.lng], { radius }).addTo(map);
  //           map.flyToBounds(vesselCircle.getBounds(), {
  //             animate: true,
  //             duration: 1.5,
  //           });
  //         })
  //         .catch(error => {
  //           console.error("Error saving vessel buffer:", error);
  //           alert("Failed to save vessel buffer.");
  //         });
  //     });
  
  //     btnCancel.addEventListener("click", () => {
  //       map.closePopup(vesselPopup);
  //     });
  //   }, 100);
  // }

  // const handleDrawStart = (e) => {
  //   console.log(e);
  //   if (!mapInstance) {
  //     console.error("Map instance is not available yet.");
  //     return;
  //   }
  //   if (!allowDrawing && e.layerType === "circle") {
  //     const drawControl = drawControlRef.current;
  //     if (drawControl && drawControl._toolbars?.draw?._modes?.circle?.handler) {
  //       drawControl._toolbars.draw._modes.circle.handler.disable();
  //     }
      
  //     setIsEditing(false);
  //     setAllowDrawing(false);
  //     setCurrentLayer(e.layer);
    
  //     const center = mapInstance.getCenter();
    
  //     // Create a DOM element for the popup
  //     const popupContainer = document.createElement("div");
  //     popupContainer.style.textAlign = "center";
    
  //     const p = document.createElement("p");
  //     p.textContent = "Select Circle Geofence Type:";
  //     popupContainer.appendChild(p);
    
  //     const btnNormal = document.createElement("button");
  //     btnNormal.id = "btnNormal";
  //     btnNormal.textContent = "Circle Geofence";
  //     btnNormal.style.marginRight = "10px";
  //     popupContainer.appendChild(btnNormal);
    
  //     const btnVessel = document.createElement("button");
  //     btnVessel.id = "btnVessel";
  //     btnVessel.textContent = "Vessel Buffer Geofence";
  //     popupContainer.appendChild(btnVessel);
    
  //     // Create and open the popup on the map
  //     const popup = L.popup({
  //       closeOnClick: false,
  //       autoClose: false,
  //       closeButton: false,
  //     })
  //       .setLatLng(center)
  //       .setContent(popupContainer)
  //       .openOn(mapInstance);
    
  //     // Attach event listeners that stop event propagation and remove the popup
  //     btnNormal.addEventListener("click", (event) => {
  //       event.preventDefault();
  //       event.stopPropagation();
  //       console.log("clicked-normal");
  //     // Explicitly close the popup before setting drawing mode
  // mapInstance.closePopup(popup);

  // selectedGeofenceModeRef.current = "normalcircle";
  // setAllowDrawing(true);

  //       setTimeout(() => {
  //         if (
  //           drawControlRef.current &&
  //           drawControlRef.current._toolbars?.draw?._modes?.circle?.handler
  //         ) {
  //           drawControlRef.current._toolbars.draw._modes.circle.handler.enable();
  //         }
  //       }, 100);
  //     });
    
  //     btnVessel.addEventListener("click", (event) => {
  //       event.preventDefault();
  //       event.stopPropagation();
  //       console.log("clicked-buffer");
  // // Close the popup before opening the vessel buffer popup
  // mapInstance.closePopup(popup);
  //       selectedGeofenceModeRef.current = "vesselbuffer";
  //       openVesselBufferPopup();
  //     });
  //   }
  // };
  
  
  const handleCreated = (e) => {

    console.log("handleCreated fired!", e.layerType);
    
  
    const { layer } = e;
    console.log(e);

    if (!layer) {
        console.error("No layer detected in event.");
        return;
    }
    
    let coordinates;
    let type = e.layerType;

    setGeofenceForm(initialFormState); // Reset form state here

    if (layer instanceof L.Circle) {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      if (radius <= 0) {
        Swal.fire('Error', 'Circle radius must be greater than zero.', 'error');
        return;
      }
       coordinates = [{ lat: center.lat, lng: center.lng, radius }];
       type = "Polycircle";
       finalizeGeofence(layer, type, coordinates);
       
      
    

    } else if (layer instanceof L.Polygon) {

      setPolygonLayer(layer); // Store layer
      setPolygonModalOpen(true); // Open modal

      // Swal.fire({
      //   title: 'Select Geofence Type',
      //   input: 'radio',
      //   inputOptions: { Polygon: 'Normal', Advanced: 'Advanced' },
      //   inputValidator: (value) => {
      //   if (!value) return 'You need to choose an option!';
      //   },
      //   showCancelButton: true,
      //   }).then((result) => {
      //   if (!result.isConfirmed) {
      //   featureGroupRef.current?.removeLayer(layer);
      //   return;
      //   }
       
      //     coordinates = layer.getLatLngs()[0].map(latlng => ({ lat: latlng.lng, lng: latlng.lat }));
      //     type = result.value ;
      //     finalizeGeofence(layer, type, coordinates);


      // })
      
     
    } else if (layer instanceof L.Polyline) {
      const  coordinates = layer.getLatLngs().map(latlng => ({ lat: latlng.lat, lng: latlng.lng }));
      const  type = "Polyline";
      finalizeGeofence(layer, type, coordinates);


    }

  };

  const finalizeGeofence = (layer, type, coordinates) => {
    const newGeofence = { id: Date.now(), type, coordinates, layer };
    setGeofenceForm(initialFormState);
    console.log(newGeofence);
    setGeofenceData(newGeofence);
  
    if (!map) {
      console.error("Map object not found");
      return;
    }
  
    const { innerWidth: clientWidth, innerHeight: clientHeight } = window;
  
    // Convert geofence center to screen coordinates
    const screenPoint = map.latLngToContainerPoint(layer.getBounds().getCenter());
  
    // Modal size
    const modalWidth = 280;
    const modalHeight = 100;
  
    // Calculate modal position
    let modalTop = screenPoint.y - 60; // Offset above geofence
    let modalLeft = screenPoint.x + 20; // Offset to the right
  
    // Ensure modal stays within the viewport
    if (modalLeft + modalWidth > clientWidth) {
      modalLeft = clientWidth - modalWidth - 10; // Shift left if out of bounds
    }
    if (modalTop < 10) {
      modalTop = 10; // Keep modal within the top of the screen
    }
    if (modalTop + modalHeight > clientHeight) {
      modalTop = clientHeight - modalHeight - 10; // Shift up if out of bounds
    }
    if (modalLeft < 10) {
      modalLeft = 10; // Keep modal within the left of the screen
    }
  
    // Set the modal position
    setModalPosition({ top: modalTop, left: modalLeft });
  
    // Delay to open the modal after positioning
    setTimeout(() => setShowModal(true), 100);
    setIsEditing(true);
    setCurrentLayer(layer); // Store the layer for potential removal
  
    if (drawControlRef.current) {
      drawControlRef.current._toolbars.draw.disable();
    }
  
  
    // Allow reopening modal when clicking on the geofence
    layer.on("click", () => {
      console.log("Geofence clicked, opening modal.");
      setShowModal(true);
    });
  };
  
  const handleGeofenceTypeSelection = (selectedType) => {
    if (!polygonLayer) return;
  
    const coordinates = polygonLayer.getLatLngs()[0].map(latlng => ({ lat: latlng.lng, lng: latlng.lat }));
  
    finalizeGeofence(polygonLayer, selectedType, coordinates);
    setPolygonModalOpen(false);
  };
  
     


        const handleSaveGeofence = async () => {
          if (!geofenceData) return;
       
          const { type, coordinates, layer } = geofenceData;
          const baseURL = process.env.REACT_APP_API_BASE_URL;

           // Ensure these fields are properly validated
           if (!geofenceForm.geofenceName || geofenceForm.geofenceName.trim() === "") {
            console.log("Geofence Name is missing!");
            Swal.fire("Error", "Geofence Name is required.", "error");
            return;
        }
        
        if (!geofenceForm.geofenceType || geofenceForm.geofenceType.trim() === "") {
          console.log("Geofence Type is missing!"); 
          Swal.fire("Error", "Geofence Type is required.", "error");
            return;
        }
  

            let endpoint = "";

            if (type === "Advanced") {
              endpoint = `${baseURL}/api/add-terrestrial-Advancedgeofence`;
            } else if (type === "Polygon") {
              endpoint = `${baseURL}/api/addpolygongeofences`;
            } else if (type === "Polycircle") {
              endpoint = `${baseURL}/api/addcirclegeofences`;
            } else if (type === "Polyline") {
              endpoint = `${baseURL}/api/addpolylinegeofences`;
            } else {
              Swal.fire('Error', 'Unsupported geofence type.', 'error');
              return;
            }
            

            const payload = {
              geofenceName: geofenceForm.geofenceName,
              type,
              geofenceType: geofenceForm.geofenceType,
              seaport: geofenceForm.seaport, // optional
              remarks: geofenceForm.remarks,
              coordinates,
            };
            
            if (!endpoint) {
              Swal.fire('Error', 'Invalid API endpoint', 'error');
              return;
           }
           
            console.log(endpoint,payload);
          // return;
          
            try {

          const response = await axios.post(endpoint, payload);
          console.log(response);
      

          if (response.status === 201) {
                   // Show a success toast
              toast.success("Geofence saved successfully!", {
                position: "top-right", // Position of the toast
                autoClose: 5000, // Time in milliseconds before it closes automatically
                hideProgressBar: false, // Show the progress bar
                closeOnClick: true, // Close on click
                pauseOnHover: true, // Pause when hovering over the toast
                draggable: true, // Allow dragging the toast
              });
              // setGeofences((prevGeofences) => [...prevGeofences, formData]);
              // setFilteredGeofences((prevGeofences) => [...prevGeofences, formData]);
              handleGeofenceChange();
              setShowModal(false);
              setGeofenceForm(initialFormState);
              // Fly to the newly created geofence
              if (layer instanceof L.Polygon || layer instanceof L.Circle) {
                const bounds = layer.getBounds();
                map.flyToBounds(bounds, 10, {
                  animate: true,
                  duration: 1.5,
                });
              }else if (layer instanceof L.Polyline) {
                const latlngs = layer.getLatLngs();
                if (latlngs.length > 0) {
                  const bounds = L.latLngBounds(latlngs);
                  map.flyToBounds(bounds, 10, {
                    animate: true,
                    duration: 1.5,
                  });
                }
              }
            
          


           
              
     
          }


        } catch (error) {
          console.error('Error saving geofence:', error);
          Swal.fire('Error', 'Failed to save geofence data. ' + (error.response?.data?.error || 'Please try again.'), 'error');
        }
      };
    
      useEffect(() => {
        if (!isModalOpen && hasModalOpened && selectedGeofenceModeRef.current === "normalcircle") {
          console.log("🟢 Modal closed, enabling draw mode...");
          // Allow drawing and then enable the circle draw handler after a short delay
          setAllowDrawing(true);
          setTimeout(() => {
            const drawControl = drawControlRef.current;
            if (drawControl?.["_toolbars"]?.draw?._modes?.circle?.handler) {
              console.log("✅ Enabling draw mode...");
              drawControl._toolbars.draw._modes.circle.handler.enable();
              console.log("✅ Circle draw enabled!");
            } else {
              console.log("⚠️ Circle draw handler not found!");
            }
          }, 300);
        }
      }, [isModalOpen, hasModalOpened]);
      
      const handleVesselBuffer = () => {
        selectedGeofenceModeRef.current = "vesselbuffer";
        console.log("User selected Vessel Buffer.");
        handleCloseModal();
        openVesselBufferPopup();
      };

      const handleNormalCircle = () => {
        selectedGeofenceModeRef.current = "normalcircle";
        console.log("🔴 User selected Normal Circle, closing modal and enabling draw...");
    
        // Immediately update the ref (and state) so further drawStart events won't open modal
        allowDrawingRef.current = true;
        setAllowDrawing(true);
    
        setIsModalOpen(false); // close modal
    
        // After a short delay, enable the circle draw handler
        setTimeout(() => {
          const drawControl = drawControlRef.current;
          if (drawControl?.["_toolbars"]?.draw?._modes?.circle?.handler) {
            console.log("✅ Enabling draw mode...");
            drawControl._toolbars.draw._modes.circle.handler.enable();
            console.log("✅ Circle draw enabled!");
          } else {
            console.log("⚠️ Circle draw handler not found!");
          }
        }, 300);
      };
    
      
      // mapInstance.on("draw:created", () => {
      //   console.log("Draw event detected. Preventing modal reopen.");
      //   setIsModalOpen(false);
      // });
      
      useEffect(() => {
        if (!mapInstance) return;
      
        const handleDrawCreated = () => {
          console.log("Draw event detected. Preventing modal reopen.");
          setIsModalOpen(false); // Ensure modal stays closed
        };
      
        mapInstance.on("draw:created", handleDrawCreated);
      
        return () => {
          mapInstance.off("draw:created", handleDrawCreated);
        };
      }, [mapInstance]);
      
      

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <FeatureGroup ref={featureGroupRef}>
      
    {mapInstance && (
      <EditControl
  position="topright"
  onMounted={(control) => {
    drawControlRef.current = control; // Store the draw control reference
  }}
  onCreated={handleCreated}
  onDrawStart={handleDrawStart} // Detect when user clicks Circle button
  draw={{
    showArea: true,
    // rectangle: {
    //   shapeOptions: {
    //     color: 'blue', // Custom color for rectangle
    //     weight: 2,
    //   },
    // },
    polygon: {
      allowIntersection: false, // Prevent self-intersections for cleaner shapes
      showArea: true, // Show the area measurement
      shapeOptions: {
        color: 'blue', // Custom polygon color
        weight: 2,
      },
      icon: L.icon({
        iconUrl: 'https://static.vecteezy.com/system/resources/previews/016/314/339/original/red-circle-red-dot-icon-free-png.png',
        iconSize: [10, 10],
      }),
    },
    // polyline: {
    //   shapeOptions: {
    //     color: 'blue', // Custom polyline color
    //     weight: 3,
       
    //   },
    //   icon: L.divIcon({
    //     className: 'custom-polyline-icon',
    //     html: '<div style="width:10px; height:10px; background:red; border-radius:50%;"></div>',
    //   }),
    // },
    // circle: {
    //   showArea: true,
    //   shapeOptions: {
    //     color: 'blue', // Custom circle color
    //     weight: 2,
    //   },
    // },
    marker: false,
    circlemarker: false,
  }}
/>
    )}

    </FeatureGroup>
    

    {showModal && (
  <div
    style={{
      position: "absolute",
      top: `${modalPosition.top || 50}px`, // Default to 50px if no position
      left: `${modalPosition.left || 50}px`, // Default to 50px if no position
      background: "white",
      padding: "12px",
      boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
      borderRadius: "8px",
      zIndex: 1000,
      width: "280px",
      maxWidth: "90vw", // Ensure modal fits on small screens
      fontFamily: "Arial, sans-serif",
      // Remove translate and adjust positioning to ensure visibility
      transform: "none", // Avoid shifting outside screen bounds
      // Optional: Add some responsiveness to ensure it's not too large on mobile screens
      minWidth: "250px",
    }}
  >

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h5 style={{ margin: 0, fontSize: "14px", fontWeight: "500", color: "#444" }}>Create Geofence</h5>
     
    </div>
    
    <form style={{ marginTop: "10px" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Name</label>
          <input
            type="text"
            name="geofenceName"
            value={geofenceForm.geofenceName}
            onChange={handleFormChange}
            placeholder="Enter"
            style={{
              width: "100%",
              padding: "6px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "12px",
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Type</label>
          <select
            name="geofenceType"
            value={geofenceForm.geofenceType}
            onChange={handleFormChange}
            style={{
              width: "100%",
              padding: "6px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "12px",
              background: "#fff",
            }}
          >
            <option value="">Select</option>
            {(geofenceData.type === "Polygon" || geofenceData.type === "Polycircle" || geofenceData.type === "Polyline") &&
              geofenceTypes.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            {geofenceData.type === "Advanced" &&
              advancedOptions.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Seaport</label>
          <select
            name="seaport"
            value={geofenceForm.seaport}
            onChange={handleFormChange}
            style={{
              width: "100%",
              padding: "6px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "12px",
              background: "#fff",
            }}
          >
            <option value="">Select</option>
            {portnames.map((type, index) => (
              <option key={index} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#666" }}>Remarks</label>
          <input
            type="text"
            name="remarks"
            value={geofenceForm.remarks}
            onChange={handleFormChange}
            placeholder="Optional"
            style={{
              width: "100%",
              padding: "6px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              fontSize: "12px",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
        <button
          type="button"
          onClick={handleModalClose}
          style={{
            padding: "6px 10px",
            borderRadius: "5px",
            border: "none",
            background: "#ddd",
            fontSize: "12px",
            cursor: "pointer",
            color: "#555"
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSaveGeofence}
          style={{
            padding: "6px 10px",
            borderRadius: "5px",
            border: "none",
            background: "#007bff",
            color: "white",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>
    </form>

  </div>
)}

<Modal
  isOpen={polygonModalOpen}
  onRequestClose={() => setPolygonModalOpen(false)}
  parentSelector={() => document.getElementById("map")}
  style={{
    ...modalStyles,
    content: {
      ...modalStyles.content,
      height: "auto",
    },
  }}
  shouldCloseOnOverlayClick={true}
>
  <div style={{ textAlign: "center", margin: "0" }}>
    <h5 style={{ color: "#333", marginBottom: "20px", fontWeight: "semibold" }}>
      Select Polygon Geofence Type
    </h5>
    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
      <button
        onClick={() => handleGeofenceTypeSelection("Polygon")}
        style={{
          padding: "7px 15px",
          border: "none",
          background: "#0F67B1",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Normal
      </button>
      <button
        onClick={() => handleGeofenceTypeSelection("Advanced")}
        style={{
          padding: "7px 15px",
          border: "none",
          background: "#28a745",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Advanced
      </button>
    </div>
  </div>
</Modal>

{/* circle Geofence Type Selection Modal */}

<Modal
  isOpen={isModalOpen}
  onRequestClose={handleCloseModal}
  parentSelector={() => document.getElementById("map")}
  style={{
    ...modalStyles,
    content: {
      ...modalStyles.content,
      height: "auto", // Set your desired height here
    },
  }}
  shouldCloseOnOverlayClick={true}
>
  <div style={{ textAlign: "center", margin: "0" }}>
    <h5 style={{ color: "#333",marginBottom: "20px", fontWeight:"semibold" }}>Select Circle Geofence Type</h5>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "10px", // Adjust the gap between buttons as needed
      }}
    >
      <button
        onClick={handleNormalCircle}
        style={{
          padding: "7px 15px",
          border: "none",
          background: "#0F67B1",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Circle Geofence
      </button>
      <button
        onClick={handleVesselBuffer}
        style={{
          padding: "7px 15px",
          border: "none",
          background: "#28a745",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Vessel Buffer Geofence
      </button>
    </div>
  </div>
</Modal>

{/* Vessel Buffer Details Modal */}
<Modal
  isOpen={isVesselPopupOpen}
  onRequestClose={closeVesselBufferPopup}
  parentSelector={() => document.getElementById("map")}
  style={{
    ...modalStyles,
    content: {
      ...modalStyles.content,
      height: "auto", // Adjust height based on content
    },
  }}
  shouldCloseOnOverlayClick={true}
>
  <div style={{ textAlign: "center" }}>
  <h5 style={{ color: "#333", fontWeight: "semibold", marginBottom: "15px" }}>Enter Vessel Buffer Details</h5>

    {/* Vessel Selection */}
    <div style={{ textAlign: "left", width: "80%", margin: "0 auto", marginBottom: "5px" }}>
      <select id="vessel-select" style={customSelectStyles}>
        <option value="">Select Vessel Name</option>
        {vessels.map((vessel) => (
          <option key={vessel.id || vessel.name} value={vessel.name}>
            {vessel.name}
          </option>
        ))}
      </select>
   


      {vesselError && <div style={{ color: 'red' }}>{vesselError}</div>}
    </div>
   
    {/* Radius Input */}
    <div style={{ textAlign: "left", width: "80%", margin: "0 auto" }}>
      <input
        type="number"
        id="radius-input"
        placeholder="Enter Radius (meters)"
        min="1"
        style={{
          width: "100%",
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
      {radiusError && <div style={{ color: 'red' }}>{radiusError}</div>}
    </div>

    {/* Buttons */}
    <div>
      <button
        onClick={closeVesselBufferPopup}
        style={{
          margin: "10px",
          padding: "10px 26px",
          border: "none",
          background: "#6c757d",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Cancel
      </button>

      <button
        onClick={handleVesselBufferSubmit}
        style={{
          margin: "10px",
          padding: "10px 26px",
          border: "none",
          background: "#0F67B1",
          color: "#fff",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Submit
      </button>
    </div>
  </div>
</Modal>

</div>


  );
};

MapWithDraw.propTypes = {
  vessels: PropTypes.array.isRequired,
  portnames: PropTypes.array.isRequired,
  setGeofences: PropTypes.func.isRequired,
  setFilteredGeofences: PropTypes.func.isRequired,
  handleGeofenceChange: PropTypes.func.isRequired,
  map: PropTypes.object.isRequired,
};

export default MapWithDraw;