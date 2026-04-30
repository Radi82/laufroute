import { emit } from "./eventBus.js";

document.getElementById("runBtn")
    .addEventListener("click", () => {
        emit("run:toggle");
    });