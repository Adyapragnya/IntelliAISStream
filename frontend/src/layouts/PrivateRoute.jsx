// src/routes/PrivateRoute.jsx
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";

  return isLoggedIn ? children : <Navigate to="/auth/sign-in" />;
};

export default PrivateRoute;
