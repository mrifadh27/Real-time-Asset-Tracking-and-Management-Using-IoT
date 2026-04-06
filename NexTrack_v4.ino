/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  NexTrack v5.0 — Production Firmware                                    ║
 * ║  ESP32 + SIM808 (GPS via AT commands, no SIM needed) + MPU6050          ║
 * ║  → Firebase Realtime DB via Wi-Fi                                       ║
 * ║                                                                          ║
 * ║  WHAT CHANGED FROM v4.0:                                                ║
 * ║  ✅ SWITCHED FROM NEO-6M  to SIM808 built-in GPS (AT+CGNSINF)          ║
 * ║  ✅ GPS works WITHOUT a SIM card (module only needs power)              ║
 * ║  ✅ lat/lng sent as JSON numbers (not strings) → map always shows pin   ║
 * ║  ✅ Last-valid GPS position cached & re-sent when signal lost           ║
 * ║  ✅ Improved offline SPIFFS sync (keeps partial records)                ║
 * ║  ✅ MPU6050 tilt/impact angle computed (pitch & roll)                   ║
 * ║  ✅ Vehicle heading estimated from consecutive GPS fixes                ║
 * ║  ✅ Heartbeat sends device name so dashboard always shows label         ║
 * ║                                                                          ║
 * ║  WIRING:                                                                 ║
 * ║  ┌────────────────┬──────────────────────────────┐                      ║
 * ║  │ SIM808 Module  │  ESP32                       │                      ║
 * ║  │ TX (SIM808→)   │  GPIO 16 (RX2)               │                      ║
 * ║  │ RX (SIM808←)   │  GPIO 17 (TX2)               │                      ║
 * ║  │ VCC            │  5 V (or external 4 V supply) │                      ║
 * ║  │ GND            │  GND                          │                      ║
 * ║  │ PWRKEY         │  GPIO 4  (optional power-on)  │                      ║
 * ║  ├────────────────┼──────────────────────────────┤                      ║
 * ║  │ MPU6050        │  ESP32                        │                      ║
 * ║  │ SDA            │  GPIO 21                      │                      ║
 * ║  │ SCL            │  GPIO 22                      │                      ║
 * ║  │ VCC            │  3.3 V                        │                      ║
 * ║  │ GND            │  GND                          │                      ║
 * ║  └────────────────┴──────────────────────────────┘                      ║
 * ║                                                                          ║
 * ║  SIM808 GPS NOTE:                                                        ║
 * ║  The SIM808 has a built-in GPS receiver that works entirely without      ║
 * ║  a SIM card.  We communicate via AT commands on UART2.                  ║
 * ║  Keep the SIM808 GPS antenna (small ceramic patch) facing the sky.      ║
 * ║  First fix can take 30-120 s outdoors.                                   ║
 * ║                                                                          ║
 * ║  REQUIRED LIBRARIES (Arduino Library Manager):                           ║
 * ║    • MPU6050       by Electronic Cats (or Jeff Rowberg)                  ║
 * ║    • ArduinoJson   by Benoit Blanchon  v6.x                              ║
 * ║    • Wire          (built-in)                                            ║
 * ║    • SPIFFS        (built-in ESP32)                                      ║
 * ║                                                                          ║
 * ║  Board: ESP32 Dev Module  |  Upload Speed: 921600                        ║
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
#include <math.h>

// ════════════════════════════════════════════
//  ①  USER CONFIGURATION — EDIT THESE
// ════════════════════════════════════════════

// WiFi
#define WIFI_SSID       "MrTecno"
#define WIFI_PASSWORD   "00000000"

// Firebase Realtime Database host (without https://)
#define FIREBASE_HOST   "realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app"
// Optional: database auth token/secret if your DB rules require auth
#define FIREBASE_AUTH_TOKEN ""

// Device identity (change per unit)
#define DEVICE_ID       "tracker_01"
#define DEVICE_NAME     "Vehicle 01"

