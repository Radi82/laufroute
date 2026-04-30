/************************************************************
 * 🎛️ UI MODULE
 * Zuständig für:
 * - Button Events
 * - History Rendering
 * - Run Status Anzeige
 * - Routen Dropdown Panel
 ************************************************************/

import { on, emit } from "./eventBus.js";
import { formatDuration } from "./utils.js";

/************************************************************
 * 📦 UI STATE
 ************************************************************/
let cachedRoutes = [];

/************************************************************
 * 🚀 INIT UI
 ************************************************************/
export function initUI() {
    console.log("🎛️ UI MODULE READY");

    bindButtons();
    bindFileInput();
    bindSearchEnter();
    bindEventListeners();
}

/************************************************************
 * 🔘 BUTTONS
 ************************************************************/
function bindButtons() {
    bind("runBtn", () => emit("run:toggle"));

    bind("undoBtn", () => emit("route:undo"));
    bind("resetBtn", () => emit("route:reset"));
    bind("exportBtn", () => emit("route:export"));

    bind("locBtn", () => emit("map:locate"));
    bind("searchBtn", () => emit("map:search"));

    bind("loginBtn", () => emit("auth:login"));
    bind("logoutBtn", () => emit("auth:logout"));

    bind("importBtn", () => {
        document.getElementById("fileInput")?.click();
    });

    /********************
     * 📍 ROUTEN PANEL
     ********************/
    bind("routesPanelBtn", toggleRoutesPanel);
    bind("loadSelectedRouteBtn", loadSelectedRoute);
    bind("exportSelectedRouteBtn", exportSelectedRoute);
    bind("renameSelectedRouteBtn", renameSelectedRoute);
    bind("deleteSelectedRouteBtn", deleteSelectedRoute);
}

function bind(id, handler) {
    const el = document.getElementById(id);

    if (!el) {
        console.warn("Missing UI element:", id);
        return;
    }

    el.addEventListener("click", handler);
}

/************************************************************
 * 📂 FILE IMPORT
 ************************************************************/
function bindFileInput() {
    const input = document.getElementById("fileInput");

    if (!input) return;

    input.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        emit("map:importFile", file);

        input.value = "";
    });
}

/************************************************************
 * 🔎 ENTER TO SEARCH
 ************************************************************/
function bindSearchEnter() {
    const input = document.getElementById("searchInput");

    if (!input) return;

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            emit("map:search");
        }
    });
}

/************************************************************
 * 📡 EVENT LISTENERS
 ************************************************************/
function bindEventListeners() {
    on("run:state", updateRunState);
    on("run:saved", showRunSaved);
    on("history:loaded", renderHistory);
    on("routes:loaded", renderRoutesDropdown);
}

/************************************************************
 * 🏃 RUN STATUS
 ************************************************************/
function updateRunState(payload) {
    const btn = document.getElementById("runBtn");
    const status = document.getElementById("runStatus");

    if (!btn || !status) return;

    if (payload.state === "running") {
        btn.innerText = "⏹ STOP RUN";
        status.innerText = "RUNNING";
    }

    if (payload.state === "stopped") {
        btn.innerText = "▶ START RUN";
        status.innerText = "STOPPED";
    }
}

function showRunSaved() {
    const status = document.getElementById("runStatus");
    if (!status) return;

    status.innerText = "SAVED";

    setTimeout(() => {
        status.innerText = "READY";
    }, 1500);
}

/************************************************************
 * 📍 ROUTEN PANEL
 ************************************************************/
function toggleRoutesPanel() {
    const panel = document.getElementById("routesPanel");
    if (!panel) return;

    panel.classList.toggle("hidden");

    // Beim Öffnen frisch laden
    if (!panel.classList.contains("hidden")) {
        emit("routes:load");
    }
}

function renderRoutesDropdown(routes) {
    cachedRoutes = routes || [];

    const select = document.getElementById("routeSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Route auswählen...</option>`;

    if (!cachedRoutes.length) {
        const option = document.createElement("option");
        option.value = "";
        option.innerText = "Keine Routen gespeichert";
        select.appendChild(option);
        return;
    }

    cachedRoutes.forEach(route => {
        const option = document.createElement("option");
        option.value = route.id;
        option.innerText = route.name || "Unbenannte Route";
        select.appendChild(option);
    });
}

function getSelectedRoute() {
    const select = document.getElementById("routeSelect");
    if (!select || !select.value) return null;

    return cachedRoutes.find(route => route.id === select.value) || null;
}

function loadSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        alert("Bitte zuerst eine Route auswählen");
        return;
    }

    emit("route:loadSaved", route);
}

function exportSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        alert("Bitte zuerst eine Route auswählen");
        return;
    }

    emit("route:exportSaved", route);
}

function renameSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        alert("Bitte zuerst eine Route auswählen");
        return;
    }

    const name = prompt("Neuer Routenname:", route.name || "");

    if (!name) return;

    emit("route:rename", {
        id: route.id,
        name
    });
}

function deleteSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        alert("Bitte zuerst eine Route auswählen");
        return;
    }

    if (confirm(`Route "${route.name || "Unbenannte Route"}" wirklich löschen?`)) {
        emit("route:delete", route.id);
    }
}

/************************************************************
 * 📜 RUN HISTORY UI
 ************************************************************/
function renderHistory(runs) {
    const container = document.getElementById("historyList");

    if (!container) return;

    container.innerHTML = "";

    if (!runs.length) {
        container.innerHTML = "<p>Keine Runs gespeichert.</p>";
        return;
    }

    runs.forEach(run => {
        const div = document.createElement("div");
        div.className = "run-item";

        div.innerHTML = `
            <div>
                📅 ${new Date(run.created_at).toLocaleString()}<br>
                🏃 ${Number(run.distance).toFixed(2)} km<br>
                ⏱ ${formatDuration(run.duration || 0)}
            </div>
            <button class="delete-run-btn">Löschen</button>
        `;

        div.addEventListener("click", () => {
            emit("history:select", run);
        });

        const deleteBtn = div.querySelector(".delete-run-btn");

        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            if (confirm("Run wirklich löschen?")) {
                emit("history:delete", run.id);
            }
        });

        container.appendChild(div);
    });
}