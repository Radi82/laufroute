/************************************************************
 * 🧠 GLOBAL STATE
 ************************************************************/
let map;

let points = [];
let markers = [];
let routeLine = null;

let isRunning = false;
let runPoints = [];
let runLine = null;
let watchId = null;

let runStartTime = null;
let runDistance = 0;
let lastPoint = null;

let runHistory = [];

const apiUrl = "/api/route";


/************************************************************
 * 🗺️ MAP INIT
 ************************************************************/
document.addEventListener("DOMContentLoaded", () => {
    console.log("APP INIT OK");

    initMap();
    initUI();
    checkUser();
    loadRunHistory();
});


function initMap() {
    map = L.map("map").setView([48.137, 11.575], 13);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
    ).addTo(map);

    map.on("click", onMapClick);
}


/************************************************************
 * 🎛️ UI BINDINGS
 ************************************************************/
function initUI() {

    document.getElementById("runBtn")?.addEventListener("click", toggleRun);
    document.getElementById("undoBtn")?.addEventListener("click", undoPoint);
    document.getElementById("resetBtn")?.addEventListener("click", clearRoute);
    document.getElementById("exportBtn")?.addEventListener("click", exportRoute);
    document.getElementById("locBtn")?.addEventListener("click", goToMyLocation);
    document.getElementById("searchBtn")?.addEventListener("click", searchLocation);

    document.getElementById("loginBtn")?.addEventListener("click", login);
    document.getElementById("logoutBtn")?.addEventListener("click", logout);

    document.getElementById("importBtn")?.addEventListener("click", () => {
        document.getElementById("fileInput")?.click();
    });
}


/************************************************************
 * 📍 MAP CLICK ROUTE
 ************************************************************/
function onMapClick(e) {

    const point = [e.latlng.lat, e.latlng.lng];
    points.push(point);

    const marker = L.circleMarker(point, {
        radius: 6,
        color: "#00ff66",
        fillColor: "#00ff66",
        fillOpacity: 0.6
    }).addTo(map);

    markers.push(marker);

    if (points.length > 1) drawRoute();
}


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

        if (!data.routes?.length) {
            console.log("BAD RESPONSE:", data);
            throw new Error("Keine Route erhalten");
        }

        const route = data.routes[0];
        const coords = decodePolyline(route.geometry);
        const distance = route.summary.distance / 1000;

        if (routeLine) map.removeLayer(routeLine);

        routeLine = L.polyline(coords, {
            color: "#00ff66",
            weight: 3
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
 * 🏃 RUN SYSTEM
 ************************************************************/
function toggleRun() {
    isRunning ? stopRun() : startRun();
}

function startRun() {

    isRunning = true;
    runPoints = [];
    runDistance = 0;
    lastPoint = null;
    runStartTime = Date.now();

    document.getElementById("runBtn").innerText = "⏹ STOP RUN";
    document.getElementById("runStatus").innerText = "RUNNING";

    watchId = navigator.geolocation.watchPosition(onRunUpdate, onGPSError, {
        enableHighAccuracy: true,
        maximumAge: 1000
    });
}

async function stopRun() {

    isRunning = false;

    document.getElementById("runBtn").innerText = "▶ START RUN";
    document.getElementById("runStatus").innerText = "STOPPED";

    if (watchId) navigator.geolocation.clearWatch(watchId);

    if (runPoints.length < 2) return;

    const runData = {
        distance: runDistance,
        duration: Math.floor((Date.now() - runStartTime) / 1000),
        points: runPoints
    };

    await saveRunToDB(runData);
    await loadRunHistory();
}


/************************************************************
 * 📡 RUN TRACKING
 ************************************************************/
function onRunUpdate(pos) {

    const point = [pos.coords.latitude, pos.coords.longitude];

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
    console.error(err);
    alert("GPS Fehler");
}

function drawRunLine() {

    if (runLine) map.removeLayer(runLine);

    runLine = L.polyline(runPoints, {
        color: "#ff4444",
        weight: 4
    }).addTo(map);
}


/************************************************************
 * 📏 DISTANCE
 ************************************************************/
function getDistance(a, b) {

    const R = 6371;

    const dLat = (b[0] - a[0]) * Math.PI / 180;
    const dLng = (b[1] - a[1]) * Math.PI / 180;

    const lat1 = a[0] * Math.PI / 180;
    const lat2 = b[0] * Math.PI / 180;

    const x =
        Math.sin(dLat/2) ** 2 +
        Math.sin(dLng/2) ** 2 *
        Math.cos(lat1) * Math.cos(lat2);

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}


/************************************************************
 * 💾 SUPABASE SAVE
 ************************************************************/
async function saveRunToDB(runData) {

    const user = await supabaseClient.auth.getUser();
    if (!user.data.user) return;

    const { error } = await supabaseClient
        .from("runs")
        .insert([{
            user_id: user.data.user.id,
            distance: runData.distance,
            duration: runData.duration,
            points: runData.points
        }]);

    if (error) console.error(error);
}


/************************************************************
 * 📥 LOAD HISTORY
 ************************************************************/
async function loadRunHistory() {

    const user = await supabaseClient.auth.getUser();
    if (!user.data.user) return;

    const { data, error } = await supabaseClient
        .from("runs")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return console.error(error);

    runHistory = data || [];
    renderRunHistory();
}


/************************************************************
 * 📜 HISTORY UI
 ************************************************************/
function renderRunHistory() {

    const container = document.getElementById("historyList");
    container.innerHTML = "";

    runHistory.forEach(run => {

        const div = document.createElement("div");

        div.innerHTML = `
            📅 ${new Date(run.created_at).toLocaleString()}<br>
            🏃 ${run.distance.toFixed(2)} km<br>
            ⏱ ${Math.floor(run.duration / 60)} min
        `;

        div.onclick = () => loadRun(run);

        container.appendChild(div);
    });
}

function loadRun(run) {

    if (routeLine) map.removeLayer(routeLine);

    routeLine = L.polyline(run.points, {
        color: "#ff4444",
        weight: 4
    }).addTo(map);

    map.fitBounds(routeLine.getBounds());
}


/************************************************************
 * 🧭 UTILS
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