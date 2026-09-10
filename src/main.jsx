import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const paddleToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim();

// Paddle must not be initialized without a real client-side token.
// Missing/placeholder payment credentials should never prevent the React app
// itself from rendering.
if (window.Paddle && paddleToken && !paddleToken.startsWith("paste_your_")) {
  const env = import.meta.env.VITE_PADDLE_ENV || "sandbox";
  if (env === "sandbox") {
    window.Paddle.Environment.set("sandbox");
  }
window.Paddle.Initialize({
    token: paddleToken,
    eventCallback: (event) => {
      if (event?.name === "checkout.completed") {
        const transactionId = event?.data?.transaction_id || event?.data?.id;
        // Dispatch a plain browser event so any component (e.g.
        // AdvertiserForm) can react without needing a direct reference
        // to Paddle's internals. Carries the transaction id so the
        // listener can look up the setup token with no email/login step.
        window.dispatchEvent(
          new CustomEvent("pandora:checkout-completed", { detail: { transactionId } })
        );
        // Paddle does not auto-close its overlay — we do it explicitly.
        window.Paddle.Checkout.close();
      }
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
