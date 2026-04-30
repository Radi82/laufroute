/************************************************************
 * 🧠 GLOBAL STATE
 ************************************************************/
let runHistory = [];
let runStartTime = null;

let isRunning = false;
let runPoints = [];
let runLine = null;
let watchId = null;

let runDistance = 0;
let lastPoint = null;

let points = [];
let markers = [];
let routeLine = null;

const apiUrl = "/api/route";


/************************************************************
 * 🔐 AUTH / USER
 ************************************************************/
async function getUserId() {
    const { data } = await supabaseClient.auth.getUser();
    return data.user?.id || null;
}

async function checkUser() {
    const { data } = await supabaseClient.auth.getUser();

    document.getElementById("userInfo").innerText =
        data.user ? "👤 " + data.user.email : "Not logged in";
}

async function login() {
    await supabaseClient.auth.signInWithOAuth({
        provider: "google"
    });
}

async function logout() {
    await supabaseClient.auth.signOut();
    document.getElementById("userInfo").innerText = "Not logged in";
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    document.getElementById("userInfo").innerText =
        session?.user ? "👤 " + session.user.email : "Not logged in";

    loadRunHistory();
});


/************************************************************
 * 🧾 RUN HISTORY (USER BASED)
 ************************************************************/
async function loadRunHistory() {
    const userId = await getUserId();
    if (!userId) return;

    runHistory = JSON.parse(
        localStorage.getItem("runHistory_" + userId)
    ) || [];

    renderRunHistory();
}

async function saveRunHistory() {
    const userId = await getUserId();
    if (!userId) return;

    localStorage.setItem(
        "runHistory_" + userId,
        JSON.stringify(runHistory)
    );
}


/************************************************************
 * 🏃 RUN CONTROL
 ************************************************************/
function toggleRun() {
    isRunning ? stopRun() : startRun();
}

function startRun() {
    isRunning = true;
    runStartTime = Date.now();
    runPoints = [];
    runDistance = 0;
    lastPoint = null;

    document.getElementById("runBtn").innerText = "⏹ STOP RUN";
    document.getElementById("runStatus").innerText = "RUNNING";

    watchId = navigator.geolocation.watchPosition(onRunUpdate, onGPSError, {
        enableHighAccuracy: true,
        maximumAge: 1000
    });
}

async function stopRun() {
    isRunning = false;

    if (!runStartTime) return;

    document.getElementById("runBtn").innerText = "▶ START RUN";
    document.getElementById("runStatus").innerText = "STOPPED";

    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    const runData = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        distance: runDistance,
        duration: Math.floor((Date.now() - runStartTime) / 1000),
        points: runPoints
    };

    runHistory.push(runData);
    await saveRunHistory();
    renderRunHistory();

    lastPoint = null;
}


/************************************************************
 * 📡 RUN UPDATE
 ************************************************************/
function onRunUpdate(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const point = [lat, lng];

    runPoints.push(point);

    if (lastPoint) {
        runDistance += getDistance(lastPoint, point);
    }

    lastPoint = point;

    drawRunLine();

    document.getElementById("distance").innerText =
        "Run: " + runDistance.toFixed(2) + " km";
}

function onGPSError(err) {
    console.error("GPS ERROR:", err);
    alert("GPS Fehler beim Run Tracking");
}


/************************************************************
 * 📏 DISTANZ (HAVERSINE)
 ************************************************************/
function getDistance(a, b) {
    const R = 6371;

    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;

    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 *
        Math.cos(lat1) * Math.cos(lat2);

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}


/************************************************************
 * 📍 RUN DRAW
 ************************************************************/
function drawRunLine() {
    if (runLine) map.removeLayer(runLine);

    runLine = L.polyline(runPoints, {
        color: "#ff4444",
        weight: 4
    }).addTo(map);
}


/************************************************************
 * 🗺️ MAP
 ************************************************************/
const map = L.map("map").setView([48.137, 11.575], 13);

L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom: 19 }
).addTo(map);


/************************************************************
 * 📍 MAP CLICK ROUTE
 ************************************************************/
map.on("click", (e) => {
    const point = [e.latlng.lat, e.latlng.lng];

    points.push(point);

    markers.push(
        L.circleMarker(point, {
            radius: 6,
            color: "#00ff66",
            fillColor: "#00ff66",
            fillOpacity: 0.6
        }).addTo(map)
    );

    if (points.length > 1) drawRoute();
});


/************************************************************
 * 🧭 ROUTING
 ************************************************************/
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

        if (!data.routes?.length) throw new Error("Keine Route");

        const route = data.routes[0];

        const coords = decodePolyline(route.geometry);
        const distance = route.summary.distance / 1000;

        if (routeLine) map.removeLayer(routeLine);

        routeLine = L.polyline(coords, {
            color: "#00ff66"
        }).addTo(map);

        document.getElementById("distance").innerText =
            "Distanz: " + distance.toFixed(2) + " km";

        map.fitBounds(routeLine.getBounds(), { padding: [20, 20] });

    } catch (err) {
        console.error(err);
        alert("Routing Fehler");
    }
}


/************************************************************
 * 📡 POLYLINE DECODE
 ************************************************************/
function decodePolyline(str, precision = 5) {
    let index = 0, lat = 0, lng = 0, coords = [];
    const factor = 10 ** precision;

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
 * 📋 HISTORY UI
 ************************************************************/
function renderRunHistory() {
    const container = document.getElementById("historyList");
    container.innerHTML = "";

    runHistory.slice().reverse().forEach(run => {
        const div = document.createElement("div");

        div.innerHTML = `
            📅 ${new Date(run.date).toLocaleString()}<br>
            🏃 ${run.distance.toFixed(2)} km<br>
            ⏱ ${Math.floor(run.duration / 60)} min
        `;

        div.onclick = () => loadRun(run.id);

        container.appendChild(div);
    });
}

function loadRun(id) {
    const run = runHistory.find(r => r.id === id);
    if (!run) return;

    if (routeLine) map.removeLayer(routeLine);

    routeLine = L.polyline(run.points, {
        color: "#ff4444"
    }).addTo(map);

    map.fitBounds(routeLine.getBounds());
}


/************************************************************
 * 🚀 INIT
 ************************************************************/
checkUser();
loadRunHistory();