import "leaflet-geosearch/dist/geosearch.css"; // Import styles
import PropTypes from "prop-types";
import React, { useState } from "react";
import { useMap } from "react-leaflet";
import { Autocomplete, TextField, CircularProgress } from "@mui/material";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import { createTheme, ThemeProvider } from "@mui/material/styles";

import Popper from "@mui/material/Popper";

const theme = createTheme({
  components: {
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: "#D70654",
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)", // Keeps label centered by default
          transition: "all 0.2s ease-in-out",
          padding: "4px", 
          marginLeft: "6px",
          display: "flex",
          alignItems: "center",
    
          "&.MuiInputLabel-shrink": {
            top: "-13px",  // Moves label above the border
            transform: "translateY(0)",
            background: "white",
            padding: "0px 0px", // Adds small padding so it doesn't touch the border
            margin: "4px 8px",
            fontSize: "12px", // Smaller label when focused
          },
    
          "&.Mui-focused": {
            color: "#D70654",
          },
    
          [theme.breakpoints.down("sm")]: {
            fontSize: "8px", // Adjust for small screens
          },
          
          [theme.breakpoints.down("md")]: {
            fontSize: "10px", // Adjust for small screens
          },
        }),
      },
    },
    
    
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "lightgray",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "lightgray",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "lightgray",
          },
          color: "black",
          display: "flex",
          alignItems: "center",
          height: "30px", // Adjust height
    
          [theme.breakpoints.down("md")]: {
            height: "28px",
          },
          [theme.breakpoints.down("sm")]: {
            height: "26px",
          },
        }),
        input: {
          fontSize: "12px", // Reduce selected option text size
          padding: "6px 8px", // Reduce padding
          lineHeight: 1.5,
        },
      },
    },
    
    
    MuiAutocomplete: {
      styleOverrides: {
        root: ({ theme }) => ({
    
          minHeight: "36px",
          [theme.breakpoints.down("md")]: {
            minHeight: "36px",
          },
          [theme.breakpoints.down("sm")]: {
            minHeight: "32px",
          },
        }),
        inputRoot: {
          color: "#D70654",
          fontSize: "12px", // Reduce input text size
          padding: "2px 4px", // Reduce padding inside input
          fontWeight: "bold",
        },
        option: {
          padding: "2px 2px", // Default padding
          fontSize: "12px",
    
          "@media (max-width:600px)": {
            margin:"0px" ,
            padding: "2px 2px !important" , // Reduce padding for small screens
            fontSize: "10px",
          },
        },
      },
    },
  },
});

<ThemeProvider theme={theme}>
  <Autocomplete
    sx={{
      "& .MuiOutlinedInput-root": {
        display: "flex",
        alignItems: "center", // Ensures text stays centered
      },
    }}
    // {...otherProps}
/>
</ThemeProvider>;

const SearchControl = ({ vessels }) => {
  const map = useMap(); // Ensure the component is inside a MapContainer
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const provider = new OpenStreetMapProvider();

  // Handle user search input
  const handleSearch = async (event, value) => {
    setSearchTerm(value);

    if (!value) {
      setSearchOptions([]);
      return;
    }

    setLoading(true);

    // Filter vessels matching the search term
    const vesselMatches = vessels
      .filter(
        (v) =>
          v.name.toLowerCase().includes(value.toLowerCase()) ||
          v.imo.toString().includes(value)
      )
      .map((v) => ({
        label: `🚢 ${v.name} (IMO: ${v.imo})`,
        lat: v.lat,
        lng: v.lng,
        type: "vessel",
      }));

    // Fetch address results from OpenStreetMap
    const addressResults = await provider.search({ query: value });
    const addressMatches = addressResults.map((addr) => ({
      label: `📍 ${addr.label}`,
      lat: addr.y,
      lng: addr.x,
      type: "address",
    }));

    // Combine results and update state
    setSearchOptions([...vesselMatches, ...addressMatches]);
    setLoading(false);
  };

  // Handle selection and zoom to location
  const handleSelect = (event, value) => {
    if (!value) return;

    map.setView([value.lat, value.lng], 10);
    setSearchTerm(""); // Clear input after selection
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "300px",
        backgroundColor: "transparent",
        borderRadius: "8px",
        padding: "0px",
        paddingBottom: "0px !important",
        boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.3)",
      }}
    >
        <ThemeProvider theme={theme}>
      <Autocomplete
        options={searchOptions}
        getOptionLabel={(option) => option.label}
        inputValue={searchTerm}
        onInputChange={handleSearch}
        onChange={handleSelect}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Vessels or Address"
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: loading ? <CircularProgress size={20} /> : null,
            }}
          />
        )}
      />
      </ThemeProvider>
    </div>
  );
};

SearchControl.propTypes = {
  vessels: PropTypes.array.isRequired,
};

export default SearchControl;

