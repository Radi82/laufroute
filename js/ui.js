/************************************************************
 * 🎛️ UI MODULE
 * Zuständig für:
 * - DOM Events (Buttons, Inputs)
 * - Anzeige (Run Status, User, etc.)
 * - Kommunikation mit run/map via Events
 ************************************************************/

import { toggleRun } from "./run.js";
import { getMap } from "./map.js";

/************************************************************
 * 🚀 INIT UI
 ************************************************************/
export function initUI() {

    console.log("🎛️ UI MODULE READY");

    bindEvents();
    bindRunStateListener();
}


/************************************************************
 * 🔗 EVENT BINDINGS (nur UI → Logic)
 ************************************************************/
function bindEvents() {

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) {
            console.warn("Missing UI element:", id);
            return;
        }
        el.addEventListener("click", fn);
    };

    /********************
     * 🏃 RUN CONTROL
     ********************/
    bind("runBtn", toggleRun);

    /********************
     * 🧭 MAP ACTIONS
     ********************/
    bind("undoBtn", () => window.undoPoint?.());
    bind("resetBtn", () => window.clearRoute?.());
    bind("exportBtn", () => window.exportRoute?.());
    bind("locBtn", () => window.goToMyLocation?.());

    /********************
     * 🔎 SEARCH
     ********************/
    bind("searchBtn", () => window.searchLocation?.());

    /********************
     * 🔐 AUTH
     ********************/
    bind("loginBtn", () => window.login?.());
    bind("logoutBtn", () => window.logout?.());

    /********************
     * 📂 IMPORT
     ********************/
    bind("importBtn", () => {
        document.getElementById("fileInput")?.click();
    });
}


/************************************************************
 * 📡 RUN STATE LISTENER
 * Kommt aus run.js via CustomEvent
 ************************************************************/
function bindRunStateListener() {

    document.addEventListener("run:state", (e) => {

        const state = e.detail.state;

        const btn = document.getElementById("runBtn");
        const status = document.getElementById("runStatus");

        if (!btn || !status) return;

        switch (state) {

            case "running":
                btn.innerText = "⏹ STOP RUN";
                status.innerText = "RUNNING";
                break;

            case "stopped":
                btn.innerText = "▶ START RUN";
                status.innerText = "STOPPED";
                break;

            case "saved":
                status.innerText = "SAVED";
                setTimeout(() => {
                    status.innerText = "READY";
                }, 1500);
                break;
        }
    });
}