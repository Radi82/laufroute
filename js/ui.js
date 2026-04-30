import { emit } from "./eventBus.js";

export function initUI() {

    console.log("🎛️ UI READY");

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (!el) return console.warn("Missing:", id);
        el.addEventListener("click", fn);
    };

    bind("runBtn", () => emit("run:toggle"));
    bind("undoBtn", () => emit("route:undo"));
    bind("resetBtn", () => emit("route:reset"));
    bind("exportBtn", () => emit("route:export"));
    bind("locBtn", () => emit("map:locate"));
    bind("searchBtn", () => emit("map:search"));

    bind("loginBtn", () => emit("auth:login"));
    bind("logoutBtn", () => emit("auth:logout"));

    const importBtn = document.getElementById("importBtn");
    const fileInput = document.getElementById("fileInput");

    importBtn?.addEventListener("click", () => fileInput?.click());
}