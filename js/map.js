/************************************************************
 * 🗺️ MAP MODULE
 *
 * Zuständig für:
 * - Karte initialisieren
 * - Routenpunkte setzen (Klick)
 * - Routing (API)
 * - GPX Export
 * - GPS & Suche
 * - Anzeigen von Run / History
 ************************************************************/

import { on, emit } from "./eventBus.js";
import { decodePolyline } from "./utils.js";
import { saveRouteToDB } from "./storage.js";

export let map;

/************************************************************
 * 📦 STATE
 ************************************************************/
const apiUrl = "/api/route";

let routePoints = [];        // geplante Route Punkte
let routeMarkers = [];       // Marker für Punkte
let plannedRouteLine = null; // geplante Route Linie

let runLine = null;          // Live Run Linie
let historyLine = null;      // History Linie
let locationMarker = null;   // GPS Marker

let baseLayers = {};
let currentBaseLayer = null;

/************************************************************
 * 🚀 INIT
 ************************************************************/
export function initMap() {
    log("🗺️ MAP MODULE READY");

    if (!window.L) throw new Error("Leaflet nicht geladen");

    map = L.map("map").setView([48.137, 11.575], 13);

    setupBaseLayers();
    setupMapEvents();
    setupEventListeners();

    log("🗺️ MAP READY OK");
}

/************************************************************
 * 🧱 BASE LAYERS (Map Styles)
 ************************************************************/
function setupBaseLayers() {

    const light = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19 }
    );

    const dark = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    );

    const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
    );

    baseLayers = {
        "☀️ Normal": light,
        "🌙 Dark": dark,
        "🛰️ Satellite": satellite
    };

    currentBaseLayer = light;
    currentBaseLayer.addTo(map);

    L.control.layers(baseLayers).addTo(map);
}

/************************************************************
 * 🖱️ MAP CLICK → Route bauen
 ************************************************************/
function setupMapEvents() {
    map.on("click", (e) => {
        addRoutePoint([e.latlng.lat, e.latlng.lng]);
    });
}

function addRoutePoint(point) {

    routePoints.push(point);

    const marker = L.circleMarker(point, {
        radius: 6,
        color: "#00ff66",
        fillColor: "#00ff66",
        fillOpacity: 0.75
    }).addTo(map);

    routeMarkers.push(marker);

    if (routePoints.length > 1) {
        drawPlannedRoute();
    }
}

/************************************************************
 * 📡 EVENT SYSTEM
 ************************************************************/
function setupEventListeners() {

    // Route Actions
    on("route:undo", undoRoutePoint);
    on("route:reset", clearRoute);
    on("route:export", exportRoute);
    on("route:save", saveCurrentRoute);
    on("route:loadSaved", loadSavedRoute);
    on("route:exportSaved", exportSavedRoute);

    // Map
    on("map:locate", goToMyLocation);
    on("map:search", searchLocation);
    on("map:importFile", importRouteFile);

    // Run / History Anzeige
    on("run:update", drawLiveRun);
    on("history:select", drawHistoryRun);
}

/************************************************************
 * 🧭 ROUTING (API)
 ************************************************************/
async function drawPlannedRoute() {

    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                coordinates: routePoints.map(p => [p[1], p[0]])
            })
        });

        const data = await res.json();

        if (!data.routes?.length) {
            throw new Error("Keine Route erhalten");
        }

        const route = data.routes[0];
        const coords = decodePolyline(route.geometry);

        if (plannedRouteLine) {
            map.removeLayer(plannedRouteLine);
        }

        plannedRouteLine = L.polyline(coords, {
            color: "#00ff66",
            weight: 4
        }).addTo(map);

        map.fitBounds(plannedRouteLine.getBounds(), {
            padding: [20, 20]
        });

    } catch (err) {
        error("ROUTING ERROR:", err);
    }
}

/************************************************************
 * ↩️ ROUTE ACTIONS
 ************************************************************/
function undoRoutePoint() {

    if (!routePoints.length) return;

    routePoints.pop();

    const m = routeMarkers.pop();
    if (m) map.removeLayer(m);

    if (plannedRouteLine) {
        map.removeLayer(plannedRouteLine);
        plannedRouteLine = null;
    }

    if (routePoints.length > 1) drawPlannedRoute();
}