// ════════════════════════════════════════════
//  ②  PIN DEFINITIONS
// ════════════════════════════════════════════
#define SIM808_RX_PIN   16   // ESP32 RX2 ← SIM808 TX
#define SIM808_TX_PIN   17   // ESP32 TX2 → SIM808 RX
#define SIM808_PWR_PIN   4   // Optional: drive LOW 1 s to power-on SIM808
#define SDA_PIN         21
#define SCL_PIN         22
#define LED_PIN          2

// ════════════════════════════════════════════
//  ③  TUNING PARAMETERS
// ════════════════════════════════════════════
#define UPLOAD_INTERVAL_MS      5000
#define OFFLINE_STORE_INTERVAL  3000
#define SIM808_BAUD             9600
#define IMU_SAMPLE_HZ           50
#define IMU_LPF_ALPHA           0.15f
#define ACCEL_IDLE_THRESH       0.30f
#define PARKED_CONFIRM_MS       10000
#define HEARTBEAT_INTERVAL_MS   10000
#define MAX_OFFLINE_RECORDS     200
#define OFFLINE_FILE            "/offline_queue.json"
#define WIFI_RECONNECT_INTERVAL 15000
#define GPS_TIMEOUT_MS          15000   // 15 s with no valid fix = signal lost
#define AT_TIMEOUT_MS           3000    // wait up to 3 s for AT response
#define GPS_POLL_INTERVAL_MS    1000    // poll SIM808 every 1 s

// ════════════════════════════════════════════
//  OBJECTS & GLOBALS
// ════════════════════════════════════════════
HardwareSerial sim808(2);   // UART2: GPIO16=RX, GPIO17=TX
MPU6050        mpu;

// ── GPS snapshot (always in NUMBERS, never strings) ──
struct GpsSnapshot {
  double  lat        = 0.0;
  double  lng        = 0.0;
  double  altitude   = 0.0;
  double  speed_kmh  = 0.0;
  double  hdop       = 99.9;
  int     satellites = 0;
  float   heading    = 0.0f;  // degrees 0–360
  bool    valid      = false;
};
GpsSnapshot gpsNow;
GpsSnapshot gpsLastValid;  // cached last-good fix
bool        gpsEverValid = false;

// ── IMU ──
float accelX_f = 0.0f, accelY_f = 0.0f, accelZ_f = 1.0f;
float accelNorm = 0.0f;
float pitch_deg = 0.0f;
float roll_deg  = 0.0f;

// ── State machine ──
enum VehicleState { STATE_PARKED, STATE_MOVING, STATE_IDLE };
VehicleState vehicleState = STATE_PARKED;

// ── Timers ──
unsigned long lastUpload          = 0;
unsigned long lastHeartbeat       = 0;
unsigned long lastImuSample       = 0;
unsigned long parkedSince         = 0;
unsigned long ledLastBlink        = 0;
unsigned long lastGpsValid        = 0;
unsigned long lastOfflineStore    = 0;
unsigned long lastWifiRetry       = 0;
unsigned long lastGpsPoll         = 0;

// ── Flags ──
bool ledState      = false;
bool mpuOk         = false;
bool gpsSignalLost = false;
bool isOfflineMode = false;
int  offlineCount  = 0;

const float LSB_PER_G = 16384.0f;
const float RAD2DEG   = 57.2957795f;

// ════════════════════════════════════════════
//  FUNCTION DECLARATIONS
// ════════════════════════════════════════════
void  connectWiFi();
bool  sendToFirebase(bool heartbeatOnly = false);
void  pollSIM808GPS();
void  readIMU();
void  runStateMachine();
void  blinkLed(int times, int ms = 80);
bool  sendAT(const char* cmd, const char* expect, uint32_t timeout = AT_TIMEOUT_MS);
void  powerOnSIM808();
bool  parseCGNSINF(const String& line, GpsSnapshot& out);

// Offline
void  initSPIFFS();
void  storeOfflineRecord();
void  syncOfflineRecords();
int   countOfflineRecords();
void  buildPayload(String& payload, bool heartbeatOnly,
                   bool offline = false, unsigned long ts = 0);

