import React from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';  // ← добавлен импорт
import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

// Вставь сюда свой Client ID из Google Cloud
const GOOGLE_CLIENT_ID = "505415978328-qhvr63qvtimbj8cmmh24r344t2411fjd.apps.googleusercontent.com";

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HelmetProvider>          {/* ← обёртка HelmetProvider */}
        <App />
      </HelmetProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);