function clearRoute() {

    routePoints = [];

    routeMarkers.forEach(m => map.removeLayer(m));
    routeMarkers = [];

    if (plannedRouteLine) {
        map.removeLayer(plannedRouteLine);
        plannedRouteLine = null;
    }
}

/************************************************************
 * 💾 ROUTE SPEICHERN
 ************************************************************/
async function saveCurrentRoute() {

    if (!routePoints.length) {
        showToast("Keine Route vorhanden", "error");
        return;
    }

    const name = prompt("Name der Route:", "Meine Route");
    if (!name) return;

    await saveRouteToDB({
        name,
        points: routePoints,
        distance: 0
    });

    emit("routes:load"); // UI neu laden
}

/************************************************************
 * 📍 ROUTE LADEN
 ************************************************************/
function loadSavedRoute(route) {

    if (!route?.points?.length) return;

    clearRoute();

    // alte History / Run Linien entfernen
    if (runLine) {
        map.removeLayer(runLine);
        runLine = null;
    }

    if (historyLine) {
        map.removeLayer(historyLine);
        historyLine = null;
    }

    // 🔥 neue aktive Route zeichnen
    plannedRouteLine = L.polyline(route.points, {
        color: "#00e5ff",   // 🔵 Cyan (anders als grün)
        weight: 5,          // dicker
        opacity: 0.9
    }).addTo(map);

    // 👀 Fokus auf Route
    map.fitBounds(plannedRouteLine.getBounds(), {
        padding: [20, 20]
    });

    log("📍 Active Route geladen:", route.name);
}
/************************************************************
 * 📤 GPX EXPORT
 ************************************************************/
function exportRoute() {

    if (!routePoints.length) {
        showToast("Keine Route vorhanden", "error");
        return;
    }

    const name = prompt("GPX Name:", "laufroute");
    if (!name) return;

    const gpx = generateGPX(routePoints, name);

    const blob = new Blob([gpx], {
        type: "application/gpx+xml"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + ".gpx";
    a.click();
}
/************************************************************
 * 📤 GPX EXPORT AUS GESPEICHERTER ROUTE
 ************************************************************/
function exportSavedRoute(route) {
    if (!route?.points?.length) {
        showToast("Route leer", "error");
        return;
    }

    const routeName = route.name || "laufroute";

    const safeName = routeName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");

    const gpx = generateGPX(route.points, routeName);

    const blob = new Blob([gpx], {
        type: "application/gpx+xml"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName || "laufroute"}.gpx`;
    a.click();

    URL.revokeObjectURL(a.href);

    log("📤 GPX aus gespeicherter Route exportiert:", a.download);
}
/************************************************************
 * 📍 GPS
 ************************************************************/
function goToMyLocation() {

    if (!navigator.geolocation) {
        showToast("Kein GPS verfügbar", "error");
        return;
    }

    navigator.geolocation.getCurrentPosition((pos) => {

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        map.setView([lat, lng], 16);

        if (locationMarker) map.removeLayer(locationMarker);

        locationMarker = L.circleMarker([lat, lng], {
            radius: 8,
            color: "#00ff66"
        }).addTo(map);

    });
}

/************************************************************
 * 🔎 SEARCH
 ************************************************************/
async function searchLocation() {

    const q = document.getElementById("searchInput").value;
    if (!q) return;

    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`
    );

    const data = await res.json();
    if (!data.length) return;

    const p = data[0];

    map.setView([p.lat, p.lon], 14);

    L.marker([p.lat, p.lon])
        .addTo(map)
        .bindPopup(p.display_name)
        .openPopup();
}

/************************************************************
 * 🏃 RUN / HISTORY
 ************************************************************/
function drawLiveRun(data) {

    if (runLine) map.removeLayer(runLine);

    runLine = L.polyline(data.points, {
        color: "#ff4444"
    }).addTo(map);
}

function drawHistoryRun(run) {

    if (!run?.points?.length) return;

    if (historyLine) map.removeLayer(historyLine);

    historyLine = L.polyline(run.points, {
        color: "#ffaa00"
    }).addTo(map);
}

/************************************************************
 * 🧾 GPX HELPER
 ************************************************************/
function generateGPX(points, name) {

    return `<?xml version="1.0"?>
<gpx>
<trk>
<name>${name}</name>
<trkseg>
${points.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join("")}
</trkseg>
</trk>
</gpx>`;
}