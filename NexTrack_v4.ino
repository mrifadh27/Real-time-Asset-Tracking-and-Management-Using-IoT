/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  VECTOR — Production Firmware v5.1 FINAL                                 ║
 * ║  Vehicle Embedded Communication Tracking Optimization & Reporting         ║
 * ║  Hardware : ESP32 + SIM808 (GPS only, no SIM) + MPU6050                  ║
 * ║  Backend  : Firebase Realtime Database via Wi-Fi (HTTPS PATCH)           ║
 * ║                                                                            ║
 * ║  FEATURES:                                                                ║
 * ║  ✅ SIM808 GPS via AT+CGNSINF — no SIM card needed                       ║
 * ║  ✅ GPS quality gates: HDOP < 3.0, satellites ≥ 4                       ║
 * ║  ✅ GPS glitch rejection via Haversine jump detection (>350 km/h)         ║
 * ║  ✅ SBAS/WAAS high-accuracy mode via PMTK commands                        ║
 * ║  ✅ MPU6050 startup auto-calibration (removes sensor bias)                ║
 * ║  ✅ IMU EMA low-pass filter (α=0.20) on accel + speed                    ║
 * ║  ✅ Pitch & roll tilt angles computed                                     ║
 * ║  ✅ Heading estimated from consecutive GPS fixes + Haversine              ║
 * ║  ✅ Vehicle state machine: PARKED / IDLE / MOVING                         ║
 * ║  ✅ Last-valid GPS cached & re-sent when signal lost                      ║
 * ║  ✅ NTP real-time clock sync — accurate Unix timestamps on Firebase       ║
 * ║  ✅ SPIFFS offline queue — stores up to 200 records, auto-syncs           ║
 * ║  ✅ lat/lng sent as JSON numbers (never strings) — map pin always works   ║
 * ║  ✅ LED status indicator                                                  ║
 * ║                                                                            ║
 * ║  WIRING (no external battery — powered entirely from ESP32):              ║
 * ║  ┌─────────────────┬──────────────────────────────────────────────────┐  ║
 * ║  │  SIM808 Module  │  ESP32                                           │  ║
 * ║  │  TX  (→ ESP32)  │  GPIO 16  (RX2)                                 │  ║
 * ║  │  RX  (← ESP32)  │  GPIO 17  (TX2)                                 │  ║
 * ║  │  VCC            │  5V pin   ← USB VBUS rail (500 mA from USB 2.0) │  ║
 * ║  │  GND            │  GND                                             │  ║
 * ║  │  PWRKEY         │  GPIO 4   (optional auto power-on)               │  ║
 * ║  ├─────────────────┼──────────────────────────────────────────────────┤  ║
 * ║  │  MPU6050        │  ESP32                                           │  ║
 * ║  │  SDA            │  GPIO 21                                         │  ║
 * ║  │  SCL            │  GPIO 22                                         │  ║
 * ║  │  VCC            │  3.3V pin (onboard LDO — MPU6050 draws ~3.9 mA) │  ║
 * ║  │  GND            │  GND                                             │  ║
 * ║  └─────────────────┴──────────────────────────────────────────────────┘  ║
 * ║                                                                            ║
 * ║  ⚡ POWER BUDGET (USB powered, no external battery):                      ║
 * ║     SIM808 GPS-only mode  ≈  50 mA (from 5V pin)                         ║
 * ║     ESP32                 ≈  80–240 mA (Wi-Fi active)                    ║
 * ║     MPU6050               ≈  3.9 mA (from 3.3V pin)                      ║
 * ║     Total                 ≈  134–294 mA — within USB 2.0 (500 mA) ✅     ║
 * ║     If you see random resets, add a 470 µF capacitor across               ║
 * ║     SIM808 VCC–GND to absorb current spikes.                              ║
 * ║                                                                            ║
 * ║  REQUIRED LIBRARIES (Arduino IDE → Library Manager):                      ║
 * ║    • MPU6050      by Electronic Cats  (or Jeff Rowberg)                   ║
 * ║    • ArduinoJson  by Benoit Blanchon  v6.x                               ║
 * ║    • Wire         (built-in)                                              ║
 * ║    • SPIFFS       (built-in ESP32 core)                                   ║
 * ║                                                                            ║
 * ║  BOARD  : ESP32 Dev Module   UPLOAD SPEED : 921600                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HardwareSerial.h>
#include <MPU6050.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <time.h>
#include <math.h>

// ════════════════════════════════════════════════════════════
//  ①  USER CONFIGURATION — EDIT THESE
// ════════════════════════════════════════════════════════════

#define WIFI_SSID        "Dialog 4G 001"
#define WIFI_PASSWORD    "22c9E2DF"

// Firebase Realtime Database host (no "https://" prefix)
#define FIREBASE_HOST    "realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app"

// Device identity (unique per tracker unit)
#define DEVICE_ID        "vector_01"
#define DEVICE_NAME      "Asset 01"

// NTP — Sri Lanka is UTC+5:30 = 19800 seconds
#define NTP_SERVER       "pool.ntp.org"
#define NTP_GMT_OFFSET    19800
#define NTP_DST_OFFSET    0

// ════════════════════════════════════════════════════════════
//  ②  PIN DEFINITIONS
// ════════════════════════════════════════════════════════════

