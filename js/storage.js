/************************************************************
 * 💾 STORAGE MODULE (SUPABASE)
 * Verantwortlich für:
 * - Run speichern
 * - Runs laden
 * - zentrale Datenlogik für History
 ************************************************************/

import { supabaseClient } from "../supabase.js";

let runHistory = [];


/************************************************************
 * 🚀 INIT
 ************************************************************/
export function initStorage() {
    console.log("💾 STORAGE MODULE READY");
}


/************************************************************
 * 👤 USER HELPER
 ************************************************************/
async function getUser() {
    const { data } = await supabaseClient.auth.getUser();
    return data.user || null;
}


/************************************************************
 * 💾 SAVE RUN
 ************************************************************/
export async function saveRunToDB(runData) {

    const user = await getUser();
    if (!user) {
        console.warn("No user logged in → skip save");
        return;
    }

    const { error } = await supabaseClient
        .from("runs")
        .insert([
            {
                user_id: user.id,
                distance: runData.distance,
                duration: runData.duration,
                points: runData.points,
                created_at: new Date().toISOString()
            }
        ]);

    if (error) {
        console.error("SAVE ERROR:", error);
    }
}


/************************************************************
 * 📥 LOAD RUN HISTORY
 ************************************************************/
export async function loadRunHistory() {

    const user = await getUser();
    if (!user) return [];

    const { data, error } = await supabaseClient
        .from("runs")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("LOAD ERROR:", error);
        return [];
    }

    runHistory = data || [];

    return runHistory;
}


/************************************************************
 * 📤 GET LOCAL CACHE
 ************************************************************/
export function getRunHistory() {
    return runHistory;
}


/************************************************************
 * 🧹 DELETE RUN
 ************************************************************/
export async function deleteRun(id) {

    const user = await getUser();
    if (!user) return;

    const { error } = await supabaseClient
        .from("runs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

    if (error) {
        console.error("DELETE ERROR:", error);
    }
}