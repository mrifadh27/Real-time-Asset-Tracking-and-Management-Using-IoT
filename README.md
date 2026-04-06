# NexTrack v6 - Real-time Asset Tracking Dashboard

Production-ready frontend refactor for an IoT asset tracking dashboard using **Vite + React + TypeScript + Tailwind + Leaflet/OpenStreetMap**.

## ✅ What was upgraded

- Clean architecture with dedicated folders:
  - `src/components`
  - `src/pages`
  - `src/services`
  - `src/hooks`
  - `src/utils`
  - `src/styles`
- `index.html` is now minimal (only root mount + module entry).
- Professional map system built on OpenStreetMap with:
  - Autocomplete location search
  - Place suggestions
  - Smooth fly-to navigation
  - Marker placement for selected place
  - Reverse geocoding label
- Firebase-ready service layer (`gpsService`, `firebase.ts`) with fallback to mock data.
- Reusable components (`Navbar`, `Sidebar`, `MapView`, `DeviceList`, `DeviceCard`, `AlertsPanel`).
- Strong typing and modular ES imports/exports.

## 🧱 Project Structure

```bash
src/
  components/
  hooks/
  pages/
  services/
  styles/
  types/
  utils/
```

## ⚙️ Run the project now

```bash
npm install
npm run dev
```

Then open the URL shown by Vite (typically `http://localhost:5173`).

## 🔌 Firebase setup (optional)

1. Copy `.env.example` to `.env`.
2. Fill your Firebase config variables.
3. Restart `npm run dev`.

If Firebase config is missing, the dashboard runs with realistic mock telemetry so the UI is fully usable.

## 🏗️ Build for production

```bash
npm run build
npm run preview
```