#define SIM808_RX_PIN   16    // ESP32 GPIO16 ← SIM808 TX
#define SIM808_TX_PIN   17    // ESP32 GPIO17 → SIM808 RX
#define SIM808_PWR_PIN   4    // Pull LOW 1.2 s to toggle SIM808 PWRKEY
#define SDA_PIN         21
#define SCL_PIN         22
#define LED_PIN          2    // Built-in blue LED (active HIGH on most ESP32 boards)

// ════════════════════════════════════════════════════════════
//  ③  TUNING PARAMETERS
// ════════════════════════════════════════════════════════════

// Upload intervals
#define UPLOAD_INTERVAL_MS        5000   // send telemetry every 5 s
#define HEARTBEAT_INTERVAL_MS    10000   // send name+lastSeen every 10 s
#define OFFLINE_STORE_INTERVAL    3000   // store to SPIFFS every 3 s when GPS lost

// SIM808 / GPS
#define SIM808_BAUD               9600
#define AT_TIMEOUT_MS             3000   // max wait for AT response
#define GPS_POLL_INTERVAL_MS       500   // query SIM808 every 500 ms
#define GPS_MAX_RETRIES              3   // AT retry count per poll cycle
#define GPS_TIMEOUT_MS           30000   // 30 s without a valid fix = signal lost

// GPS quality gates (rejects low-accuracy fixes instead of sending bad data)
#define GPS_HDOP_THRESHOLD         3.0   // HDOP < 3.0 → ~<8 m accuracy
#define GPS_MIN_SATELLITES           4   // need ≥ 4 sats for a real 3-D fix
#define GPS_MAX_JUMP_KMH           350   // reject fix if implied speed > 350 km/h

// GPS coordinate bounds
#define GPS_LAT_MIN              -90.0
#define GPS_LAT_MAX               90.0
#define GPS_LNG_MIN             -180.0
#define GPS_LNG_MAX              180.0

// IMU
#define IMU_SAMPLE_HZ             100    // read MPU6050 at 100 Hz
#define IMU_LPF_ALPHA            0.20f   // EMA weight (higher = more responsive)
#define ACCEL_IDLE_THRESH        0.30f   // g — below this = not moving
#define PARKED_CONFIRM_MS        10000   // idle for 10 s → PARKED
#define IMU_CALIBRATION_SAMPLES    300   // 300 × 10 ms = 3 s calibration window

// Wi-Fi / offline
#define WIFI_RECONNECT_INTERVAL  15000
#define MAX_OFFLINE_RECORDS        200
#define OFFLINE_FILE         "/offline_queue.json"

// ════════════════════════════════════════════════════════════
//  OBJECTS & GLOBALS
// ════════════════════════════════════════════════════════════

HardwareSerial sim808(2);   // UART2: GPIO16=RX, GPIO17=TX
MPU6050        mpu;

// GPS snapshot — coordinates always stored as numbers, never strings
struct GpsSnapshot {
  double  lat        = 0.0;
  double  lng        = 0.0;
  double  altitude   = 0.0;
  double  speed_kmh  = 0.0;
  double  hdop       = 99.9;
  int     satellites = 0;
  float   heading    = 0.0f;   // degrees 0–360
  bool    valid      = false;
};

GpsSnapshot gpsNow;           // latest GPS poll result
GpsSnapshot gpsLastValid;     // last known good position (cached)
bool        gpsEverValid = false;

// EMA-smoothed speed — stable display value, also used by state machine
float speedFiltered = 0.0f;

// IMU
float accelX_f = 0.0f, accelY_f = 0.0f, accelZ_f = 1.0f;
float accelNorm = 0.0f;
float pitch_deg = 0.0f, roll_deg = 0.0f;

// MPU6050 startup calibration offsets
int16_t axOffset = 0, ayOffset = 0, azOffset = 0;
bool    mpuCalibrated = false;
bool    mpuOk         = false;

// Vehicle state machine
enum VehicleState { STATE_PARKED, STATE_MOVING, STATE_IDLE };
VehicleState vehicleState = STATE_PARKED;

// Timers
unsigned long lastUpload        = 0;
unsigned long lastHeartbeat     = 0;
unsigned long lastImuSample     = 0;
unsigned long parkedSince       = 0;
unsigned long ledLastBlink      = 0;
unsigned long lastGpsValid      = 0;
unsigned long lastOfflineStore  = 0;
unsigned long lastWifiRetry     = 0;
unsigned long lastGpsPoll       = 0;

// Flags
bool ledState      = false;
bool gpsSignalLost = false;
bool isOfflineMode = false;
bool ntpSynced     = false;
int  offlineCount  = 0;

// ±4g range = 8192 LSB/g  (better dynamic range for vehicles than ±2g)
const float LSB_PER_G = 8192.0f;
const float RAD2DEG   = 57.2957795f;

// ════════════════════════════════════════════════════════════
//  FUNCTION DECLARATIONS
// ════════════════════════════════════════════════════════════

void   connectWiFi();
void   syncNTP();
long   getEpochSec();
bool   sendToFirebase(bool heartbeatOnly = false);
void   pollSIM808GPS();
void   readIMU();
void   calibrateMPU6050();
void   runStateMachine();
void   blinkLed(int times, int ms = 80);
bool   sendAT(const char* cmd, const char* expect, uint32_t timeout = AT_TIMEOUT_MS);
void   powerOnSIM808();
bool   parseCGNSINF(const String& line, GpsSnapshot& out);
void   configureGPS();
double haversineM(double lat1, double lon1, double lat2, double lon2);

void   initSPIFFS();
void   storeOfflineRecord();
void   syncOfflineRecords();
int    countOfflineRecords();
void   buildPayload(String& payload, bool heartbeatOnly,
                    bool offline = false, long ts = 0);

