import { map } from "./map.js";
import { on } from "./eventBus.js";
import { saveRunToDB } from "./storage.js";

export let isRunning = false;
export let runPoints = [];

let watchId = null;
let startTime = null;
let distance = 0;
let last = null;

export function initRun() {
    console.log("🏃 RUN READY");

    on("run:toggle", toggleRun);
}
export function toggleRun() {
    isRunning ? stopRun() : startRun();
    emit("run:state", isRunning);
}

function startRun() {

    isRunning = true;
    runPoints = [];
    distance = 0;
    last = null;
    startTime = Date.now();

    watchId = navigator.geolocation.watchPosition(update);
}

async function stopRun() {

    isRunning = false;

    if (watchId) navigator.geolocation.clearWatch(watchId);

    if (runPoints.length < 2) return;

    const runData = {
        distance,
        duration: Math.floor((Date.now() - startTime) / 1000),
        points: runPoints
    };

    await saveRunToDB(runData);

    emit("run:finished", runData);
}

function update(pos) {

    const p = [pos.coords.latitude, pos.coords.longitude];

    runPoints.push(p);

    if (last) distance += getDistance(last, p);
    last = p;

    emit("run:update", { points: runPoints, distance });
}

/************************************************************/
function getDistance(a, b) {

    const R = 6371;

    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 *
        Math.cos(a[0] * Math.PI / 180) *
        Math.cos(b[0] * Math.PI / 180);

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}