import { toggleRun } from "./run.js";
import { login, logout } from "./auth.js";

export function initUI() {

    document.getElementById("runBtn").addEventListener("click", toggleRun);

    document.getElementById("loginBtn").addEventListener("click", login);
    document.getElementById("logoutBtn").addEventListener("click", logout);
}