// ════════════════════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println(F("\n╔══════════════════════════════════════════════╗"));
  Serial.println(F("║     VECTOR  Real-Time Asset Tracking  v5.1  ║"));
  Serial.printf ("║  Device  : %-30s ║\n", DEVICE_ID);
  Serial.printf ("║  Network : %-30s ║\n", WIFI_SSID);
  Serial.println(F("╚══════════════════════════════════════════════╝\n"));

  pinMode(LED_PIN, OUTPUT);
  blinkLed(3, 150);

  // ── SPIFFS offline storage ──────────────────────────────
  initSPIFFS();

  // ── I2C / MPU6050 ───────────────────────────────────────
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);          // 400 kHz fast mode
  mpu.initialize();

  if (!mpu.testConnection()) {
    Serial.println(F("[MPU] ❌ Not found — IMU data will be zero"));
    mpuOk = false;
  } else {
    mpuOk = true;
    Serial.println(F("[MPU] ✅ MPU6050 connected"));

    // 42 Hz digital low-pass filter — suppresses engine vibration noise
    mpu.setDLPFMode(MPU6050_DLPF_BW_42);
    // Sample rate = 1000 / (9+1) = 100 Hz
    mpu.setRate(9);
    // ±4g range — captures normal driving forces without saturation
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_4);
    // ±250°/s gyro range
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);

    // Auto-calibrate: removes manufacturing bias (keep device STILL during this)
    calibrateMPU6050();
  }

  // ── SIM808 UART ──────────────────────────────────────────
  sim808.begin(SIM808_BAUD, SERIAL_8N1, SIM808_RX_PIN, SIM808_TX_PIN);
  delay(500);
  powerOnSIM808();

  // ── Enable SIM808 built-in GPS ───────────────────────────
  Serial.println(F("[SIM808] Enabling GNSS power..."));
  for (int i = 0; i < 3; i++) {
    if (sendAT("AT+CGNSPWR=1", "OK", 3000)) break;
    delay(500);
  }
  delay(1000);
  sendAT("AT+CGNSURC=0", "OK", 1000);   // disable unsolicited NMEA (we poll manually)
  configureGPS();                         // SBAS/WAAS high-accuracy mode

  Serial.println(F("[SIM808] ✅ GNSS started — first fix takes 30–120 s outdoors"));

  // ── Wi-Fi + NTP ──────────────────────────────────────────
  connectWiFi();

  parkedSince  = millis();
  lastGpsValid = millis();
}

// ════════════════════════════════════════════════════════════
//  LOOP
// ════════════════════════════════════════════════════════════

