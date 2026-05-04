import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// FIXED: Guard against double-mount which causes "Cannot read properties of
// null (reading 'useEffect')" — happens when React renders before the root
// element exists, or when HMR re-runs this module without a clean teardown.
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "[MuseWave] Root element #root not found. Check that index.html contains <div id=\"root\"></div>."
  );
}

// In development, Vite's HMR can cause createRoot to be called on an already-
// used container. We store the root on the DOM node itself to reuse it.
let root = (rootElement as any).__reactRoot;

if (!root) {
  root = createRoot(rootElement);
  (rootElement as any).__reactRoot = root;
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);