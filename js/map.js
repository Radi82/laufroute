/************************************************************
 * 🚀 MAP MODULE
 ************************************************************/

export let map;

let baseLayers;
let activeLayerControl;
let currentLayer;

/************************************************************
 * 🗺️ INIT MAP
 ************************************************************/
export function initMap() {

    console.log("🗺️ MAP MODULE READY");

    map = L.map("map").setView([48.137, 11.575], 13);

    const dark = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    );

    const light = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    );

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
    currentLayer = light;
    currentLayer.addTo(map);

    activeLayerControl = L.control.layers(baseLayers).addTo(map);

    console.log("🗺️ MAP READY OK");
}

/************************************************************
 * 🔁 SWITCH BASE LAYER (GLOBAL EXPORT)
 ************************************************************/
export function setBaseLayer(layer) {
    if (!map || !currentLayer) return;

    map.removeLayer(currentLayer);
    currentLayer = layer;
    map.addLayer(layer);
}