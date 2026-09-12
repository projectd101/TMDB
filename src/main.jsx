import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Dodo Payments has no client-side SDK to initialize — checkout is a
// redirect to a hosted page (checkout_url returned by the create-checkout
// edge function), and Dodo sends the browser back to our own homepage
// (/?checkout=complete&payment_id=...) afterwards. See App.jsx /
// AdvertiserForm.jsx.

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
