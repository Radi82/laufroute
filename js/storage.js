import { on } from "./eventBus.js";

export async function loadRunHistory() {
    console.log("📥 history loaded (mock)");
}

export async function saveRunToDB(run) {
    console.log("💾 saved run", run);
}

on("run:finished", saveRunToDB);