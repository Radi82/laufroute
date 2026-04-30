function decodePolyline(str, precision = 5) {
    let index = 0, lat = 0, lng = 0, coordinates = [];
    const factor = Math.pow(10, precision);

    while (index < str.length) {
        let result = 0, shift = 0, b;

        do {
            b = str.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        result = 0;
        shift = 0;

        do {
            b = str.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}

const map = L.map('map').setView([48.137, 11.575], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

let points = [];
let markers = [];
let routeLine = null;

// Vercel Proxy Endpoint
const apiUrl = "/api/route";

map.on('click', (e) => {
    const point = [e.latlng.lat, e.latlng.lng];
    points.push(point);

    markers.push(L.marker(point).addTo(map));

    if (points.length > 1) drawRoute();
});

async function drawRoute() {
    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                coordinates: points.map(p => [p[1], p[0]])
            })
        });

        const data = await res.json();

        console.log("ROUTE RESPONSE:", data);

        if (!data.routes || !data.routes.length) {
            console.log("BAD RESPONSE:", data);
            throw new Error("Keine Route erhalten");
        }

        const route = data.routes[0];

        const coords = decodePolyline(route.geometry).map(c => [c[0], c[1]]);
        const distance = route.summary.distance / 1000;

        if (routeLine) map.removeLayer(routeLine);

        routeLine = L.polyline(coords, {
            color: 'blue',
            weight: 4,
            opacity: 0.8
        }).addTo(map);

        document.getElementById("distance").innerText =
            "Distanz: " + distance.toFixed(2) + " km";

        map.fitBounds(routeLine.getBounds(), {
            padding: [20, 20]
        });

    } catch (err) {
        console.error(err);
        alert("Routing Fehler");
    }
}

function undoPoint() {
    if (!points.length) return;

    points.pop();
    const m = markers.pop();
    map.removeLayer(m);

    if (points.length > 1) drawRoute();
    else if (routeLine) map.removeLayer(routeLine);
}

function clearRoute() {
    points = [];
    markers.forEach(m => m.remove());
    markers = [];

    if (routeLine) map.removeLayer(routeLine);

    document.getElementById("distance").innerText = "Distanz: 0 km";
}

function exportRoute() {
    const blob = new Blob([JSON.stringify(points)], {
        type: "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "route.json";
    a.click();
}

function importRoute(event) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("Invalid");

            clearRoute();
            points = data;

            points.forEach(p => {
                markers.push(L.marker(p).addTo(map));
            });

            drawRoute();

        } catch {
            alert("Import Fehler");
        }
    };

    reader.readAsText(event.target.files[0]);
}
