import { initMap } from "./map.js";
import { initRun } from "./run.js";
import { initUI } from "./ui.js";
import { initAuth, checkUser } from "./auth.js";
import { loadRunHistory } from "./storage.js";

console.log("🚀 APP BOOT");

document.addEventListener("DOMContentLoaded", async () => {

    initMap();
    initAuth();
    initRun();
    initUI();

    await checkUser();
    await loadRunHistory();

    console.log("✅ SYSTEM READY");
});