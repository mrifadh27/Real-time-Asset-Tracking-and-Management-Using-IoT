# NexTrack Live - Real-time Asset Tracking Dashboard

Realtime IoT dashboard for **ESP32 + SIM808 + MPU6050** using **Vite + React + TypeScript + Tailwind + Leaflet/OpenStreetMap** and **Firebase Realtime Database**.

## ✅ Current behavior

- Reads only real data from Firebase (`/assets` path).
- No mock, demo, or generated fallback telemetry.
- Live map markers, asset cards, alerts, and analytics update from the realtime stream.
- Connection status is visible in the navbar and sidebar.

## ⚙️ Run the project

```bash
npm install
npm run dev
```

Then open the URL shown by Vite (typically `http://localhost:5173`).

## 🔌 Firebase setup

1. Copy `.env.example` to `.env`.
2. Keep the Firebase values for your project.
3. Restart `npm run dev`.

If variables are missing, the app now shows a clear configuration error instead of fake data.

## 🏗️ Build

```bash
npm run build
npm run preview
```
