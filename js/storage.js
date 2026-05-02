/************************************************************
 * STORAGE MODULE
 *
 * Zuständig für:
 * - Run speichern
 * - Run History laden
 * - Run löschen
 * - Routen speichern
 * - Routen laden
 * - Routen löschen
 * - Routen umbenennen
 * - Events an UI senden
 ************************************************************/

import { on, emit } from "./eventBus.js";
import { log, error as logError } from "./logger.js";
import { showToast } from "./toast.js";

let runHistory = [];

export function initStorage() {
    log("STORAGE MODULE READY");

    on("run:finished", saveRunToDB);
    on("storage:load", loadRunHistory);
    on("history:delete", deleteRun);

    on("routes:load", loadRoutesFromDB);
    on("route:delete", deleteRouteFromDB);
    on("route:rename", ({ id, name }) => renameRouteInDB(id, name));
}

export async function loadRunHistory() {
    const user = await getUser();

    if (!user) {
        runHistory = [];
        emit("history:loaded", runHistory);
        return runHistory;
    }

    const { data, error: loadError } = await window.supabaseClient
        .from("runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (loadError) {
        logError("LOAD HISTORY ERROR:", loadError);
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
        showToast("Bitte einloggen, um Runs zu speichern", "error");
        return;
    }

    const { error: saveError } = await window.supabaseClient
        .from("runs")
        .insert([
            {
                user_id: user.id,
                distance: runData.distance,
                duration: runData.duration,
                points: runData.points
            }
        ]);

    if (saveError) {
        logError("SAVE RUN ERROR:", saveError);
        showToast("Run konnte nicht gespeichert werden", "error");
        return;
    }

    emit("run:saved");
    showToast("Run gespeichert");
    await loadRunHistory();
}

async function deleteRun(runId) {
    const user = await getUser();

    if (!user || !runId) return;

    const { error: deleteError } = await window.supabaseClient
        .from("runs")
        .delete()
        .eq("id", runId)
        .eq("user_id", user.id);

    if (deleteError) {
        logError("DELETE RUN ERROR:", deleteError);
        showToast("Run konnte nicht gelöscht werden", "error");
        return;
    }

    showToast("Run gelöscht");
    await loadRunHistory();
}

export async function saveRouteToDB(routeData) {
    const user = await getUser();

    if (!user) {
        showToast("Bitte einloggen, um Routen zu speichern", "error");
        return;
    }

    const { error: saveError } = await window.supabaseClient
        .from("routes")
        .insert([
            {
                user_id: user.id,
                name: routeData.name || "Meine Route",
                points: routeData.points,
                distance: routeData.distance || 0
            }
        ]);

    if (saveError) {
        logError("SAVE ROUTE ERROR:", saveError);
        showToast("Route konnte nicht gespeichert werden", "error");
        return;
    }

    showToast("Route gespeichert");
    await loadRoutesFromDB();
}

export async function loadRoutesFromDB() {
    const user = await getUser();

    if (!user) {
        emit("routes:loaded", []);
        return [];
    }

    const { data, error: loadError } = await window.supabaseClient
        .from("routes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (loadError) {
        logError("LOAD ROUTES ERROR:", loadError);
        emit("routes:loaded", []);
        return [];
    }

    emit("routes:loaded", data || []);
    return data || [];
}

export async function loadRouteById(routeId) {
    const user = await getUser();

    if (!routeId || !user) return null;

    const { data, error: loadError } = await window.supabaseClient
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .eq("user_id", user.id)
        .single();

    if (loadError) {
        logError("LOAD ROUTE BY ID ERROR:", loadError);
        showToast("Geteilte Route konnte nicht geladen werden", "error");
        return null;
    }

    emit("route:loadSaved", data);
    return data;
}

export async function deleteRouteFromDB(routeId) {
    const user = await getUser();

    if (!user || !routeId) return;

    const { error: deleteError } = await window.supabaseClient
        .from("routes")
        .delete()
        .eq("id", routeId)
        .eq("user_id", user.id);

    if (deleteError) {
        logError("DELETE ROUTE ERROR:", deleteError);
        showToast("Route konnte nicht gelöscht werden", "error");
        return;
    }

    showToast("Route gelöscht");
    await loadRoutesFromDB();
}

export async function renameRouteInDB(routeId, newName) {
    const user = await getUser();

    if (!user || !routeId || !newName) return;

    const { error: renameError } = await window.supabaseClient
        .from("routes")
        .update({
            name: newName
        })
        .eq("id", routeId)
        .eq("user_id", user.id);

    if (renameError) {
        logError("RENAME ROUTE ERROR:", renameError);
        showToast("Route konnte nicht umbenannt werden", "error");
        return;
    }

    showToast("Route umbenannt");
    await loadRoutesFromDB();
}

async function getUser() {
    const { data, error: userError } =
        await window.supabaseClient.auth.getUser();

    if (userError) {
        if (userError.name === "AuthSessionMissingError") {
            return null;
        }

        logError("GET USER ERROR:", userError);
        return null;
    }

    return data.user || null;
}
