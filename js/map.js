/************************************************************
 * MAP MODULE
 *
 * Zuständig für:
 * - Karte initialisieren
 * - Routenpunkte setzen (Klick)
 * - Routing (API)
 * - JSON / GPX Export
 * - GPS & Suche
 * - Anzeigen von Run / History
 ************************************************************/
import { showToast } from "./toast.js";
import { on, emit } from "./eventBus.js";
import { decodePolyline, getDistanceKm } from "./utils.js";
import { saveRouteToDB } from "./storage.js";
import { log, error } from "./logger.js";
import { getRouteApiUrl } from "./platform.js";

export let map;

const apiUrl = getRouteApiUrl();

let routePoints = [];
let routedRoutePoints = [];
let routeDistance = 0;
let routeMarkers = [];
let plannedRouteLine = null;

let runLine = null;
let historyLine = null;
let locationMarker = null;

let baseLayers = {};
let currentBaseLayer = null;

export function initMap() {
    log("MAP MODULE READY");

    if (!window.L) throw new Error("Leaflet nicht geladen");

    map = L.map("map").setView([48.137, 11.575], 13);

    setupBaseLayers();
    setupMapEvents();
    setupEventListeners();

    log("MAP READY OK");
}

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
        "Normal": light,
        "Dark": dark,
        "Satellite": satellite
    };

    currentBaseLayer = light;
    currentBaseLayer.addTo(map);

    L.control.layers(baseLayers).addTo(map);
}

function setupMapEvents() {
    map.on("click", (e) => {
        addRoutePoint([e.latlng.lat, e.latlng.lng]);
    });
}

function setupEventListeners() {
    on("route:undo", undoRoutePoint);
    on("route:reset", clearRoute);
    on("route:export", exportRoute);
    on("route:save", saveCurrentRoute);
    on("route:loadSaved", loadSavedRoute);
    on("route:exportSaved", exportSavedRoute);

    on("map:locate", goToMyLocation);
    on("map:search", searchLocation);
    on("map:importFile", importRouteFile);

    on("run:update", drawLiveRun);
    on("history:select", drawHistoryRun);
}

function addRoutePoint(point) {
    routePoints.push(point);
    addMarkerOnly(point);

    if (routePoints.length === 1) {
        routedRoutePoints = [point];
        routeDistance = 0;
        setDistanceText("Distanz: 0.00 km");
        return;
    }

    drawPlannedRoute({ fitBounds: false });
}

async function drawPlannedRoute(options = {}) {
    const { fitBounds = false } = options;

    try {
        const route = await fetchRoute(routePoints);
        const coords = decodePolyline(route.geometry);

        routedRoutePoints = coords;
        routeDistance = route.summary?.distance
            ? route.summary.distance / 1000
            : calculateRouteDistance(coords);

        drawRouteLine(coords, "#00ff66");
        setDistanceText(`Distanz: ${routeDistance.toFixed(2)} km`);

        if (fitBounds && plannedRouteLine) {
            fitMapToLine(plannedRouteLine);
        }
    } catch (err) {
        error("ROUTING ERROR:", err);
        showToast("Routing Fehler", "error");
    }
}

async function fetchRoute(points) {
    const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            coordinates: points.map(p => [p[1], p[0]])
        })
    });

    const data = await res.json();

    if (!res.ok || !data.routes?.length) {
        throw new Error(data.error || "Keine Route erhalten");
    }

    return data.routes[0];
}

function drawRouteLine(points, color) {
    if (plannedRouteLine) {
        map.removeLayer(plannedRouteLine);
    }

    plannedRouteLine = L.polyline(points, {
        color,
        weight: 5,
        opacity: 0.9
    }).addTo(map);
}

function addMarkerOnly(point) {
    const marker = L.circleMarker(point, {
        radius: 6,
        color: "#00ff66",
        fillColor: "#00ff66",
        fillOpacity: 0.75
    }).addTo(map);

    routeMarkers.push(marker);
}

function undoRoutePoint() {
    if (!routePoints.length) return;

    routePoints.pop();

    const marker = routeMarkers.pop();
    if (marker) map.removeLayer(marker);

    if (plannedRouteLine) {
        map.removeLayer(plannedRouteLine);
        plannedRouteLine = null;
    }

    routedRoutePoints = [];
    routeDistance = 0;

    if (routePoints.length > 1) {
        drawPlannedRoute({ fitBounds: false });
    } else if (routePoints.length === 1) {
        routedRoutePoints = [...routePoints];
        setDistanceText("Distanz: 0.00 km");
    } else {
        setDistanceText("Distanz: 0 km");
    }
}

function clearRoute() {
    routePoints = [];
    routedRoutePoints = [];
    routeDistance = 0;

    routeMarkers.forEach(marker => map.removeLayer(marker));
    routeMarkers = [];

    if (plannedRouteLine) {
        map.removeLayer(plannedRouteLine);
        plannedRouteLine = null;
    }

    setDistanceText("Distanz: 0 km");
}

async function saveCurrentRoute() {
    if (routePoints.length < 2) {
        showToast("Setze mindestens zwei Marker", "error");
        return;
    }

    if (!routedRoutePoints.length || routeDistance === 0) {
        await drawPlannedRoute({ fitBounds: false });
    }

    const points = getExportPoints();
    const distance = routeDistance || calculateRouteDistance(points);

    if (points.length < 2 || distance === 0) {
        showToast("Route ist noch nicht berechnet", "error");
        return;
    }

    const name = prompt("Name der Route:", "Meine Route");
    if (!name) return;

    await saveRouteToDB({
        name,
        points,
        distance
    });

    emit("routes:load");
}

