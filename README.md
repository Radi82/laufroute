⚠️ Disclaimer

Kein Tracking, keine Werbung, keine versteckten Daten, Kostenlos!.
Dieses Projekt ist ein persönliches DIY-Tool.
### Alles noch Work in Progress :p ###


# 🏃‍♂️ Laufroute Web App

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Tech](https://img.shields.io/badge/stack-VanillaJS%20%7C%20Leaflet%20%7C%20Supabase-blue)
![Mobile](https://img.shields.io/badge/mobile-optimized-00ff66)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> Plane deine Laufstrecken, tracke deine Runs und exportiere alles als GPX oder JSON.  
> Minimalistisch. Schnell. Ohne unnötigen Ballast.

---

## 🎬 Demo

![App Demo](./assets/demo.gif)

👉 Live: https://laufroutev12.vercel.app/

---

## ✨ Features

### 🗺️ Routen planen
- Klick auf Karte → automatische Streckenberechnung
- Live Distanzanzeige
- Undo / Reset

### 📍 Routen speichern
- Supabase (pro User)
- Laden / Umbenennen / Löschen
- Dropdown-Routenpanel

### 📤 Export
- aktuelle Route
- gespeicherte Route
- GPX und JSON
- kompatibel mit Garmin & Co

### 🏃 Run Tracking
- GPS Tracking im Browser
- Distanzberechnung (Haversine)
- Speicherung deiner Runs

### 📜 Run History
- Übersicht aller Runs
- Klick → Route anzeigen
- Löschen einzelner Runs

### 🔐 Auth
- Google Login (Supabase)
- User-spezifische Daten

### 📱 Mobile UX
- große Buttons
- Map im Fokus
- Capacitor-Setup für Android vorbereitet

---

## 🧠 Tech Stack

- **Frontend:** Vanilla JS (ES Modules)
- **Map:** Leaflet.js
- **Backend:** Supabase
- **Routing Proxy:** Vercel Function
- **Hosting:** Vercel
- **Android:** Capacitor

---

## 🧱 Projektstruktur

```text
/js
  app.js        → App Bootstrap
  map.js        → Karte & Routing
  run.js        → GPS Tracking
  ui.js         → UI & Events
  storage.js    → DB (Supabase)
  auth.js       → Login System
  eventBus.js   → Event Architektur
  utils.js      → Helper Funktionen
  toast.js      → Notifications
  logger.js     → Debug System
  platform.js   → Web/Android Runtime Helpers

/api
  route.js      → Vercel Proxy für OpenRouteService

/scripts
  prepare-capacitor-web.cjs → kopiert Web-Dateien nach www/
```

---

## 📱 Android App mit Capacitor

Das Repo ist für eine echte Android-App mit Capacitor vorbereitet.

```bash
npm install
npm run build
npm run cap:add:android
npm run cap:open:android
```

Nach Web-Code-Änderungen:

```bash
npm run cap:sync:android
```

Mehr Details: [docs/android-capacitor.md](./docs/android-capacitor.md)

Wichtig für Supabase Auth:

```text
com.radi82.laufroute://auth/callback
```

muss in Supabase als Redirect URL erlaubt werden. Der native Android Deep-Link wird im nächsten Schritt im generierten `android/`-Projekt ergänzt.

---

## 🚀 Installation & Setup

<details>
<summary>🔧 Komplettes Setup anzeigen</summary>

### 🧱 1. Repository klonen & starten

```bash
git clone https://github.com/Radi82/laufroute.git
cd laufroute
npx live-server
```

---

### 🗄️ 2. Supabase Tabellen erstellen

```sql
create table runs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  distance float,
  duration int,
  points jsonb,
  created_at timestamp default now()
);

create table routes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  name text,
  distance float,
  points jsonb,
  created_at timestamp default now()
);
```

---

### 🔐 3. Permissions setzen

```sql
GRANT SELECT, INSERT, DELETE, UPDATE ON public.runs TO authenticated;
GRANT SELECT, INSERT, DELETE, UPDATE ON public.routes TO authenticated;
```

---

### 🔗 4. Supabase verbinden (`supabase.js`)

```js
const supabaseUrl = "https://DEIN-PROJEKT.supabase.co";
const supabaseKey = "DEIN-ANON-KEY";

window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
```

---

### 🌍 5. Vercel Deploy

1. https://vercel.com öffnen
2. "Add New Project"
3. GitHub Repo auswählen
4. Deploy klicken

---

### ⚠️ 6. Supabase URL setzen

Site URL:

```text
https://deine-app.vercel.app
```

</details>


🍻 Credits

Built with sweat, caffeine & questionable decisions.
