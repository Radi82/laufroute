⚠️ Disclaimer

Kein Tracking, keine Werbung, keine versteckten Daten, Kostenlos!.
Dieses Projekt ist ein persönliches DIY-Tool.
### Alles noch Work in Progress :p ###


# 🏃‍♂️ Laufroute Web App

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Tech](https://img.shields.io/badge/stack-VanillaJS%20%7C%20Leaflet%20%7C%20Supabase-blue)
![Mobile](https://img.shields.io/badge/mobile-optimized-00ff66)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

> Plane deine Laufstrecken, tracke deine Runs und exportiere alles als GPX.  
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

### 📤 GPX Export
- aktuelle Route
- gespeicherte Route
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
- Bauchtaschen-optimiert 😉
- große Buttons
- Map im Fokus

### 🔔 UX Extras
- Toast Notifications
- Dark Tactical Design
- Clean UI

---

## 🧠 Tech Stack

- **Frontend:** Vanilla JS (ES Modules)
- **Map:** Leaflet.js
- **Backend:** Supabase
- **Hosting:** Vercel

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



## 🚀 Installation & Setup

<details>
<summary>🔧 Komplettes Setup anzeigen</summary>

### 🧱 1. Repository klonen & starten

git clone https://github.com/DEIN-USERNAME/laufroute.git
cd laufroute
npx live-server

---

### 🗄️ 2. Supabase Tabellen erstellen

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

---

### 🔐 3. Permissions setzen

GRANT SELECT, INSERT, DELETE, UPDATE ON public.runs TO authenticated;
GRANT SELECT, INSERT, DELETE, UPDATE ON public.routes TO authenticated;

---

### 🔗 4. Supabase verbinden (supabase.js)

const supabaseUrl = "https://DEIN-PROJEKT.supabase.co";
const supabaseKey = "DEIN-ANON-KEY";

window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

---

### 🌍 5. Vercel Deploy

1. https://vercel.com öffnen
2. "Add New Project"
3. GitHub Repo auswählen
4. Deploy klicken

---

### ⚠️ 6. Supabase URL setzen

Site URL:
https://deine-app.vercel.app

</details>


🍻 Credits

Built with sweat, caffeine & questionable decisions.