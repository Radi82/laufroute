console.log("📡 EVENT BUS READY");

/************************************************************
 * 📡 SIMPLE PUB/SUB EVENT BUS
 ************************************************************/
const events = {};

export function on(event, callback) {
    if (!events[event]) events[event] = [];
    events[event].push(callback);
}

export function emit(event, data) {
    if (!events[event]) return;

    events[event].forEach(cb => cb(data));
}