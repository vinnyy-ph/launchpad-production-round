import React from "react";
import ReactDOM from "react-dom/client";
import "@/shared/styles/jia-tokens.css";
import "@/shared/styles/fonts/satoshi.css";
import "./index.css";
import App from "./app/app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
