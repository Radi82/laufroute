/************************************************************
 * 🔐 AUTH MODULE
 *
 * Zuständig für:
 * - Login
 * - Logout
 * - User anzeigen
 * - Auth-State beobachten
 * - Nach Login Runs + Routen laden
 ************************************************************/

import { on, emit } from "./eventBus.js";
import { log, warn, error } from "./logger.js";
/************************************************************
 * 🚀 INIT AUTH
 * Registriert Login/Logout Events und Supabase Auth Listener
 ************************************************************/
export function initAuth() {
    log("🔐 AUTH MODULE READY");

    // UI Events
    on("auth:login", login);
    on("auth:logout", logout);

    // Supabase Session Listener
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user || null;

        updateUserInfo(user);
        emit("auth:changed", user);

        // Nach erfolgreichem Login Daten laden
        if (user) {
            emit("storage:load"); // Runs laden
            emit("routes:load");  // Routen laden
        }
    });
}

/************************************************************
 * 👤 CHECK USER
 * Prüft beim App-Start, ob bereits ein User eingeloggt ist
 ************************************************************/
export async function checkUser() {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error) {
        error("AUTH CHECK ERROR:", error);
        updateUserInfo(null);
        return null;
    }

    const user = data.user || null;

    updateUserInfo(user);
    emit("auth:changed", user);

    // Wenn Session existiert, direkt Routen laden
    if (user) {
        emit("storage:load");
        emit("routes:load");
    }

    return user;
}

/************************************************************
 * 👤 GET CURRENT USER
 * Kann von anderen Modulen genutzt werden, falls nötig
 ************************************************************/
export async function getCurrentUser() {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error) {
        error("GET USER ERROR:", error);
        return null;
    }

    return data.user || null;
}

/************************************************************
 * 🔐 LOGIN
 * Startet Google OAuth Login
 ************************************************************/
async function login() {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: "google"
    });

    if (error) {
        error("LOGIN ERROR:", error);
        showToast("Login fehlgeschlagen", "error");
    }
}

/************************************************************
 * 🚪 LOGOUT
 * Meldet User ab und leert UI-Listen
 ************************************************************/
async function logout() {
    const { error } = await window.supabaseClient.auth.signOut();

    if (error) {
        error("LOGOUT ERROR:", error);
        showToast("Logout fehlgeschlagen", "error");
        return;
    }

    updateUserInfo(null);

    // UI nach Logout leeren
    emit("history:loaded", []);
    emit("routes:loaded", []);
}

/************************************************************
 * 🧾 USER INFO UI
 * Zeigt eingeloggten User oben in der Toolbar
 ************************************************************/
function updateUserInfo(user) {
    const el = document.getElementById("userInfo");

    if (!el) return;

    el.innerText = user ? `👤 ${user.email}` : "Not logged in";
}