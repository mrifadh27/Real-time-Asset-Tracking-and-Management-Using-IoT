# VECTOR — Vehicle Embedded Communication Tracking, Optimization & Reporting System
### Group-AR | 10 Members | NSBM Green University | IoT Project

---

## 📁 Project Structure

```
VECTOR_COMPLETE/
├── VECTOR_WebApp/              ← Web Dashboard (Vite + Leaflet + Firebase)
│   ├── public/
│   │   ├── index.html
│   │   └── assets/
│   ├── src/
│   │   ├── main.js             ← App boot, Firebase listeners, event bus
│   │   ├── config/firebase.js  ← Firebase credentials (edit this)
│   │   ├── modules/
│   │   │   ├── alerts.js       ★ Fixed: online alert + timestamps
│   │   │   ├── devices.js      ★ Fixed: first-connect + offline bugs
│   │   │   ├── geofence.js     ★ Fixed: entry detection + formatDistance
│   │   │   ├── analytics.js    ← Chart.js charts
│   │   │   ├── map.js          ← Leaflet map + search
│   │   │   ├── playback.js     ← Route playback
│   │   │   ├── route.js        ← OSRM navigation
│   │   │   └── search.js       ← Nominatim geocoding
│   │   ├── ui/
│   │   │   ├── pages.js        ★ Fixed: alert toolbar buttons
│   │   │   ├── panel.js        ★ Fixed: smart distance/time/HDOP display
│   │   │   ├── settings.js     ← Settings load/save
│   │   │   ├── sidebar.js      ← Device list
│   │   │   └── topbar.js       ← Connection status
│   │   ├── styles/styles.css   ★ Fixed: alert toolbar CSS
│   │   └── utils/
│   │       ├── helpers.js      ★ Fixed: relativeTime (hrs) + formatDistance
│   │       ├── state.js        ★ Fixed: knownDevices Set added
│   │       ├── events.js
│   │       └── toast.js
│   ├── package.json
│   └── vite.config.js
│
└── Arduino_Firmware/
    └── NexTrack_v4/
        └── NexTrack_v4.ino     ★ Fixed: GPS accuracy, MPU6050 calibration,
                                          SBAS/WAAS, power notes corrected
```

---

## ⚡ Quick Start — Web Dashboard

```bash
cd VECTOR_WebApp
npm install
npm run dev          # → http://localhost:3000
```

**Only file you need to edit:** `src/config/firebase.js` — add your Firebase credentials.

---

## 🔧 Quick Start — Arduino Firmware

### ✅ Actual Hardware Used (Issue 5 — README corrected)

| Component | Model | How Powered |
|-----------|-------|-------------|
| Microcontroller | ESP32 Dev Module | USB from laptop |
| GPS + optional GSM | SIM808 | ESP32 **5V pin** (VBUS from USB) |
| IMU | MPU-6050 | ESP32 **3.3V pin** |

> **No external battery. No 12V supply. No LM7805 regulator.**
> The SIM808 is used for GPS only — no SIM card required, no GSM active.
> GPS-only current draw is ~50 mA, well within USB budget.

> **⚠️ If you see random resets:** Add a **470 µF capacitor** across SIM808 VCC–GND
> to buffer any current spikes during GPS cold start.

### Wiring (corrected)

```
SIM808 TX   →  ESP32 GPIO16  (RX2)
SIM808 RX   →  ESP32 GPIO17  (TX2)
SIM808 VCC  →  ESP32 5V pin  (VBUS — from USB)
SIM808 GND  →  ESP32 GND
SIM808 PWRKEY → ESP32 GPIO4  (optional, for auto power-on)

MPU6050 SDA →  ESP32 GPIO21
MPU6050 SCL →  ESP32 GPIO22
MPU6050 VCC →  ESP32 3.3V pin
MPU6050 GND →  ESP32 GND
```

### Arduino IDE Setup

1. Install **ESP32** board package (Boards Manager):
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. Install via Library Manager:
   - `MPU6050` by Electronic Cats (or Jeff Rowberg)
   - `ArduinoJson` by Benoit Blanchon v6.x
   - `Wire`, `WiFi`, `WiFiClientSecure`, `SPIFFS` — **all built-in** to ESP32 core, no install needed
3. Board: **ESP32 Dev Module**
4. Upload Speed: **921600**

### Configuration (edit top of .ino)

```cpp
#define WIFI_SSID       "YourWiFiName"
#define WIFI_PASSWORD   "YourPassword"
#define FIREBASE_HOST   "your-project-default-rtdb.region.firebasedatabase.app"
#define DEVICE_ID       "vector_01"     // unique per device
#define DEVICE_NAME     "Asset 01"      // shown in dashboard
```

---

## 🔥 Firebase Setup

1. Go to https://console.firebase.google.com → Create project → Enable **Realtime Database**
2. Set Database Rules (development):
   ```json
   { "rules": { ".read": true, ".write": true } }
   ```
3. Edit `src/config/firebase.js`:
   ```js
   const FB_CONFIG = {
     apiKey:      "your-api-key",
     authDomain:  "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.region.firebasedatabase.app/",
     projectId:   "your-project-id",
   };
   ```

