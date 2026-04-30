import { emit } from "./eventBus.js";

export function initUI() {

    document.getElementById("runBtn")
        .addEventListener("click", () => {
            emit("run:toggle");
        });
}