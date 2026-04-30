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

function exportRoute() {
    const blob = new Blob([JSON.stringify(routePoints)], {
        type: "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "route.json";
    a.click();
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
        alert("Geolocation nicht unterstützt");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            map.setView([lat, lng], 15);

            if (locationMarker) {
                map.removeLayer(locationMarker);
            }

            locationMarker = L.circleMarker([lat, lng], {
                radius: 8,
                color: "#00ff66",
                fillColor: "#00ff66",
                fillOpacity: 0.8
            }).addTo(map)
                .bindPopup("Du bist hier")
                .openPopup();
        },
        (err) => {
            console.error("GPS ERROR:", err);
            alert("Standort konnte nicht geladen werden: " + err.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
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