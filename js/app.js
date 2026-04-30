console.log("🚀 APP BOOTING...");

/************************************************************
 * 📦 IMPORT MODULES
 ************************************************************/
import { initMap } from "./map.js";
import { initRun } from "./run.js";
import { initUI } from "./ui.js";
import { initAuth, checkUser } from "./auth.js";
import { loadRunHistory } from "./storage.js";

/************************************************************
 * 🧠 GLOBAL BOOT FLOW
 ************************************************************/
document.addEventListener("DOMContentLoaded", async () => {

    console.log("⚙️ DOM READY – START INIT SEQUENCE");

    // 1️⃣ MAP FIRST (alles hängt daran)
    await bootMap();

    // 2️⃣ AUTH
    await bootAuth();

    // 3️⃣ STORAGE
    await bootStorage();

    // 4️⃣ RUN SYSTEM
    await bootRun();

    // 5️⃣ UI LAST (wichtig!)
    bootUI();

    console.log("✅ APP FULLY INITIALIZED");
});


/************************************************************
 * 🗺️ MAP BOOT
 ************************************************************/
async function bootMap() {
    console.log("🗺️ INIT MAP...");
    initMap();
}


/************************************************************
 * 🔐 AUTH BOOT
 ************************************************************/
async function bootAuth() {
    console.log("🔐 INIT AUTH...");
    initAuth();
    await checkUser();
}


/************************************************************
 * 💾 STORAGE BOOT
 ************************************************************/
async function bootStorage() {
    console.log("💾 LOAD HISTORY...");
    await loadRunHistory();
}


/************************************************************
 * 🏃 RUN BOOT
 ************************************************************/
async function bootRun() {
    console.log("🏃 INIT RUN...");
    initRun();
}


/************************************************************
 * 🎛️ UI BOOT
 ************************************************************/
function bootUI() {
    console.log("🎛️ INIT UI...");
    initUI();
}