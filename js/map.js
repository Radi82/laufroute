/************************************************************
 * 🗺️ MAP MODULE
 * Zuständig für:
 * - Leaflet Karte
 * - Klickpunkte
 * - Routing über /api/route
 * - Marker / Linien
 * - Suche / Standort
 ************************************************************/

import { on } from "./eventBus.js";
import { decodePolyline } from "./utils.js";
import { saveRouteToDB } from "./storage.js";

export let map;

const apiUrl = "/api/route";

let routePoints = [];
let routeMarkers = [];
let plannedRouteLine = null;
let runLine = null;
let historyLine = null;
let locationMarker = null;

let baseLayers = {};
let currentBaseLayer = null;

/************************************************************
 * 🚀 INIT MAP
 ************************************************************/
export function initMap() {
    console.log("🗺️ MAP MODULE READY");

    if (!window.L) {
        throw new Error("Leaflet wurde nicht geladen");
    }

    map = L.map("map").setView([48.137, 11.575], 13);

    setupBaseLayers();
    setupMapEvents();
    setupEventListeners();

    console.log("🗺️ MAP READY OK");
}

/************************************************************
 * 🧱 BASE LAYERS
 ************************************************************/
function setupBaseLayers() {
    const dark = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap & CARTO"
        }
    );

    const light = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }
    );

    const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri"
        }
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
 * 🖱️ MAP CLICKS
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
 * 📡 EVENT LISTENERS
 ************************************************************/
function setupEventListeners() {
    on("route:undo", undoRoutePoint);
    on("route:reset", clearRoute);
    on("route:export", exportRoute);
    on("route:save", saveCurrentRoute);
    on("route:loadSaved", loadSavedRoute);

    on("map:locate", goToMyLocation);
    on("map:search", searchLocation);
    on("map:importFile", importRouteFile);

    on("run:update", drawLiveRun);
    on("history:select", drawHistoryRun);
}

/************************************************************
 * 🧭 ROUTING
 ************************************************************/
async function drawPlannedRoute() {
    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                coordinates: routePoints.map(p => [p[1], p[0]])
            })
        });

        const data = await response.json();

        if (!data.routes?.length) {
            console.log("BAD ROUTE RESPONSE:", data);
            throw new Error("Keine Route erhalten");
        }

        const route = data.routes[0];
        const coords = decodePolyline(route.geometry);
        const distance = route.summary.distance / 1000;

        if (plannedRouteLine) {
            map.removeLayer(plannedRouteLine);
        }

        plannedRouteLine = L.polyline(coords, {
            color: "#00ff66",
            weight: 4,
            opacity: 0.9
        }).addTo(map);

        setDistanceText(`Distanz: ${distance.toFixed(2)} km`);

        map.fitBounds(plannedRouteLine.getBounds(), {
            padding: [20, 20]
        });

    } catch (err) {
        console.error("ROUTING ERROR:", err);
        alert("Routing Fehler");
    }
}

/************************************************************
 * ↩️ ROUTE ACTIONS
 ************************************************************/
function undoRoutePoint() {
    if (!routePoints.length) return;

    routePoints.pop();

    const marker = routeMarkers.pop();
    if (marker) {
        map.removeLayer(marker);
    }

    if (plannedRouteLine) {
        map.removeLayer(plannedRouteLine);
        plannedRouteLine = null;
    }

    if (routePoints.length > 1) {
        drawPlannedRoute();
    } else {
        setDistanceText("Distanz: 0 km");
    }
}

function clearRoute() {
    routePoints = [];

    routeMarkers.forEach(marker => map.removeLayer(marker));
    routeMarkers = [];

    if (plannedRouteLine) {
        map.removeLayer(plannedRouteLine);
        plannedRouteLine = null;
    }

    setDistanceText("Distanz: 0 km");
}

/************************************************************
 * 💾 SAVE CURRENT ROUTE
 ************************************************************/
async function saveCurrentRoute() {
    if (!routePoints.length) {
        alert("Keine Route zum Speichern");
        return;
    }

const name = prompt("Name der Route:", "Meine Route");
if (!name) return;

await saveRouteToDB({
    name,
    points: routePoints,
    distance: 0
});

// direkt neu laden
emit("routes:load");
}

/************************************************************
 * 📍 LOAD SAVED ROUTE
 ************************************************************/
function loadSavedRoute(route) {
    if (!route?.points?.length) return;

    // alles sauber resetten
    clearRoute();

    if (runLine) {
        map.removeLayer(runLine);
        runLine = null;
    }

    if (historyLine) {
        map.removeLayer(historyLine);
        historyLine = null;
    }

    route.points.forEach(point => {
        addRoutePoint(point);
    });
}

