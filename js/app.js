/************************************************************
 * APP ENTRY POINT
 * Startet alle Module in sauberer Reihenfolge.
 ************************************************************/
import { showToast } from "./toast.js";
import { initMap } from "./map.js";
import { initAuth, checkUser } from "./auth.js";
import { initStorage, loadRunHistory, loadRouteById } from "./storage.js";
import { initRun } from "./run.js";
import { initUI } from "./ui.js";
import { log, error } from "./logger.js";

log("APP BOOT");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        log("DOM READY");

        initNativeAuthCallbacks();
        initMap();
        initAuth();
        initStorage();
        initRun();
        initUI();

        await checkUser();
        await loadRunHistory();
        await loadSharedRouteFromUrl();

        log("SYSTEM READY");
    } catch (err) {
        error("APP INIT FAILED:", err);
        showToast("App konnte nicht gestartet werden. Console prüfen.", "error");
    }
});

function initNativeAuthCallbacks() {
    const appPlugin = window.Capacitor?.Plugins?.App;

    if (!appPlugin?.addListener) return;

    appPlugin.addListener("appUrlOpen", async ({ url }) => {
        try {
            if (!url?.startsWith("com.radi82.laufroute://auth/callback")) return;

            const parsedUrl = new URL(url);
            const code = parsedUrl.searchParams.get("code");

            if (!code) return;

            const { error: authError } = await window.supabaseClient.auth.exchangeCodeForSession(code);

            if (authError) {
                error("ANDROID AUTH CALLBACK ERROR:", authError);
                showToast("Login konnte nicht abgeschlossen werden", "error");
                return;
            }

            showToast("Login erfolgreich");
        } catch (err) {
            error("ANDROID AUTH CALLBACK FAILED:", err);
            showToast("Login konnte nicht abgeschlossen werden", "error");
        }
    });
}

async function loadSharedRouteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const sharedRouteId = params.get("route");

    if (sharedRouteId) {
        await loadRouteById(sharedRouteId);
    }
}
