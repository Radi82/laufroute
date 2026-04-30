/************************************************************
 * 🏃 RUN MODULE
 * Verantwortlich für:
 * - Live GPS Tracking
 * - Distanzberechnung
 * - Run State Management
 ************************************************************/

import { saveRunToDB } from "./storage.js";
import { getMap } from "./map.js";

/************************************************************
 * 📦 STATE (nur Run-Logik)
 ************************************************************/
export let isRunning = false;
export let runPoints = [];

let watchId = null;
let startTime = null;
let distance = 0;
let lastPoint = null;

let runLine = null;


/************************************************************
 * 🚀 INIT
 ************************************************************/
export function initRun() {
    console.log("🏃 RUN MODULE READY");
}


/************************************************************
 * 🎮 RUN CONTROL API
 ************************************************************/
export function toggleRun() {
    return isRunning ? stopRun() : startRun();
}

export function startRun() {

    isRunning = true;
    runPoints = [];
    distance = 0;
    lastPoint = null;
    startTime = Date.now();

    // GPS Tracking starten
    watchId = navigator.geolocation.watchPosition(
        onUpdate,
        onError,
        { enableHighAccuracy: true, maximumAge: 1000 }
    );

    dispatchState("running");
}

export async function stopRun() {

    isRunning = false;

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    dispatchState("stopped");

    // zu wenig Daten → ignorieren
    if (runPoints.length < 2) return;

    const runData = {
        distance,
        duration: Math.floor((Date.now() - startTime) / 1000),
        points: runPoints,
        created_at: new Date().toISOString()
    };

    await saveRunToDB(runData);

    dispatchState("saved");
}


/************************************************************
 * 📡 GPS UPDATE LOOP
 ************************************************************/
function onUpdate(pos) {

    const point = [
        pos.coords.latitude,
        pos.coords.longitude
    ];

    runPoints.push(point);

    if (lastPoint) {
        distance += getDistance(lastPoint, point);
    }

    lastPoint = point;

    drawRun();
}


/************************************************************
 * 🗺️ DRAW RUN LINE
 ************************************************************/
function drawRun() {

    const map = getMap();
    if (!map) return;

    if (runLine) {
        map.removeLayer(runLine);
    }

    runLine = L.polyline(runPoints, {
        color: "#ff4444",
        weight: 4
    }).addTo(map);
}


/************************************************************
 * 📏 DISTANCE (HAVERSINE)
 ************************************************************/
function getDistance(a, b) {

    const R = 6371; // Earth radius (km)

    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);

    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 *
        Math.cos(lat1) *
        Math.cos(lat2);

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg) {
    return deg * Math.PI / 180;
}


/************************************************************
 * ⚠️ ERROR HANDLING
 ************************************************************/
function onError(err) {
    console.error("GPS ERROR:", err);
}


/************************************************************
 * 📡 EVENT SYSTEM (für UI)
 * Damit UI weiß was passiert ohne DOM coupling
 ************************************************************/
function dispatchState(state) {
    document.dispatchEvent(
        new CustomEvent("run:state", {
            detail: { state }
        })
    );
}