/************************************************************
 * 📤 GPX EXPORT
 ************************************************************/
function exportRoute() {
    if (!routePoints.length) {
        alert("Keine Route vorhanden");
        return;
    }

    const routeName = prompt("Name für GPX-Datei:", "laufroute");

    if (!routeName) return;

    const safeName = routeName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");

    const gpx = generateGPX(routePoints, routeName);

    const blob = new Blob([gpx], {
        type: "application/gpx+xml"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName || "laufroute"}.gpx`;
    a.click();

    URL.revokeObjectURL(a.href);

    console.log("📤 GPX exportiert:", a.download);
}

function generateGPX(points, name = "Laufroute") {
    const createdAt = new Date().toISOString();

    const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Laufroute App" xmlns="http://www.topografix.com/GPX/1/1">
<metadata>
<name>${escapeXML(name)}</name>
<time>${createdAt}</time>
</metadata>
<trk>
<name>${escapeXML(name)}</name>
<trkseg>`;

    const footer = `</trkseg>
</trk>
</gpx>`;

    const trackPoints = points.map(p => {
        return `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`;
    }).join("\n");

    return header + "\n" + trackPoints + "\n" + footer;
}
function escapeXML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
/************************************************************
 * 📥 IMPORT ROUTE
 ************************************************************/
function importRouteFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!Array.isArray(data)) {
                throw new Error("Ungültiges JSON Format");
            }

            clearRoute();

            data.forEach(point => {
                if (
                    Array.isArray(point) &&
                    typeof point[0] === "number" &&
                    typeof point[1] === "number"
                ) {
                    addRoutePoint(point);
                }
            });

        } catch (err) {
            console.error("IMPORT ERROR:", err);
            alert("Import Fehler");
        }
    };

    reader.readAsText(file);
}

/************************************************************
 * 📍 GPS / SEARCH
 ************************************************************/
function goToMyLocation() {
    if (!navigator.geolocation) {
        alert("Dein Gerät unterstützt kein GPS");
        return;
    }

    console.log("📍 GPS Anfrage gestartet...");

    setDistanceText("📍 Standort wird gesucht...");

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            console.log("✅ GPS OK:", lat, lng);

            map.setView([lat, lng], 16);

            if (locationMarker) {
                map.removeLayer(locationMarker);
            }

            locationMarker = L.circleMarker([lat, lng], {
                radius: 8,
                color: "#00ff66",
                fillColor: "#00ff66",
                fillOpacity: 0.9
            }).addTo(map)
              .bindPopup("📍 Du bist hier")
              .openPopup();

            setDistanceText("📍 Standort gefunden");
        },

        (err) => {
            console.error("❌ GPS ERROR:", err);

            let msg = "";

            switch (err.code) {
                case 1:
                    msg = "🚫 Standort-Zugriff blockiert.\n➡️ Browser erlauben!";
                    break;
                case 2:
                    msg = "📡 Standort nicht verfügbar.\n➡️ WLAN oder GPS aktivieren.";
                    break;
                case 3:
                    msg = "⏱ GPS Timeout.\n➡️ Versuch es nochmal.";
                    break;
                default:
                    msg = "Unbekannter GPS Fehler";
            }

            alert(msg);
            setDistanceText("❌ GPS Fehler");
        },

        {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000
        }
    );
}

async function searchLocation() {
    const input = document.getElementById("searchInput");
    const query = input?.value?.trim();

    if (!query) return;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!data.length) {
            alert("Nichts gefunden");
            return;
        }

        const place = data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        map.setView([lat, lon], 14);

        L.marker([lat, lon])
            .addTo(map)
            .bindPopup(place.display_name)
            .openPopup();

    } catch (err) {
        console.error("SEARCH ERROR:", err);
        alert("Suchfehler");
    }
}

/************************************************************
 * 🏃 LIVE RUN / HISTORY
 ************************************************************/
function drawLiveRun(data) {
    if (runLine) {
        map.removeLayer(runLine);
    }

    runLine = L.polyline(data.points, {
        color: "#ff4444",
        weight: 4
    }).addTo(map);

    setDistanceText(`Run: ${data.distance.toFixed(2)} km`);
}

function drawHistoryRun(run) {
    if (!run?.points?.length) return;

    if (historyLine) {
        map.removeLayer(historyLine);
    }

    historyLine = L.polyline(run.points, {
        color: "#ffaa00",
        weight: 4
    }).addTo(map);

    map.fitBounds(historyLine.getBounds(), {
        padding: [20, 20]
    });
}

/************************************************************
 * 🧾 UI HELPERS
 ************************************************************/
function setDistanceText(text) {
    const el = document.getElementById("distance");
    if (el) el.innerText = text;
}