// ════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println(F("\n╔═══════════════════════════════════════════╗"));
  Serial.println(F("║  NexTrack v5.0  Production Firmware       ║"));
  Serial.printf ("║  Device  : %-30s ║\n", DEVICE_ID);
  Serial.printf ("║  Network : %-30s ║\n", WIFI_SSID);
  Serial.println(F("╚═══════════════════════════════════════════╝\n"));

  pinMode(LED_PIN, OUTPUT);
  blinkLed(3, 150);

  // ── SPIFFS ──
  initSPIFFS();

  // ── I2C / MPU6050 ──
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println(F("[MPU] ❌ Not found — IMU data will be 0"));
    mpuOk = false;
  } else {
    mpuOk = true;
    Serial.println(F("[MPU] ✅ MPU6050 ready"));
    mpu.setDLPFMode(5);
    mpu.setRate(19);
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);
  }

  // ── SIM808 UART ──
  sim808.begin(SIM808_BAUD, SERIAL_8N1, SIM808_RX_PIN, SIM808_TX_PIN);
  delay(200);
  powerOnSIM808();

  // ── Start GPS on SIM808 (no SIM required) ──
  Serial.println(F("[SIM808] Enabling GNSS power..."));
  sendAT("AT+CGNSPWR=1", "OK", 3000);
  delay(500);
  sendAT("AT+CGNSSEQ=\"RMC\"", "OK", 1000);
  // Set NMEA output interval 1 s (optional, we poll manually)
  sendAT("AT+CGNSURC=0", "OK", 1000);   // disable unsolicited NMEA
  Serial.println(F("[SIM808] ✅ GNSS started — waiting for fix..."));

  // ── WiFi ──
  connectWiFi();

  parkedSince  = millis();
  lastGpsValid = millis();
}

// ════════════════════════════════════════════
//  LOOP
// ════════════════════════════════════════════
void loop() {
  const unsigned long now = millis();

  // ── Poll SIM808 GPS ──
  if (now - lastGpsPoll >= GPS_POLL_INTERVAL_MS) {
    lastGpsPoll = now;
    pollSIM808GPS();
  }

  // ── IMU ──
  if (now - lastImuSample >= (1000 / IMU_SAMPLE_HZ)) {
    lastImuSample = now;
    if (mpuOk) { readIMU(); runStateMachine(); }
  }

  // ── GPS timeout detection ──
  if (gpsNow.valid) {
    lastGpsValid  = now;
    gpsSignalLost = false;
  } else if (now - lastGpsValid > GPS_TIMEOUT_MS) {
    if (!gpsSignalLost) {
      gpsSignalLost = true;
      Serial.println(F("[GPS] ⚠️  Signal LOST — using last known position"));
    }
  }

  // ── WiFi state ──
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
    syncOfflineRecords();
  }

  // ── LED patterns ──
  unsigned long blinkPeriod;
  if (isOfflineMode)         blinkPeriod = 200;
  else if (!gpsNow.valid)    blinkPeriod = 500;
  else                       blinkPeriod = 1200;

  if (now - ledLastBlink > blinkPeriod) {
    ledLastBlink = now;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
  }

  // ── Heartbeat ──
  if (wifiUp && now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    sendToFirebase(true);
  }

  // ── Main upload ──
  if (now - lastUpload >= UPLOAD_INTERVAL_MS) {
    lastUpload = now;

    // Use last valid GPS if current fix lost
    const GpsSnapshot& gpsToSend = gpsNow.valid ? gpsNow : gpsLastValid;

    Serial.printf("[GPS] Valid:%d Lat:%.6f Lng:%.6f Spd:%.1f Sats:%d Hdg:%.1f\n",
                  gpsNow.valid, gpsToSend.lat, gpsToSend.lng,
                  gpsToSend.speed_kmh, gpsToSend.satellites, gpsToSend.heading);
    Serial.printf("[IMU] accelNorm:%.3fg  pitch:%.1f°  roll:%.1f°\n",
                  accelNorm, pitch_deg, roll_deg);
    Serial.printf("[SYS] WiFi:%s GPS:%s Offline:%d\n",
                  wifiUp?"UP":"DOWN", gpsNow.valid?"OK":"LOST", offlineCount);

    if (wifiUp) {
      bool ok = sendToFirebase(false);
      if (ok) {
        Serial.println(F("[FB] ✅ Upload OK"));
        blinkLed(2, 50);
      } else {
        Serial.println(F("[FB] ❌ Upload failed — storing offline"));
        storeOfflineRecord();
        blinkLed(6, 60);
      }
    } else {
      Serial.println(F("[FB] WiFi down — storing offline"));
      storeOfflineRecord();
    }
  }

  // ── Offline-only store when GPS lost ──
  if (gpsSignalLost && now - lastOfflineStore >= OFFLINE_STORE_INTERVAL) {
    lastOfflineStore = now;
    storeOfflineRecord();
  }
}

