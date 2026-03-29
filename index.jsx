import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppSettingsProvider } from "./context/AppSettingsContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppSettingsProvider>
      <App />
    </AppSettingsProvider>
  </React.StrictMode>
);