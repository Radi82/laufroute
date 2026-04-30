import { initMap } from "./map.js";
import { initRun } from "./run.js";
import { initUI } from "./ui.js";
import { initAuth, checkUser } from "./auth.js";
import { loadRunHistory } from "./storage.js";

console.log("APP START");

document.addEventListener("DOMContentLoaded", async () => {
    initMap();
    initRun();
    initUI();
    initAuth();

    await checkUser();
    await loadRunHistory();
});