/************************************************************
 * 🗺️ MAP MODULE
 * Verantwortlich für:
 * - Leaflet Init
 * - Karteninstanz bereitstellen
 * - einfache Map-Helpers
 ************************************************************/

let mapInstance = null;


/************************************************************
 * 🚀 INIT MAP
 ************************************************************/
export function initMap() {

    console.log("🗺️ MAP MODULE READY");

    mapInstance = L.map("map").setView([48.137, 11.575], 13);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap & CARTO"
        }
    ).addTo(mapInstance);

    return mapInstance;
}


/************************************************************
 * 📦 GET MAP INSTANCE
 * Wird von anderen Modulen genutzt (run.js etc.)
 ************************************************************/
export function getMap() {
    if (!mapInstance) {
        console.warn("Map not initialized yet!");
    }
    return mapInstance;
}


/************************************************************
 * 📍 CENTER MAP
 ************************************************************/
export function setView(lat, lng, zoom = 15) {
    if (!mapInstance) return;

    mapInstance.setView([lat, lng], zoom);
}


/************************************************************
 * 📏 FIT BOUNDS
 ************************************************************/
export function fitToBounds(layer) {
    if (!mapInstance || !layer) return;

    const bounds = layer.getBounds?.();
    if (bounds) {
        mapInstance.fitBounds(bounds, { padding: [20, 20] });
    }
}