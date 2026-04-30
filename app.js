/************************************************************
 * 🧾 RUN HISTORY STORAGE
 * Läufe werden im Browser gespeichert (LocalStorage)
 ************************************************************/

// Alle gespeicherten Runs laden (oder leeres Array)
let runHistory = JSON.parse(localStorage.getItem("runHistory")) || [];

// Startzeit des aktuellen Runs
let runStartTime = null;


/************************************************************
 * 🏃‍♂️ START / STOP RUN MODE (LIVE TRACKING) 
 ************************************************************/
let isRunning = false;
let runPoints = [];
let runLine = null;
let watchId = null;

let runDistance = 0;
let lastPoint = null;

/************************************************************
 * 🧠 3. RUN TOGGLE LOGIK
 ************************************************************/
function toggleRun() {
    if (!isRunning) {
        startRun();
    } else {
        stopRun();
    }
}


/************************************************************
 * 🏃‍♂️ 4. START RUN 🟢 START RUN → Startzeit setzen
 ************************************************************/
function startRun() {
    isRunning = true;
    runStartTime = Date.now();
    runPoints = [];
    runDistance = 0;
    lastPoint = null;

    document.getElementById("runBtn").innerText = "⏹ STOP RUN";
    document.getElementById("runStatus").innerText = "RUNNING";

    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            const point = [lat, lng];

            runPoints.push(point);

            // Marker optional (nur debug)
            L.circleMarker(point, {
                radius: 5,
                color: "#ff4444",
                fillColor: "#ff4444",
                fillOpacity: 0.8
            }).addTo(map);

            // Distanz berechnen
            if (lastPoint) {
                runDistance += getDistance(lastPoint, point);
            }

            lastPoint = point;

            // Linie zeichnen
            drawRunLine();

            document.getElementById("distance").innerText =
                "Run: " + runDistance.toFixed(2) + " km";
        },
        (err) => {
            console.error("GPS ERROR:", err);
            alert("GPS Fehler beim Run Tracking");
        },
        {
            enableHighAccuracy: true,
            maximumAge: 1000
        }
    );
}


/************************************************************
 * 🧮 5. DISTANZ FUNKTION (Haversine)
 ************************************************************/
function getDistance(a, b) {
    const R = 6371;

    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;

    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;

    const x =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLng/2) * Math.sin(dLng/2) *
        Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));

    return R * c;
}

/************************************************************
 * 📍 6. RUN LINE DRAWING
 ************************************************************/
function drawRunLine() {
    if (runLine) map.removeLayer(runLine);

    runLine = L.polyline(runPoints, {
        color: "#ff4444",
        weight: 4,
        opacity: 0.9
    }).addTo(map);
}

/************************************************************
 * 🛑 3. STOP RUN → SPEICHERN
 ************************************************************/
function stopRun() {
    isRunning = false;

    document.getElementById("runBtn").innerText = "▶ START RUN";
    document.getElementById("runStatus").innerText = "STOPPED";

    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    lastPoint = null;
}
/************************************************************
 * 💾 RUN SPEICHERN (BEIM STOP)
 ************************************************************/

// Run Objekt erstellen
const runData = {
    id: Date.now().toString(),                 // eindeutige ID
    date: new Date().toISOString(),            // Zeitstempel
    distance: runDistance,                     // km
    duration: Math.floor((Date.now() - runStartTime) / 1000), // Sekunden
    points: runPoints                          // GPS Punkte
};

// Run zur History hinzufügen
runHistory.push(runData);

// Im Browser speichern
localStorage.setItem("runHistory", JSON.stringify(runHistory));

// UI aktualisieren
renderRunHistory();

/************************************************************
 * 🗺️ MAP INITIALISIERUNG
 ************************************************************/
const map = L.map('map').setView([48.137, 11.575], 13);

// Dark Tile Layer (Tactical Style)
const baseLayer = L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap & CARTO'
  }
).addTo(map);


/************************************************************
 * 📦 GLOBAL STATE (WICHTIG: alle Daten hier zentral)
 ************************************************************/
let points = [];
let markers = [];
let routeLine = null;

const apiUrl = "/api/route";


/************************************************************
 * 📍 MAP CLICK → PUNKT SETZEN
 ************************************************************/
map.on('click', (e) => {
    const point = [e.latlng.lat, e.latlng.lng];

    points.push(point);

    // Marker setzen
    const marker = L.circleMarker(point, {
        radius: 6,
        color: "#00ff66",
        fillColor: "#00ff66",
        fillOpacity: 0.6
    }).addTo(map);

    markers.push(marker);

    // Route nur berechnen wenn genug Punkte
    if (points.length > 1) drawRoute();
});


/************************************************************
 * 🧭 ROUTE BERECHNEN (VIA VERCEL API)
 ************************************************************/