// ════════════════════════════════════════════
//  POWER ON SIM808 (if PWRKEY wired)
// ════════════════════════════════════════════
void powerOnSIM808() {
  // Send AT to check if already awake
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
    Serial.println(F("[SIM808] ⚠️  No response — check wiring/power"));
  }
}

// ════════════════════════════════════════════
//  SEND AT COMMAND & WAIT FOR RESPONSE
// ════════════════════════════════════════════
bool sendAT(const char* cmd, const char* expect, uint32_t timeout) {
  // Flush
  while (sim808.available()) sim808.read();
  sim808.println(cmd);
  unsigned long t = millis();
  String resp = "";
  while (millis() - t < timeout) {
    while (sim808.available()) {
      char c = (char)sim808.read();
      resp += c;
    }
    if (resp.indexOf(expect) >= 0) return true;
    delay(10);
  }
  return false;
}

// ════════════════════════════════════════════
//  POLL SIM808 GPS via AT+CGNSINF
// ════════════════════════════════════════════
//  Response format:
//  +CGNSINF: <GNSS run>,<Fix status>,<UTC date-time>,
//            <lat>,<lon>,<alt>,<speed m/s>,<course>,<fix mode>,
//            <reserved1>,<HDOP>,<PDOP>,<VDOP>,<reserved2>,
//            <GPS satellites in view>,<GPS satellites used>,
//            <GLONASS satellites used>,<reserved3>,<C/N0 max>,<HPA>,<VPA>
// ════════════════════════════════════════════
void pollSIM808GPS() {
  while (sim808.available()) sim808.read(); // flush
  sim808.println("AT+CGNSINF");

  unsigned long t = millis();
  String line = "";
  bool gotLine = false;
  while (millis() - t < AT_TIMEOUT_MS) {
    while (sim808.available()) {
      char c = (char)sim808.read();
      if (c == '\n') {
        if (line.startsWith("+CGNSINF:")) {
          gotLine = true;
          break;
        }
        line = "";
      } else if (c != '\r') {
        line += c;
      }
    }
    if (gotLine) break;
    delay(5);
  }

  if (!gotLine) return;

  GpsSnapshot newFix;
  if (parseCGNSINF(line, newFix)) {
    // Compute heading from consecutive fixes
    if (gpsEverValid && gpsLastValid.lat != 0 && newFix.valid) {
      double dLng = (newFix.lng - gpsLastValid.lng) * cos(newFix.lat * 0.01745329);
      double dLat = (newFix.lat - gpsLastValid.lat);
      if (fabs(dLat) > 1e-7 || fabs(dLng) > 1e-7) {
        float hdg = (float)(atan2(dLng, dLat) * RAD2DEG);
        if (hdg < 0) hdg += 360.0f;
        newFix.heading = hdg;
      } else {
        newFix.heading = gpsLastValid.heading;
      }
    }
    gpsNow = newFix;
    if (newFix.valid) {
      gpsLastValid  = newFix;
      gpsEverValid  = true;
    }
  }
}

