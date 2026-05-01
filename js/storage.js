/************************************************************
 * 💾 STORAGE MODULE
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

/************************************************************
 * 📦 STATE
 ************************************************************/
let runHistory = [];

/************************************************************
 * 🚀 INIT STORAGE
 * Registriert alle Storage-relevanten Events
 ************************************************************/
export function initStorage() {
    log("💾 STORAGE MODULE READY");

    // Runs
    on("run:finished", saveRunToDB);
    on("storage:load", loadRunHistory);
    on("history:delete", deleteRun);

    // Routes
    on("routes:load", loadRoutesFromDB);
    on("route:delete", deleteRouteFromDB);
    on("route:rename", ({ id, name }) => renameRouteInDB(id, name));
}

/************************************************************
 * 🏃 LOAD RUN HISTORY
 * Lädt alle Runs des eingeloggten Users aus Supabase
 ************************************************************/
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
        .order("created_at", { ascending: false });

    if (loadError) {
        logError("LOAD HISTORY ERROR:", loadError);
        emit("history:loaded", []);
        return [];
    }

    runHistory = data || [];

    // UI informieren
    emit("history:loaded", runHistory);

    return runHistory;
}

/************************************************************
 * 💾 SAVE RUN
 * Speichert einen abgeschlossenen Run in Supabase
 ************************************************************/
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

    // Nach dem Speichern History neu laden
    await loadRunHistory();
}

/************************************************************
 * 🗑️ DELETE RUN
 * Löscht einen Run des eingeloggten Users
 ************************************************************/
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

/************************************************************
 * 📍 SAVE ROUTE
 * Speichert eine geplante Route in Supabase
 *
 * routeData erwartet:
 * {
 *   name: string,
 *   points: [[lat, lng], ...],
 *   distance: number
 * }
 ************************************************************/
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

/************************************************************
 * 📥 LOAD ROUTES
 * Lädt alle gespeicherten Routen des Users
 ************************************************************/
export async function loadRoutesFromDB() {
    const user = await getUser();

    if (!user) {
        emit("routes:loaded", []);
        return [];
    }

    const { data, error: loadError } = await window.supabaseClient
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });

    if (loadError) {
        logError("LOAD ROUTES ERROR:", loadError);
        emit("routes:loaded", []);
        return [];
    }

    emit("routes:loaded", data || []);

    return data || [];
}

/************************************************************
 * 🔗 LOAD SINGLE ROUTE BY ID
 * Lädt eine einzelne Route aus Supabase
 ************************************************************/
export async function loadRouteById(routeId) {
    if (!routeId) return null;

    const { data, error: loadError } = await window.supabaseClient
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .single();

    if (loadError) {
        logError("LOAD ROUTE BY ID ERROR:", loadError);
        showToast("Geteilte Route konnte nicht geladen werden", "error");
        return null;
    }

    emit("route:loadSaved", data);
    return data;
}

/************************************************************
 * 🗑️ DELETE ROUTE
 * Löscht eine gespeicherte Route
 ************************************************************/
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

/************************************************************
 * ✏️ RENAME ROUTE
 * Ändert den Namen einer gespeicherten Route
 ************************************************************/
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

/************************************************************
 * 👤 GET USER
 * Holt den aktuell eingeloggten User.
 *
 * Wichtig:
 * - Kein Login ist KEIN echter Fehler
 * - AuthSessionMissingError wird deshalb still behandelt
 ************************************************************/
async function getUser() {
    const { data, error: userError } =
        await window.supabaseClient.auth.getUser();

    if (userError) {
        // Supabase meldet das, wenn niemand eingeloggt ist.
        // Das ist für unsere App normal und kein Crash-Grund.
        if (userError.name === "AuthSessionMissingError") {
            return null;
        }

        logError("GET USER ERROR:", userError);
        return null;
    }

    return data.user || null;
}