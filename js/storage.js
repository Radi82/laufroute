/************************************************************
 * 💾 STORAGE MODULE
 * Zuständig für:
 * - Run speichern
 * - Run History laden
 * - Run löschen
 * - History Events senden
 ************************************************************/

import { on, emit } from "./eventBus.js";

let runHistory = [];

export function initStorage() {
    console.log("💾 STORAGE MODULE READY");

    on("run:finished", saveRunToDB);
    on("storage:load", loadRunHistory);
    on("history:delete", deleteRun);
}

export async function loadRunHistory() {
    const user = await getUser();

    if (!user) {
        runHistory = [];
        emit("history:loaded", runHistory);
        return runHistory;
    }

    const { data, error } = await window.supabaseClient
        .from("runs")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("LOAD HISTORY ERROR:", error);
        emit("history:loaded", []);
        return [];
    }

    runHistory = data || [];
    emit("history:loaded", runHistory);

    return runHistory;
}

async function saveRunToDB(runData) {
    const user = await getUser();

    if (!user) {
        alert("Bitte einloggen, um Runs zu speichern");
        return;
    }

    const { error } = await window.supabaseClient
        .from("runs")
        .insert([
            {
                user_id: user.id,
                distance: runData.distance,
                duration: runData.duration,
                points: runData.points
            }
        ]);

    if (error) {
        console.error("SAVE RUN ERROR:", error);
        alert("Run konnte nicht gespeichert werden");
        return;
    }

    emit("run:saved");
    await loadRunHistory();
}

async function deleteRun(runId) {
    const user = await getUser();

    if (!user || !runId) return;

    const { error } = await window.supabaseClient
        .from("runs")
        .delete()
        .eq("id", runId)
        .eq("user_id", user.id);

    if (error) {
        console.error("DELETE RUN ERROR:", error);
        alert("Run konnte nicht gelöscht werden");
        return;
    }

    await loadRunHistory();
}

async function getUser() {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error) {
        console.error("GET USER ERROR:", error);
        return null;
    }

    return data.user || null;
}