import { emit } from "./eventBus.js";

export function initUI() {

    console.log("🎛️ UI READY");

    document.getElementById("runBtn")
        ?.addEventListener("click", () => {
            emit("run:toggle");
        });

    document.getElementById("undoBtn")
        ?.addEventListener("click", () => emit("route:undo"));

    document.getElementById("resetBtn")
        ?.addEventListener("click", () => emit("route:reset"));

    document.getElementById("exportBtn")
        ?.addEventListener("click", () => emit("route:export"));

    document.getElementById("locBtn")
        ?.addEventListener("click", () => emit("map:locate"));

    document.getElementById("searchBtn")
        ?.addEventListener("click", () => emit("map:search"));

    document.getElementById("loginBtn")
        ?.addEventListener("click", () => emit("auth:login"));

    document.getElementById("logoutBtn")
        ?.addEventListener("click", () => emit("auth:logout"));

    document.getElementById("importBtn")
        ?.addEventListener("click", () => {
            document.getElementById("fileInput")?.click();
        });
}