// ════════════════════════════════════════════
//  PARSE +CGNSINF RESPONSE
// ════════════════════════════════════════════
bool parseCGNSINF(const String& line, GpsSnapshot& out) {
  // Strip "+CGNSINF: " prefix
  int colon = line.indexOf(':');
  if (colon < 0) return false;
  String data = line.substring(colon + 1);
  data.trim();

  // Split by comma
  String fields[25];
  int count = 0;
  int start = 0;
  for (int i = 0; i <= (int)data.length() && count < 24; i++) {
    if (i == (int)data.length() || data[i] == ',') {
      fields[count++] = data.substring(start, i);
      start = i + 1;
    }
  }

  if (count < 2) return false;

  // Field 0 = GNSS run status (1 = running)
  // Field 1 = Fix status (1 = valid)
  int gnssRun  = fields[0].toInt();
  int fixStatus = fields[1].toInt();

  if (gnssRun != 1) {
    // GNSS not running — re-enable
    sendAT("AT+CGNSPWR=1", "OK", 2000);
    return false;
  }

  out.valid = (fixStatus == 1);
  if (!out.valid) return true; // parsed OK but no fix

  // Field 3 = lat, Field 4 = lon, Field 5 = alt, Field 6 = speed (m/s)
  // Field 7 = course, Field 10 = HDOP, Field 14 = sats in view, Field 15 = sats used
  if (count > 3)  out.lat       = fields[3].toDouble();
  if (count > 4)  out.lng       = fields[4].toDouble();
  if (count > 5)  out.altitude  = fields[5].toDouble();
  if (count > 6)  out.speed_kmh = fields[6].toFloat() * 3.6f;   // m/s → km/h
  if (count > 7)  { float c = fields[7].toFloat(); if (c > 0) out.heading = c; }
  if (count > 10) out.hdop      = fields[10].toDouble();
  if (count > 15) out.satellites = fields[15].toInt();

  // Sanity check
  if (out.lat == 0.0 && out.lng == 0.0) { out.valid = false; return true; }

  return true;
}

// ════════════════════════════════════════════
//  READ & FILTER IMU
// ════════════════════════════════════════════
void readIMU() {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  float rawX = (float)ax / LSB_PER_G;
  float rawY = (float)ay / LSB_PER_G;
  float rawZ = (float)az / LSB_PER_G;

  accelX_f = IMU_LPF_ALPHA * rawX + (1.0f - IMU_LPF_ALPHA) * accelX_f;
  accelY_f = IMU_LPF_ALPHA * rawY + (1.0f - IMU_LPF_ALPHA) * accelY_f;
  accelZ_f = IMU_LPF_ALPHA * rawZ + (1.0f - IMU_LPF_ALPHA) * accelZ_f;

  accelNorm = fabsf(sqrtf(accelX_f*accelX_f + accelY_f*accelY_f + accelZ_f*accelZ_f) - 1.0f);

  // Tilt angles (useful for impact detection & display)
  pitch_deg = atan2f(accelX_f, sqrtf(accelY_f*accelY_f + accelZ_f*accelZ_f)) * RAD2DEG;
  roll_deg  = atan2f(accelY_f, accelZ_f) * RAD2DEG;
}

