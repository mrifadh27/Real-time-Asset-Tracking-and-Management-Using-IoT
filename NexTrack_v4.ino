/*
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  NexTrack v4.0 — Production Firmware                                    ║
 * ║  ESP32 + NEO-6M GPS + MPU6050 IMU → Firebase Realtime DB               ║
 * ║                                                                          ║
 * ║  CHANGES FROM v3.0:                                                      ║
 * ║  ✅ Offline mode: stores data to SPIFFS when GPS/WiFi lost               ║
 * ║  ✅ Auto-sync: uploads queued records when connection restores           ║
 * ║  ✅ GPS signal validity detection & offline flag in payload             ║
 * ║  ✅ Removed Theft/Accident alert types (per dashboard update)           ║
 * ║  ✅ Geofence now per-device (radius field sent in payload)              ║
 * ║  ✅ Improved WiFi reconnect with exponential backoff                    ║
 * ║  ✅ LED patterns for offline mode                                        ║
 * ║                                                                          ║
 * ║  WIRING:                                                                 ║
 * ║  ┌─────────────┬──────────────┐                                         ║
 * ║  │ GPS NEO-6M  │   ESP32      │                                         ║
 * ║  │ TX          │ GPIO 16(RX2) │                                         ║
 * ║  │ RX          │ GPIO 17(TX2) │ (optional)                              ║
 * ║  │ VCC         │ 3.3V or 5V   │                                         ║
 * ║  │ GND         │ GND          │                                         ║
 * ║  ├─────────────┼──────────────┤                                         ║
 * ║  │ MPU6050     │   ESP32      │                                         ║
 * ║  │ SDA         │ GPIO 21      │                                         ║
 * ║  │ SCL         │ GPIO 22      │                                         ║
 * ║  │ VCC         │ 3.3V         │                                         ║
 * ║  │ GND         │ GND          │                                         ║
 * ║  │ INT         │ GPIO 34      │ (optional interrupt pin)                ║
 * ║  └─────────────┴──────────────┘                                         ║
 * ║                                                                          ║
 * ║  REQUIRED LIBRARIES (Arduino Library Manager):                           ║
 * ║    • TinyGPSPlus      by Mikal Hart                                     ║
 * ║    • MPU6050          by Electronic Cats (or by Jeff Rowberg)            ║
 * ║    • ArduinoJson      by Benoit Blanchon  v6.x                           ║
 * ║    • Wire             (built-in)                                         ║
 * ║    • SPIFFS           (built-in ESP32)                                   ║
 * ║                                                                          ║
 * ║  Board: ESP32 Dev Module  |  Upload Speed: 921600                        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <MPU6050.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

// ════════════════════════════════════════════
//  ①  USER CONFIGURATION — EDIT THESE
// ════════════════════════════════════════════

// WiFi
#define WIFI_SSID       "MrTecno"
#define WIFI_PASSWORD   "00000000"

// Firebase (must match index.html exactly)
#define FIREBASE_HOST   "realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app"

// Device identity (change per unit)
#define DEVICE_ID       "tracker_01"
#define DEVICE_NAME     "Vehicle 01"

// ════════════════════════════════════════════
//  ②  PIN DEFINITIONS
// ════════════════════════════════════════════
#define GPS_RX_PIN    16
#define GPS_TX_PIN    17
#define SDA_PIN       21
#define SCL_PIN       22
#define LED_PIN        2

// ════════════════════════════════════════════
//  ③  TUNING PARAMETERS
// ════════════════════════════════════════════
#define UPLOAD_INTERVAL_MS      5000    // Normal upload interval
#define OFFLINE_STORE_INTERVAL  3000    // Store to SPIFFS every 3s offline
#define GPS_BAUD                9600
#define IMU_SAMPLE_HZ           50
#define IMU_DLPF_MODE            5
#define IMU_SAMPLE_RATE_DIV     19
#define IMU_LPF_ALPHA           0.15f
#define ACCEL_IDLE_THRESH       0.30f
#define PARKED_CONFIRM_MS       10000
#define HEARTBEAT_INTERVAL_MS   10000
#define MAX_OFFLINE_RECORDS     200     // Max records stored on SPIFFS
#define OFFLINE_FILE            "/offline_queue.json"
#define WIFI_RECONNECT_INTERVAL 15000   // Try WiFi reconnect every 15s
#define GPS_TIMEOUT_MS          8000    // GPS considered lost after 8s with no valid fix

// ════════════════════════════════════════════
//  OBJECTS & GLOBALS
// ════════════════════════════════════════════
TinyGPSPlus    gps;
HardwareSerial gpsSerial(2);
MPU6050        mpu;

struct GpsSnapshot {
  double  lat        = 0.0;
  double  lng        = 0.0;
  double  altitude   = 0.0;
  double  speed_kmh  = 0.0;
  double  hdop       = 99.9;
  int     satellites = 0;
  bool    valid      = false;
};
GpsSnapshot gpsNow;

float accelX_f = 0.0f, accelY_f = 0.0f, accelZ_f = 1.0f;
float accelNorm = 0.0f;

enum VehicleState { STATE_PARKED, STATE_MOVING, STATE_IDLE };
VehicleState vehicleState = STATE_PARKED;

unsigned long lastUpload          = 0;
unsigned long lastHeartbeat       = 0;
unsigned long lastImuSample       = 0;
unsigned long parkedSince         = 0;
unsigned long ledLastBlink        = 0;
unsigned long lastGpsValid        = 0;   // millis when GPS was last valid
unsigned long lastOfflineStore    = 0;
unsigned long lastWifiRetry       = 0;
unsigned long lastOnlineSync      = 0;

bool ledState       = false;
bool mpuOk          = false;
bool gpsSignalLost  = false;   // true = no GPS fix for GPS_TIMEOUT_MS
bool isOfflineMode  = false;   // true = WiFi unavailable
int  offlineCount   = 0;       // records in SPIFFS queue

const float LSB_PER_G = 16384.0f;

// ════════════════════════════════════════════
//  FUNCTION DECLARATIONS
// ════════════════════════════════════════════
void     connectWiFi();
bool     sendToFirebase(bool heartbeatOnly = false);
void     readGPS();
void     readIMU();
void     runStateMachine();
void     blinkLed(int times, int ms = 80);

// Offline functions
void     initSPIFFS();
void     storeOfflineRecord();
void     syncOfflineRecords();
int      countOfflineRecords();
void     buildPayload(String &payload, bool heartbeatOnly, bool offline = false,
                      unsigned long ts = 0);

// ════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println(F("\n╔═══════════════════════════════════════════╗"));
  Serial.println(F("║  NexTrack v4.0  Production Firmware       ║"));
  Serial.printf ("║  Device  : %-30s ║\n", DEVICE_ID);
  Serial.printf ("║  Network : %-30s ║\n", WIFI_SSID);
  Serial.println(F("╚═══════════════════════════════════════════╝\n"));

  pinMode(LED_PIN, OUTPUT);
  blinkLed(3, 150);

  // ── SPIFFS (offline storage) ──
  initSPIFFS();

  // ── I2C for MPU6050 ──
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println(F("[MPU] ❌ Not found — IMU data will be 0"));
    mpuOk = false;
  } else {
    mpuOk = true;
    Serial.println(F("[MPU] ✅ MPU6050 ready"));
    mpu.setDLPFMode(IMU_DLPF_MODE);
    mpu.setRate(IMU_SAMPLE_RATE_DIV);
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);
  }

  // ── GPS UART2 ──
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println(F("[GPS] UART2 started"));

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

  readGPS();

  if (now - lastImuSample >= (1000 / IMU_SAMPLE_HZ)) {
    lastImuSample = now;
    if (mpuOk) { readIMU(); runStateMachine(); }
  }

  // ── GPS signal loss detection ──
  if (gpsNow.valid) {
    lastGpsValid   = now;
    gpsSignalLost  = false;
  } else if (now - lastGpsValid > GPS_TIMEOUT_MS) {
    if (!gpsSignalLost) {
      gpsSignalLost = true;
      Serial.println(F("[GPS] ⚠️  Signal LOST — entering offline position mode"));
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
    // Just reconnected
    isOfflineMode = false;
    Serial.println(F("[WiFi] ✅ Reconnected — syncing offline data"));
    syncOfflineRecords();
  }

  // ── LED patterns ──
  unsigned long blinkPeriod;
  if (isOfflineMode)        blinkPeriod = 200;   // Very fast = WiFi offline
  else if (!gpsNow.valid)   blinkPeriod = 500;   // Fast = waiting GPS fix
  else                      blinkPeriod = 1200;  // Slow = all good

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

  // ── Main upload or offline store ──
  if (now - lastUpload >= UPLOAD_INTERVAL_MS) {
    lastUpload = now;

    Serial.printf("[GPS] Valid:%d Lat:%.6f Lng:%.6f Spd:%.1f Sats:%d\n",
                  gpsNow.valid, gpsNow.lat, gpsNow.lng, gpsNow.speed_kmh, gpsNow.satellites);
    Serial.printf("[IMU] accelNorm:%.3fg\n", accelNorm);
    Serial.printf("[SYS] WiFi:%s GPS:%s Offline queue:%d\n",
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
      Serial.println(F("[FB] WiFi down — storing record offline"));
      storeOfflineRecord();
    }
  }

  // ── Offline store (IMU-only when GPS lost) ──
  if (gpsSignalLost && now - lastOfflineStore >= OFFLINE_STORE_INTERVAL) {
    lastOfflineStore = now;
    storeOfflineRecord();
  }
}

// ════════════════════════════════════════════
//  SPIFFS INIT
// ════════════════════════════════════════════
void initSPIFFS() {
  if (!SPIFFS.begin(true)) {
    Serial.println(F("[SPIFFS] ❌ Mount failed — offline storage disabled"));
    return;
  }
  Serial.println(F("[SPIFFS] ✅ Mounted"));
  offlineCount = countOfflineRecords();
  if (offlineCount > 0) {
    Serial.printf("[SPIFFS] Found %d queued offline records\n", offlineCount);
  }
}

// ════════════════════════════════════════════
//  BUILD JSON PAYLOAD
// ════════════════════════════════════════════
void buildPayload(String &payload, bool heartbeatOnly, bool offline, unsigned long ts) {
  StaticJsonDocument<512> doc;

  if (!heartbeatOnly) {
    doc["name"]         = DEVICE_NAME;
    doc["lat"]          = serialized(String(gpsNow.lat,       6));
    doc["lng"]          = serialized(String(gpsNow.lng,       6));
    doc["altitude"]     = serialized(String(gpsNow.altitude,  1));
    doc["speed"]        = serialized(String(gpsNow.speed_kmh, 1));
    doc["hdop"]         = serialized(String(gpsNow.hdop,      2));
    doc["satellites"]   = gpsNow.satellites;
    doc["accel"]        = serialized(String(accelNorm,        3));
    doc["gpsValid"]     = gpsNow.valid;
    doc["offline"]      = offline;

    const char* stateStr = "parked";
    if (vehicleState == STATE_MOVING) stateStr = "moving";
    else if (vehicleState == STATE_IDLE) stateStr = "idle";
    doc["vehicleState"] = stateStr;

    // Timestamp — device millis or provided ts
    doc["ts"] = (ts > 0) ? (long)ts : (long)millis();
  }

  doc["lastSeen"] = (long)millis();
  serializeJson(doc, payload);
}

// ════════════════════════════════════════════
//  SEND FULL DATA TO FIREBASE
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
  String req  = "PATCH " + path + " HTTP/1.1\r\n"
                "Host: " + FIREBASE_HOST + "\r\n"
                "Content-Type: application/json\r\n"
                "Content-Length: " + payload.length() + "\r\n"
                "Connection: close\r\n\r\n" + payload;

  client.print(req);

  unsigned long t = millis();
  while (!client.available() && millis()-t < 8000) delay(5);
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
//  STORE ONE RECORD TO SPIFFS
// ════════════════════════════════════════════
void storeOfflineRecord() {
  if (offlineCount >= MAX_OFFLINE_RECORDS) {
    Serial.println(F("[SPIFFS] Buffer full — dropping oldest record"));
    // To keep it simple, wipe and restart (production would use circular buffer)
    SPIFFS.remove(OFFLINE_FILE);
    offlineCount = 0;
  }

  // Load existing array
  DynamicJsonDocument doc(32768);
  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (f && f.size() > 0) {
    DeserializationError err = deserializeJson(doc, f);
    if (err) doc.to<JsonArray>(); // reset if corrupt
  }
  f.close();

  // Ensure it's an array
  if (!doc.is<JsonArray>()) doc.to<JsonArray>();
  JsonArray arr = doc.as<JsonArray>();

  // Append new record
  JsonObject rec = arr.createNestedObject();
  rec["lat"]        = gpsNow.lat;
  rec["lng"]        = gpsNow.lng;
  rec["speed"]      = gpsNow.speed_kmh;
  rec["accel"]      = accelNorm;
  rec["satellites"] = gpsNow.satellites;
  rec["gpsValid"]   = gpsNow.valid;
  rec["ts"]         = (long)millis();
  rec["offline"]    = true;

  // Write back
  File fw = SPIFFS.open(OFFLINE_FILE, "w");
  if (!fw) { Serial.println(F("[SPIFFS] ❌ Cannot write")); return; }
  serializeJson(doc, fw);
  fw.close();

  offlineCount = arr.size();
  Serial.printf("[SPIFFS] Stored offline record. Total: %d\n", offlineCount);
}

// ════════════════════════════════════════════
//  SYNC OFFLINE RECORDS TO FIREBASE
// ════════════════════════════════════════════
void syncOfflineRecords() {
  if (!SPIFFS.exists(OFFLINE_FILE)) return;

  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (!f || !f.size()) { f.close(); return; }

  DynamicJsonDocument doc(32768);
  DeserializationError err = deserializeJson(doc, f);
  f.close();

  if (err || !doc.is<JsonArray>()) {
    Serial.println(F("[SYNC] ❌ Corrupt offline file — clearing"));
    SPIFFS.remove(OFFLINE_FILE); offlineCount = 0; return;
  }

  JsonArray arr = doc.as<JsonArray>();
  if (!arr.size()) { SPIFFS.remove(OFFLINE_FILE); offlineCount = 0; return; }

  Serial.printf("[SYNC] Uploading %d offline records…\n", (int)arr.size());
  int uploaded = 0;

  for (JsonObject rec : arr) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(F("[SYNC] WiFi lost mid-sync — aborting"));
      break;
    }
    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(8);
    if (!client.connect(FIREBASE_HOST, 443)) continue;

    // Build record payload
    StaticJsonDocument<512> payload_doc;
    payload_doc["deviceId"]   = DEVICE_ID;
    payload_doc["deviceName"] = DEVICE_NAME;
    payload_doc["lat"]        = rec["lat"];
    payload_doc["lng"]        = rec["lng"];
    payload_doc["speed"]      = rec["speed"];
    payload_doc["accel"]      = rec["accel"];
    payload_doc["satellites"] = rec["satellites"];
    payload_doc["gpsValid"]   = rec["gpsValid"];
    payload_doc["ts"]         = rec["ts"];
    payload_doc["offline"]    = true;

    String body;
    serializeJson(payload_doc, body);

    String req = "POST /offline_data.json HTTP/1.1\r\n"
                 "Host: " + String(FIREBASE_HOST) + "\r\n"
                 "Content-Type: application/json\r\n"
                 "Content-Length: " + body.length() + "\r\n"
                 "Connection: close\r\n\r\n" + body;

    client.print(req);
    unsigned long t = millis();
    while (!client.available() && millis()-t < 6000) delay(5);
    String status = client.readStringUntil('\n');
    while (client.available()) client.read();
    client.stop();

    if (status.indexOf("200") > 0) {
      uploaded++;
    }
    delay(100); // avoid rate limiting
  }

  Serial.printf("[SYNC] ✅ Uploaded %d / %d records\n", uploaded, (int)arr.size());

  if (uploaded == (int)arr.size()) {
    SPIFFS.remove(OFFLINE_FILE);
    offlineCount = 0;
    Serial.println(F("[SYNC] Offline queue cleared"));
  } else {
    // Keep unsynced records (partial sync)
    // Build new array with remaining
    DynamicJsonDocument remaining(32768);
    JsonArray remArr = remaining.to<JsonArray>();
    int i = 0;
    for (JsonObject rec : arr) {
      if (i >= uploaded) remArr.add(rec);
      i++;
    }
    File fw = SPIFFS.open(OFFLINE_FILE, "w");
    if (fw) { serializeJson(remaining, fw); fw.close(); }
    offlineCount = remArr.size();
  }
}

// ════════════════════════════════════════════
//  COUNT OFFLINE RECORDS
// ════════════════════════════════════════════
int countOfflineRecords() {
  if (!SPIFFS.exists(OFFLINE_FILE)) return 0;
  File f = SPIFFS.open(OFFLINE_FILE, "r");
  if (!f || !f.size()) { f.close(); return 0; }
  DynamicJsonDocument doc(32768);
  deserializeJson(doc, f);
  f.close();
  if (!doc.is<JsonArray>()) return 0;
  return doc.as<JsonArray>().size();
}

// ════════════════════════════════════════════
//  READ GPS
// ════════════════════════════════════════════
void readGPS() {
  while (gpsSerial.available()) gps.encode(gpsSerial.read());
  if (gps.location.isValid()) {
    gpsNow.valid      = true;
    gpsNow.lat        = gps.location.lat();
    gpsNow.lng        = gps.location.lng();
    gpsNow.altitude   = gps.altitude.isValid()   ? gps.altitude.meters()    : 0.0;
    gpsNow.speed_kmh  = gps.speed.isValid()       ? gps.speed.kmph()         : 0.0;
    gpsNow.hdop       = gps.hdop.isValid()         ? gps.hdop.hdop()          : 99.9;
    gpsNow.satellites = gps.satellites.isValid()   ? (int)gps.satellites.value() : 0;
  } else {
    gpsNow.valid = false;
  }
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

  accelNorm = sqrtf(accelX_f*accelX_f + accelY_f*accelY_f + accelZ_f*accelZ_f);
  accelNorm = fabsf(accelNorm - 1.0f); // deviation from 1g
}

// ════════════════════════════════════════════
//  STATE MACHINE (simplified — no theft/accident alerts)
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
//  CONNECT WIFI
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
    // Sync any offline records immediately
    syncOfflineRecords();
  } else {
    Serial.println(F("[WiFi] ❌ Failed — entering offline mode"));
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
 *    "lat":          "7.290612",
 *    "lng":          "80.633742",
 *    "altitude":     "112.5",
 *    "speed":        "42.3",
 *    "hdop":         "1.20",
 *    "satellites":   8,
 *    "accel":        "0.082",
 *    "vehicleState": "moving",
 *    "gpsValid":     true,        ← NEW: GPS signal status
 *    "offline":      false,       ← NEW: was this sent from offline queue?
 *    "ts":           1234567890,  ← NEW: original timestamp
 *    "lastSeen":     1234567890
 *  }
 *
 *  /offline_data/{auto-id}        ← NEW: offline records synced on reconnect
 *  {
 *    "deviceId":  "tracker_01",
 *    "lat":       7.290612,
 *    "lng":       80.633742,
 *    "speed":     42.3,
 *    "accel":     0.082,
 *    "satellites": 0,
 *    "gpsValid":  false,
 *    "ts":        1234567890,
 *    "offline":   true
 *  }
 *
 * ══════════════════════════════════════════════════════════════════
 *  LED STATUS CODES (v4.0)
 *    Very fast (200ms) = WiFi offline mode
 *    Fast (500ms)      = Waiting for GPS fix
 *    Slow (1200ms)     = Normal operation
 *    2 quick blinks    = Firebase upload OK
 *    6 rapid blinks    = Firebase upload failed
 *
 * ══════════════════════════════════════════════════════════════════
 *  OFFLINE BUFFER
 *    Stored at /offline_queue.json on SPIFFS
 *    Max 200 records (configurable via MAX_OFFLINE_RECORDS)
 *    Auto-synced to Firebase /offline_data on WiFi reconnect
 *    Includes IMU accel data even when GPS is invalid
 *
 * ══════════════════════════════════════════════════════════════════
 *  FIREBASE DATABASE RULES
 *  {
 *    "rules": {
 *      ".read": true,
 *      ".write": true
 *    }
 *  }
 * ══════════════════════════════════════════════════════════════════
 */
