/************************************************************
 * 🎛️ UI MODULE
 * Zuständig für:
 * - Button Events
 * - History Rendering
 * - Run Status Anzeige
 ************************************************************/

import { on, emit } from "./eventBus.js";
import { formatDuration } from "./utils.js";

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
    bind("saveRouteBtn", () => emit("route:save"));
    bind("loadRoutesBtn", () => emit("routes:load"));
    bind("locBtn", () => emit("map:locate"));
    bind("searchBtn", () => emit("map:search"));
    
    bind("loginBtn", () => emit("auth:login"));
    bind("logoutBtn", () => emit("auth:logout"));

    bind("importBtn", () => {
        document.getElementById("fileInput")?.click();
    });
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
    on("routes:loaded", renderRoutes);
}

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
 * 📍 ROUTE LIST UI
 ************************************************************/
function renderRoutes(routes) {
    const container = document.getElementById("routeList");

    if (!container) return;

    container.innerHTML = "";

    if (!routes.length) {
        container.innerHTML = "<p>Keine Routen gespeichert.</p>";
        return;
    }

    routes.forEach(route => {
        const div = document.createElement("div");
        div.className = "route-item";

        div.innerHTML = `
            <div>
                📍 <strong>${route.name || "Unbenannte Route"}</strong><br>
                📅 ${new Date(route.created_at).toLocaleString()}<br>
                🧭 ${route.points?.length || 0} Punkte
            </div>
            <button class="rename-route-btn">Umbenennen</button>
            <button class="delete-route-btn">Löschen</button>
        `;

        div.addEventListener("click", () => {
            emit("route:loadSaved", route);
        });

        div.querySelector(".delete-route-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            emit("route:delete", route.id);
        });

        div.querySelector(".rename-route-btn").addEventListener("click", (e) => {
            e.stopPropagation();

            const name = prompt("Neuer Routenname:", route.name || "");

            if (name) {
                emit("route:rename", {
                    id: route.id,
                    name
                });
            }
        });

        container.appendChild(div);
    });
}

/************************************************************
 * 📜 HISTORY UI
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
            emit("history:delete", run.id);
        });

        container.appendChild(div);
    });
}