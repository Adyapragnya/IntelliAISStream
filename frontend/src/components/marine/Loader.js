import React from "react";
import "./Loader.css"; // Make sure to create this CSS file for styling

const Loader = () => {
  return (
    <div className="container">
      <div className="loader"></div>
      <div className="loader"></div>
      <div className="loader"></div>
    </div>
  );
};

export default Loader;