// ════════════════════════════════════════════
//  STATE MACHINE
// ════════════════════════════════════════════
void runStateMachine() {
  const unsigned long now   = millis();
  const float         speed = (float)gpsNow.speed_kmh;

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

// ════════════════════════════════════════════
//  BUILD JSON PAYLOAD
//  lat/lng are stored as JSON NUMBERS (not strings)
//  so Firebase / index.html can do numeric comparisons
// ════════════════════════════════════════════
void buildPayload(String& payload, bool heartbeatOnly, bool offline, unsigned long ts) {
  StaticJsonDocument<640> doc;

  // Always include name & lastSeen for dashboard label
  doc["name"]     = DEVICE_NAME;
  doc["lastSeen"] = (long)millis();

  if (!heartbeatOnly) {
    // Choose GPS source: live fix OR last known
    const GpsSnapshot& g = gpsNow.valid ? gpsNow : gpsLastValid;

    // ← CRITICAL FIX: store as double numbers, not strings
    doc["lat"]          = g.lat;
    doc["lng"]          = g.lng;
    doc["altitude"]     = (double)(int(g.altitude * 10)) / 10.0;  // 1 decimal
    doc["speed"]        = (double)(int(g.speed_kmh * 10)) / 10.0;
    doc["hdop"]         = (double)(int(g.hdop * 100)) / 100.0;
    doc["satellites"]   = g.satellites;
    doc["heading"]      = (double)(int(g.heading * 10)) / 10.0;
    doc["accel"]        = (double)(int(accelNorm * 1000)) / 1000.0;
    doc["pitch"]        = (double)(int(pitch_deg * 10)) / 10.0;
    doc["roll"]         = (double)(int(roll_deg  * 10)) / 10.0;
    doc["gpsValid"]     = gpsNow.valid;
    doc["gpsCached"]    = !gpsNow.valid && gpsEverValid;   // true = showing last known pos
    doc["offline"]      = offline;

    const char* stateStr = "parked";
    if (vehicleState == STATE_MOVING) stateStr = "moving";
    else if (vehicleState == STATE_IDLE) stateStr = "idle";
    doc["vehicleState"] = stateStr;
    const long stamp = (ts > 0) ? (long)ts : (long)millis();
    doc["ts"] = stamp;
    doc["updatedAt"] = stamp;
  }

  serializeJson(doc, payload);
}

// ════════════════════════════════════════════
//  SEND TO FIREBASE
// ════════════════════════════════════════════
bool sendToFirebase(bool heartbeatOnly) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(10);

  if (!client.connect(FIREBASE_HOST, 443)) {
    Serial.println(F("[FB] ❌ Cannot connect"));
    return false;
  }

  String payload;
  buildPayload(payload, heartbeatOnly, false, 0);

  String path = String("/assets/") + DEVICE_ID + ".json";
  if (strlen(FIREBASE_AUTH_TOKEN) > 0) path += String("?auth=") + FIREBASE_AUTH_TOKEN;
  String req  = "PATCH " + path + " HTTP/1.1\r\n"
                "Host: " + FIREBASE_HOST + "\r\n"
                "Content-Type: application/json\r\n"
                "Content-Length: " + payload.length() + "\r\n"
                "Connection: close\r\n\r\n" + payload;

  client.print(req);

  unsigned long t = millis();
  while (!client.available() && millis() - t < 8000) delay(5);
  String status = client.readStringUntil('\n');
  status.trim();
  while (client.available()) client.read();
  client.stop();

  if (!heartbeatOnly) {
    Serial.print(F("[FB] ")); Serial.println(status);
  }
  return status.indexOf("200") > 0;
}

// ════════════════════════════════════════════
//  SPIFFS INIT
// ════════════════════════════════════════════
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

// ════════════════════════════════════════════
//  STORE OFFLINE RECORD
// ════════════════════════════════════════════
void storeOfflineRecord() {
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
  JsonArray arr = doc.as<JsonArray>();
  JsonObject rec = arr.createNestedObject();
  rec["lat"]        = g.lat;        // number
  rec["lng"]        = g.lng;        // number
  rec["speed"]      = g.speed_kmh;
  rec["accel"]      = (double)accelNorm;
  rec["satellites"] = g.satellites;
  rec["heading"]    = (double)g.heading;
  rec["gpsValid"]   = gpsNow.valid;
  rec["gpsCached"]  = !gpsNow.valid && gpsEverValid;
  rec["ts"]         = (long)millis();
  rec["offline"]    = true;

  File fw = SPIFFS.open(OFFLINE_FILE, "w");
  if (!fw) { Serial.println(F("[SPIFFS] ❌ Write failed")); return; }
  serializeJson(doc, fw);
  fw.close();

  offlineCount = arr.size();
  Serial.printf("[SPIFFS] Stored offline record. Total: %d\n", offlineCount);
}

