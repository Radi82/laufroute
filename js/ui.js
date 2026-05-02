/************************************************************
 * UI MODULE
 * Zuständig für:
 * - Button Events
 * - History Rendering
 * - Run Status Anzeige
 * - Routen Dropdown Panel
 ************************************************************/
import { showToast } from "./toast.js";
import { on, emit } from "./eventBus.js";
import { formatDuration } from "./utils.js";
import { log, warn } from "./logger.js";

let cachedRoutes = [];

export function initUI() {
    log("UI MODULE READY");

    bindButtons();
    bindFileInput();
    bindSearchEnter();
    bindEventListeners();
}

function bindButtons() {
    bind("runBtn", () => emit("run:toggle"));

    bind("undoBtn", () => emit("route:undo"));
    bind("resetBtn", () => emit("route:reset"));
    bind("exportBtn", () => emit("route:export"));
    bind("saveRouteBtn", () => emit("route:save"));

    bind("locBtn", () => emit("map:locate"));
    bind("searchBtn", () => emit("map:search"));

    bind("loginBtn", () => emit("auth:login"));
    bind("logoutBtn", () => emit("auth:logout"));

    bind("importBtn", () => {
        document.getElementById("fileInput")?.click();
    });

    bind("routesPanelBtn", toggleRoutesPanel);
    bind("loadSelectedRouteBtn", loadSelectedRoute);
    bind("exportSelectedRouteBtn", exportSelectedRoute);
    bind("renameSelectedRouteBtn", renameSelectedRoute);
    bind("deleteSelectedRouteBtn", deleteSelectedRoute);
    bind("shareSelectedRouteBtn", shareSelectedRoute);
}

function bind(id, handler) {
    const el = document.getElementById(id);

    if (!el) {
        warn("Missing UI element:", id);
        return;
    }

    el.addEventListener("click", handler);
}

function bindFileInput() {
    const input = document.getElementById("fileInput");

    if (!input) return;

    input.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        emit("map:importFile", file);
        input.value = "";
    });
}

function bindSearchEnter() {
    const input = document.getElementById("searchInput");

    if (!input) return;

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            emit("map:search");
        }
    });
}

function bindEventListeners() {
    on("run:state", updateRunState);
    on("run:saved", showRunSaved);
    on("history:loaded", renderHistory);
    on("routes:loaded", renderRoutesDropdown);
}

function updateRunState(payload) {
    const btn = document.getElementById("runBtn");
    const status = document.getElementById("runStatus");

    if (!btn || !status) return;

    if (payload.state === "running") {
        btn.innerText = "STOP RUN";
        status.innerText = "RUNNING";
    }

    if (payload.state === "stopped") {
        btn.innerText = "START RUN";
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

function toggleRoutesPanel() {
    const panel = document.getElementById("routesPanel");
    if (!panel) return;

    panel.classList.toggle("hidden");

    if (!panel.classList.contains("hidden")) {
        emit("routes:load");
    }
}

function renderRoutesDropdown(routes) {
    cachedRoutes = routes || [];

    const select = document.getElementById("routeSelect");
    const activeInfo = document.getElementById("activeRouteInfo");

    if (!select) return;

    select.replaceChildren(createRouteOption("", "Route auswählen..."));

    if (activeInfo) {
        activeInfo.innerText = "Keine Route ausgewählt";
    }

    if (!cachedRoutes.length) {
        select.appendChild(createRouteOption("", "Keine Routen gespeichert"));
        return;
    }

    cachedRoutes.forEach(route => {
        select.appendChild(createRouteOption(route.id, route.name || "Unbenannte Route"));
    });

    select.onchange = updateActiveRouteInfo;
}

function createRouteOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.innerText = label;
    return option;
}

function updateActiveRouteInfo() {
    const route = getSelectedRoute();
    const activeInfo = document.getElementById("activeRouteInfo");

    if (!activeInfo) return;

    activeInfo.replaceChildren();

    if (!route) {
        activeInfo.innerText = "Keine Route ausgewählt";
        return;
    }

    const nameLine = document.createElement("div");
    const nameStrong = document.createElement("strong");
    nameStrong.innerText = route.name || "Unbenannte Route";
    nameLine.append("Aktive Auswahl: ", nameStrong);

    const pointsLine = document.createElement("div");
    pointsLine.innerText = `Punkte: ${route.points?.length || 0}`;

    const distanceLine = document.createElement("div");
    const distance = Number(route.distance) || 0;
    distanceLine.innerText = `Distanz: ${distance.toFixed(2)} km`;

    const dateLine = document.createElement("div");
    dateLine.innerText = new Date(route.created_at).toLocaleString();

    activeInfo.append(nameLine, pointsLine, distanceLine, dateLine);
}

function getSelectedRoute() {
    const select = document.getElementById("routeSelect");
    if (!select || !select.value) return null;

    return cachedRoutes.find(route => route.id === select.value) || null;
}

function loadSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        showToast("Bitte zuerst eine Route auswählen", "error");
        return;
    }

    emit("route:loadSaved", route);
}

function exportSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        showToast("Bitte zuerst eine Route auswählen", "error");
        return;
    }

    emit("route:exportSaved", route);
}

function renameSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        showToast("Bitte zuerst eine Route auswählen", "error");
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
        showToast("Bitte zuerst eine Route auswählen", "error");
        return;
    }

    if (confirm(`Route "${route.name || "Unbenannte Route"}" wirklich löschen?`)) {
        emit("route:delete", route.id);
    }
}

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

async function shareSelectedRoute() {
    const route = getSelectedRoute();

    if (!route) {
        showToast("Bitte zuerst eine Route auswählen", "error");
        return;
    }

    const url = `${window.location.origin}${window.location.pathname}?route=${route.id}`;

    try {
        await navigator.clipboard.writeText(url);
        showToast("Link kopiert");
    } catch {
        prompt("Link kopieren:", url);
    }
}
