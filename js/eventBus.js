/************************************************************
 * 📡 EVENT BUS
 * Kleines Pub/Sub-System für Modul-Kommunikation.
 ************************************************************/

const events = {};

export function on(eventName, callback) {
    if (!events[eventName]) {
        events[eventName] = [];
    }

    events[eventName].push(callback);
}

export function emit(eventName, payload = null) {
    if (!events[eventName]) return;

    events[eventName].forEach(callback => {
        try {
            callback(payload);
        } catch (err) {
            console.error(`Event error in "${eventName}":`, err);
        }
    });
}

console.log("📡 EVENT BUS READY");