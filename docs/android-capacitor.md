# Android App mit Capacitor

Diese App ist als Web-App und als Capacitor-Android-App vorbereitet.

## Voraussetzungen

- Node.js und npm
- Android Studio
- Android SDK über Android Studio installiert
- Ein Android Emulator oder echtes Android-Gerät

## Erstes Setup

```bash
npm install
npm run build
npm run cap:add:android
npm run cap:open:android
```

`npm run build` kopiert die statischen Web-Dateien nach `www/`. Capacitor nutzt `www/` als Web-Asset-Ordner.

Capacitor empfiehlt für bestehende Web-Apps genau diesen Ablauf: Web-Build erzeugen, Android-Plattform hinzufügen, danach syncen.

## Nach Web-Code-Änderungen

```bash
npm run cap:sync:android
```

Danach in Android Studio erneut starten.

## Routing API

Im Browser nutzt die App weiter:

```text
/api/route
```

In der Android-App nutzt sie automatisch:

```text
https://laufroutev12.vercel.app/api/route
```

Das ist nötig, weil die Android-App lokal unter Capacitor läuft und keine lokale Vercel Function besitzt.

## Supabase Auth / Google Login

Für die Android-App ist folgender Redirect vorbereitet:

```text
com.radi82.laufroute://auth/callback
```

Diesen Redirect musst du in Supabase unter Auth URL Configuration erlauben.

Nach `npm run cap:add:android` muss im generierten Android-Projekt ein Deep-Link Intent Filter in `android/app/src/main/AndroidManifest.xml` ergänzt werden. Der gehört in die Main Activity:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />

    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />

    <data
        android:scheme="com.radi82.laufroute"
        android:host="auth"
        android:path="/callback" />
</intent-filter>
```

Die Web-App hat den Callback-Code bereits in `js/app.js`. Sobald Android diesen Link an die App weiterleitet, wird der Supabase OAuth Code gegen eine Session getauscht.

## Wichtige Dateien

- `package.json` - npm und Capacitor Scripts
- `capacitor.config.json` - Capacitor App ID, Name und `webDir`
- `scripts/prepare-capacitor-web.cjs` - kopiert Web-Dateien nach `www/`
- `js/platform.js` - erkennt Web vs. Android und setzt API/Auth URLs
- `js/app.js` - verarbeitet Android Auth Callback URLs

## Nächster nativer Schritt

Nachdem `android/` generiert wurde, müssen wir prüfen:

- App Icon
- Splashscreen
- Android Permissions für Standort
- Deep-Link Intent Filter für Supabase OAuth
- Debug Build auf Gerät/Emulator
