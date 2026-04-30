/************************************************************
 * 🔐 AUTH MODULE
 * Zuständig für Login, Logout und User-Anzeige.
 ************************************************************/

import { on, emit } from "./eventBus.js";

export function initAuth() {
    console.log("🔐 AUTH MODULE READY");

    on("auth:login", login);
    on("auth:logout", logout);

    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user || null;

        updateUserInfo(user);
        emit("auth:changed", user);

        if (user) {
            emit("storage:load");
        }
    });
}

export async function checkUser() {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error) {
        console.error("AUTH CHECK ERROR:", error);
        updateUserInfo(null);
        return null;
    }

    const user = data.user || null;
    updateUserInfo(user);
    emit("auth:changed", user);

    return user;
}

export async function getCurrentUser() {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error) {
        console.error("GET USER ERROR:", error);
        return null;
    }

    return data.user || null;
}

async function login() {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: "google"
    });

    if (error) {
        console.error("LOGIN ERROR:", error);
        alert("Login fehlgeschlagen");
    }
}

async function logout() {
    const { error } = await window.supabaseClient.auth.signOut();

    if (error) {
        console.error("LOGOUT ERROR:", error);
        alert("Logout fehlgeschlagen");
        return;
    }

    updateUserInfo(null);
    emit("history:loaded", []);
}

function updateUserInfo(user) {
    const el = document.getElementById("userInfo");
    if (!el) return;

    el.innerText = user ? `👤 ${user.email}` : "Not logged in";
}