void loop() {
  const unsigned long now = millis();

  // ── Poll SIM808 GPS every 500 ms ────────────────────────
  if (now - lastGpsPoll >= GPS_POLL_INTERVAL_MS) {
    lastGpsPoll = now;
    pollSIM808GPS();
  }

  // ── IMU at 100 Hz ───────────────────────────────────────
  if (now - lastImuSample >= (1000 / IMU_SAMPLE_HZ)) {
    lastImuSample = now;
    if (mpuOk) { readIMU(); runStateMachine(); }
  }

  // ── GPS timeout detection ────────────────────────────────
  if (gpsNow.valid) {
    lastGpsValid  = now;
    gpsSignalLost = false;
  } else if (now - lastGpsValid > GPS_TIMEOUT_MS && !gpsSignalLost) {
    gpsSignalLost = true;
    Serial.println(F("[GPS] ⚠️  Signal LOST — using last known position"));
  }

  // ── Wi-Fi watchdog ───────────────────────────────────────
  bool wifiUp = (WiFi.status() == WL_CONNECTED);
  if (!wifiUp) {
    isOfflineMode = true;
    if (now - lastWifiRetry > WIFI_RECONNECT_INTERVAL) {
      lastWifiRetry = now;
      Serial.println(F("[WiFi] Reconnecting..."));
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  } else if (isOfflineMode) {
    isOfflineMode = false;
    Serial.println(F("[WiFi] ✅ Reconnected — syncing offline data"));
    syncNTP();
    syncOfflineRecords();
  }

  // ── LED blink rate encodes status ────────────────────────
  // Fast  200 ms = Wi-Fi offline
  // Med   500 ms = Waiting for GPS fix
  // Slow 1200 ms = All good
  unsigned long blinkPeriod = isOfflineMode ? 200 : (!gpsNow.valid ? 500 : 1200);
  if (now - ledLastBlink > blinkPeriod) {
    ledLastBlink = now;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
  }

  // ── Heartbeat (name + lastSeen only, minimal data) ───────
  if (wifiUp && now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    sendToFirebase(true);
  }

  // ── Main telemetry upload ────────────────────────────────
  if (now - lastUpload >= UPLOAD_INTERVAL_MS) {
    lastUpload = now;

    const GpsSnapshot& g = gpsNow.valid ? gpsNow : gpsLastValid;
    Serial.printf("[GPS] valid:%d hdop:%.1f sats:%d lat:%.6f lng:%.6f spd:%.1f hdg:%.0f\n",
      gpsNow.valid, g.hdop, g.satellites, g.lat, g.lng, speedFiltered, g.heading);
    Serial.printf("[IMU] accel:%.3fg pitch:%.1f° roll:%.1f° cal:%s\n",
      accelNorm, pitch_deg, roll_deg, mpuCalibrated ? "yes" : "no");
    Serial.printf("[SYS] WiFi:%s GPS:%s Offline:%d NTP:%s\n",
      wifiUp ? "UP" : "DOWN", gpsNow.valid ? "OK" : "LOST",
      offlineCount, ntpSynced ? "synced" : "unsynced");

    if (wifiUp) {
      bool ok = sendToFirebase(false);
      if (ok) {
        Serial.println(F("[FB] ✅ Upload OK"));
        blinkLed(2, 50);
      } else {
        Serial.println(F("[FB] ❌ Failed — stored offline"));
        storeOfflineRecord();
        blinkLed(6, 60);
      }
    } else {
      Serial.println(F("[FB] Wi-Fi down — storing offline"));
      storeOfflineRecord();
    }
  }

  // ── Keep storing while GPS is lost (offline) ────────────
  if (gpsSignalLost && now - lastOfflineStore >= OFFLINE_STORE_INTERVAL) {
    lastOfflineStore = now;
    storeOfflineRecord();
  }
}

// ════════════════════════════════════════════════════════════
//  MPU6050 STARTUP CALIBRATION
//  Keeps device STILL for ~3 s after boot.
//  Measures raw sensor output, removes the bias automatically.
// ════════════════════════════════════════════════════════════

void calibrateMPU6050() {
  Serial.println(F("[MPU] ⏳ Calibrating — keep device STILL for 3 s..."));
  blinkLed(2, 200);

  long sumAx = 0, sumAy = 0, sumAz = 0;

  for (int i = 0; i < IMU_CALIBRATION_SAMPLES; i++) {
    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    sumAx += ax;
    sumAy += ay;
    sumAz += az;
    delay(10);   // 300 × 10 ms = 3 s
  }

  // With ±4g range: 1g = 8192 LSB
  // Z-axis should read +8192 when flat (gravity pointing down)
  axOffset = (int16_t)(sumAx / IMU_CALIBRATION_SAMPLES);
  ayOffset = (int16_t)(sumAy / IMU_CALIBRATION_SAMPLES);
  azOffset = (int16_t)(sumAz / IMU_CALIBRATION_SAMPLES) - (int16_t)LSB_PER_G;

  Serial.printf("[MPU] ✅ Calibrated  axOff=%d  ayOff=%d  azOff=%d\n",
    axOffset, ayOffset, azOffset);
  mpuCalibrated = true;
  blinkLed(5, 80);   // 5 quick blinks = calibration done
}

// ════════════════════════════════════════════════════════════
//  GPS HIGH-ACCURACY CONFIGURATION
//  Sends PMTK commands to the MediaTek GPS chip inside SIM808.
//  NMEA checksums verified correct (XOR of bytes between $ and *).
// ════════════════════════════════════════════════════════════

void configureGPS() {
  Serial.println(F("[GPS] Configuring SBAS/WAAS high-accuracy mode..."));

  // PMTK301,2 — use SBAS differential correction (improves position 2-5×)
  sendAT("AT+CGNSCMD=0,\"$PMTK301,2*2E\"", "OK", 2000);

  // PMTK313,1 — enable SBAS satellite search
  sendAT("AT+CGNSCMD=0,\"$PMTK313,1*2E\"", "OK", 2000);

  // PMTK386,0 — disable static speed threshold (accurate course at low speed)
  sendAT("AT+CGNSCMD=0,\"$PMTK386,0*23\"", "OK", 2000);

  // PMTK225,0 — normal acquisition mode (not power-save) for best accuracy
  sendAT("AT+CGNSCMD=0,\"$PMTK225,0*2B\"", "OK", 2000);

  Serial.println(F("[GPS] ✅ High-accuracy GPS configured"));
}

// ════════════════════════════════════════════════════════════
//  POWER ON SIM808  (via PWRKEY pin)
// ════════════════════════════════════════════════════════════

void powerOnSIM808() {
  // Check if already awake
  if (sendAT("AT", "OK", 1000)) {
    Serial.println(F("[SIM808] Already awake"));
    return;
  }
  Serial.println(F("[SIM808] Toggling PWRKEY..."));
  pinMode(SIM808_PWR_PIN, OUTPUT);
  digitalWrite(SIM808_PWR_PIN, LOW);
  delay(1200);
  digitalWrite(SIM808_PWR_PIN, HIGH);
  delay(3000);

  if (sendAT("AT", "OK", 2000)) {
    Serial.println(F("[SIM808] ✅ Powered on"));
  } else {
    Serial.println(F("[SIM808] ⚠️  No response — check wiring and 5V supply"));
  }
}

// ════════════════════════════════════════════════════════════
//  SEND AT COMMAND & WAIT FOR EXPECTED RESPONSE
// ════════════════════════════════════════════════════════════

bool sendAT(const char* cmd, const char* expect, uint32_t timeout) {
  while (sim808.available()) sim808.read();   // flush RX buffer
  sim808.println(cmd);
  unsigned long t = millis();
  String resp = "";
  while (millis() - t < timeout) {
    while (sim808.available()) resp += (char)sim808.read();
    if (resp.indexOf(expect) >= 0) return true;
    delay(10);
  }
  return false;
}

// ════════════════════════════════════════════════════════════
//  POLL SIM808 GPS — AT+CGNSINF
//
//  Response field layout:
//  Field  0 : GNSS run status (1 = running)
//  Field  1 : Fix status (1 = valid fix)
//  Field  2 : UTC date-time (yyyyMMddHHmmss.sss)
//  Field  3 : Latitude  (decimal degrees)
//  Field  4 : Longitude (decimal degrees)
//  Field  5 : Altitude  (metres)
//  Field  6 : Speed     (m/s — converted to km/h below)
//  Field  7 : Course    (degrees)
//  Field  8 : Fix mode
//  Field  9 : Reserved
//  Field 10 : HDOP
//  Field 11 : PDOP
//  Field 12 : VDOP
//  Field 13 : Reserved
//  Field 14 : GPS satellites in view
//  Field 15 : GPS satellites used
//  Field 16 : GLONASS satellites used
// ════════════════════════════════════════════════════════════

void pollSIM808GPS() {
  for (int retry = 0; retry < GPS_MAX_RETRIES; retry++) {
    // Flush, then request
    while (sim808.available()) sim808.read();
    delay(30);
    sim808.println("AT+CGNSINF");

    // Read until we get the +CGNSINF: line
    unsigned long t = millis();
    String line = "";
    bool gotLine = false;
    while (millis() - t < AT_TIMEOUT_MS) {
      while (sim808.available()) {
        char c = (char)sim808.read();
        if (c == '\n') {
          if (line.startsWith("+CGNSINF:")) { gotLine = true; break; }
          line = "";
        } else if (c != '\r') {
          line += c;
        }
      }
      if (gotLine) break;
      delay(5);
    }
    if (!gotLine) { delay(100); continue; }

    GpsSnapshot newFix;
    if (!parseCGNSINF(line, newFix)) { delay(100); continue; }

    // ── Compute heading from consecutive valid fixes ──────
    if (newFix.valid && gpsEverValid) {
      double dLng = (newFix.lng - gpsLastValid.lng) * cos(newFix.lat * 0.017453293);
      double dLat = (newFix.lat - gpsLastValid.lat);
      if (fabs(dLat) > 1e-7 || fabs(dLng) > 1e-7) {
        float hdg = (float)(atan2(dLng, dLat) * RAD2DEG);
        if (hdg < 0) hdg += 360.0f;
        newFix.heading = hdg;
      } else {
        newFix.heading = gpsLastValid.heading;  // hold last heading while stopped
      }
    }

    // ── GPS glitch rejection — rejects impossible jumps ──
    if (newFix.valid && gpsEverValid) {
      double jumpM       = haversineM(gpsLastValid.lat, gpsLastValid.lng,
                                      newFix.lat, newFix.lng);
      double dtSec       = GPS_POLL_INTERVAL_MS / 1000.0;
      double impliedKmh  = (jumpM / dtSec) * 3.6;
      if (impliedKmh > GPS_MAX_JUMP_KMH) {
        Serial.printf("[GPS] ⚠️  Jump %.0f m (%.0f km/h) — rejected as glitch\n",
          jumpM, impliedKmh);
        return;   // discard, keep last valid
      }
    }

    // ── EMA speed smoothing (α=0.30 for speed — responsive but stable) ──
    if (newFix.valid) {
      speedFiltered = 0.30f * (float)newFix.speed_kmh + 0.70f * speedFiltered;
    }

    gpsNow = newFix;
    if (newFix.valid) {
      gpsLastValid = newFix;
      gpsEverValid = true;
    }
    return;   // success — exit retry loop
  }
}

// ════════════════════════════════════════════════════════════
//  PARSE +CGNSINF RESPONSE WITH STRICT QUALITY GATES
// ════════════════════════════════════════════════════════════

bool parseCGNSINF(const String& line, GpsSnapshot& out) {
  int colon = line.indexOf(':');
  if (colon < 0) return false;
  String data = line.substring(colon + 1);
  data.trim();

  String fields[25];
  int count = 0, start = 0;
  for (int i = 0; i <= (int)data.length() && count < 24; i++) {
    if (i == (int)data.length() || data[i] == ',') {
      fields[count++] = data.substring(start, i);
      start = i + 1;
    }
  }
  if (count < 2) return false;

  int gnssRun   = fields[0].toInt();
  int fixStatus = fields[1].toInt();

  if (gnssRun != 1) {
    // GPS chip stopped — re-enable automatically
    Serial.println(F("[GPS] GNSS not running — re-enabling..."));
    sendAT("AT+CGNSPWR=1", "OK", 3000);
    return false;
  }

  out.valid = (fixStatus == 1);
  if (!out.valid) return true;   // parsed OK but no fix yet

  if (count > 3)  out.lat        = fields[3].toDouble();
  if (count > 4)  out.lng        = fields[4].toDouble();
  if (count > 5)  out.altitude   = fields[5].toDouble();
  if (count > 6)  out.speed_kmh  = fields[6].toFloat() * 3.6f;   // m/s → km/h
  if (count > 7)  { float c = fields[7].toFloat(); if (c > 0) out.heading = c; }
  if (count > 10) out.hdop       = fields[10].toDouble();
  if (count > 15) out.satellites = fields[15].toInt();

  // ── Coordinate sanity checks ────────────────────────────
  if (out.lat == 0.0 && out.lng == 0.0)               { out.valid = false; return true; }
  if (out.lat < GPS_LAT_MIN || out.lat > GPS_LAT_MAX)  { out.valid = false; return true; }
  if (out.lng < GPS_LNG_MIN || out.lng > GPS_LNG_MAX)  { out.valid = false; return true; }
  if (isnan(out.lat) || isnan(out.lng))                { out.valid = false; return true; }

  // ── HDOP quality gate ────────────────────────────────────
  if (out.hdop > GPS_HDOP_THRESHOLD) {
    Serial.printf("[GPS] Poor HDOP=%.1f (accept <%.1f) — holding last valid\n",
      out.hdop, GPS_HDOP_THRESHOLD);
    out.valid = false;
    return true;
  }

  // ── Satellite count gate ─────────────────────────────────
  if (out.satellites < GPS_MIN_SATELLITES) {
    Serial.printf("[GPS] Only %d sats (need >=%d) — holding last valid\n",
      out.satellites, GPS_MIN_SATELLITES);
    out.valid = false;
    return true;
  }

  return true;
}

// ════════════════════════════════════════════════════════════
//  HAVERSINE DISTANCE — returns metres between two coordinates
// ════════════════════════════════════════════════════════════

double haversineM(double lat1, double lon1, double lat2, double lon2) {
  const double R    = 6371000.0;
  const double degR = 0.017453293;
  double dLat = (lat2 - lat1) * degR;
  double dLon = (lon2 - lon1) * degR;
  double a = sin(dLat/2)*sin(dLat/2)
           + cos(lat1*degR) * cos(lat2*degR) * sin(dLon/2)*sin(dLon/2);
  return R * 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
}

// ════════════════════════════════════════════════════════════
//  READ & FILTER IMU  (with calibration offset correction)
// ════════════════════════════════════════════════════════════

void readIMU() {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  // Remove startup calibration bias
  ax -= axOffset;
  ay -= ayOffset;
  az -= azOffset;

  // Convert raw ADC counts to g  (±4g range → 8192 LSB/g)
  float rawX = (float)ax / LSB_PER_G;
  float rawY = (float)ay / LSB_PER_G;
  float rawZ = (float)az / LSB_PER_G;

  // EMA low-pass filter — reduces vibration noise
  accelX_f = IMU_LPF_ALPHA * rawX + (1.0f - IMU_LPF_ALPHA) * accelX_f;
  accelY_f = IMU_LPF_ALPHA * rawY + (1.0f - IMU_LPF_ALPHA) * accelY_f;
  accelZ_f = IMU_LPF_ALPHA * rawZ + (1.0f - IMU_LPF_ALPHA) * accelZ_f;

  // Net dynamic acceleration (gravity vector removed)
  accelNorm = fabsf(sqrtf(accelX_f*accelX_f + accelY_f*accelY_f + accelZ_f*accelZ_f) - 1.0f);

  // Tilt angles
  pitch_deg = atan2f(accelX_f, sqrtf(accelY_f*accelY_f + accelZ_f*accelZ_f)) * RAD2DEG;
  roll_deg  = atan2f(accelY_f, accelZ_f) * RAD2DEG;
}

// ════════════════════════════════════════════════════════════
//  VEHICLE STATE MACHINE
// ════════════════════════════════════════════════════════════

void runStateMachine() {
  const float         speed = speedFiltered;
  const unsigned long now   = millis();

  switch (vehicleState) {
    case STATE_PARKED:
      if (speed > 3.0f || accelNorm > ACCEL_IDLE_THRESH) {
        vehicleState = STATE_MOVING;
        Serial.println(F("[STATE] PARKED → MOVING"));
      }
      break;

    case STATE_MOVING:
      if (speed < 1.5f && accelNorm < ACCEL_IDLE_THRESH) {
        vehicleState = STATE_IDLE;
        parkedSince  = now;
        Serial.println(F("[STATE] MOVING → IDLE"));
      }
      break;

    case STATE_IDLE:
      if (speed > 3.0f || accelNorm > ACCEL_IDLE_THRESH) {
        vehicleState = STATE_MOVING;
        Serial.println(F("[STATE] IDLE → MOVING"));
      } else if ((now - parkedSince) >= PARKED_CONFIRM_MS) {
        vehicleState = STATE_PARKED;
        Serial.println(F("[STATE] IDLE → PARKED"));
      }
      break;
  }
}

// ════════════════════════════════════════════════════════════
//  NTP TIME SYNC  (called after Wi-Fi connects)
// ════════════════════════════════════════════════════════════

void syncNTP() {
  if (WiFi.status() != WL_CONNECTED) return;
  Serial.println(F("[NTP] Syncing time..."));
  configTime(NTP_GMT_OFFSET, NTP_DST_OFFSET, NTP_SERVER);

  struct tm ti;
  unsigned long t = millis();
  while (!getLocalTime(&ti) && millis() - t < 5000) delay(100);

  if (getLocalTime(&ti)) {
    ntpSynced = true;
    Serial.printf("[NTP] ✅ %04d-%02d-%02d %02d:%02d:%02d (LKT)\n",
      ti.tm_year + 1900, ti.tm_mon + 1, ti.tm_mday,
      ti.tm_hour, ti.tm_min, ti.tm_sec);
  } else {
    Serial.println(F("[NTP] ⚠️  Sync failed — timestamp will use uptime"));
  }
}

// Returns Unix epoch seconds (real time if NTP synced, else uptime seconds)
long getEpochSec() {
  if (!ntpSynced) return (long)(millis() / 1000);
  time_t now;
  time(&now);
  return (long)now;
}

// ════════════════════════════════════════════════════════════
//  BUILD JSON PAYLOAD
//  lat/lng stored as JSON NUMBERS — critical for Firebase
//  map markers to render at the correct coordinates.
// ════════════════════════════════════════════════════════════

void buildPayload(String& payload, bool heartbeatOnly, bool offline, long ts) {
  StaticJsonDocument<640> doc;

  long epoch = (ts > 0) ? ts : getEpochSec();

  doc["name"]     = DEVICE_NAME;
  doc["lastSeen"] = epoch;

  if (!heartbeatOnly) {
    const GpsSnapshot& g = gpsNow.valid ? gpsNow : gpsLastValid;

    doc["lat"]          = g.lat;                                    // NUMBER
    doc["lng"]          = g.lng;                                    // NUMBER
    doc["altitude"]     = round(g.altitude          * 10.0) / 10.0;
    doc["speed"]        = round((double)speedFiltered * 10.0) / 10.0;
    doc["hdop"]         = round(g.hdop              * 100.0) / 100.0;
    doc["satellites"]   = g.satellites;
    doc["heading"]      = round((double)g.heading   * 10.0) / 10.0;
    doc["accel"]        = round((double)accelNorm   * 1000.0) / 1000.0;
    doc["pitch"]        = round((double)pitch_deg   * 10.0) / 10.0;
    doc["roll"]         = round((double)roll_deg    * 10.0) / 10.0;
    doc["gpsValid"]     = gpsNow.valid;
    doc["gpsCached"]    = (!gpsNow.valid && gpsEverValid);
    doc["offline"]      = offline;
    doc["vehicleState"] = (vehicleState == STATE_MOVING) ? "moving"
                        : (vehicleState == STATE_IDLE)   ? "idle" : "parked";
    doc["ts"]           = epoch;
  }
  serializeJson(doc, payload);
}

// ════════════════════════════════════════════════════════════
//  SEND TO FIREBASE  (raw HTTPS PATCH, no library)
// ════════════════════════════════════════════════════════════

bool sendToFirebase(bool heartbeatOnly) {
  WiFiClientSecure client;
  client.setInsecure();       // skip certificate check (acceptable for IoT)
  client.setTimeout(10);

  if (!client.connect(FIREBASE_HOST, 443)) {
    Serial.println(F("[FB] ❌ Connection failed"));
    return false;
  }

  String payload;
  buildPayload(payload, heartbeatOnly, false, 0);

  String path = String("/assets/") + DEVICE_ID + ".json";
  client.print(
    "PATCH " + path + " HTTP/1.1\r\n"
    "Host: " + FIREBASE_HOST + "\r\n"
    "Content-Type: application/json\r\n"
    "Content-Length: " + payload.length() + "\r\n"
    "Connection: close\r\n\r\n" + payload
  );

  unsigned long t = millis();
  while (!client.available() && millis() - t < 8000) delay(5);
  String status = client.readStringUntil('\n');
  while (client.available()) client.read();
  client.stop();

  if (!heartbeatOnly) {
    Serial.print(F("[FB] ")); Serial.println(status.substring(9, 15));
  }
  return status.indexOf("200") > 0;
}

// ════════════════════════════════════════════════════════════
//  CONNECT WI-FI
// ════════════════════════════════════════════════════════════

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to \"%s\" ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 20000) {
    delay(500);
    Serial.print(F("."));
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] ✅ Connected  IP: %s  RSSI: %d dBm\n",
      WiFi.localIP().toString().c_str(), WiFi.RSSI());
    isOfflineMode = false;
    syncNTP();
    syncOfflineRecords();
  } else {
    Serial.println(F("[WiFi] ❌ Timeout — entering offline mode"));
    isOfflineMode = true;
  }
}