---

## 🐛 All Bugs Fixed

### Issue 1 — Online Alert Not Shown on First Connect
**Root cause:** `prevStatus` defaulted to `'online'`, so the online-alert check
(which only runs when transitioning from offline→online) never ran on first packet.

**Fix:** `prevStatus` starts as `undefined`. A new `S.knownDevices` Set tracks first-ever
appearances. First packet → "Device connected" alert. Subsequent reconnects → "Back online" alert.

### Bug 1 — Online Alert Disappears After Showing
**Root cause:** `_clearOfflineAlerts()` missed `S.firebaseAlerts`. Next `mergeAndRender()`
pulled the offline alert back, burying the online alert.

**Fix:** All three stores purged: `S.firebaseAlerts`, `S.localAlerts`, `S.alerts`.

### Bug 2 — Geofence "Inside Zone" Alert Never Fires After Offline
**Root cause:** `S.geofenceExitTracker[id]` was left as `false` (inside) when device went offline.
On reconnect, `checkGeofence` saw `false` and silently skipped.

**Fix:** Offline timer now does `delete S.geofenceExitTracker[id]` → `undefined` forces
fresh evaluation on first reconnect packet.

### Bug 3 — Geofence Skipped on First Reconnect Packet
**Root cause:** `checkGeofence()` gated on `gpsValid` firmware flag, which stays `false`
for seconds after reconnect even with valid coordinates.

**Fix:** Gate changed to `isValidGPS()` (coordinate range check) — immediate.

---

## ✅ Issues Fixed in This Version

### Issue 2 — Location Accuracy (Firmware)
- HDOP threshold tightened from 5.0 → **3.0** (~<8 m accuracy)
- Minimum satellite count enforced: **4**
- **SBAS/WAAS enabled** via PMTK301,2 + PMTK313,1 (2–5× accuracy improvement)
- Static navigation filter disabled (PMTK386,0) — better accuracy at low speed
- **Position jump detection** rejects GPS glitches (>350 km/h implied movement)
- MPU6050: **startup calibration** removes sensor bias (auto, no user action needed)
- MPU6050: LPF improved (0.15→0.20), DLPF set to 42 Hz, ±4g range

### Issue 3 — Time & Distance Formatting
| Before | After |
|--------|-------|
| "90 min ago" | "1 hr 30 min ago" |
| "2.34 km" always | "234 m" if < 1 km, "1.23 km" if ≥ 1 km |
| HDOP: "1.20" (plain) | HDOP: colour-coded + accuracy estimate (e.g. "~3 m") |

### Issue 4 — Button Verification (all confirmed working)
| Button | Location | Status |
|--------|----------|--------|
| 🔍 Fit All | Map controls | ✅ |
| 📐 Set Geofence | Map controls | ✅ |
| ✓ Mark Read | Alert Center | ✅ |
| 🗑 Clear All | Alert Center | ✅ |
| Filter buttons (All/Offline/Geofence/Speed/Crash/Sync) | Alert Center | ✅ |
| ▶ Play/Pause/Rewind/Clear | Route Playback | ✅ |
| ▶ Get Route / ✕ Clear Route | Route panel + map | ✅ |
| 💾 Save Settings | Settings | ✅ |
| 💾 Save Geofences | Settings | ✅ |
| Theme / Trail / Offline / AutoSync toggles | Settings | ✅ |

### Issue 5 — README Hardware Corrections
- Removed incorrect "12V → LM7805 → 5V" power supply description
- Corrected SIM808 power source to "ESP32 5V (VBUS from USB)"
- Added accurate current draw figures
- Added capacitor recommendation for stability
- Corrected library list (Wire/WiFi/SPIFFS are built-in, no install needed)

### Issue 6 — Sensor Accuracy Improvements
See Issue 2 above for GPS. Additionally:
- MPU6050 set to ±4g range (better sensitivity for driving vs ±2g which clips at hard braking)
- DLPF 42 Hz eliminates engine vibration noise
- 300-sample startup calibration removes per-unit manufacturing offset

---

## 📡 LED Status Codes

| Pattern | Meaning |
|---------|---------|
| Very fast (200 ms) | Wi-Fi offline |
| Fast (500 ms) | Waiting for GPS fix |
| Slow (1200 ms) | All systems nominal |
| 2 quick blinks | Firebase upload OK ✅ |
| 6 rapid blinks | Firebase upload failed ❌ |
| 5 rapid blinks | MPU6050 calibration complete ✅ |

---

## 👥 Group-AR — 10 Members

| # | Role |
|---|------|
| 1 | Project Lead & Architecture |
| 2 | Firmware Development |
| 3 | GPS & IMU Integration |
| 4 | Wi-Fi / Firebase Communication |
| 5 | Firebase Database Design |
| 6 | Web Dashboard — Map & Markers |
| 7 | Web Dashboard — Alerts & Geofence |
| 8 | Analytics & Chart.js |
| 9 | Testing & QA |
| 10 | Documentation & Report |

**Lecturer:** Mr. Isuru Sri Bandara | isuru.s@nsbm.ac.lk  
**Institution:** NSBM Green University
