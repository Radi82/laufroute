/************************************************************
 * AUTH MODULE
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
import { getAuthRedirectUrl } from "./platform.js";

export function initAuth() {
    log("AUTH MODULE READY");

    on("auth:login", login);
    on("auth:logout", logout);

    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user || null;

        updateUserInfo(user);
        emit("auth:changed", user);

        if (user) {
            emit("storage:load");
            emit("routes:load");
        }
    });
}

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

    if (user) {
        emit("storage:load");
        emit("routes:load");
    }

    return user;
}

export async function getCurrentUser() {
    const { data, error: userError } =
        await window.supabaseClient.auth.getUser();

    if (userError) {
        logError("GET USER ERROR:", userError);
        return null;
    }

    return data.user || null;
}

async function login() {
    const { error: loginError } =
        await window.supabaseClient.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: getAuthRedirectUrl()
            }
        });

    if (loginError) {
        logError("LOGIN ERROR:", loginError);
        showToast("Login fehlgeschlagen", "error");
    }
}

async function logout() {
    const { error: logoutError } =
        await window.supabaseClient.auth.signOut();

    if (logoutError) {
        logError("LOGOUT ERROR:", logoutError);
        showToast("Logout fehlgeschlagen", "error");
        return;
    }

    updateUserInfo(null);
    emit("history:loaded", []);
    emit("routes:loaded", []);

    showToast("Logout erfolgreich");
}

function updateUserInfo(user) {
    const el = document.getElementById("userInfo");

    if (!el) return;

    el.innerText = user ? `👤 ${user.email}` : "Not logged in";
}
