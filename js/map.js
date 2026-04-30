/************************************************************
 * 🗺️ MAP MODULE (WITH LAYERS)
 ************************************************************/

let mapInstance = null;

let baseLayers = {};
let activeLayerControl = null;


/************************************************************
 * 🚀 INIT MAP
 ************************************************************/
export function initMap() {

    console.log("🗺️ MAP MODULE READY");

    mapInstance = L.map("map").setView([48.137, 11.575], 13);

    // 🌙 DARK
    const dark = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    );

    // ☀️ LIGHT
    const light = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    );

    // 🛰️ SATELLITE
    const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
    );

    baseLayers = {
        "🌙 Dark": dark,
        "☀️ Light": light,
        "🛰️ Satellite": satellite
    };

    // Default Layer
    dark.addTo(mapInstance);

    // Layer Switch Control
    activeLayerControl = L.control.layers(baseLayers).addTo(mapInstance);

    return mapInstance;
}


/************************************************************
 * 📦 GET MAP
 ************************************************************/
export function getMap() {
    return mapInstance;
}