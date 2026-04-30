export let map;

export function initMap() {
    map = L.map("map").setView([48.137, 11.575], 13);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    ).addTo(map);
}