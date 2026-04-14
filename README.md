# VECTOR — Real-Time IoT Vehicle Tracking System

> **Vehicle Embedded Communication, Tracking, Optimization & Reporting**
>
> A professional-grade, real-time GPS fleet tracking dashboard built with an ESP32, SIM808 GPS module, and MPU6050 IMU sensor — streaming live telemetry to a Firebase Realtime Database, visualised in a secure single-admin web application.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Hardware Components](#2-hardware-components)
3. [Circuit Connections](#3-circuit-connections)
4. [How the System Works](#4-how-the-system-works)
5. [Features](#5-features)
6. [Arduino IDE Setup](#6-arduino-ide-setup)
7. [Firebase Setup](#7-firebase-setup)
8. [Web Application Setup](#8-web-application-setup)
9. [WiFi Configuration](#9-wifi-configuration)
10. [Usage Instructions](#10-usage-instructions)
11. [Firebase Security Rules](#11-firebase-security-rules)
12. [Important Notes](#12-important-notes)
13. [Troubleshooting](#13-troubleshooting)
14. [Future Improvements](#14-future-improvements)

---

## 1. Project Overview

VECTOR is a complete end-to-end IoT vehicle tracking system designed for real-time asset monitoring. The hardware unit (ESP32 + SIM808 + MPU6050) collects GPS coordinates, speed, heading, IMU motion data, and vehicle state — then streams it to Firebase every 5 seconds over Wi-Fi.

The web dashboard provides:
- A live map with moving vehicle markers
- Geofence zones with enter/exit alerts
- Overspeed and crash impact detection
- Offline data buffering with automatic sync on reconnect
- A full Alert Center with browser push notifications and audio beeps
- Admin-only access secured by Firebase Authentication

```
[ ESP32 + SIM808 + MPU6050 ]
         │  Wi-Fi (HTTPS)
         ▼
[ Firebase Realtime Database ]
         │  Firebase SDK
         ▼
[ VECTOR Web Dashboard ]  ←  Admin browser
```

---

## 2. Hardware Components

| Component | Purpose | Qty |
|-----------|---------|-----|
| ESP32 Dev Module (38-pin) | Main controller, Wi-Fi, firmware | 1 |
| SIM808 GSM/GPS Module | GPS positioning via AT+CGNSINF | 1 |
| MPU6050 IMU | Accelerometer + gyroscope (crash / tilt detection) | 1 |
| USB cable (Micro-USB or USB-C) | Power + programming | 1 |
| Jumper wires | Module connections | ~10 |
| Optional: 470 µF capacitor | SIM808 current-spike stabiliser | 1 |

> **No SIM card is required.** The SIM808 is used in GPS-only mode via its built-in GNSS engine. All data is sent over Wi-Fi, not GSM.

---

## 3. Circuit Connections

### SIM808 → ESP32

| SIM808 Pin | ESP32 Pin | Notes |
|------------|-----------|-------|
| TX | GPIO 16 (RX2) | SIM808 transmits → ESP32 receives |
| RX | GPIO 17 (TX2) | ESP32 transmits → SIM808 receives |
| VCC | 5V (VBUS) | USB 5V rail — **must be 5V, not 3.3V** |
| GND | GND | Common ground |
| PWRKEY | GPIO 4 | Optional auto power-on (pulled LOW 1.2s) |

> ⚠️ **Critical:** SIM808 requires 5V at up to 500 mA during GPS cold-start. Connect VCC to the ESP32's 5V VBUS pin (the USB power rail), **not** the 3.3V regulator output, which cannot supply enough current.

### MPU6050 → ESP32

| MPU6050 Pin | ESP32 Pin | Notes |
|-------------|-----------|-------|
| SDA | GPIO 21 | I²C data |
| SCL | GPIO 22 | I²C clock |
| VCC | 3.3V | MPU6050 is a 3.3V device |
| GND | GND | Common ground |
| AD0 | GND | Sets I²C address to 0x68 |
| INT | Not connected | Not used |

### Wiring Diagram (text)

```
USB Laptop ──► ESP32
                │
                ├─ GPIO 16 (RX2) ◄─────── SIM808 TX
                ├─ GPIO 17 (TX2) ──────► SIM808 RX
                ├─ 5V ──────────────────► SIM808 VCC ──[470µF cap]── GND
                ├─ GPIO 4 ──────────────► SIM808 PWRKEY (optional)
                │
                ├─ GPIO 21 (SDA) ◄──────► MPU6050 SDA
                ├─ GPIO 22 (SCL) ◄──────► MPU6050 SCL
                ├─ 3.3V ────────────────► MPU6050 VCC
                └─ GND ─────────────────► MPU6050 GND + SIM808 GND
```

### Power Budget (USB-powered)

| Module | Current draw |
|--------|-------------|
| ESP32 (Wi-Fi active) | 80–240 mA |
| SIM808 (GPS-only mode) | ~50 mA |
| MPU6050 | ~4 mA |
| **Total** | **~134–294 mA** (within USB 2.0 500 mA limit ✅) |

> If you observe random reboots, add a **470 µF electrolytic capacitor** across the SIM808 VCC–GND pins to absorb current spikes during GPS cold-start.

---

## 4. How the System Works

### Step-by-step data flow

```
1. ESP32 boots
   └─► Mounts SPIFFS (offline queue storage)
   └─► Initialises MPU6050 and runs 3-second auto-calibration
   └─► Powers on SIM808 via PWRKEY
   └─► Enables GNSS (AT+CGNSPWR=1) and configures SBAS high-accuracy mode
   └─► Connects to Wi-Fi and syncs time via NTP

2. Every 500 ms — GPS poll
   └─► Sends AT+CGNSINF to SIM808
   └─► Parses GNSS response: lat, lng, speed, heading, HDOP, satellites
   └─► Quality gates: HDOP < 3.0, satellites ≥ 4, coordinate range valid
   └─► Glitch rejection: implied speed > 350 km/h → discard fix
   └─► EMA smoothing applied to speed (α = 0.30)

3. Every 10 ms — IMU read (100 Hz)
   └─► Reads accelerometer (±4g range, 8192 LSB/g)
   └─► Removes startup calibration bias offsets
   └─► Applies EMA low-pass filter (α = 0.20) — removes engine vibration
   └─► Computes net dynamic acceleration (gravity removed)
   └─► Computes pitch and roll tilt angles
   └─► Runs vehicle state machine: PARKED → MOVING → IDLE → PARKED

4. Every 5 seconds — Firebase upload (when Wi-Fi up)
   └─► Builds JSON payload (lat/lng as numbers, never strings)
   └─► Sends HTTPS PATCH to /assets/{device_id}.json?auth=SECRET
   └─► On HTTP 200: LED blinks twice ✅
   └─► On failure: stores to SPIFFS offline queue, LED blinks 6 times

5. On Wi-Fi reconnect
   └─► Re-syncs NTP time
   └─► Uploads all queued SPIFFS records to /offline_data
   └─► Clears queue on success

6. Web dashboard (browser)
   └─► Firebase auth check — only admin email allowed
   └─► Subscribes to /assets and /alerts via Firebase .on('value')
   └─► Renders Leaflet map with live device markers
   └─► Runs geofence detection, overspeed check, crash detection per update
   └─► Fires alerts → Alert Center + OS push notification + audio beep
```

---

## 5. Features

### Firmware (ESP32)
- ✅ SIM808 GPS via AT+CGNSINF (no SIM card needed)
- ✅ SBAS/WAAS differential correction for higher GPS accuracy (~3m HDOP)
- ✅ GPS quality gates (HDOP < 3.0, ≥4 satellites, coordinate range check)
- ✅ GPS glitch rejection (rejects fixes implying speed > 350 km/h)
- ✅ Last-valid GPS cached and re-sent when signal is lost
- ✅ MPU6050 startup auto-calibration (3-second window, removes sensor bias)
- ✅ IMU EMA low-pass filter (removes engine vibration noise)
- ✅ Vehicle state machine: PARKED / IDLE / MOVING
- ✅ Crash detection via g-force threshold
- ✅ Pitch and roll tilt angles
- ✅ NTP real-time clock sync (accurate Unix timestamps)
- ✅ SPIFFS offline queue (up to 200 records per device)
- ✅ Auto-sync offline data on Wi-Fi reconnect
- ✅ LED status indicator (blink patterns encode system state)

### Web Dashboard
- ✅ Admin-only access (Firebase Auth email/password)
- ✅ Real-time Leaflet map with animated vehicle markers
- ✅ Per-device geofence (click-to-draw on map, enter/exit detection)
- ✅ Overspeed alerts with configurable threshold
- ✅ Crash impact alerts with configurable g-force threshold
- ✅ Offline/online device status detection
- ✅ Alert Center with filters (Offline, Geofence, Speed, Crash, Sync)
- ✅ Browser push notifications (OS-level) for all critical alerts
- ✅ Audio beeps with distinct tones per alert type
- ✅ Unread alert badge + browser tab title badge
- ✅ Analytics page (speed chart, activity chart, distance per device)
- ✅ Route playback of recorded GPS track
- ✅ OSRM route planning to any destination
- ✅ Offline data sync management
- ✅ Dark/light theme toggle (persisted across refresh)
- ✅ Settings: all thresholds configurable, persisted to localStorage

---

## 6. Arduino IDE Setup

### 6.1 Install Arduino IDE

Download and install **Arduino IDE 2.x** from [arduino.cc/en/software](https://www.arduino.cc/en/software).

### 6.2 Add ESP32 Board Support

1. Open Arduino IDE → **File → Preferences**
2. In **"Additional boards manager URLs"** paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Click **OK**
4. Go to **Tools → Board → Boards Manager**
5. Search **"esp32"** → Install **"esp32 by Espressif Systems"** (version 2.x or later)

### 6.3 Select Board and Port

- **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
- **Tools → Upload Speed → 921600**
- **Tools → Flash Size → 4MB (32Mb)**
- **Tools → Partition Scheme → Default 4MB with spiffs** *(important for offline queue)*
- **Tools → Port → COMx** (Windows) or **/dev/ttyUSB0** (Linux/Mac)

### 6.4 Required Libraries

Install all of the following via **Tools → Manage Libraries**:

| Library | Author | Version |
|---------|--------|---------|
| MPU6050 | Electronic Cats (or Jeff Rowberg) | Any recent |
| ArduinoJson | Benoit Blanchon | **6.x** (not 7.x) |

The following are **built-in** to the ESP32 Arduino core (no installation needed):

- `Wire` — I²C for MPU6050
- `WiFi` + `WiFiClientSecure` — HTTPS to Firebase
- `HardwareSerial` — UART to SIM808
- `SPIFFS` — offline storage
- `time.h` — NTP

---

## 7. Firebase Setup

### 7.1 Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → enter a name → Continue
3. Disable Google Analytics (optional) → **Create project**

### 7.2 Enable Authentication

1. In the Firebase Console sidebar → **Authentication** → **Get started**
2. Click **"Email/Password"** → Enable → **Save**
3. Go to **Users** tab → **Add user**
4. Enter your admin email and password (e.g. `admin@yourdomain.com`)
5. **Remember these credentials** — they are what you use to log into the dashboard

### 7.3 Create a Realtime Database

1. Sidebar → **Realtime Database** → **Create Database**
2. Choose a location (pick the closest region to you)
3. Start in **"Test mode"** (we will lock it down in step 7.5)
4. Click **Enable**

### 7.4 Get Your Firebase Config Keys

1. Sidebar → **Project Overview** → click the **`</>`** (web) icon
2. Register app with any nickname
3. Copy the `firebaseConfig` object — you will need these values:

```js
const firebaseConfig = {
  apiKey:            "AIza...",          // ← your API key
  authDomain:        "your-project.firebaseapp.com",
  databaseURL:       "https://your-project-default-rtdb.firebasedatabase.app",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc"
};
```

4. Open `src/config/firebase.js` in the web project and replace the existing config with yours:

```js
// src/config/firebase.js  — REPLACE THIS ENTIRE BLOCK
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.REGION.firebasedatabase.app",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
```

### 7.5 Get Your Database Secret (for the ESP32)

1. Sidebar → **⚙️ Project Settings** → **Service Accounts** tab
2. Scroll down to **"Database secrets"** → **Show** → Copy the secret

You will paste this into `NexTrack_v5.ino` (see [Section 9](#9-wifi-configuration)).

---

## 8. Web Application Setup

### 8.1 Prerequisites

- [Node.js 18+](https://nodejs.org)
- npm (included with Node.js)

### 8.2 Install and Run

```bash
# 1. Extract the project zip
unzip VECTOR_RELEASE.zip
cd VECTOR_RELEASE

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open your browser at `http://localhost:5173`

### 8.3 Build for Production

```bash
npm run build
# Output is in the dist/ folder — upload to any static host
# (Netlify, Vercel, Firebase Hosting, GitHub Pages, etc.)
```

### 8.4 Deploy to Firebase Hosting (optional)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select your project, set dist as public dir
npm run build
firebase deploy
```

---

## 9. WiFi Configuration

Open `NexTrack_v5.ino` and find **Section ① USER CONFIGURATION** near the top of the file. Replace all values marked with angle brackets:

```cpp
// ════════════════════════════════════════════════════════════
//  ①  USER CONFIGURATION — EDIT THESE
// ════════════════════════════════════════════════════════════

#define WIFI_SSID        "YOUR_WIFI_NAME"       // ← your Wi-Fi network name
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"   // ← your Wi-Fi password

#define FIREBASE_HOST    "your-project-default-rtdb.REGION.firebasedatabase.app"
//                        ↑ copy from Firebase Console → Realtime Database → Data tab (without https://)

#define FIREBASE_SECRET  "YOUR_DATABASE_SECRET_HERE"
//                        ↑ from Project Settings → Service Accounts → Database secrets

#define DEVICE_ID        "vector_01"   // unique ID per tracker (no spaces)
#define DEVICE_NAME      "Asset 01"    // display name shown in the dashboard

// NTP timezone offset in seconds (Sri Lanka = UTC+5:30 = 19800)
#define NTP_GMT_OFFSET    19800        // ← adjust for your timezone
```

**After editing**, select your COM port and click **Upload** in Arduino IDE.

---

## 10. Usage Instructions

### First-time startup

1. Flash the firmware to the ESP32
2. Open Arduino IDE **Serial Monitor** at **115200 baud**
3. Watch the boot sequence:
   ```
   [MPU] ⏳ Calibrating — keep device STILL for 3 s...
   [MPU] ✅ Calibrated
   [SIM808] ✅ Powered on
   [GPS] Configuring SBAS/WAAS high-accuracy mode...
   [WiFi] ✅ Connected  IP: 192.168.x.x
   [NTP] ✅ 2025-01-01 08:30:00
   [FB] ✅ Upload OK
   ```
4. Wait for GPS first fix — can take **30–120 seconds outdoors**. Keep clear sky view.

### LED Status Codes

| Pattern | Meaning |
|---------|---------|
| Fast blink (200ms) | Wi-Fi disconnected — offline mode |
| Medium blink (500ms) | Wi-Fi connected, waiting for GPS fix |
| Slow blink (1200ms) | All systems nominal |
| 2 quick blinks | Firebase upload successful |
| 6 rapid blinks | Firebase upload failed → stored offline |
| 5 rapid blinks (boot) | MPU6050 calibration complete |

### Dashboard — Geofence Setup

1. Log into the dashboard with your admin email/password
2. Wait for the device to appear on the map (the 🚛 marker)
3. Click the device marker → click **"📐 Set Geofence for this device"**
   — OR — select the device, then click **"📐 Set Geofence"** in the right panel
4. The map cursor turns into a **crosshair** ✛
5. Click anywhere on the map to place the geofence centre
6. The geofence circle appears immediately (default 500 m radius)
7. Press **Esc** at any time to cancel without saving
8. To adjust the radius: go to **Settings → Per-Device Geofence**, change the radius number, click **Save Geofences**

From this point, every time the vehicle crosses the geofence boundary (in or out), you will see:
- An alert in the Alert Center
- A browser push notification
- An audio beep (distinct tones for enter vs exit)

---

## 11. Firebase Security Rules

In Firebase Console → **Realtime Database → Rules**, replace the default rules with:

```json
{
  "rules": {
    "assets": {
      ".read":  "auth != null && auth.token.email == 'YOUR_ADMIN_EMAIL'",
      ".write": true
    },
    "alerts": {
      ".read":  "auth != null && auth.token.email == 'YOUR_ADMIN_EMAIL'",
      ".write": "auth != null && auth.token.email == 'YOUR_ADMIN_EMAIL'"
    },
    "offline_data": {
      ".read":  "auth != null && auth.token.email == 'YOUR_ADMIN_EMAIL'",
      ".write": true
    },
    "$other": {
      ".read":  false,
      ".write": false
    }
  }
}
```

Replace `YOUR_ADMIN_EMAIL` with your exact admin email address.

**What each rule means:**

| Path | Read | Write | Reason |
|------|------|-------|--------|
| `/assets` | Admin only | Anyone | ESP32 writes with database secret (no login); dashboard reads with login |
| `/alerts` | Admin only | Admin only | Only the dashboard (logged in) writes alerts |
| `/offline_data` | Admin only | Anyone | ESP32 syncs offline records with database secret |
| Everything else | Nobody | Nobody | All other paths are completely blocked |

Click **Publish** to apply.

---

## 12. Important Notes

### Power Limitations (USB-powered)

- USB 2.0 provides **500 mA maximum**. The system draws up to 294 mA under load, leaving only ~200 mA headroom.
- Avoid connecting other USB devices to the same hub/port.
- If you see **random ESP32 resets**, the SIM808 is causing a current spike. Add a **470 µF electrolytic capacitor** (rated ≥6.3V) across the SIM808 VCC–GND pins.
- For reliable long-term deployment, use a **USB power adapter rated ≥2A** instead of a laptop USB port.

### SIM808 GPS Cold Start

- First GPS fix after power-on takes **30–120 seconds** when outdoors with clear sky view.
- Subsequent fixes (warm start) take 5–15 seconds.
- Indoors or near tall buildings, GPS may not fix at all. The firmware will use the last known position.
- The SIM808 GNSS antenna is the small ceramic patch on the module. Point it skyward.

### SIM808 Communication

- The SIM808 is used in GPS-only mode — no SIM card is inserted and no cellular data is used.
- All Firebase communication goes through the ESP32's own Wi-Fi radio.
- If the SIM808 does not respond at boot, check: VCC is 5V (not 3.3V), TX/RX wires are not swapped, and PWRKEY is connected to GPIO 4.

### Dashboard Security

- The `#app` element is hidden in the HTML by default. It is only revealed after Firebase confirms a valid authenticated session. The login page cannot be bypassed.
- Only the exact admin email configured in Firebase Rules can access any data. Even if someone knows the database URL, they cannot read without the correct authenticated session.
- The database secret in the firmware should be treated as a password — do not commit it to public version control.

---

## 13. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `[FB] 401 Un` every upload | Firebase database secret missing or wrong | Set `FIREBASE_SECRET` in the `#define` section |
| `[SIM808] No response` | SIM808 not powered or wiring issue | Check 5V on VCC, TX/RX not swapped |
| `[GPS] GNSS not running` | SIM808 powered but GNSS not enabled | Firmware auto-retries `AT+CGNSPWR=1`; wait 10s |
| GPS never gets a fix | Indoors / no sky view | Move device outdoors with clear sky |
| Map pin doesn't move | GPS valid = false (poor signal) | HDOP > 3 or sats < 4; wait for better signal |
| Login page loops | Wrong email or password | Check Firebase Auth → Users for exact email |
| Dashboard won't open | Auth rules too strict | Check Firebase Rules tab for errors |
| Geofence alert only fires once | Old firmware without cooldown fix | Flash the latest `NexTrack_v5.ino` |
| Charts show blank | Analytics page visited before data loads | Navigate away and back |

---

## 14. Future Improvements

- **Multiple admin accounts** — extend Firebase rules to support a whitelist of admin emails
- **Mobile app** — React Native app reading from same Firebase database
- **SMS alerts via GSM** — use SIM808 GSM modem (with SIM card) to send SMS on critical events
- **Historical playback** — store all GPS tracks to Firebase and replay any day's route
- **Driver scoring** — compute aggressive braking, sharp turns, and overspeed events into a driver score
- **Multiple vehicles** — VECTOR already supports N devices; add a fleet overview analytics screen
- **Geofence schedule** — different geofence radii and active hours per device
- **Battery monitoring** — add a voltage divider on an ADC pin to report battery percentage
- **OTA firmware updates** — use ESP32 OTA to push firmware over Wi-Fi without physical access
- **Encrypted SPIFFS** — encrypt the offline queue so GPS data cannot be extracted from flash

---

## License

This project is for educational and personal use. If you use this code as a base for a commercial product, please give credit to the original project.

---

## Contributing

Issues and pull requests are welcome. When reporting a bug, please include:
- Your Serial Monitor output (first 30 lines after boot)
- Your Firebase Rules (with personal details removed)
- Browser console errors (F12 → Console tab)

---

*Built with ❤️ for reliable, real-time asset tracking.*
