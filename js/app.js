/************************************************************
 * 🚀 APP ENTRY POINT
 * Startet alle Module in sauberer Reihenfolge.
 ************************************************************/
import { showToast } from "./toast.js";
import { initMap } from "./map.js";
import { initAuth, checkUser } from "./auth.js";
import { initStorage, loadRunHistory } from "./storage.js";
import { initRun } from "./run.js";
import { initUI } from "./ui.js";
import { log, error } from "./logger.js";

log("🚀 APP BOOT");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        log("⚙️ DOM READY");

        initMap();
        initAuth();
        initStorage();
        initRun();
        initUI();

        await checkUser();
        await loadRunHistory();

        log("✅ SYSTEM READY");
    } catch (err) {
        error("🔥 APP INIT FAILED:", err);
        showToast("App konnte nicht gestartet werden. Console prüfen.", "error");
    }
});