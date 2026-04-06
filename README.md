# NexTrack v5 — Real-time IoT Asset Tracking Dashboard

> Production-grade refactor of the original single-file dashboard into a fully modular, component-based architecture.

---

## 🚀 Quick Start

```bash
npm install
npm run dev        # dev server → http://localhost:3000
npm run build      # production build → dist/
npm run preview    # preview the production build
```

---

## 📁 Project Structure

```
nextrack/
├── index.html                  # Minimal shell — no inline scripts
├── vite.config.js
├── package.json
└── src/
    ├── main.js                 # Entry point — imports CSS + boots App
    ├── App.js                  # Orchestrator — wires everything together
    │
    ├── styles/
    │   ├── globals.css         # Design tokens, reset, animations
    │   ├── components.css      # Sidebar, Topbar, Toast, shared UI
    │   └── pages.css           # Dashboard, Analytics, Alerts, Settings
    │
    ├── services/               # Pure data / API layer (no DOM)
    │   ├── firebaseService.js  # Firebase init, subscribe, pushRecord
    │   ├── deviceService.js    # Processes raw Firebase data → Device objects
    │   ├── alertService.js     # Alert creation, cooldowns, Firebase writes
    │   ├── geofenceService.js  # Per-device geofence storage & drawing
    │   ├── geocodingService.js # Nominatim search + reverse geocoding
    │   └── routeService.js     # OSRM route fetching + progress tracking
    │
    ├── components/             # UI components (DOM builders)
    │   ├── Sidebar.js          # Navigation, device list, footer
    │   ├── Topbar.js           # Connection status, theme toggle
    │   ├── MapView.js          # Leaflet map, markers, trails, search, geofence draw
    │   └── Charts.js           # All Chart.js instances
    │
    ├── pages/
    │   └── pages.js            # HTML templates for Dashboard/Analytics/Alerts/Settings
    │
    ├── hooks/
    │   └── usePlayback.js      # Route playback controller (encapsulated state)
    │
    └── utils/
        ├── state.js            # Central application state (single source of truth)
        ├── helpers.js          # Pure utilities: haversine, toFloat, debounce, etc.
        └── toast.js            # Toast notification system
```

---

## 🗺️ Key Upgrades

### 1. Project Structure Refactor
| Before | After |
|--------|-------|
| Single 1500-line `index.html` | Modular files under `src/` |
| All logic in `<script>` tags | ES modules with proper imports/exports |
| Global functions (`showPage()`, `toggleTheme()`, etc.) | Methods on `App` class, no leaking globals |
| Mixed CSS, HTML, JS | Separated into `styles/`, `components/`, `pages/` |

### 2. Professional Map Search (MAJOR UPGRADE)
The original basic Nominatim call has been replaced with a full professional search system:

- **Dedicated `geocodingService.js`** with AbortController for request cancellation
- **Autocomplete results** appear as you type (350ms debounce)
- **Two search locations:**
  - **Map search bar** (top-right of map) — fly-to with animated navigation + pinned marker
  - **Route destination search** (right panel) — feeds the OSRM routing system
- **Structured results** — primary name + secondary context on separate lines
- **Loading indicator** while searching
- **"No results" state** handling
- **Click-outside-to-dismiss** behaviour
- **Keyboard support** (Escape to close)
- **Reverse geocoding** utility available via `reverseGeocode(lat, lng)`

### 3. Code Quality
- All `parseFloat()` calls centralised in `toFloat()` (NaN-safe)
- All booleans from Firebase normalised via `toBool()` (handles string `"true"`)
- Speed computed with fallback to haversine when firmware omits it
- GPS jump guard (> 500 m in one update = ignored)
- Alert cooldowns per-device per-type (was a single shared object)
- `debounce()` utility prevents API hammering

### 4. Component Architecture
| Component | Responsibility |
|-----------|---------------|
| `Sidebar`  | Navigation + device list rendering |
| `Topbar`   | Status pill + theme toggle |
| `MapView`  | Leaflet lifecycle, markers, trails, geofence draw, search |
| `Charts`   | All Chart.js instances — init, update, mini-speed |

### 5. Service Layer (Firebase-ready)
```js
// Drop-in Firebase replacement example:
import { subscribe } from './services/firebaseService.js';
subscribe('/assets', snap => { /* ... */ });
```
All Firebase calls are in `firebaseService.js` — swap the backend by changing one file.

### 6. Bug Fixes
| Bug | Fix |
|-----|-----|
| `lat`/`lng` sometimes strings from Firebase | Normalised to `number` at entry via `toFloat()` |
| `parseFloat(null).toFixed()` crash | `toFloat()` returns `0` for any non-finite input |
| Geofence cooldown shared across all devices | Keyed by `deviceId_alertType` |
| Playback speed change didn't restart interval | `pbSpeedChanged()` → clears & restarts timer |
| Map search results escaped quotes breaking onclick | `data-*` attributes + event delegation |
| Trail toggle didn't remove existing trails | `MapView.clearTrails()` called properly |
| Activity chart not updating | Interval set in `App.mount()` |

### 7. Performance
- `Chart.update('none')` (no animation) on live data updates
- `debounce` on all search inputs (350ms)
- Route points capped at 500 per device (FIFO ring buffer)
- Speed history capped at 20 entries per device
- Markers reused (position + icon updated, not recreated)
- AbortController cancels superseded geocoding requests

---

## 🔌 Real-time Data Schema (Firebase)

```
/assets/{deviceId}/
  name:         string
  lat:          number
  lng:          number
  altitude:     number
  speed:        number
  heading:      number
  hdop:         number
  satellites:   number
  accel:        number
  pitch:        number
  roll:         number
  gpsValid:     boolean
  gpsCached:    boolean
  vehicleState: string

/alerts/{alertId}/
  deviceId:   string
  deviceName: string
  type:       "offline" | "geofence" | "speed" | "sync"
  message:    string
  lat:        number
  lng:        number
  timestamp:  number
  read:       boolean

/offline_data/{key}/
  ...device snapshot + { deviceId, ts, offline: true }
```

---

## 🛠️ Tech Stack
- **Vite 5** — dev server + bundler
- **Leaflet 1.9** — map rendering
- **Chart.js 4.4** — data visualisation  
- **Firebase 10 (compat)** — real-time database
- **Nominatim** — geocoding (free, no API key)
- **OSRM** — routing (free, no API key)
- Vanilla JS (ES2022 modules) — no framework overhead

---

## 📟 Hardware (NexTrack_v4.ino)
The original Arduino/ESP32 firmware file is included unchanged.  
It publishes GPS + IMU data to Firebase at `/assets/{deviceId}`.
