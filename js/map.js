import { on } from "./eventBus.js";

export let map;
let runLine;

export function initMap() {

    map = L.map("map").setView([48.137, 11.575], 13);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    ).addTo(map);

    on("run:update", drawRun);
}

function drawRun(data) {

    if (runLine) map.removeLayer(runLine);

    runLine = L.polyline(data.points, {
        color: "#ff4444",
        weight: 4
    }).addTo(map);
}