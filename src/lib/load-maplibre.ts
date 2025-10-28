"use client";

const MAPLIBRE_SCRIPT_SRC = "https://unpkg.com/maplibre-gl@5.10.0/dist/maplibre-gl.js";
const MAPLIBRE_STYLESHEET_HREF = "https://unpkg.com/maplibre-gl@5.10.0/dist/maplibre-gl.css";

let maplibrePromise: Promise<MapLibreModule | null> | null = null;

export type MapLibreModule = typeof import("maplibre-gl");

declare global {
  interface Window {
    maplibregl?: MapLibreModule;
  }
}

function ensureStylesheet() {
  if (typeof document === "undefined") return;
  if (document.querySelector("link[data-maplibre]") instanceof HTMLLinkElement) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MAPLIBRE_STYLESHEET_HREF;
  link.dataset.maplibre = "true";
  document.head.appendChild(link);
}

export function loadMapLibre(): Promise<MapLibreModule | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (window.maplibregl) {
    ensureStylesheet();
    return Promise.resolve(window.maplibregl);
  }

  if (!maplibrePromise) {
    maplibrePromise = new Promise((resolve, reject) => {
      ensureStylesheet();
      const existingScript = document.querySelector<HTMLScriptElement>("script[data-maplibre]");
      const script = existingScript ?? document.createElement("script");

      if (existingScript && !existingScript.dataset.maplibre) {
        existingScript.dataset.maplibre = "true";
      }

      const handleLoad = () => {
        script.dataset.maplibreLoaded = "true";
        resolve(window.maplibregl ?? null);
      };
      const handleError = () => {
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);
        maplibrePromise = null;
        reject(new Error("Failed to load MapLibre"));
      };

      if (!existingScript) {
        script.src = MAPLIBRE_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.maplibre = "true";
        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", handleError, { once: true });
        document.head.appendChild(script);
      } else if (script.dataset.maplibreLoaded === "true" || script.getAttribute("data-loaded") === "true") {
        resolve(window.maplibregl ?? null);
      } else {
        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", handleError, { once: true });
      }
    });
  }

  return maplibrePromise;
}
