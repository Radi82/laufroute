/************************************************************
 * 🏃 RUN MODULE
 * Zuständig für:
 * - Start / Stop
 * - GPS Tracking
 * - Distanzberechnung
 * - Events an Map + Storage
 ************************************************************/

import { on, emit } from "./eventBus.js";
import { getDistanceKm } from "./utils.js";
import { log, warn, error } from "./logger.js";

let isRunning = false;
let watchId = null;

let runPoints = [];
let startTime = null;
let distance = 0;
let lastPoint = null;

export function initRun() {
    log("🏃 RUN MODULE READY");

    on("run:toggle", toggleRun);
}

function toggleRun() {
    if (isRunning) {
        stopRun();
    } else {
        startRun();
    }
}

function startRun() {
    if (!navigator.geolocation) {
        showToast("GPS wird nicht unterstützt", "error");
        return;
    }

    isRunning = true;
    runPoints = [];
    distance = 0;
    lastPoint = null;
    startTime = Date.now();

    emit("run:state", {
        state: "running"
    });

    watchId = navigator.geolocation.watchPosition(
        onPositionUpdate,
        onPositionError,
        {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
        }
    );
}

async function stopRun() {
    isRunning = false;

    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    emit("run:state", {
        state: "stopped"
    });

    if (runPoints.length < 2) {
        warn("Run nicht gespeichert: zu wenige Punkte");
        return;
    }

    const runData = {
        distance,
        duration: Math.floor((Date.now() - startTime) / 1000),
        points: runPoints
    };

    emit("run:finished", runData);
}

function onPositionUpdate(pos) {
    const point = [
        pos.coords.latitude,
        pos.coords.longitude
    ];

    runPoints.push(point);

    if (lastPoint) {
        distance += getDistanceKm(lastPoint, point);
    }

    lastPoint = point;

    emit("run:update", {
        points: runPoints,
        distance
    });
}

function onPositionError(err) {
    error("RUN GPS ERROR:", err);
    alert("GPS Fehler beim Run Tracking: " + err.message);
}