// ════════════════════════════════════════════════════════════
//  SPIFFS — OFFLINE QUEUE MANAGEMENT
// ════════════════════════════════════════════════════════════

void initSPIFFS() {
  if (!SPIFFS.begin(true)) {
    Serial.println(F("[SPIFFS] ❌ Mount failed"));
    return;
  }
  Serial.println(F("[SPIFFS] ✅ Mounted"));
  offlineCount = countOfflineRecords();
  if (offlineCount > 0)
    Serial.printf("[SPIFFS] %d queued records found\n", offlineCount);
}

void storeOfflineRecord() {
  // Rotate file when full
  if (offlineCount >= MAX_OFFLINE_RECORDS) {
    SPIFFS.remove(OFFLINE_FILE);
    offlineCount = 0;
  }

  DynamicJsonDocument doc(32768);
  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (f && f.size() > 0) {
    DeserializationError err = deserializeJson(doc, f);
    if (err) doc.to<JsonArray>();
  }
  if (f) f.close();
  if (!doc.is<JsonArray>()) doc.to<JsonArray>();

  const GpsSnapshot& g = gpsNow.valid ? gpsNow : gpsLastValid;
  JsonObject rec = doc.as<JsonArray>().createNestedObject();
  rec["lat"]       = g.lat;
  rec["lng"]       = g.lng;
  rec["speed"]     = (double)speedFiltered;
  rec["accel"]     = (double)accelNorm;
  rec["satellites"]= g.satellites;
  rec["heading"]   = (double)g.heading;
  rec["gpsValid"]  = gpsNow.valid;
  rec["gpsCached"] = (!gpsNow.valid && gpsEverValid);
  rec["ts"]        = getEpochSec();
  rec["offline"]   = true;

  File fw = SPIFFS.open(OFFLINE_FILE, "w");
  if (!fw) { Serial.println(F("[SPIFFS] ❌ Write failed")); return; }
  serializeJson(doc, fw);
  fw.close();
  offlineCount = doc.as<JsonArray>().size();
  Serial.printf("[SPIFFS] Stored record. Total queued: %d\n", offlineCount);
}

