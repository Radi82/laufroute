/************************************************************
 * 🧾 LOGGER MODULE
 * Zentrale Steuerung für Console-Ausgaben
 ************************************************************/

const DEBUG = false; 
// true  = Dev Logs sichtbar
// false = ruhige Production Console

export function log(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

export function warn(...args) {
    if (DEBUG) {
        console.warn(...args);
    }
}

export function error(...args) {
    console.error(...args);
}