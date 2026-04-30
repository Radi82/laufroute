console.log("📡 EVENT BUS READY");

/************************************************************
 * 📡 SIMPLE PUB/SUB EVENT BUS
 ************************************************************/
const events = {};

export function on(event, fn) {
    if (!events[event]) events[event] = [];
    events[event].push(fn);
}

export function emit(event, data) {
    (events[event] || []).forEach(fn => fn(data));
}