void syncOfflineRecords() {
  if (!SPIFFS.exists(OFFLINE_FILE)) return;

  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (!f || !f.size()) { if (f) f.close(); return; }

  DynamicJsonDocument doc(32768);
  DeserializationError err = deserializeJson(doc, f);
  f.close();

  if (err || !doc.is<JsonArray>()) {
    Serial.println(F("[SYNC] ❌ Corrupt file — clearing"));
    SPIFFS.remove(OFFLINE_FILE);
    offlineCount = 0;
    return;
  }

  JsonArray arr = doc.as<JsonArray>();
  if (!arr.size()) { SPIFFS.remove(OFFLINE_FILE); offlineCount = 0; return; }

  Serial.printf("[SYNC] Uploading %d queued records...\n", (int)arr.size());
  int uploaded = 0;

  for (JsonObject rec : arr) {
    if (WiFi.status() != WL_CONNECTED) break;

    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(8);
    if (!client.connect(FIREBASE_HOST, 443)) continue;

    StaticJsonDocument<512> pd;
    pd["deviceId"]   = DEVICE_ID;
    pd["deviceName"] = DEVICE_NAME;
    pd["lat"]        = (double)rec["lat"];
    pd["lng"]        = (double)rec["lng"];
    pd["speed"]      = (double)rec["speed"];
    pd["accel"]      = (double)rec["accel"];
    pd["satellites"] = (int)   rec["satellites"];
    pd["heading"]    = (double)rec["heading"];
    pd["gpsValid"]   = (bool)  rec["gpsValid"];
    pd["gpsCached"]  = (bool)  rec["gpsCached"];
    pd["ts"]         = (long)  rec["ts"];
    pd["offline"]    = true;

    String body;
    serializeJson(pd, body);

    client.print(
      "POST /offline_data.json HTTP/1.1\r\n"
      "Host: " + String(FIREBASE_HOST) + "\r\n"
      "Content-Type: application/json\r\n"
      "Content-Length: " + body.length() + "\r\n"
      "Connection: close\r\n\r\n" + body
    );

    unsigned long t = millis();
    while (!client.available() && millis() - t < 6000) delay(5);
    String status = client.readStringUntil('\n');
    while (client.available()) client.read();
    client.stop();

    if (status.indexOf("200") > 0) uploaded++;
    delay(100);
  }

  Serial.printf("[SYNC] ✅ %d / %d uploaded\n", uploaded, (int)arr.size());

  if (uploaded == (int)arr.size()) {
    SPIFFS.remove(OFFLINE_FILE);
    offlineCount = 0;
  } else {
    // Keep the records that weren't uploaded yet
    DynamicJsonDocument rem(32768);
    JsonArray remArr = rem.to<JsonArray>();
    int i = 0;
    for (JsonObject rec : arr) {
      if (i >= uploaded) remArr.add(rec);
      i++;
    }
    File fw = SPIFFS.open(OFFLINE_FILE, "w");
    if (fw) { serializeJson(rem, fw); fw.close(); }
    offlineCount = remArr.size();
  }
}

