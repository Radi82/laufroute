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
import { error as logError, log } from "./logger.js";
import { showToast } from "./toast.js";

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
    const { data, error: authError } =
        await window.supabaseClient.auth.getUser();

    if (authError) {
        logError("AUTH CHECK ERROR:", authError);
        updateUserInfo(null);
        return null;
    }

    const user = data.user || null;

    updateUserInfo(user);
    emit("auth:changed", user);

    // Wenn Session existiert, direkt Daten laden
    if (user) {
        emit("storage:load");
        emit("routes:load");
    }

    return user;
}

/************************************************************
 * 👤 GET CURRENT USER
 * Kann von anderen Modulen genutzt werden
 ************************************************************/
export async function getCurrentUser() {
    const { data, error: userError } =
        await window.supabaseClient.auth.getUser();

    if (userError) {
        logError("GET USER ERROR:", userError);
        return null;
    }

    return data.user || null;
}

/************************************************************
 * 🔐 LOGIN
 * Startet Google OAuth Login
 ************************************************************/
async function login() {
    const { error: loginError } =
        await window.supabaseClient.auth.signInWithOAuth({
            provider: "google"
        });

    if (loginError) {
        logError("LOGIN ERROR:", loginError);
        showToast("Login fehlgeschlagen", "error");
    }
}

/************************************************************
 * 🚪 LOGOUT
 * Meldet User ab und leert UI-Listen
 ************************************************************/
async function logout() {
    const { error: logoutError } =
        await window.supabaseClient.auth.signOut();

    if (logoutError) {
        logError("LOGOUT ERROR:", logoutError);
        showToast("Logout fehlgeschlagen", "error");
        return;
    }

    updateUserInfo(null);

    // UI nach Logout leeren
    emit("history:loaded", []);
    emit("routes:loaded", []);

    showToast("Logout erfolgreich");
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