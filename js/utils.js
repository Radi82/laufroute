/************************************************************
 * 🧰 UTILS
 ************************************************************/

export function decodePolyline(str, precision = 5) {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coords = [];
    const factor = 10 ** precision;

    while (index < str.length) {
        let result = 0;
        let shift = 0;
        let b;

        do {
            b = str.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        lat += (result & 1) ? ~(result >> 1) : (result >> 1);

        result = 0;
        shift = 0;

        do {
            b = str.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        lng += (result & 1) ? ~(result >> 1) : (result >> 1);

        coords.push([lat / factor, lng / factor]);
    }

    return coords;
}

export function getDistanceKm(a, b) {
    const R = 6371;

    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);

    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 *
        Math.cos(lat1) *
        Math.cos(lat2);

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;

    return `${min}:${sec.toString().padStart(2, "0")} min`;
}

function toRad(value) {
    return value * Math.PI / 180;
}