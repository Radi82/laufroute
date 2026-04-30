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
        const coords = data.features[0].geometry.coordinates
            .map(c => [c[1], c[0]]);

        const distance = data.features[0].properties.summary.distance / 1000;

        if (routeLine) map.removeLayer(routeLine);

        routeLine = L.polyline(coords, { color: 'blue' }).addTo(map);

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