function loadSavedRoute(route) {
    if (!route?.points?.length) return;

    clearRoute();
    clearRunAndHistoryLines();

    const points = normalizePoints(route.points);
    routedRoutePoints = points;
    routePoints = [];
    routeDistance = Number(route.distance) > 0
        ? Number(route.distance)
        : calculateRouteDistance(points);

    drawRouteLine(points, "#00e5ff");
    setDistanceText(`Distanz: ${routeDistance.toFixed(2)} km`);

    if (plannedRouteLine) fitMapToLine(plannedRouteLine);
    log("Active Route geladen:", route.name);
}

function clearRunAndHistoryLines() {
    if (runLine) {
        map.removeLayer(runLine);
        runLine = null;
    }

    if (historyLine) {
        map.removeLayer(historyLine);
        historyLine = null;
    }
}

function exportRoute() {
    const points = getExportPoints();

    if (points.length < 2) {
        showToast("Keine Route vorhanden", "error");
        return;
    }

    const format = prompt("Export-Format: json oder gpx", "json");
    if (!format) return;

    const name = prompt("Dateiname:", "laufroute");
    if (!name) return;

    if (format.trim().toLowerCase() === "gpx") {
        downloadText(`${safeFileName(name)}.gpx`, generateGPX(points, name), "application/gpx+xml");
        return;
    }

    downloadJSON(name, {
        name,
        distance: routeDistance || calculateRouteDistance(points),
        points,
        control_points: routePoints,
        exported_at: new Date().toISOString()
    });
}

function exportSavedRoute(route) {
    if (!route?.points?.length) {
        showToast("Route leer", "error");
        return;
    }

    const routeName = route.name || "laufroute";
    const format = prompt("Export-Format: json oder gpx", "gpx");
    if (!format) return;

    const points = normalizePoints(route.points);

    if (format.trim().toLowerCase() === "json") {
        downloadJSON(routeName, {
            name: routeName,
            distance: Number(route.distance) || calculateRouteDistance(points),
            points,
            exported_at: new Date().toISOString()
        });
        return;
    }

    downloadText(`${safeFileName(routeName)}.gpx`, generateGPX(points, routeName), "application/gpx+xml");
    log("Route exportiert:", routeName);
}

function importRouteFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            const points = Array.isArray(imported) ? imported : imported.points;
            const controlPoints = Array.isArray(imported.control_points) ? imported.control_points : [];
            const validPoints = normalizePoints(points);

            if (validPoints.length < 2) {
                throw new Error("Ungültiges JSON Format");
            }

            clearRoute();

            routePoints = controlPoints.length ? normalizePoints(controlPoints) : [];
            routePoints.forEach(point => addMarkerOnly(point));

            routedRoutePoints = validPoints;
            routeDistance = Number(imported.distance) || calculateRouteDistance(validPoints);

            drawRouteLine(validPoints, "#00ff66");
            setDistanceText(`Distanz: ${routeDistance.toFixed(2)} km`);
            if (plannedRouteLine) fitMapToLine(plannedRouteLine);
        } catch (err) {
            error("IMPORT ERROR:", err);
            showToast("Import Fehler", "error");
        }
    };

    reader.readAsText(file);
}

function goToMyLocation() {
    if (!navigator.geolocation) {
        showToast("Kein GPS verfügbar", "error");
        return;
    }

    showToast("Standort wird gesucht...");

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            map.setView([lat, lng], 16);

            if (locationMarker) map.removeLayer(locationMarker);

            locationMarker = L.circleMarker([lat, lng], {
                radius: 8,
                color: "#00ff66",
                fillColor: "#00ff66",
                fillOpacity: 0.8
            })
                .addTo(map)
                .bindPopup("Du bist hier")
                .openPopup();

            showToast("Standort gefunden");
        },
        (err) => {
            error("GPS ERROR:", err);

            if (err.code === 1) showToast("Standort-Zugriff blockiert", "error");
            else if (err.code === 2) showToast("Standort nicht verfügbar", "error");
            else if (err.code === 3) showToast("GPS Timeout", "error");
            else showToast("GPS Fehler", "error");
        },
        {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 60000
        }
    );
}

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

    fitMapToLine(historyLine);
}

function getExportPoints() {
    return routedRoutePoints.length ? routedRoutePoints : routePoints;
}

function normalizePoints(points) {
    if (!Array.isArray(points)) return [];

    return points.filter(point =>
        Array.isArray(point) &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1]))
    ).map(point => [Number(point[0]), Number(point[1])]);
}

function calculateRouteDistance(points) {
    let distance = 0;

    for (let i = 1; i < points.length; i++) {
        distance += getDistanceKm(points[i - 1], points[i]);
    }

    return distance;
}

function fitMapToLine(line) {
    map.fitBounds(line.getBounds(), {
        padding: [20, 20]
    });
}

function downloadJSON(name, data) {
    downloadText(
        `${safeFileName(name)}.json`,
        JSON.stringify(data, null, 2),
        "application/json"
    );
}

function downloadText(fileName, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

function safeFileName(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "") || "laufroute";
}

function generateGPX(points, name) {
    return `<?xml version="1.0"?>
<gpx version="1.1" creator="Laufroute App" xmlns="http://www.topografix.com/GPX/1/1">
<trk>
<name>${escapeXML(name)}</name>
<trkseg>
${points.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join("\n")}
</trkseg>
</trk>
</gpx>`;
}

function escapeXML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function setDistanceText(text) {
    const el = document.getElementById("distance");
    if (el) el.innerText = text;
}
