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

/************************************************************
 * 📦 STATE
 ************************************************************/
let runHistory = [];

/************************************************************
 * 🚀 INIT STORAGE
 * Registriert alle Storage-relevanten Events
 ************************************************************/
export function initStorage() {
    console.log("💾 STORAGE MODULE READY");

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
        alert("Bitte einloggen, um Routen zu speichern");
        return;
    }

    const { error } = await window.supabaseClient
        .from("routes")
        .insert([
            {
                user_id: user.id,
                name: routeData.name || "Meine Route",
                points: routeData.points,
                distance: routeData.distance || 0
            }
        ]);

    if (error) {
        console.error("SAVE ROUTE ERROR:", error);
        alert("Route konnte nicht gespeichert werden");
        return;
    }

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

    const { data, error } = await window.supabaseClient
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("LOAD ROUTES ERROR:", error);
        emit("routes:loaded", []);
        return [];
    }

    emit("routes:loaded", data || []);

    return data || [];
}

/************************************************************
 * 🗑️ DELETE ROUTE
 * Löscht eine gespeicherte Route
 ************************************************************/
export async function deleteRouteFromDB(routeId) {
    const user = await getUser();

    if (!user || !routeId) return;

    const { error } = await window.supabaseClient
        .from("routes")
        .delete()
        .eq("id", routeId)
        .eq("user_id", user.id);

    if (error) {
        console.error("DELETE ROUTE ERROR:", error);
        alert("Route konnte nicht gelöscht werden");
        return;
    }

    await loadRoutesFromDB();
}

/************************************************************
 * ✏️ RENAME ROUTE
 * Ändert den Namen einer gespeicherten Route
 ************************************************************/
export async function renameRouteInDB(routeId, newName) {
    const user = await getUser();

    if (!user || !routeId || !newName) return;

    const { error } = await window.supabaseClient
        .from("routes")
        .update({
            name: newName
        })
        .eq("id", routeId)
        .eq("user_id", user.id);

    if (error) {
        console.error("RENAME ROUTE ERROR:", error);
        alert("Route konnte nicht umbenannt werden");
        return;
    }

    await loadRoutesFromDB();
}

/************************************************************
 * 👤 GET CURRENT USER
 * Holt den aktuell eingeloggten Supabase User
 ************************************************************/
async function getUser() {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error) {
        console.error("GET USER ERROR:", error);
        return null;
    }

    return data.user || null;
}