int countOfflineRecords() {
  if (!SPIFFS.exists(OFFLINE_FILE)) return 0;
  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (!f || !f.size()) { if (f) f.close(); return 0; }
  DynamicJsonDocument doc(32768);
  deserializeJson(doc, f);
  f.close();
  return doc.is<JsonArray>() ? (int)doc.as<JsonArray>().size() : 0;
}

// ════════════════════════════════════════════════════════════
//  LED BLINK HELPER
// ════════════════════════════════════════════════════════════

void blinkLed(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH); delay(ms);
    digitalWrite(LED_PIN, LOW);  delay(ms);
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  FIREBASE DATA STRUCTURE  (/assets/vector_01)
 *
 *  {
 *    "name":         "Asset 01",
 *    "lat":          6.921944,       ← NUMBER — never string
 *    "lng":          79.847778,      ← NUMBER — never string
 *    "altitude":     7.5,            ← metres
 *    "speed":        42.3,           ← km/h  (EMA-smoothed)
 *    "hdop":         1.20,           ← < 3.0 accepted; ≥ 3.0 held/cached
 *    "satellites":   8,              ← ≥ 4 required
 *    "heading":      245.3,          ← 0–360° compass bearing
 *    "accel":        0.082,          ← g  (gravity removed, calibrated)
 *    "pitch":        -3.1,           ← degrees  (+ = nose up)
 *    "roll":         0.9,            ← degrees  (+ = right tilt)
 *    "vehicleState": "moving",       ← "moving" | "idle" | "parked"
 *    "gpsValid":     true,           ← current fix passes all quality gates
 *    "gpsCached":    false,          ← true = showing last-known position
 *    "offline":      false,
 *    "ts":           1712345678,     ← Unix epoch seconds (NTP-synced)
 *    "lastSeen":     1712345678
 *  }
 *
 *  LED STATUS CODES:
 *    Very fast  200 ms  blink = Wi-Fi offline
 *    Fast       500 ms  blink = Waiting for GPS fix
 *    Slow      1200 ms  blink = All systems good
 *    2 quick blinks           = Firebase upload OK
 *    6 rapid blinks           = Firebase upload failed → stored offline
 *    5 rapid blinks           = MPU6050 calibration complete
 *
 *  FIREBASE RULES (open for development — tighten before production):
 *  {
 *    "rules": { ".read": true, ".write": true }
 *  }
 * ═══════════════════════════════════════════════════════════════════════════
 */
