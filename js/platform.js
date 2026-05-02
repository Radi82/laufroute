const PRODUCTION_ORIGIN = "https://laufroutev12.vercel.app";
const ANDROID_AUTH_REDIRECT = "com.radi82.laufroute://auth/callback";

export function isNativeApp() {
    return Boolean(window.Capacitor?.isNativePlatform?.()) ||
        window.location.protocol === "capacitor:";
}

export function getRouteApiUrl() {
    return isNativeApp()
        ? `${PRODUCTION_ORIGIN}/api/route`
        : "/api/route";
}

export function getAuthRedirectUrl() {
    return isNativeApp()
        ? ANDROID_AUTH_REDIRECT
        : window.location.origin;
}