// ════════════════════════════════════════════
//  SYNC OFFLINE RECORDS
// ════════════════════════════════════════════
void syncOfflineRecords() {
  if (!SPIFFS.exists(OFFLINE_FILE)) return;

  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (!f || !f.size()) { if(f) f.close(); return; }

  DynamicJsonDocument doc(32768);
  DeserializationError err = deserializeJson(doc, f);
  f.close();

  if (err || !doc.is<JsonArray>()) {
    Serial.println(F("[SYNC] ❌ Corrupt file — clearing"));
    SPIFFS.remove(OFFLINE_FILE); offlineCount = 0; return;
  }

  JsonArray arr = doc.as<JsonArray>();
  if (!arr.size()) { SPIFFS.remove(OFFLINE_FILE); offlineCount = 0; return; }

  Serial.printf("[SYNC] Uploading %d records…\n", (int)arr.size());
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
    pd["satellites"] = (int)rec["satellites"];
    pd["heading"]    = (double)rec["heading"];
    pd["gpsValid"]   = (bool)rec["gpsValid"];
    pd["gpsCached"]  = (bool)rec["gpsCached"];
    pd["ts"]         = (long)rec["ts"];
    pd["offline"]    = true;

    String body;
    serializeJson(pd, body);

    String req = "POST /offline_data.json HTTP/1.1\r\n"
                 "Host: " + String(FIREBASE_HOST) + "\r\n"
                 "Content-Type: application/json\r\n"
                 "Content-Length: " + body.length() + "\r\n"
                 "Connection: close\r\n\r\n" + body;

    client.print(req);
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
    // Keep unsynced records
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

// ════════════════════════════════════════════
//  COUNT OFFLINE RECORDS
// ════════════════════════════════════════════
int countOfflineRecords() {
  if (!SPIFFS.exists(OFFLINE_FILE)) return 0;
  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (!f || !f.size()) { if(f) f.close(); return 0; }
  DynamicJsonDocument doc(32768);
  deserializeJson(doc, f);
  f.close();
  if (!doc.is<JsonArray>()) return 0;
  return doc.as<JsonArray>().size();
}

// ════════════════════════════════════════════
//  CONNECT WiFi
// ════════════════════════════════════════════
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to \"%s\" ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long t = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t < 20000) {
    delay(500); Serial.print(F("."));
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] ✅ Connected  IP: %s  RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    isOfflineMode = false;
    syncOfflineRecords();
  } else {
    Serial.println(F("[WiFi] ❌ Failed — offline mode"));
    isOfflineMode = true;
  }
}

// ════════════════════════════════════════════
//  LED BLINK HELPER
// ════════════════════════════════════════════
void blinkLed(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH); delay(ms);
    digitalWrite(LED_PIN, LOW);  delay(ms);
  }
}

/*
 * ══════════════════════════════════════════════════════════════════
 *  FIREBASE DATA STRUCTURE (what this firmware writes)
 *
 *  /assets/tracker_01
 *  {
 *    "name":         "Vehicle 01",
 *    "lat":          7.290612,       ← NUMBER (was string in v4)
 *    "lng":          80.633742,      ← NUMBER
 *    "altitude":     112.5,
 *    "speed":        42.3,
 *    "hdop":         1.20,
 *    "satellites":   8,
 *    "heading":      245.3,          ← NEW: compass bearing 0-360°
 *    "accel":        0.082,
 *    "pitch":        -3.1,           ← NEW: tilt forward/back in °
 *    "roll":         0.9,            ← NEW: tilt side in °
 *    "vehicleState": "moving",
 *    "gpsValid":     true,
 *    "gpsCached":    false,          ← NEW: true = last known pos shown
 *    "offline":      false,
 *    "ts":           1234567890,
 *    "lastSeen":     1234567890
 *  }
 *
 *  LED STATUS CODES (v5.0)
 *    Very fast (200ms) = WiFi offline
 *    Fast (500ms)      = Waiting for GPS fix
 *    Slow (1200ms)     = All good
 *    2 quick blinks    = Firebase upload OK
 *    6 rapid blinks    = Firebase upload failed
 *
 *  FIREBASE DATABASE RULES (open for development)
 *  {
 *    "rules": { ".read": true, ".write": true }
 *  }
 * ══════════════════════════════════════════════════════════════════
 */