async function drawRoute() {
    try {
        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                coordinates: points.map(p => [p[1], p[0]]) // lng, lat
            })
        });

        const data = await res.json();

        console.log("ROUTE RESPONSE:", data);

        // ❌ Fehlercheck
        if (!data.routes || !data.routes.length) {
            console.log("BAD RESPONSE:", data);
            throw new Error("Keine Route erhalten");
        }

        const route = data.routes[0];

        // 📏 Koordinaten + Distanz
        const coords = decodePolyline(route.geometry);
        const distance = route.summary.distance / 1000;

        // alte Route entfernen
        if (routeLine) map.removeLayer(routeLine);

        // neue Route zeichnen
        routeLine = L.polyline(coords, {
            color: '#00ff66',
            weight: 3,
            opacity: 0.85
        }).addTo(map);

        // UI Update
        document.getElementById("distance").innerText =
            "Distanz: " + distance.toFixed(2) + " km";

        // Zoom auf Route
        map.fitBounds(routeLine.getBounds(), {
            padding: [20, 20]
        });

    } catch (err) {
        console.error(err);
        alert("Routing Fehler");
    }
}


/************************************************************
 * 📡 POLYLINE DECODE (OpenRouteService Format)
 ************************************************************/
function decodePolyline(str, precision = 5) {
    let index = 0, lat = 0, lng = 0, coords = [];
    const factor = Math.pow(10, precision);

    while (index < str.length) {
        let result = 0, shift = 0, b;

        do {
            b = str.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        result = 0;
        shift = 0;

        do {
            b = str.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        coords.push([lat / factor, lng / factor]);
    }

    return coords;
}


/************************************************************
 * ↩️ UNDO LETZTEN PUNKT
 ************************************************************/
function undoPoint() {
    if (!points.length) return;

    points.pop();

    const m = markers.pop();
    map.removeLayer(m);

    if (points.length > 1) drawRoute();
    else if (routeLine) map.removeLayer(routeLine);
}


/************************************************************
 * 🧹 ROUTE RESET
 ************************************************************/
function clearRoute() {
    points = [];

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (routeLine) map.removeLayer(routeLine);

    document.getElementById("distance").innerText = "Distanz: 0 km";
}


/************************************************************
 * 💾 EXPORT ROUTE (JSON DOWNLOAD)
 ************************************************************/
function exportRoute() {
    const blob = new Blob([JSON.stringify(points)], {
        type: "application/json"
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "route.json";
    a.click();
}


/************************************************************
 * 📥 IMPORT ROUTE (JSON FILE)
 ************************************************************/
function importRoute(event) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!Array.isArray(data)) throw new Error("Invalid format");

            clearRoute();
            points = data;

            points.forEach(p => {
                const marker = L.circleMarker(p, {
                    radius: 6,
                    color: "#00ff66",
                    fillColor: "#00ff66",
                    fillOpacity: 0.6
                }).addTo(map);

                markers.push(marker);
            });

            drawRoute();

        } catch (err) {
            console.error(err);
            alert("Import Fehler");
        }
    };

    reader.readAsText(event.target.files[0]);
}


/************************************************************
 * 📍 GPS: AKTUELLER STANDORT
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

            console.log("GPS OK", pos);

            map.setView([lat, lng], 15);

            L.circleMarker([lat, lng], {
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
        }
    );
}


/************************************************************
 * 🔎 SEARCH (NOMINATIM OSM)
 ************************************************************/
async function searchLocation() {
    const query = document.getElementById("searchInput").value;

    if (!query) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

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
        console.error(err);
        alert("Suchfehler");
    }
}

/************************************************************
 * 📋 RUN HISTORY ANZEIGEN
 * Zeigt alle gespeicherten Läufe in der UI
 ************************************************************/
function renderRunHistory() {
    const container = document.getElementById("historyList");

    // UI leeren
    container.innerHTML = "";

    // Neueste Runs zuerst anzeigen
    runHistory.slice().reverse().forEach(run => {

        const div = document.createElement("div");

        // Styling (kannst du später schöner machen)
        div.style.margin = "8px 0";
        div.style.padding = "8px";
        div.style.border = "1px solid #00ff66";
        div.style.cursor = "pointer";

        // Inhalt anzeigen
        div.innerHTML = `
            📅 ${new Date(run.date).toLocaleString()}<br>
            🏃 ${run.distance.toFixed(2)} km<br>
            ⏱ ${Math.floor(run.duration / 60)} min
        `;

        // Klick → Run laden
        div.onclick = () => loadRun(run.id);

        container.appendChild(div);
    });
}

/************************************************************
 * 📍 RUN LADEN
 * Zeichnet gespeicherten Lauf auf die Karte
 ************************************************************/
function loadRun(id) {

    // Run finden
    const run = runHistory.find(r => r.id === id);
    if (!run) return;

    // Alte Route entfernen
    if (routeLine) map.removeLayer(routeLine);

    // Neue Route zeichnen
    routeLine = L.polyline(run.points, {
        color: "#ff4444",
        weight: 4
    }).addTo(map);

    // Karte auf Route zoomen
    map.fitBounds(routeLine.getBounds(), {
        padding: [20, 20]
    });
}

/************************************************************
 * 🧹 RUN LÖSCHEN
 ************************************************************/
function deleteRun(id) {

    // Run entfernen
    runHistory = runHistory.filter(r => r.id !== id);

    // Speicher aktualisieren
    localStorage.setItem("runHistory", JSON.stringify(runHistory));

    // UI neu rendern
    renderRunHistory();
}

/************************************************************
 * 🚀 APP START
 * Lädt gespeicherte Runs beim Start
 ************************************************************/
renderRunHistory();