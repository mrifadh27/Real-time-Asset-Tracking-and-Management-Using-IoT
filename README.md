# 🗺️ VECTOR — Real-Time Intelligent Asset Tracking System

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./vite.config.js)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0-brightgreen.svg)](https://nodejs.org)
[![Build Tool](https://img.shields.io/badge/build-Vite-purple.svg)](https://vitejs.dev)

A comprehensive **GPS-based real-time asset tracking platform** combining embedded ESP32 IoT hardware with an interactive web dashboard for live monitoring, analytics, geofencing, and route optimization.

**🎯 Perfect for:** Fleet management, vehicle tracking, asset monitoring, logistics optimization, and real-time location services.

---

## 📑 Quick Navigation

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Hardware Setup](#-hardware-setup)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [Configuration](#-configuration)
- [API & Modules](#-api--modules)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Support & Contributions](#-support--contributions)

---

## 🎯 Overview

**VECTOR** is a **dual-component real-time tracking system** combining:
- **Hardware Layer:** ESP32 microcontroller with SIM808 GPS module and MPU6050 accelerometer
- **Cloud Backend:** Firebase Realtime Database storing device telemetry, geofences, and alerts
- **Web Frontend:** Interactive Vite-based dashboard with Leaflet maps and Chart.js analytics

### System Components

| Component | Description |
|-----------|-------------|
| **🔌 Hardware Layer** | ESP32 + SIM808 GPS (no SIM card required) + MPU6050 IMU transmitting telemetry via Wi-Fi |
| **☁️ Backend Layer** | Firebase Realtime Database (realtime-asset-tracking-e00df, asia-southeast1) |
| **🖥️ Frontend Layer** | Vite dev server + Vanilla JavaScript with Leaflet.js (CDN) and Chart.js (CDN) |

### Why VECTOR?

✅ **Real-Time Tracking** - Live location updates every 5 seconds (configurable)  
✅ **No SIM Required** - GPS works independently without cellular connectivity  
✅ **Offline Queuing** - Automatically stores and syncs data when Wi-Fi reconnects  
✅ **Dual-Core Processing** - ESP32's 240MHz dual-core handles simultaneous telemetry  
✅ **Lightweight Frontend** - Zero framework bloat, pure JavaScript (ES6+)  
✅ **Responsive Design** - Works on desktop, tablet, and mobile browsers  

---

## ✨ Features

### 🗺️ Real-Time Mapping
- **Live GPS Tracking** - Device markers update every 5 seconds
- **Movement Trails** - Visual path of recent movement
- **Marker Clustering** - Groups devices when zoomed out
- **Auto-Pan** - Click device in sidebar to focus map
- **Multiple Map Layers** - Street, satellite, and terrain views (Leaflet)

### 🚨 Intelligent Alerting
- **Geofence Alerts** - Detect zone entry/exit automatically
- **Speed Alerts** - Notifications when speed exceeds thresholds
- **Impact Detection** - Uses MPU6050 accelerometer data
- **Alert History** - Browse and dismiss past alerts
- **Real-Time Notifications** - Toast notifications for new alerts

### 📊 Advanced Analytics
- **Live Dashboard** - Current speed, distance, device count
- **Performance Charts** - Speed trends and activity timelines (Chart.js)
- **Device Insights** - Per-device analytics
- **Offline Indicators** - Clear visibility of which devices are offline
- **Activity Timeline** - Movement history visualization

### 🎬 Playback & Route Planning
- **Historical Playback** - Rewind and re-watch vehicle routes
- **Speed Control** - 0.5x to 4x playback speed
- **Route Seek** - Jump to any point in history
- **Route Planning** - Set destinations with address search
- **ETA Display** - Time and distance to destination

### 📱 Beautiful, Responsive UI
- **Multi-Page Dashboard** - Dashboard, Analytics, Alerts, Settings
- **Device Sidebar** - List with quick device filtering
- **Real-Time Topbar** - Notifications and system status
- **Mobile-Friendly** - Responsive layout on all screen sizes
- **Dark Mode Ready** - CSS variables support theme switching

### 🔌 Offline & Resilience
- **Offline Queue** - Queues up to 200 records locally when Wi-Fi disconnects
- **Auto-Sync** - Automatically syncs when connection restored
- **Conflict Resolution** - Intelligent merge for offline updates
- **SPIFFS Storage** - Persistent storage on ESP32 filesystem

### 📡 Rich Telemetry

The device sends:
- **GPS Coordinates** - Latitude/longitude (±5-10m accuracy typical)
- **Speed & Heading** - Calculated from consecutive GPS fixes
- **Accelerometer Data** - 3-axis acceleration for impact detection
- **Battery Level** - Power status monitoring
- **Timestamps** - All data timestamped for accurate replay
- **Device Name** - Custom label per device

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Firebase project with Realtime Database (free tier works)
- ESP32 dev board + SIM808 module + MPU6050 sensor

### 1. Setup Web Dashboard (5 minutes)

**Clone & Install:**
```bash
git clone <your-repo-url>
cd Real-time-Asset-Tracking-and-Management-Using-IoT
npm install
```

**Run Development Server:**
```bash
npm run dev
# Opens http://localhost:3000
```

**Note:** Dashboard will load but show no devices until ESP32 connects.

### 2. Setup Hardware (30 minutes)

**Wiring ESP32:**
- SIM808 TX → ESP32 GPIO 16 (RX2)
- SIM808 RX → ESP32 GPIO 17 (TX2)
- SIM808 VCC → 5V external power (not USB!)
- SIM808 GND → Common ground
- MPU6050 SDA → ESP32 GPIO 21
- MPU6050 SCL → ESP32 GPIO 22
- MPU6050 VCC → 3.3V
- MPU6050 GND → Common ground

**Flash Firmware:**
1. Open `NexTrack_v4.ino` in Arduino IDE
2. Install board: **ESP32 Dev Module**
3. Install libraries: **MPU6050**, **ArduinoJson** (6.x)
4. Edit these lines in sketch:
   - `#define WIFI_SSID "YOUR_SSID"`
   - `#define WIFI_PASSWORD "YOUR_PASSWORD"`
   - Update `FIREBASE_HOST` if using different Firebase project
5. Upload (921600 baud)
6. Open Serial Monitor (115200 baud) to verify connection

### 3. Configure Firebase

Current project uses: `realtime-asset-tracking-e00df` (asia-southeast1)

**To use your own Firebase project:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project or use existing
3. Enable **Realtime Database** (Test Mode)
4. Get database URL from **Settings → General**
5. Update in both:
   - `NexTrack_v4.ino` (line with `FIREBASE_HOST`)
   - `src/config/firebase.js` (databaseURL)

### ✅ Verify All Working

1. **Check dashboard:** Device should appear on map within 10 seconds
2. **Check Serial Monitor:** Should show `[INFO] Sending telemetry...` every 5 seconds
3. **Check Firebase:** Go to Console → Realtime Database → see `devices` branch

---

## 🏗️ System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      VECTOR SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐        ┌──────────────────┐  ┌──────────┐
│  │   HARDWARE     │        │    BACKEND       │  │ FRONTEND │
│  │   (ESP32)      │        │  (Firebase RT)   │  │ (Vite)   │
│  ├────────────────┤        ├──────────────────┤  ├──────────┤
│  │ • WiFi         │ HTTPS  │ • Realtime DB    │  │ • Maps   │
│  │ • SIM808 GPS   │◄─────►│ • Auth           │◄─┤ • Charts │
│  │ • MPU6050 IMU  │ WebSock│ • Rules          │  │ • Alerts │
│  │ • SPIFFS       │        │ • Geofences      │  │ • Sidebar│
│  │ • Li-Po Battery│        │ • Devices path   │  │ • Pages  │
│  └────────────────┘        └──────────────────┘  └──────────┘
│   Updates: 5s               Real-time listeners    Poll/Events
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Device (ESP32)
  ↓ (Every 5 seconds)
  ├─ Read GPS from SIM808
  ├─ Read accelerometer (MPU6050)
  ├─ Calculate heading
  └─ POST JSON to Firebase via Wi-Fi
          ↓
Firebase Realtime Database (asia-southeast1)
  ├─ Stores in /devices/{deviceId}/
  ├─ Triggers alert rules
  ├─ Broadcasts changes via WebSocket
  └─ Stores geofences & history
          ↓
Web Dashboard (Browser)
  ├─ WebSocket listener updates markers
  ├─ Refreshes analytics charts
  ├─ Displays alerts
  └─ Updates sidebar device list
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Microcontroller** | ESP32 | - | 240MHz dual-core processor |
| **Firmware** | C++ (Arduino) | C++11 | Device logic & sensor integration |
| **GPS** | SIM808 | - | GPS receiver (works without SIM) |
| **IMU** | MPU6050 | - | 6-axis accelerometer/gyroscope |
| **Backend** | Firebase Realtime DB | - | Real-time sync, rules engine |
| **Frontend** | Vanilla JavaScript | ES6+ | UI rendering, no frameworks |
| **Build Tool** | Vite | 5.2.0 | Dev server, production bundling |
| **Maps** | Leaflet.js | 1.9.4 | Interactive mapping (via CDN) |
| **Charts** | Chart.js | 4.4.2 | Analytics visualization (via CDN) |
| **Styling** | CSS3 | - | Responsive design |
| **Database** | Firebase Realtime | - | asia-southeast1 region |

---

## 📂 Project Structure

```
Real-time-Asset-Tracking-and-Management-Using-IoT/
│
├── 📘 Configuration Files
│   ├── NexTrack_v4.ino          # ESP32 firmware (main entry)
│   ├── package.json              # Node.js scripts & metadata
│   └── vite.config.js            # Vite build config
│
├── 📄 public/                    # Static web assets
│   ├── index.html                # HTML entry point
│   └── assets/                   # Images, icons
│
├── 💻 src/                       # Application source
│   │
│   ├── main.js                   # App orchestration entry point
│   │
│   ├── config/
│   │   └── firebase.js           # Firebase init + helpers
│   │
│   ├── modules/                  # Core features (no params!)
│   │   ├── map.js               # Leaflet map rendering
│   │   ├── geofence.js          # Geofence drawing/detection
│   │   ├── devices.js           # Device sync & offline queue
│   │   ├── alerts.js            # Alert firing & history
│   │   ├── analytics.js         # Chart.js graphs
│   │   ├── playback.js          # Route replay engine
│   │   ├── route.js             # Route planning
│   │   └── search.js            # Device search
│   │
│   ├── styles/
│   │   └── styles.css            # All CSS styling
│   │
│   ├── ui/                       # UI components
│   │   ├── pages.js              # Page HTML templates
│   │   ├── panel.js              # Device info panel
│   │   ├── sidebar.js            # Left sidebar
│   │   ├── topbar.js             # Top navigation
│   │   └── settings.js           # Settings panel
│   │
│   └── utils/                    # Helper utilities
│       ├── state.js              # Global app state
│       ├── events.js             # Pub/Sub event bus
│       ├── helpers.js            # Utility functions
│       └── toast.js              # Toast notifications
│
├── 🚀 dist/                      # Production build (generated)
├── 📦 node_modules/              # Dependencies (generated)
└── .git/                         # Git repository

```

### Key Module Exports

| Module | Exports | Purpose |
|--------|---------|---------|
| **map.js** | `initMap()`, `renderMarkers()`, `panToDevice(id)`, `clearTrails()`, `fitAllDevices()` | Leaflet map rendering |
| **devices.js** | `processDevice(id, raw, now)`, `syncOfflineQueue()`, `offlineQueueTotal()`, `updateOfflineUI()` | Device data sync |
| **geofence.js** | `drawAllGeofences()`, `toggleDrawMode()`, `saveGeofencesFromForm()` | Geofence management |
| **alerts.js** | `fireAlert()`, `processAlertsSnapshot()`, `renderAlertList()`, `updateAlertBadge()` | Alert system |
| **analytics.js** | `initCharts()`, `updateAnalytics()`, `updateActivityChart()` | Chart.js graphs |
| **playback.js** | `loadRoute(deviceId)`, `toggle()`, `rewind()`, `seek(val)`, `onSpeedChange()` | Route replay |
| **route.js** | `startRoute()`, `clearRoute()`, `updateProgress()`, `onDestInput()` | Route planner |

---

## 🔧 Hardware Setup

### Component List

| Component | Model | Purpose | Cost |
|-----------|-------|---------|------|
| **Microcontroller** | ESP32 (30-pin) | Main processor, Wi-Fi | $8-12 |
| **GPS Module** | SIM808 | GPS receiver + 2G cellular | $25-40 |
| **Accelerometer** | MPU6050 | 6-axis IMU (accel + gyro) | $3-5 |
| **Battery** | Li-Po 3.7V | Power source | $10-20 |
| **Antenna** | SIM808 GPS Antenna | External GPS antenna | $3-8 |
| **USB Cable** | Micro USB | Programming | $2-5 |

**Total: $50-90 USD**

### Wiring Reference

```
┌─────────────────┬──────────────┬────────────────┐
│ Component       │ Pin          │ ESP32 Pin      │
├─────────────────┼──────────────┼────────────────┤
│ SIM808 (UART2)  │ TX           │ GPIO 16 (RX2)  │
│                 │ RX           │ GPIO 17 (TX2)  │
│                 │ VCC          │ 5V external ⚡ │
│                 │ GND          │ GND            │
│                 │ PWRKEY       │ GPIO 4 (opt)   │
├─────────────────┼──────────────┼────────────────┤
│ MPU6050 (I2C)   │ SDA          │ GPIO 21        │
│                 │ SCL          │ GPIO 22        │
│                 │ VCC          │ 3.3V           │
│                 │ GND          │ GND            │
├─────────────────┼──────────────┼────────────────┤
│ Battery         │ +3.7V / GND  │ Via power mgmt │
└─────────────────┴──────────────┴────────────────┘
```

### Hardware Setup Checklist

- [ ] Connect SIM808 TX → ESP32 GPIO 16
- [ ] Connect SIM808 RX → ESP32 GPIO 17
- [ ] Connect SIM808 VCC → 5V external power supply
- [ ] Connect SIM808 GND → common ground
- [ ] Connect MPU6050 SDA → ESP32 GPIO 21
- [ ] Connect MPU6050 SCL → ESP32 GPIO 22
- [ ] Connect MPU6050 VCC → ESP32 3.3V
- [ ] Connect MPU6050 GND → common ground
- [ ] Mount GPS antenna externally (facing sky)
- [ ] Connect Li-Po battery
- [ ] Test ESP32 board detection in Arduino IDE
- [ ] Upload NexTrack_v4.ino

### GPS Notes

⚠️ **GPS Acquisition:**
- **Antenna:** Must be external, facing upward, clear sky view required
- **Time to First Fix:** 30-120 seconds outdoors (cold start)
- **SIM Card:** NOT required—GPS works independently
- **Power:** SIM808 needs external 5V (not ESP32 USB)

---

## 💻 Installation & Setup

### Prerequisites

```bash
# Check Node.js (need v16+)
node --version

# Check npm
npm --version

# Arduino IDE from arduino.cc
```

### Step 1: Clone & Install Dashboard

```bash
git clone <your-repo-url>
cd Real-time-Asset-Tracking-and-Management-Using-IoT
npm install
```

### Step 2: Configure Firebase (if not using default project)

**File:** `src/config/firebase.js`

```javascript
const FB_CONFIG = {
  apiKey:      'YOUR_API_KEY',
  authDomain:  'your-project.firebaseapp.com',
  databaseURL: 'https://your-project-default-rtdb.REGION.firebasedatabase.app/',
  projectId:   'your-project-id',
};
```

**Also update firmware:**

**File:** `NexTrack_v4.ino`

```cpp
#define FIREBASE_HOST   "your-project-default-rtdb.REGION.firebasedatabase.app"
```

### Step 3: Setup ESP32 Firmware

1. **Open Arduino IDE** → **NexTrack_v4.ino**

2. **Install Board:**
   - Tools → Board Manager
   - Search "ESP32" → Install
   - Tools → Board → "ESP32 Dev Module"

3. **Install Libraries:**
   - Tools → Manage Libraries
   - Search and install:
     - **ArduinoJson** (v6.x)
     - **MPU6050** (by Electronic Cats)

4. **Edit Configuration (NexTrack_v4.ino):**
   ```cpp
   #define WIFI_SSID       "MrTecno"        // Your Wi-Fi SSID
   #define WIFI_PASSWORD   "00000000"       // Your password
   #define DEVICE_ID       "vector_01"      // Unique ID per device
   #define DEVICE_NAME     "Asset 01"       // Display name
   #define FIREBASE_HOST   "realtime-asset-..."  // Your Firebase
   ```

5. **Connect ESP32 via USB**

6. **Upload:**
   - Tools → Port → Select your port
   - Tools → Upload Speed → 921600
   - Click Upload (→ button)

7. **Verify:**
   - Tools → Serial Monitor (115200 baud)
   - Should show connection logs

### Step 4: Start Dashboard

```bash
npm run dev
# Opens http://localhost:3000
```

Your device should appear on the map within 10 seconds!

---

## 🎮 Usage Guide

### Dashboard Pages

**Dashboard (default view):**
- Live map with device markers
- Sidebar showing all connected devices
- Real-time telemetry data

**Analytics:**
- Speed, distance, activity charts
- Device performance metrics

**Alerts:**
- Alert history and filtering
- Dismiss / view alert details

**Settings:**
- Device configuration
- UI preferences
- Data export

### Common Tasks

#### Track a Device
1. Click device in sidebar
2. Map pans to device location
3. Watch marker update every 5 seconds

#### Create Geofence
1. Click "📍 Geofence" in topbar
2. Click map to draw polygon
3. Double-click to close shape
4. Save with name and alert type

#### View Route Playback
1. Select device from sidebar
2. Click "▶️ Playback"
3. Use controls to rewind/seek

#### Set Destination
1. Type address in "Destination" field
2. Select from autocomplete
3. See ETA and distance

---

## ⚙️ Configuration

### Firmware Configuration (NexTrack_v4.ino)

```cpp
// ═══════════════════════════════════════════
// USER CONFIGURATION
// ═══════════════════════════════════════════

// WiFi
#define WIFI_SSID       "MrTecno"
#define WIFI_PASSWORD   "00000000"

// Firebase
#define FIREBASE_HOST   "realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app"

// Device identity (unique per unit)
#define DEVICE_ID       "vector_01"
#define DEVICE_NAME     "Asset 01"

// Timing
#define UPLOAD_INTERVAL_MS   5000     // Send data every 5 seconds
#define HEARTBEAT_INTERVAL_MS 10000   // Heartbeat every 10 seconds

// GPS
#define GPS_TIMEOUT_MS  30000   // Timeout if no lock
```

### Dashboard Configuration (src/config/firebase.js)

```javascript
const FB_CONFIG = {
  apiKey:      'AIzaSyAZiSKitF5KYCam6Lzmdc4pPlczLUQmQ_A',
  authDomain:  'realtime-asset-tracking-e00df.firebaseapp.com',
  databaseURL: 'https://realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId:   'realtime-asset-tracking-e00df',
};
```

---

## 🧩 API & Modules

### Module: map.js

```javascript
import { initMap, renderMarkers, panToDevice, clearTrails, fitAllDevices } from './modules/map.js';

// Initialize Leaflet map
initMap();

// Render device markers
renderMarkers();

// Pan to specific device
panToDevice(deviceId);

// Fit all devices in view
fitAllDevices();

// Clear movement trails
clearTrails();
```

### Module: devices.js

```javascript
import { processDevice, syncOfflineQueue, offlineQueueTotal, updateOfflineUI } from './modules/devices.js';

// Process incoming device update
processDevice(deviceId, telemetryData, timestamp);

// Sync queued offline records
await syncOfflineQueue();

// Get number of queued records
const total = offlineQueueTotal();

// Update offline indicators in UI
updateOfflineUI();
```

### Module: alerts.js

```javascript
import { fireAlert, renderAlertList, updateAlertBadge } from './modules/alerts.js';

// Fire alert notification
fireAlert(alertType, deviceId, message);

// Display alert list
renderAlertList();

// Update alert badge count
updateAlertBadge(count);
```

### Module: analytics.js

```javascript
import { initCharts, updateAnalytics, updateActivityChart } from './modules/analytics.js';

// Initialize Chart.js charts
initCharts();

// Refresh all analytics from current data
updateAnalytics();

// Update activity timeline chart
updateActivityChart();
```

### Module: playback.js

```javascript
import { loadRoute, toggle, rewind, seek, onSpeedChange } from './modules/playback.js';

// Load historical route for device
loadRoute(deviceId);

// Play/pause route
toggle();

// Return to route start
rewind();

// Jump to timestamp
seek(timestamp);

// Change playback speed
onSpeedChange(); // Called by UI slider
```

### Utility: state.js

```javascript
import { S } from './utils/state.js';

// Access global state
S.devices           // All connected devices
S.alerts            // Alert history
S.geofences         // Defined geofences
S.user              // User settings
S.offline_queue     // Offline queued records
```

### Utility: events.js

```javascript
import { on, emit, EV } from './utils/events.js';

// Subscribe to event
on(EV.DEVICE_UPDATED, (data) => {
  console.log('Device updated:', data);
});

// Emit event
emit(EV.DEVICE_UPDATED, deviceData);

// Available events
EV.DEVICE_UPDATED
EV.ALERT_FIRED
EV.GEOFENCE_CROSSED
EV.OFFLINE_STATUS_CHANGED
```

---

## 🛠️ Development

### Development Workflow

```bash
# 1. Start dev server (hot reload enabled)
npm run dev

# 2. Modify files in src/
# Changes auto-reload immediately

# 3. Stop server
# Ctrl + C in terminal
```

### Build for Production

```bash
# Create optimized bundle in dist/
npm run build

# Test production locally
npm run preview
```

### Editing Tips

- **CSS:** Modify `src/styles/styles.css`
- **Pages:** Modify `src/ui/pages.js` templates
- **Firebase:** Modify `src/config/firebase.js`
- **Modules:** Modify files in `src/modules/`
- **Firmware:** Modify `NexTrack_v4.ino` and re-upload

### Dependencies

```json
{
  "devDependencies": {
    "vite": "^5.2.0"
  }
}
```

**Note:** Leaflet.js and Chart.js are loaded via CDN in `public/index.html`, not npm.

---

## 🐛 Troubleshooting

### GPS Not Acquiring Lock

**Symptoms:** Serial monitor shows no GPS fix, coordinates stuck at 0,0

**Solutions:**
1. Antenna must be external and facing upward
2. Test outdoors (not indoors)
3. GPS needs 30-120 seconds on first power-up
4. Verify SIM808 power: measure 5V at VCC pin
5. Check UART wiring: RX/TX not swapped

### Device Not Appearing on Map

**Symptoms:** Dashboard loads but no device, sidebar empty

**Solutions:**
1. **Check ESP32 serial output (115200 baud)**
   - Should show: `[INFO] Connected! IP: 192.168.x.x`
   - If not: Check Wi-Fi SSID and password

2. **Check Firebase connection**
   - Serial should show: `[INFO] Firebase connected!`
   - Verify FIREBASE_HOST is correct

3. **Check Firebase console**
   - Go to Firebase Realtime DB
   - Should see `/devices` branch with data
   - If empty: Device not sending data

4. **Check dashboard console**
   - Press F12 → Console tab
   - Look for Firebase connection errors
   - Check Network tab for WebSocket connection

### Dashboard Not Loading

**Symptoms:** Blank page or infinite loading

**Solutions:**
1. **Clear browser cache:** Ctrl + Shift + Delete
2. **Check browser console (F12):**
   - Look for red errors
   - Common: `firebaseConfig is undefined` → fix firebase.js
3. **Verify Firebase project:** Is Realtime DB enabled?
4. **Check network:** Is your computer online?

### Geofence Not Triggering Alerts

**Symptoms:** Geofence created but no alerts when crossing

**Solutions:**
1. Geofence polygon must be closed (end point connects to start)
2. GPS accuracy is ±5-10m, draw geofence larger than needed
3. Check Firebase database for geofence data structure
4. Check browser console for JavaScript errors

### Offline Queue Not Syncing

**Symptoms:** Device offline, data queues, but doesn't sync when reconnected

**Solutions:**
1. Device must have Wi-Fi connectivity to sync
2. Manually trigger sync: Check browser console
3. Verify Firebase write permissions in rules
4. Check `/offline_queue.json` in ESP32 SPIFFS

---

## 🗂️ Firebase Data Schema

Your Firebase project stores data in this structure:

```json
{
  "devices": {
    "vector_01": {
      "name": "Asset 01",
      "lat": 40.7128,
      "lng": -74.0060,
      "speed": 45,
      "heading": 270,
      "battery": 85,
      "timestamp": 1700000000000
    }
  },
  "geofences": {
    "warehouse_zone": {
      "name": "Warehouse",
      "coordinates": [[40.7, -74.0], [40.8, -74.0], [40.8, -74.1]],
      "alertType": "entry"
    }
  },
  "alerts": {
    "alert_id": {
      "deviceId": "vector_01",
      "type": "speed",
      "message": "Speed limit exceeded",
      "timestamp": 1700000000000,
      "dismissed": false
    }
  }
}
```

---

## 📚 Additional Resources

- **Leaflet Docs:** https://leafletjs.com/reference/
- **Firebase Realtime DB:** https://firebase.google.com/docs/database
- **Arduino ESP32:** https://docs.espressif.com/projects/arduino-esp32/
- **Vite Docs:** https://vitejs.dev/
- **Chart.js Docs:** https://www.chartjs.org/docs/latest/

---

## 📄 License

This project is licensed under the **MIT License**:

```
MIT License

Copyright (c) 2026 VECTOR Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Support & Contributions

**Found a bug or have a feature request?**
- Open an issue on GitHub with a clear description
- Include reproduction steps and error messages
- Attach screenshots if helpful

**Want to contribute?**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and test thoroughly
4. Commit clearly: `git commit -m "feat: describe changes"`
5. Push: `git push origin feature/your-feature`
6. Open Pull Request

**Development Guidelines:**
- Follow code style conventions documented above
- Keep commits atomic and focused
- Update README if adding features
- Test on real hardware when possible

---

**VECTOR** © 2026 - Real-Time Asset Tracking Made Simple
# 🗺️ VECTOR — Real-Time Intelligent Asset Tracking System

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0-brightgreen.svg)](https://nodejs.org)
[![Build Tool](https://img.shields.io/badge/build-Vite-purple.svg)](https://vitejs.dev)

A comprehensive **GPS-based vehicle and asset tracking platform** combining embedded IoT hardware with a modern web dashboard for real-time monitoring, analytics, and geofencing.

**🎯 Perfect for:** Fleet management, vehicle tracking, asset monitoring, logistics optimization, and real-time location services.

---

## 📑 Quick Navigation

- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Hardware Setup](#-hardware-setup)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [Configuration](#-configuration)
- [API & Modules](#-api--modules)
- [Development](#-development)
- [Troubleshooting](#-troubleshooting)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**VECTOR** *(Vehicle Embedded Communication Tracking Optimization and Reporting)* is a **dual-component real-time tracking system** designed for modern fleet and asset management:

### System Components

| Component | Description |
|-----------|-------------|
| **🔌 Hardware Layer** | ESP32 microcontroller + SIM808 GPS + MPU6050 accelerometer transmitting real-time telemetry to Firebase |
| **☁️ Backend Layer** | Firebase Realtime Database storing device data, geofences, alerts, routes, and analytics |
| **🖥️ Frontend Layer** | Interactive Vite-based web dashboard for visualization, control, and management |

### Why VECTOR?

✅ **Real-Time Tracking** - Live location updates every 5 seconds (configurable)  
✅ **Low Power** - Optimized for extended operation on battery  
✅ **Offline Ready** - Queues data when offline, syncs automatically online  
✅ **No SIM Required** - GPS works with or without mobile connectivity  
✅ **Lightweight Frontend** - Zero bloat (vanilla JS, no frameworks)  
✅ **Extensible** - Modular architecture for easy feature additions  

---

## ✨ Features

### 🗺️ Real-Time Mapping
- **Live Device Tracking** - See all devices on interactive map in real-time
- **Trail Visualization** - Track movement history with automatic trail lines
- **Smart Clustering** - Automatically groups devices when zoomed out
- **Custom Markers** - Device names and status displayed on markers
- **Auto-Fit View** - Fit all devices in viewport with one click

### 🚨 Intelligent Alerting
- **Geofence Alerts** - Automatic detection of zone entry/exit
- **Speed Alerts** - Notifications when speed exceeds thresholds
- **Impact Alerts** - Tilt/impact detection via accelerometer
- **Alert History** - Browse and dismiss past alerts
- **Customizable Rules** - Configuration per device and zone

### 📊 Advanced Analytics
- **Real-Time Dashboard** - Current speed, distance traveled, device status
- **Performance Charts** - Speed trends, activity timelines, distance metrics
- **Device Insights** - Per-device performance analytics
- **Offline Indicators** - Clear visibility of offline devices
- **Export Ready** - Data structure prepared for external analysis

### 🎬 Playback & Route Planning
- **Historical Playback** - Rewind and re-watch vehicle routes
- **Speed Control** - Adjust playback speed (0.5x to 4x)
- **Seek Functionality** - Jump to any point in the route
- **Route Planning** - Set destinations using Nominatim (OpenStreetMap)
- **Progress Tracking** - Visual progress bar along planned routes

### 📱 Beautiful, Responsive UI
- **Multi-Page Dashboard** - Dashboard, Analytics, Alerts, Settings
- **Sidebar Navigation** - Device list with quick filters and status
- **Real-Time Topbar** - Notifications and system status
- **Mobile-Friendly** - Responsive design works on tablets and phones
- **Dark/Light Ready** - CSS variables support theme switching

### 🔌 Offline & Resilience
- **Queue Management** - Queues data when offline, syncs automatically
- **SPIFFS Storage** - Persistent storage on embedded filesystem
- **Automatic Recovery** - Reconnects and reconciles data on network return
- **Conflict Resolution** - Intelligent merge for offline updates

### 📡 Rich Telemetry
- **GPS Coordinates** - High-accuracy location (±5-10m typical)
- **Heading Estimation** - Direction of travel calculation
- **Accelerometer Data** - 3-axis acceleration for impact/tilt detection
- **Signal Strength** - Monitor cellular signal quality
- **Battery Level** - Track device power status
- **Timestamps** - All data timestamped for accurate replay

---

## 🚀 Quick Start

### Fastest Setup (5 minutes)

**Prerequisites:**
- Node.js 16+ installed
- Firebase project with Realtime Database
- ESP32 dev board + SIM808 module

**1. Clone & Install**
```bash
git clone <repository-url>
cd VECTOR
npm install
```

**2. Configure Firebase**
Edit `src/config/firebase.js` with your Firebase credentials (found in Firebase Console → Project Settings)

**3. Deploy Firmware**
- Open `NexTrack_v4.ino` in Arduino IDE
- Install ESP32 board support + required libraries (MPU6050, ArduinoJson)
- Update Wi-Fi credentials and Firebase config
- Upload to ESP32

**4. Run Dashboard**
```bash
npm run dev
# Opens http://localhost:3000
```

**✅ Done!** Device should appear on map within 10 seconds.

---

## 🏗️ System Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         VECTOR SYSTEM                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐         ┌──────────────────┐  ┌──────────────┐
│  │   HARDWARE      │         │    BACKEND       │  │   FRONTEND   │
│  │   LAYER         │         │    LAYER         │  │   LAYER      │
│  ├─────────────────┤         ├──────────────────┤  ├──────────────┤
│  │                 │         │                  │  │              │
│  │ ┌─ ESP32       │         │ ┌─ Firebase       │  │ ┌─ Web App   │
│  │ │ ┌─ SIM808    │ HTTPS   │ │ ┌─ Realtime DB   │  │ │ ┌─ Map   │
│  │ │ │  (GPS)     │◄───────►│ │ ├─ Auth          │◄─┼─┤ ├─ Charts │
│  │ │ ├─ MPU6050   │ WebSocket│ └─ Rules          │  │ │ ├─ Alerts │
│  │ │ ├─ SPIFFS    │         │                  │  │ │ └─ Panels  │
│  │ │ └─ RTC       │         │ ┌─ Optional:      │  │ │            │
│  │ └─ Li-Po Battery          │ └─ Functions      │  │ └─ Vite Dev  │
│  │                 │         │                  │  │  Server      │
│  └─────────────────┘         └──────────────────┘  └──────────────┘
│    Updates every 5s              Real-time              Polling
│                                 Listeners              Listeners
│
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Device (ESP32)
    ↓ (Every 5 seconds)
    ├─ Read GPS coordinates (SIM808)
    ├─ Read accelerometer (MPU6050)
    ├─ Calculate speed & heading
    └─ Send to Firebase via HTTPS
                ↓
Firebase Realtime Database
    ├─ Stores: Device state, Geofences, Alerts, Routes
    ├─ Triggers: Alert rules, Offline detection
    └─ Broadcasts changes via WebSocket
                ↓
Web Dashboard (Connected Clients)
    ├─ Updates map markers in real-time
    ├─ Refreshes analytics charts
    ├─ Displays alerts immediately
    └─ Renders route playback data
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Hardware** | ESP32, SIM808, MPU6050 | GPS tracking, accelerometer, microcontroller |
| **Firmware** | C++ (Arduino) | Device logic, sensor integration, data transmission |
| **Backend** | Firebase Realtime DB | Data storage, real-time sync, rules engine |
| **Frontend** | Vanilla JavaScript | UI rendering, user interactions, data visualization |
| **Build** | Vite | Fast development server, production bundling |
| **Maps** | Leaflet.js | Interactive mapping, markers, geofences |
| **Charts** | Chart.js | Analytics visualization, real-time updates |

---

## 📂 Project Structure

```
VECTOR/
│
├── 📘 Hardware & Config
│   ├── NexTrack_v4.ino          # 🔌 ESP32 Firmware (main entry)
│   ├── package.json              # 📦 Node.js dependencies & scripts
│   ├── package-lock.json         # 🔒 Locked dependency versions
│   ├── vite.config.js            # ⚙️ Vite build configuration
│   └── README.md                 # 📖 Project documentation (you are here)
│
├── 📄 public/                    # Static web assets
│   ├── index.html                # 🌐 HTML entry point
│   └── assets/                   # 🖼️ Static images, fonts, etc.
│
├── 💻 src/                       # Application source code
│   │
│   ├── main.js                   # 🎯 Application entry point
│   │                             #    (orchestrates all modules)
│   │
│   ├── config/
│   │   └── firebase.js           # 🔐 Firebase credentials & init
│   │
│   ├── modules/                  # 🧩 Core functionality modules
│   │   ├── map.js               # 🗺️  Leaflet map integration
│   │   ├── geofence.js          # 🛡️  Geofence drawing & storage
│   │   ├── devices.js           # 📱 Device mgmt & sync
│   │   ├── alerts.js            # ⚠️  Alert management & filtering
│   │   ├── analytics.js         # 📊 Charts & statistics
│   │   ├── playback.js          # ▶️  Route replay engine
│   │   └── route.js             # 🧭 Route planning & navigation
│   │
│   ├── styles/
│   │   └── styles.css            # 🎨 All CSS (global styles)
│   │
│   ├── ui/                       # 🖼️  UI components & templates
│   │   ├── pages.js              # 📄 Page HTML templates
│   │   ├── panel.js              # 📋 Device info panels
│   │   ├── sidebar.js            # 🧭 Navigation sidebar
│   │   ├── topbar.js             # ⬆️  Top navigation bar
│   │   └── settings.js           # ⚙️  Settings panel UI
│   │
│   └── utils/                    # 🔧 Utility & helper modules
│       ├── state.js              # 💾 Global application state
│       ├── events.js             # 📡 Event bus (pub/sub)
│       ├── helpers.js            # 🛠️  Utility functions
│       └── toast.js              # 🔔 Toast notification system
│
├── 🚀 dist/                      # Build output (generated)
│   └── [compiled & bundled files]
│
└── 📦 node_modules/              # Dependencies (generated)
    └── [installed npm packages]

```

### Module Responsibilities

| Module | Purpose | Key Functions |
|--------|---------|----------------|
| **main.js** | Orchestration | Initialize all modules, bind events, wire listeners |
| **map.js** | Mapping | Render markers, trails, geofences on Leaflet |
| **devices.js** | Device Mgmt | Process updates, offline queue, sync |
| **geofence.js** | Geofencing | Draw, store, detect zone entry/exit |
| **alerts.js** | Notifications | Manage, filter, dismiss alerts |
| **analytics.js** | Charts | Render and update performance charts |
| **playback.js** | Replay | Route animation, seek, speed control |
| **route.js** | Navigation | Route planning, destination search |
| **state.js** | Global State | Centralized app state management |
| **events.js** | Communication | Pub/Sub event bus for module coordination |

---

## 🔧 Hardware Setup

### Component List & Specifications

| Component | Model | Purpose | Qty | Cost |
|-----------|-------|---------|-----|------|
| **Microcontroller** | ESP32 (30/36-pin) | Main processor, Wi-Fi | 1 | $8-12 |
| **GPS Module** | SIM808 | GPS + 2G cellular + GNSS | 1 | $25-40 |
| **Accelerometer** | MPU6050 | 6-axis IMU (accel + gyro) | 1 | $3-5 |
| **Power Supply** | Li-Po Battery 3.7V | Power source | 1 | $10-20 |
| **Antenna** | SIM808 GPS Antenna | External GPS antenna | 1 | $3-8 |
| **USB Cable** | Micro USB | Programming ESP32 | 1 | $2-5 |

**Total Estimated Cost:** $50-90 USD

### Wiring Reference

```
┌─────────────────┬────────────────┬──────────────────┬────────────────┐
│ Component       │ Pin/Port       │ ESP32 Pin        │ Notes          │
├─────────────────┼────────────────┼──────────────────┼────────────────┤
│ SIM808 (Serial) │ TX             │ GPIO 16 (RX2)    │ Serial2 RX     │
│                 │ RX             │ GPIO 17 (TX2)    │ Serial2 TX     │
│                 │ VCC            │ 5V External      │ Needs 5V PSU   │
│                 │ GND            │ GND              │ Common ground  │
│                 │ PWRKEY         │ GPIO 4           │ Optional       │
├─────────────────┼────────────────┼──────────────────┼────────────────┤
│ MPU6050 (I2C)   │ SDA            │ GPIO 21          │ I2C Data       │
│                 │ SCL            │ GPIO 22          │ I2C Clock      │
│                 │ VCC            │ 3.3V             │ From ESP32     │
│                 │ GND            │ GND              │ Common ground  │
├─────────────────┼────────────────┼──────────────────┼────────────────┤
│ Battery         │ +3.7V / GND    │ 5V (via boost)   │ Li-Po input    │
└─────────────────┴────────────────┴──────────────────┴────────────────┘
```

### Wiring Diagram (Visual)

```
                    ┌─────────────────┐
                    │     ESP32       │
                    │  Dev Kit 30-pin │
        ┌─────────┬─┤                 ├─────────┐
        │         │ │                 │         │
        │    GPIO 21 ├─SDA────────┐   │         │
        │    GPIO 22 ├─SCL────┐   │   │         │
        │    GPIO 16 (RX2) ◄──┼───┼──{TX}       │
        │    GPIO 17 (TX2) ──►│   │  {RX} SIM808│
        │    GPIO 4  ├─PWRKEY┘   │  {VCC}─5V ◄─┼─ External PSU
        │    GND ─────────┴───────┼─{GND}       │
        │          │             │ {GPS ANT}   │
        │          │             │  (external) │
        │        MPU6050         │             │
        └─────────────────────────┴─────────────┘
```

### Setup Checklist

- [ ] Solder or connect SIM808 TX to ESP32 GPIO16 (RX2)
- [ ] Solder or connect SIM808 RX to ESP32 GPIO17 (TX2)
- [ ] Connect SIM808 VCC to external 5V power supply
- [ ] Connect SIM808 GND to common ground (ESP32 GND & Battery GND)
- [ ] Connect MPU6050 SDA to ESP32 GPIO21
- [ ] Connect MPU6050 SCL to ESP32 GPIO22
- [ ] Connect MPU6050 VCC to ESP32 3.3V
- [ ] Connect MPU6050 GND to common ground
- [ ] Mount SIM808 GPS antenna externally, facing sky
- [ ] Connect Li-Po battery via power management board
- [ ] Test ESP32 board detection in Arduino IDE
- [ ] Upload test sketch to verify connections

### GPS Antenna Placement

⚠️ **Critical for GPS acquisition:**
- GPS antenna must have **clear sky view** (not indoor)
- Antenna should face **upward** (not downward)
- Keep antenna **away from metal** (causes reflections)
- First GPS fix typically takes **30-120 seconds** outdoors
- GPS works **without a SIM card** (only needs power)

---

## 💻 Installation & Setup

### Prerequisites Check

Verify you have these installed:

```bash
# Check Node.js version (need v16+)
node --version
npm --version

# Check Arduino IDE (if not installed, download from arduino.cc)
# Verify Git is available
git --version
```

### Step 1: Backend Setup (Firebase)

**Create Firebase Project:**

1. Go to [firebase.google.com](https://firebase.google.com)
2. Click **"Go to console"** → **"Create a project"**
3. Enter project name (e.g., "VECTOR-Tracking")
4. Accept default settings → **"Create project"**
5. Wait for project initialization (1-2 minutes)

**Enable Realtime Database:**

6. In left sidebar: **"Build"** → **"Realtime Database"**
7. Click **"Create Database"**
8. Select region closest to you
9. Start in **"Test Mode"** (for development)
10. Click **"Enable"**

**Get Firebase Credentials:**

11. Top-right: **⚙️ Settings** → **Project Settings**
12. Scroll down to **"Your apps"** section
13. Click **"</>"** (Web) if no app exists
14. Enter app name (e.g., "Vector Web")
15. Copy the Firebase config object (looks like below):

```javascript
// Your Firebase config - COPY THIS
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "my-project.firebaseapp.com",
  databaseURL: "https://my-project.firebaseio.com",
  projectId: "my-project-12345",
  storageBucket: "my-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Step 2: Frontend Setup (Web Dashboard)

**Clone & Install:**

```bash
# Clone repository
git clone <your-repo-url>
cd VECTOR

# Install Node dependencies
npm install
```

**Configure Firebase:**

1. Open [src/config/firebase.js](src/config/firebase.js)
2. Replace the `firebaseConfig` object with your config from Step 1
3. Save the file

**Start Development Server:**

```bash
npm run dev
```

Expected output:
```
  VITE v5.2.0  ready in 245 ms
  ➜  Local:   http://localhost:3000/
  ➜  Press q to stop
```

3. Open browser to `http://localhost:3000`
4. Dashboard loads (will show error until device connects)

> **💡 Tip:** Keep this terminal running during development. Files auto-reload on save.

### Step 3: Hardware Setup (Arduino)

**Install Arduino IDE & ESP32 Support:**

1. Download [Arduino IDE](https://www.arduino.cc/en/software)
2. Open Arduino IDE
3. **File** → **Preferences**
4. In **"Additional Boards Manager URLs"**, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
5. **Tools** → **Board Manager** → Search **"ESP32"** → Install latest

**Install Required Libraries:**

1. **Tools** → **Manage Libraries**
2. Search and install each:
   - **ArduinoJson** (latest version)
   - **MPU6050** by ElectronicCats
   - **ESP32 Firebase Database** (optional, for SDK)

**Configure Firmware:**

1. Open [NexTrack_v4.ino](NexTrack_v4.ino)
2. Find and update these sections:

```cpp
// Wi-Fi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Firebase Configuration
const char* FIREBASE_HOST = "my-project.firebaseio.com";
const char* FIREBASE_AUTH = "YOUR_FIREBASE_SECRET";  // See note below

// Device Configuration
const char* DEVICE_NAME = "Vehicle-01";
const unsigned long GPS_UPDATE_INTERVAL = 5000;  // 5 seconds
```

> **📝 Finding Firebase Auth (Secret):**
> - Go to Firebase Console → **Your Project**
> - Click **⚙️ Settings** → **Service Accounts**
> - Click **"Generate new private key"**
> - This gives you a JSON file with `private_key`

**Upload to ESP32:**

1. Connect ESP32 via USB cable to computer
2. **Tools** → **Port** → Select your ESP32 port
3. **Tools** → **Board** → Select **"ESP32 Dev Module"**
4. Click **Upload** (→ button)
5. Wait for upload to complete (should take 1-2 minutes)

**Verify Hardware is Running:**

1. After upload completes, click **Tools** → **Serial Monitor**
2. Set baud rate to **115200**
3. You should see debug output:
   ```
   [INFO] Connecting to Wi-Fi: MySSID
   [INFO] Connected! IP: 192.168.1.100
   [INFO] Connecting to Firebase...
   [INFO] Firebase connected!
   [INFO] GPS lock acquired in 45 seconds
   [INFO] Sending telemetry...
   ```

### Step 4: Verify Everything Works

1. **Check Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - **Realtime Database** → Should see device data appearing:
   ```json
   {
     "devices": {
       "Vehicle-01": {
         "lat": 40.7128,
         "lng": -74.0060,
         "speed": 45,
         "timestamp": 1700000000000
       }
     }
   }
   ```

2. **Check Web Dashboard:**
   - Go to `http://localhost:3000` (if not running: `npm run dev`)
   - Your device should appear on the map
   - Click device in sidebar to pan to location
   - Watch real-time updates (markers move as device moves)

3. **Test Alerts:**
   - Draw a geofence by clicking "Geofence" button
   - Drive device into/out of zone
   - Alert notification should appear

✅ **Congratulations!** System is working!

---

## 🎮 Usage Guide

### Dashboard Overview

When you first open the dashboard, you see 4 main sections:

```
┌─────────────────────────────────────────────────────────┐
│ VECTOR Dashboard                    [⚙️ Settings]      │  ← Topbar
├──────────┬──────────────────────────────────────────────┤
│ Devices  │                                              │
│ ─────    │                                              │
│ Vehicle  │                    MAP VIEW                  │
│   -01    │        (Your devices appear here)           │
│          │                                              │
│ Vehicle  │                                              │
│   -02    │                                              │
│          │                                              │
│ [Stats]  ├──────────────────────────────────────────────┤
│ Speed: 0 │ 📊 Analytics  🚨 Alerts  ⚙️ Settings        │
│ Dist: 0  │                                              │
└──────────┴──────────────────────────────────────────────┘
   Sidebar           Main Content Area          ← Tabs
```

### Common Tasks

#### 1️⃣ Track Real-Time Device Movement

1. Open dashboard (http://localhost:3000)
2. Check **Sidebar** → your device appears after 5-10 seconds
3. Map automatically focuses on device location
4. Device marker updates every 5 seconds
5. Trail lines show recent movement

#### 2️⃣ Create a Geofence Zone

**Purpose:** Alert when device enters/exits a specific area

**Steps:**

1. Click **"📍 Geofence"** button in topbar
2. Click on map to create polygon points
   - Multiple clicks = multiple corners
   - Create closed shape
3. Double-click or press **Enter** to close polygon
4. **Save Geofence** dialog appears:
   - Enter name: "Warehouse Zone"
   - Select alert type: "Entry" / "Exit" / "Both"
5. Click **"Save"**
6. Geofence appears on map as colored polygon
7. Device will alert automatically when crossing boundary

#### 3️⃣ View Real-Time Analytics

1. Click **"📊 Analytics"** tab
2. See five key metrics:
   - **Current Speed** - Real-time speed
   - **Distance Traveled** - Today's total
   - **Active Devices** - Count of online devices
   - **Speed Chart** - Last hour speed trend
   - **Activity Timeline** - Movement frequency

#### 4️⃣ Check Alerts

1. Click **"🚨 Alerts"** tab
2. See alert list with:
   - **Type** (Speed, Geofence, Tilt)
   - **Device** (which vehicle)
   - **Time** (when alert triggered)
   - **Message** (alert details)
3. Click **"Dismiss"** to mark alert as read
4. Dismissed alerts still visible (grayed out)

#### 5️⃣ Replay Vehicle Route

1. Select device from **Sidebar**
2. Click **"▶️ Playback"** button
3. Controls appear:
   - **▶️ Play/Pause** - Start/stop replay
   - **⏮️ Rewind** - Return to start
   - **Speed Slider** - 0.5x to 4x speed
   - **Seek Bar** - Jump to any point
4. Map updates marker position along historical route
5. Watch vehicle's movement history replay

#### 6️⃣ Plan Route Destination

1. Set device in normal mode (not playback)
2. Look for **"Destination"** input in sidebar
3. Type address or place name:
   - "Empire State Building, NYC"
   - "Warehouse, 123 Main St"
4. Autocomplete suggestions appear
5. Click suggestion to set route
6. **Progress bar** shows distance/time to destination
7. Bar fills as vehicle approaches

### Dashboard Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Switch between pages (Dashboard → Analytics → Alerts → Settings) |
| `Esc` | Cancel geofence drawing / close dialogs |
| `Enter` | Confirm geofence / submit forms |
| `+` / `-` | Zoom map in/out |
| `Arrows` | Pan map up/down/left/right |

### Settings Panel

**Available Settings:**

- **Device Name** - Rename devices
- **Alert Thresholds** - Set speed limits
- **Map Style** - Street / Satellite / Terrain
- **Update Interval** - Change GPS frequency
- **Export Data** - Download device records

---

## ⚙️ Configuration

### Firmware Configuration (NexTrack_v4.ino)

Edit these constants at the top of the sketch:

```cpp
// ═══════════════════════════════════════════════════════════════
// NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const char* WIFI_SSID = "MyWiFiNetwork";
const char* WIFI_PASSWORD = "MyWiFiPassword";

// ═══════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const char* FIREBASE_HOST = "my-project.firebaseio.com";
const char* FIREBASE_AUTH = "xxxxxxxxxxxxxx";  // Your secret key

// ═══════════════════════════════════════════════════════════════
// DEVICE CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const char* DEVICE_NAME = "Vehicle-01";
const unsigned long GPS_UPDATE_INTERVAL = 5000;  // milliseconds
const unsigned long ACCEL_READ_INTERVAL = 1000;   // milliseconds

// ═══════════════════════════════════════════════════════════════
// HARDWARE PIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════
#define SIM808_RX 16  // ESP32 GPIO 16 connects to SIM808 TX
#define SIM808_TX 17  // ESP32 GPIO 17 connects to SIM808 RX
#define SIM808_PWRKEY 4  // Power control (optional)
#define MPU6050_SDA 21   // I2C Data
#define MPU6050_SCL 22   // I2C Clock

// ═══════════════════════════════════════════════════════════════
// ADVANCED OPTIONS
// ═══════════════════════════════════════════════════════════════
#define DEBUG 1  // 1 = Serial output, 0 = Silent
#define OFFLINE_QUEUE_SIZE 100  // Max offline records to queue
```

### Dashboard Configuration (src/config/firebase.js)

```javascript
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "my-project.firebaseapp.com",
  databaseURL: "https://my-project.firebaseio.com",
  projectId: "my-project-12345",
  storageBucket: "my-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

// Enable/Disable Features
const CONFIG = {
  features: {
    GEOFENCE_ENABLED: true,
    ALERTS_ENABLED: true,
    PLAYBACK_ENABLED: true,
    ANALYTICS_ENABLED: true,
  },
  
  map: {
    centerLat: 40.7128,     // Default map center (NYC)
    centerLng: -74.0060,
    defaultZoom: 13,
    tileLayer: "OpenStreetMap",  // or "Satellite"
  },
  
  alerts: {
    SPEED_LIMIT: 120,       // km/h
    TILT_THRESHOLD: 45,     // degrees
    OFFLINE_TIMEOUT: 60000,  // milliseconds
  },
  
  updates: {
    MAP_REFRESH_RATE: 500,   // milliseconds
    CHART_UPDATE_RATE: 5000, // milliseconds
  }
};
```

### Environment Variables (.env)

Create `.env` file in project root for sensitive data:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_DATABASE_URL=https://my-project.firebaseio.com
VITE_MAP_STYLE=terrain
```

Access in code:

```javascript
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

---

## 🧩 API & Modules

### Module: `map.js`

Handles all map rendering and interactions using Leaflet.

**Key Functions:**

```javascript
// Initialize map on page load
initMap(containerId, centerLat, centerLng)

// Add or update device marker
renderMarkers(devices)

// Pan to specific device location
panToDevice(deviceId, zoom = 16)

// Show all devices in view
fitAllDevices()

// Clear movement trails
clearTrails()

// Internal: Update trail paths
updateTrails(deviceId, newLocation)
```

**Usage Example:**

```javascript
import { initMap, renderMarkers, panToDevice } from './modules/map.js';

// Initialize
initMap('map', 40.7128, -74.0060);

// Update markers from device data
const devices = {
  'vehicle-01': { lat: 40.7128, lng: -74.0060, name: 'Vehicle-01' },
  'vehicle-02': { lat: 40.7150, lng: -74.0040, name: 'Vehicle-02' },
};
renderMarkers(devices);

// Pan to device
panToDevice('vehicle-01', 18);
```

### Module: `geofence.js`

Drawing and managing geofence zones.

**Key Functions:**

```javascript
// Enable polygon drawing mode
toggleDrawMode(enabled)

// Save geofence to Firebase
saveGeofencesFromForm(name, coordinates, alertType)

// Display all geofences on map
drawAllGeofences(geofences)

// Check if point inside geofence
isPointInGeofence(lat, lng, geofenceCoords) → boolean
```

### Module: `devices.js`

Device data management and synchronization.

**Key Functions:**

```javascript
// Process incoming device updates
processDevice(deviceId, telemetryData)

// Sync queued offline data when online
syncOfflineQueue()

// Get total queued records
offlineQueueTotal() → number

// Update UI offline indicators
updateOfflineUI(offlineDevices)
```

### Module: `alerts.js`

Alert management and triggering.

**Key Functions:**

```javascript
// Fire alert (display in UI)
fireAlert(alertType, deviceId, message)

// Process alerts from Firebase
processAlertsSnapshot(alertsData)

// Render alert list UI  
renderAlertList(alerts)

// Update alert count badge
updateAlertBadge(count)
```

### Module: `analytics.js`

Charts and statistics.

**Key Functions:**

```javascript
// Initialize chart.js charts
initCharts()

// Update analytics data from devices
updateAnalytics(devices)

// Refresh activity chart
updateActivityChart()
```

### Module: `playback.js`

Route replay engine.

**Key Functions:**

```javascript
// Load historical route for device
loadRoute(deviceId, startTime, endTime)

// Control playback
toggle()  // Play/Pause
rewind()  // Return to start
seek(timestamp)  // Jump to time

// Adjust playback speed
onSpeedChange(multiplier)  // 0.5 to 4.0
```

### Module: `route.js`

Route planning.

**Key Functions:**

```javascript
// Start route navigation
startRoute(destination)

// Clear current route
clearRoute()

// Update progress toward destination
updateProgress(currentLat, currentLng)

// Handle destination input
onDestInput(searchText)
onDestKey(keyCode)
```

### Utility: `state.js`

Global application state.

```javascript
import { S } from './utils/state.js';

// Access state
S.devices           // All connected devices
S.alerts            // Alert history
S.geofences         // Geofence definitions
S.user              // User settings

// Update state
S.devices['vehicle-01'] = { ... };
S.alerts.push({ ... });
```

### Utility: `events.js`

Pub/Sub event system.

```javascript
import { on, emit, EV } from './utils/events.js';

// Subscribe to event
on(EV.DEVICE_UPDATED, (deviceData) => {
  console.log('Device updated:', deviceData);
});

// Emit event
emit(EV.DEVICE_UPDATED, { id: 'v1', lat: 40 });

// Available events
EV.DEVICE_UPDATED
EV.ALERT_FIRED
EV.GEOFENCE_CROSSED
EV.OFFLINE_STATUS_CHANGED
```

---

## 🛠️ Development

### Technology Stack

| Layer | Tech | Version | Purpose |
|-------|------|---------|---------|
| **Hardware** | ESP32 | - | 240MHz dual-core processor |
| **Firmware** | C++ (Arduino) | C++11 | MCU programming |
| **GPIO** | Arduino Core | v2.0+ | Pin I/O abstraction |
| **Communication** | HTTP/WebSocket | - | Cloud sync |
| **Backend** | Firebase Realtime DB | - | Real-time data sync |
| **Frontend** | Vanilla JavaScript | ES6+ | UI rendering (no frameworks) |
| **Build** | Vite | v5.2.0 | Fast bundling & dev server |
| **Maps** | Leaflet | v1.9+ | Interactive mapping |
| **Charts** | Chart.js | v4+ | Real-time analytics |
| **Styling** | CSS3 | - | Responsive design |

### Development Workflow

**Start Development:**

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (hot reload enabled)
npm run dev
# Opens http://localhost:3000

# 3. Edit files in src/ → changes auto-reload
# Keep terminal open during development

# 4. Stop server
# Press Ctrl+C in terminal
```

**Build for Production:**

```bash
# Creates optimized bundle in dist/
npm run build

# Test production build locally
npm run preview
# Opens http://localhost:4173
```

### Project Layout

```
src/
├── main.js          ← Edit: Main orchestration
├── config/
│   └── firebase.js  ← Edit: Firebase credentials
├── modules/         ← Edit: Feature logic
│   ├── map.js       ← Edit: Map interactions
│   ├── geofence.js  ← Edit: Geofence logic
│   └── ...
├── ui/              ← Edit: UI templates & events
│   ├── pages.js     ← Edit: Page HTML
│   ├── sidebar.js   ← Edit: Sidebar UI
│   └── ...
├── utils/           ← Edit: Helpers & state
│   ├── state.js     ← Edit: Global state
│   ├── events.js    ← Edit: Event system
│   └── ...
└── styles/
    └── styles.css   ← Edit: All styling
```

### Adding Features

**Example: Add new alert type**

1. **Update Firebase schema** - New alert field
2. **Update `alerts.js`** - Handle new alert type
3. **Update `firebase.js`** - Add alert trigger rule
4. **Update **`styles.css`** - Style new alert
5. **Test** - `npm run dev` and trigger alert

**Example: Add new dashboard page**

1. **Add HTML in `ui/pages.js`** - New template
2. **Create module `modules/newpage.js`** - Logic
3. **Import in `main.js`** - Register module
4. **Add button in `ui/topbar.js`** - Navigation
5. **Add styles in `styles.css`** - Appearance

### Common Development Tasks

**View real-time logs:**
```bash
# In another terminal, watch Firebase console
# https://console.firebase.google.com → Realtime DB → Data

# Or watch serial output from ESP32
# Arduino IDE → Tools → Serial Monitor (115200 baud)
```

**Debug JavaScript:**
```bash
# Press F12 in browser to open DevTools
# Console tab shows JavaScript errors
# Network tab shows Firebase requests
# Sources tab for breakpoint debugging
```

**Test with multiple devices:**
```bash
# Upload firmware to second ESP32 with different DEVICE_NAME
# Both should sync to same Firebase project
# Dashboard shows both devices on map
```

### Code Style

We follow these conventions:

- **Variables**: `camelCase` for variables/functions
- **Classes**: `PascalCase` for constructors
- **Constants**: `UPPER_SNAKE_CASE` for settings
- **Files**: `lowercase` with no spaces
- **Comments**: `// Single line` or `/* Multi line */`
- **Indentation**: 2 spaces (configured in `.editorconfig`)

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and test
npm run dev
# ... edit files ...

# Commit changes
git add .
git commit -m "feat: add new feature description"

# Push branch
git push origin feature/my-feature

# Create pull request (via GitHub UI)
```

---

## 🚀 Deployment

### Deploy Frontend (Web Dashboard)

**Option 1: Static Hosting (Recommended for small projects)**

```bash
# Build production bundle
npm run build

# Upload dist/ folder to any static host:
# - GitHub Pages (free)
# - Vercel (free)
# - Netlify (free)
# - AWS S3 (paid)
```

**Option 2: Firebase Hosting (Integrated with backend)**

```bash
# Install Firebase tools
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase hosting
firebase init hosting

# Deploy
firebase deploy
```

**Vercel Deployment (Most automatic):**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (connects to GitHub)
vercel

# Set environment variables in Vercel dashboard for .env
```

### Deploy Firmware (Hardware Update)

**OTA (Over-The-Air) Update:**

The firmware supports OTA updates via Wi-Fi (no USB required):

1. Build new firmware in Arduino IDE
2. Export compiled binary: **Sketch** → **Export compiled Binary**
3. Upload binary file to cloud storage (Firebase, AWS S3, etc.)
4. Device polls for updates periodically
5. Device auto-downloads and installs new firmware

### Production Checklist

- [ ] **Frontend**
  - [ ] Remove `console.log()` debug statements
  - [ ] Test on real devices/browsers
  - [ ] Run `npm run build` and verify no errors
  - [ ] Test production build with `npm run preview`
  - [ ] Set Firebase to "Production Mode" (restrict access)

- [ ] **Firmware**
  - [ ] Update WIFI_SSID and WIFI_PASSWORD
  - [ ] Set DEBUG = 0 for silent operation
  - [ ] Remove hardcoded test data
  - [ ] Test GPS acquisition in target location
  - [ ] Verify battery drain acceptable

- [ ] **Firebase**
  - [ ] Enable authentication if public data not desired
  - [ ] Set up database backups
  - [ ] Configure security rules (restrict read/write)
  - [ ] Monitor database size and read/write quotas
  - [ ] Set up alerts for quota overages

- [ ] **Security**
  - [ ] Don't commit `.env` or credentials to GitHub
  - [ ] Use environment variables for secrets
  - [ ] Rotate Firebase credentials periodically
  - [ ] Enable 2FA on Firebase account
  - [ ] Audit Firebase security rules

---

## 🐛 Troubleshooting

### GPS Not Acquiring Lock

**Symptoms:**
- GPS lock never happens
- `[ERROR] GPS timeout` in serial monitor
- Device location stuck at 0, 0

**Solutions:**

1. **Is antenna connected and external?**
   - GPS antenna must face upward (not downward)
   - Keep antenna at least 1m from building
   - Test outdoors (not indoors)
   - Try different location with clear sky

2. **Is GPS module powered?**
   - Check 5V power to SIM808
   - Use external power supply, not ESP32 USB
   - Measure voltage: should be 4.8-5.2V
   - Try a known-good power source

3. **Is UART connection correct?**
   - Check wiring: ESP32 GPIO 16 (RX2) → SIM808 TX
   - Check wiring: ESP32 GPIO 17 (TX2) → SIM808 RX
   - Try swapping RX/TX wires
   - Test with `AT+CPIN?` command

---

### Device Not Appearing on Map

**Symptoms:**
- Dashboard loads but device not visible
- Sidebar has no devices listed
- Firebase console shows no data

**Solutions:**

1. **Is ESP32 alive?**
   - Connect to Serial Monitor (115200 baud)
   - You should see connection logs
   - If nothing: check USB cable, try different port

2. **Is Wi-Fi connected?**
   - Serial log should show: `[INFO] Connected! IP: 192.168.x.x`
   - If not: Check WIFI_SSID and WIFI_PASSWORD in firmware
   - Try connecting to a different Wi-Fi network

3. **Is Firebase connected?**
   - Serial log should show: `[INFO] Firebase connected!`
   - If not: Check Firebase credentials in firmware
   - Verify database URL is correct
   - Check Firebase project exists and has Realtime DB

4. **Is data reaching Firebase?**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project → Realtime Database
   - Should see `devices` branch with device data
   - If empty: Device is not sending data

5. **Is web dashboard connected to Firebase?**
   - Open browser DevTools (F12) → Network tab
   - Should see WebSocket connection to Firebase
   - Look for `/gapi.iframes/` requests
   - If no requests: Firebase config wrong in frontend

---

### Dashboard Not Loading

**Symptoms:**
- Blank page or loading spinner forever
- Can't see map or buttons
- Browser shows error in console

**Solutions:**

1. **Clear browser cache:**
   ```
   Press Ctrl + Shift + Delete
   Select "All time" → Clear Data
   Refresh page
   ```

2. **Check console errors:**
   - Press F12 → Console tab
   - See red error messages?
   - Common issues:
     - `firebaseConfig is undefined` → Check firebase.js credentials
     - `Cannot read property 'map' of null` → Firebase DB not loading
     - `Failed to fetch` → CORS or network issue

3. **Verify Firebase project:**
   - Go to Firebase Console
   - Is Realtime Database enabled?
   - Is project URL correct in `src/config/firebase.js`?

4. **Check network connection:**
   - Is your computer online?
   - Is Wi-Fi/ethernet connected?
   - Try `ping 8.8.8.8` in terminal

---

### Geofence Not Triggering Alerts

**Symptoms:**
- Geofence created and visible on map
- Device drives into geofence
- No alert notification appears

**Solutions:**

1. **Is geofence polygon properly closed?**
   - End point should connect to start point
   - Save dialog should show completed polygon
   - If polygon is open: alerts won't trigger (validation in code)

2. **Is device location accurate?**
   - GPS coordinates might be ±meter offset
   - Draw geofence slightly larger than needed
   - Test by slowly driving through border

3. **Are alert settings correct?**
   - Check Firebase data for geofence config
   - Confirm alert type matches what you expect
   - Make sure alert is not dismissed

4. **Check Firebase logs:**
   - See if geofence crossing detection code runs
   - Check for JavaScript errors in browser console
   - Monitor Firebase functions (if using)

---

### Offline Queue Not Syncing

**Symptoms:**
- Device goes offline, queues data
- Device comes back online
- Queued data not synced to map

**Solutions:**

1. **Are offline events being queued?**
   - Bring device offline (disable Wi-Fi)
   - Watch serial console for offline messages
   - Send a few location updates
   - Bring device back online

2. **Does Firebase have write permissions?**
   - Check Firebase rules allow writes
   - Go to Firebase Console → Realtime DB → Rules
   - Ensure `.write` is enabled

3. **Is sync function being called?**
   - Check browser console for sync logs
   - Search for `syncOfflineQueue` function calls
   - Add `console.log()` to debug

---

### Performance Issues (Slow Map, Lagging)

**Symptoms:**
- Map pan/zoom is slow
- Markers don't update smoothly
- Dashboard responds slowlyto clicks

**Solutions:**

1. **Too many devices on map?**
   - Each marker requires rendering
   - Limit to <100 devices in single view
   - Use filters to show only devices of interest
   - Zoom in to show fewer devices

2. **Too many trails?**
   - Clear old trails: `clearTrails()` function
   - Reduce trail history in settings
   - Don't keep trails enabled unless needed

3. **Browser tab not in focus?**
   - Browsers throttle background tabs
   - Click on dashboard tab
   - Keep tab in focus during use

4. **Is Wi-Fi connection slow?**
   - Firebase updates only work at network speed
   - Test Wi-Fi speed: speedtest.net
   - Move closer to router
   - Try different Wi-Fi network

---

### Serial Monitor Shows Garbled Text

**Symptoms:**
- `ü╥úô½║õ◘øî╕üôú` instead of readable text
- Data looks corrupted

**Solutions:**

1. **Check baud rate:**
   - Must be **115200** (not 9600, 38400, etc.)
   - Arduino IDE → Tools → Serial Monitor
   - Dropdown in bottom-right: change to **115200**
   - Baud rate must match firmware setting

2. **Check cable quality:**
   - Try different USB cable
   - Known-good cable often fixes issues

---

## 📚 Additional Resources

- **Leaflet Docs:** https://leafletjs.com/reference/
- **Firebase Docs:** https://firebase.google.com/docs/database/
- **Arduino Docs:** https://www.arduino.cc/reference/
- **Vite Docs:** https://vitejs.dev/guide/
- **Chart.js Docs:** https://www.chartjs.org/docs/latest/

---

## 📡 Firebase Data Schema

```
{
  "devices/": {
    "deviceId": {
      "name": "Vehicle-01",
      "lat": 40.7128,
      "lng": -74.0060,
      "speed": 45,
      "heading": 270,
      "battery": 85,
      "signal": -75,
      "timestamp": 1700000000000
    }
  },
  "geofences/": {
    "geofenceId": {
      "name": "Warehouse Zone",
      "coordinates": [[lat, lng], ...],
      "alertType": "entry"
    }
  },
  "alerts/": {
    "alertId": {
      "deviceId": "deviceId",
      "type": "speed",
      "message": "Speed limit exceeded",
      "timestamp": 1700000000000,
      "dismissed": false
    }
  }
}
```

---

## 📄 License

This project is licensed under the **MIT License** - see below for details:

```
MIT License

Copyright (c) 2026 VECTOR Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Support & Contributions

**Found a bug or have a feature request?**
- Open an issue on GitHub with a clear description
- Include reproduction steps, expected behavior, and actual behavior
- Attach screenshots or logs if helpful

**Want to contribute code?**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "feat: describe your changes"`
5. Push to your fork: `git push origin feature/your-feature`
6. Open a Pull Request with description of changes

**Development Guidelines:**
- Follow the code style conventions documented in the [Development](#-development) section
- Keep commits atomic and focused
- Update README.md if adding new features
- Test on real hardware when possible

For security issues, please email instead of opening a public issue.

---

## 📝 Version History

- **v4.0** - Switched from NEO-6M to SIM808 GPS, improved offline sync, added accelerometer support

---

**VECTOR** © 2026 - Real-Time Asset Tracking Made Simple
