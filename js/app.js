/************************************************************
 * 🚀 APP ENTRY POINT
 * Startet alle Module in sauberer Reihenfolge.
 ************************************************************/

import { initMap } from "./map.js";
import { initAuth, checkUser } from "./auth.js";
import { initStorage, loadRunHistory } from "./storage.js";
import { initRun } from "./run.js";
import { initUI } from "./ui.js";

console.log("🚀 APP BOOT");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("⚙️ DOM READY");

        initMap();
        initAuth();
        initStorage();
        initRun();
        initUI();

        await checkUser();
        await loadRunHistory();

        console.log("✅ SYSTEM READY");
    } catch (err) {
        console.error("🔥 APP INIT FAILED:", err);
        alert("App konnte nicht gestartet werden. Console prüfen.");
    }
});