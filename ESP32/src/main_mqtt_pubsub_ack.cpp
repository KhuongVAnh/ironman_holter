#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include <ctype.h>

// Cấu hình Wi-Fi và MQTT cho bản PubSubClient + ACK ứng dụng.
static const char *WIFI_SSID = "Nhan Home";
static const char *WIFI_PASSWORD = "nhanhome";
static const char *MQTT_BROKER_HOST = "7fca0eea573545b996b5e3b23e7e5613.s1.eu.hivemq.cloud";
static const int MQTT_BROKER_PORT = 8883;
static const char *MQTT_USERNAME = "iron-holter";
static const char *MQTT_PASSWORD = "Vanh080105";
static const char *MQTT_CLIENT_ID = "esp32-holter-pubsub";
static const char *SERIAL_NUMBER = "SN-ECG-0001";

static const int SAMPLE_RATE_ECG = 10;
static const int BATCH_DURATION_SEC = 5;
static const int NUM_SAMPLES = SAMPLE_RATE_ECG * BATCH_DURATION_SEC;

static const int MPU_SAMPLE_RATE = 10;
static const int MPU_NUM_SAMPLES = MPU_SAMPLE_RATE * BATCH_DURATION_SEC;

static const int ACK_TIMEOUT_MS = 3000;
static const int MAX_RETRY = 3;
static const int RETRY_QUEUE_CAPACITY = 8;

static const int ECG_PIN = 34;
static const int SDN_PIN = 25;

// Thông tin một batch cần retry lại qua MQTT.
struct RetryItem {
  String messageId;   // message_id của batch để chờ ACK ứng dụng
  bool useBufferA;    // true nếu batch nằm trong buffer A, false nếu nằm trong buffer B
  uint8_t retryCount; // số lần đã thử gửi lại
  bool inUse;         // đánh dấu slot còn hợp lệ
};

Adafruit_MPU6050 mpu;
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

float ecgBufA[NUM_SAMPLES];
float ecgBufB[NUM_SAMPLES];
float accelX_A[MPU_NUM_SAMPLES], accelY_A[MPU_NUM_SAMPLES], accelZ_A[MPU_NUM_SAMPLES];
float gyroX_A[MPU_NUM_SAMPLES], gyroY_A[MPU_NUM_SAMPLES], gyroZ_A[MPU_NUM_SAMPLES];
float accelX_B[MPU_NUM_SAMPLES], accelY_B[MPU_NUM_SAMPLES], accelZ_B[MPU_NUM_SAMPLES];
float gyroX_B[MPU_NUM_SAMPLES], gyroY_B[MPU_NUM_SAMPLES], gyroZ_B[MPU_NUM_SAMPLES];

volatile bool useBufferA = true;
SemaphoreHandle_t readySemaphore;

volatile bool ackReceived = false;
String ackMessageId = "";
String ackStatus = "";
bool ackDuplicate = false;

RetryItem retryQueue[RETRY_QUEUE_CAPACITY];
uint8_t retryHead = 0;
uint8_t retryTail = 0;
uint8_t retryCount = 0;
uint32_t messageCounter = 0;

float x1_ = 0, x2_ = 0;
float y1_ = 0, y2_ = 0;
const float b0 = 0.9723f, b1 = -1.8478f, b2 = 0.9723f;
const float a1 = -1.8478f, a2 = 0.9446f;

// ---------------------------------------------------------------------------
// HỖ TRỢ STREAM JSON TRỰC TIẾP RA MQTT (KHÔNG DÙNG STRING LỚN TRÊN HEAP)
// ---------------------------------------------------------------------------

// Writer đếm độ dài JSON mà không cấp phát bộ nhớ.
struct JsonLengthCounter {
  size_t total;
  JsonLengthCounter() : total(0) {}
  void write(const char *s, size_t len) { total += len; }
  void writeChar(char) { total += 1; }
};

// Writer ghi trực tiếp từng chunk ra PubSubClient (streaming MQTT).
struct JsonMqttWriter {
  PubSubClient &client;
  bool ok;
  JsonMqttWriter(PubSubClient &c) : client(c), ok(true) {}

  void write(const char *s, size_t len) {
    if (!ok) return;
    size_t written = client.write(reinterpret_cast<const uint8_t *>(s), len);
    if (written != len) {
      ok = false;
    }
  }

  void writeChar(char c) {
    if (!ok) return;
    if (client.write(static_cast<uint8_t>(c)) != 1) {
      ok = false;
    }
  }
};

// Ghi số nguyên không dấu ra JSON (dạng thập phân) dùng chung cho cả 2 writer.
template <typename Writer>
void jsonWriteUnsigned(Writer &w, uint64_t value) {
  char buf[21];
  int idx = 0;

  if (value == 0) {
    buf[idx++] = '0';
  } else {
    char tmp[21];
    int t = 0;
    while (value > 0 && t < 21) {
      uint8_t digit = static_cast<uint8_t>(value % 10ULL);
      tmp[t++] = static_cast<char>('0' + digit);
      value /= 10ULL;
    }
    while (t > 0) {
      buf[idx++] = tmp[--t];
    }
  }
  w.write(buf, static_cast<size_t>(idx));
}

// Ghi số thực ra JSON với 4 chữ số phần thập phân, không có khoảng trắng đầu.
template <typename Writer>
void jsonWriteFloat(Writer &w, float value) {
  char numberBuf[20];
  dtostrf(value, 0, 4, numberBuf); // giống appendFloatCompact cũ

  char *start = numberBuf;
  while (*start == ' ') {
    start++;
  }
  size_t len = strlen(start);
  w.write(start, len);
}

// Xây JSON telemetry chuẩn contract backend, nhưng thông qua Writer (đếm độ dài hoặc stream MQTT).
// Tham số sentAt được truyền từ bên ngoài để 2 lần build (đếm độ dài và stream)
// dùng chung một giá trị thời gian, tránh lệch payload length.
template <typename Writer>
void buildTelemetryJsonStream(
  Writer &w,
  const String &messageId,
  uint64_t sentAt,
  float *ecg,
  float *ax, float *ay, float *az,
  float *gx, float *gy, float *gz
) {
  // Phần header meta
  w.write("{", 1);
  w.write("\"message_id\":\"", sizeof("\"message_id\":\"") - 1);
  w.write(messageId.c_str(), static_cast<size_t>(messageId.length()));
  w.write("\",\"serial_number\":\"", sizeof("\",\"serial_number\":\"") - 1);
  w.write(SERIAL_NUMBER, strlen(SERIAL_NUMBER));
  w.write("\",\"sent_at\":", sizeof("\",\"sent_at\":") - 1);
  jsonWriteUnsigned(w, sentAt);

  // ECG
  w.write(",\"ecg_signal\":[", sizeof(",\"ecg_signal\":[") - 1);
  for (int i = 0; i < NUM_SAMPLES; i++) {
    jsonWriteFloat(w, ecg[i]);
    if (i < NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("]", 1);

  // ACCEL
  w.write(",\"accel\":{\"x\":[", sizeof(",\"accel\":{\"x\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++) {
    jsonWriteFloat(w, ax[i]);
    if (i < MPU_NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("],\"y\":[", sizeof("],\"y\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++) {
    jsonWriteFloat(w, ay[i]);
    if (i < MPU_NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("],\"z\":[", sizeof("],\"z\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++) {
    jsonWriteFloat(w, az[i]);
    if (i < MPU_NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("]}", 2); // đóng accel

  // GYRO
  w.write(",\"gyro\":{\"x\":[", sizeof(",\"gyro\":{\"x\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++) {
    jsonWriteFloat(w, gx[i]);
    if (i < MPU_NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("],\"y\":[", sizeof("],\"y\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++) {
    jsonWriteFloat(w, gy[i]);
    if (i < MPU_NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("],\"z\":[", sizeof("],\"z\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++) {
    jsonWriteFloat(w, gz[i]);
    if (i < MPU_NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("]}", 2); // đóng gyro

  // sampling_rate
  w.write(",\"sampling_rate\":{\"ecg_hz\":", sizeof(",\"sampling_rate\":{\"ecg_hz\":") - 1);
  jsonWriteUnsigned(w, static_cast<uint64_t>(SAMPLE_RATE_ECG));
  w.write(",\"mpu_hz\":", sizeof(",\"mpu_hz\":") - 1);
  jsonWriteUnsigned(w, static_cast<uint64_t>(MPU_SAMPLE_RATE));
  w.write(",\"duration\":", sizeof(",\"duration\":") - 1);
  jsonWriteUnsigned(w, static_cast<uint64_t>(BATCH_DURATION_SEC));
  w.write("}}", 3);
}

// Tính chính xác độ dài JSON để truyền cho beginPublish().
size_t calcPayloadLength(
  const String &messageId,
  uint64_t sentAt,
  float *ecg,
  float *ax, float *ay, float *az,
  float *gx, float *gy, float *gz
) {
  JsonLengthCounter counter;
  buildTelemetryJsonStream(counter, messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
  return counter.total;
}

// Hàm tạo topic uplink theo serial thiết bị.
String topicUplink() {
  return String("devices/") + SERIAL_NUMBER + "/telemetry";
}

// Stream JSON trực tiếp ra MQTT (không tạo String payload lớn trên heap).
bool streamTelemetryJson(
  const String &messageId,
  uint64_t sentAt,
  float *ecg,
  float *ax, float *ay, float *az,
  float *gx, float *gy, float *gz
) {
  const size_t payloadLen = calcPayloadLength(messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);

  if (!mqttClient.beginPublish(topicUplink().c_str(), static_cast<unsigned int>(payloadLen), false)) {
    Serial.printf("⚠️ beginPublish thất bại cho message_id=%s\n", messageId.c_str());
    return false;
  }

  JsonMqttWriter writer(mqttClient);
  buildTelemetryJsonStream(writer, messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);

  bool okEnd = mqttClient.endPublish();
  if (!writer.ok || !okEnd) {
    Serial.printf("⚠️ endPublish hoặc ghi MQTT thất bại cho message_id=%s\n", messageId.c_str());
  } else {
    Serial.printf("✅ Đã gửi payload MQTT tới broker (message_id=%s, length=%u)\n",
                  messageId.c_str(), static_cast<unsigned int>(payloadLen));
  }
  return writer.ok && okEnd;
}

// Hàm tạo topic ACK theo serial thiết bị.
String topicAck() {
  return String("devices/") + SERIAL_NUMBER + "/ack";
}

// Hàm tạo message_id duy nhất theo serial + millis + counter.
String makeMessageId() {
  messageCounter += 1;
  return String(SERIAL_NUMBER) + "-" + String(millis()) + "-" + String(messageCounter);
}

// Hàm trích xuất giá trị chuỗi theo key từ JSON đơn giản.
bool extractJsonStringField(const String &jsonText, const char *key, String &outValue) {
  const String pattern = String("\"") + key + "\":";
  const int keyPos = jsonText.indexOf(pattern);
  if (keyPos < 0) return false;

  const int firstQuote = jsonText.indexOf('"', keyPos + pattern.length());
  if (firstQuote < 0) return false;
  const int secondQuote = jsonText.indexOf('"', firstQuote + 1);
  if (secondQuote < 0) return false;

  outValue = jsonText.substring(firstQuote + 1, secondQuote);
  return true;
}

// Hàm trích xuất giá trị bool theo key từ JSON đơn giản.
bool extractJsonBoolField(const String &jsonText, const char *key, bool &outValue) {
  const String pattern = String("\"") + key + "\":";
  const int keyPos = jsonText.indexOf(pattern);
  if (keyPos < 0) return false;

  int valuePos = keyPos + pattern.length();
  while (valuePos < (int)jsonText.length() && isspace((unsigned char)jsonText[valuePos])) {
    valuePos += 1;
  }

  if (jsonText.startsWith("true", valuePos)) {
    outValue = true;
    return true;
  }
  if (jsonText.startsWith("false", valuePos)) {
    outValue = false;
    return true;
  }
  return false;
}

// Hàm lọc notch 50Hz để giảm nhiễu lưới điện trên kênh ECG.
float notchFilter(float x) {
  float y = b0 * x + b1 * x1_ + b2 * x2_ - a1 * y1_ - a2 * y2_;
  x2_ = x1_;
  x1_ = x;
  y2_ = y1_;
  y1_ = y;
  return y;
}

// Hàm kết nối Wi-Fi và đợi đến khi có mạng.
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

// Hàm nạp payload ACK dạng chuỗi và cập nhật trạng thái đang chờ.
void updateAckState(const String &jsonText) {
  String messageId;
  String status;
  bool duplicate = false;
  if (!extractJsonStringField(jsonText, "message_id", messageId)) return;
  if (!extractJsonStringField(jsonText, "status", status)) return;
  extractJsonBoolField(jsonText, "duplicate", duplicate);

  ackMessageId = messageId;
  ackStatus = status;
  ackDuplicate = duplicate;
  ackReceived = true;
}

// Hàm callback MQTT để nhận ACK từ topic phản hồi.
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  if (String(topic) != topicAck()) return;

  String payloadText;
  payloadText.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    payloadText += (char)payload[i];
  }
  updateAckState(payloadText);
}

// Hàm đảm bảo kết nối MQTT hoạt động và subscribe topic ACK.
bool ensureMqttConnected() {
  if (mqttClient.connected()) return true;
  const uint32_t startAt = millis();
  while (!mqttClient.connected() && millis() - startAt < 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      connectWifi();
    }

    bool ok = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);
    if (ok) {
      mqttClient.subscribe(topicAck().c_str(), 1);
      Serial.println("MQTT connected");
      return true;
    }

    Serial.printf("MQTT connect failed, state=%d\n", mqttClient.state());
    delay(1000);
  }

  Serial.println("MQTT connect timeout (10s)");
  return false;
}

// Hàm đợi ACK ứng dụng theo message_id trong một khoảng timeout.
bool waitAppAck(const String &messageId, uint32_t timeoutMs) {
  const uint32_t startAt = millis();
  ackReceived = false;
  ackMessageId = "";
  ackStatus = "";
  ackDuplicate = false;

  while (millis() - startAt < timeoutMs) {
    mqttClient.loop();
    if (ackReceived) {
      ackReceived = false;
      if (ackMessageId == messageId) {
        if (ackStatus == "ok") {
          Serial.printf("✅ Nhận ACK ứng dụng OK cho message_id=%s (duplicate=%s)\n",
                        messageId.c_str(), ackDuplicate ? "true" : "false");
        } else {
          Serial.printf("⚠️ Nhận ACK ứng dụng nhưng status=\"%s\" cho message_id=%s\n",
                        ackStatus.c_str(), messageId.c_str());
        }
        return ackStatus == "ok";
      }
    }
    delay(10);
  }
  return false;
}

// Hàm đưa batch thất bại vào hàng đợi RAM để gửi lại sau.
void enqueueRetry(const String &messageId, bool useBufferAForBatch, uint8_t currentRetry) {
  if (retryCount >= RETRY_QUEUE_CAPACITY) {
    retryQueue[retryHead].inUse = false;
    retryHead = (retryHead + 1) % RETRY_QUEUE_CAPACITY;
    retryCount -= 1;
  }

  retryQueue[retryTail] = { messageId, useBufferAForBatch, currentRetry, true };
  retryTail = (retryTail + 1) % RETRY_QUEUE_CAPACITY;
  retryCount += 1;
}

// Hàm lấy một phần tử đầu hàng đợi retry theo FIFO.
bool dequeueRetry(RetryItem &outItem) {
  if (retryCount == 0) return false;
  outItem = retryQueue[retryHead];
  retryQueue[retryHead].inUse = false;
  retryHead = (retryHead + 1) % RETRY_QUEUE_CAPACITY;
  retryCount -= 1;
  return true;
}

// Hàm publish telemetry (stream JSON) và retry tối đa theo chính sách ACK timeout.
// Không lưu payload trên heap, mỗi lần gửi sẽ stream lại trực tiếp từ buffer cảm biến.
bool publishWithRetry(const String &messageId, bool useBufferAForBatch) {
  // Chọn buffer dữ liệu tương ứng với batch cần gửi (A hoặc B).
  float *ecg = useBufferAForBatch ? ecgBufA : ecgBufB;
  float *ax  = useBufferAForBatch ? accelX_A : accelX_B;
  float *ay  = useBufferAForBatch ? accelY_A : accelY_B;
  float *az  = useBufferAForBatch ? accelZ_A : accelZ_B;
  float *gx  = useBufferAForBatch ? gyroX_A  : gyroX_B;
  float *gy  = useBufferAForBatch ? gyroY_A  : gyroY_B;
  float *gz  = useBufferAForBatch ? gyroZ_A  : gyroZ_B;

  for (uint8_t attempt = 0; attempt < MAX_RETRY; attempt++) {
    if (!ensureMqttConnected()) {
      delay(300);
      continue;
    }

    // Stream JSON trực tiếp qua MQTT.
    const uint64_t sentAt = millis(); // cố định trong 1 lần thử để độ dài JSON khớp.
    bool pubOk = streamTelemetryJson(messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
    if (!pubOk) {
      delay(150);
      continue;
    }

    Serial.printf("ℹ️ Đã gửi xong batch lên broker, chờ ACK ứng dụng (attempt=%u, message_id=%s)\n",
                  static_cast<unsigned int>(attempt + 1), messageId.c_str());

    if (waitAppAck(messageId, ACK_TIMEOUT_MS)) {
      return true;
    }
  }
  return false;
}

// Hàm gửi lại các batch đã rơi vào hàng đợi khi kết nối ổn định.
void drainRetryQueue() {
  if (retryCount == 0) return;
  RetryItem item;
  if (!dequeueRetry(item)) return;
  if (!item.inUse) return;

  bool ok = publishWithRetry(item.messageId, item.useBufferA);
  if (!ok) {
    enqueueRetry(item.messageId, item.useBufferA, item.retryCount + 1);
  }
}

// Hàm thu mẫu ECG + MPU vào double buffer và báo sẵn sàng cho task gửi.
void sensorTask(void *param) {
  unsigned long lastECG = micros();
  unsigned long lastMPU = micros();
  int ecgIdx = 0;
  int mpuIdx = 0;

  const unsigned long ecgInterval = 1000000UL / SAMPLE_RATE_ECG;
  const unsigned long mpuInterval = 1000000UL / MPU_SAMPLE_RATE;

  while (true) {
    unsigned long currentMicros = micros();

    if ((currentMicros - lastECG) >= ecgInterval) {
      lastECG += ecgInterval;
      if (ecgIdx < NUM_SAMPLES) {
        int ecgRaw = analogRead(ECG_PIN);
        float v = ((float)ecgRaw / 4095.0f) * 3.3f - 1.65f;
        v = notchFilter(v);
        if (useBufferA) ecgBufA[ecgIdx] = v;
        else ecgBufB[ecgIdx] = v;
        ecgIdx++;
      }
    }

    if ((currentMicros - lastMPU) >= mpuInterval) {
      lastMPU += mpuInterval;
      if (mpuIdx < MPU_NUM_SAMPLES) {
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        if (useBufferA) {
          accelX_A[mpuIdx] = a.acceleration.x;
          accelY_A[mpuIdx] = a.acceleration.y;
          accelZ_A[mpuIdx] = a.acceleration.z;
          gyroX_A[mpuIdx] = g.gyro.x;
          gyroY_A[mpuIdx] = g.gyro.y;
          gyroZ_A[mpuIdx] = g.gyro.z;
        } else {
          accelX_B[mpuIdx] = a.acceleration.x;
          accelY_B[mpuIdx] = a.acceleration.y;
          accelZ_B[mpuIdx] = a.acceleration.z;
          gyroX_B[mpuIdx] = g.gyro.x;
          gyroY_B[mpuIdx] = g.gyro.y;
          gyroZ_B[mpuIdx] = g.gyro.z;
        }
        mpuIdx++;
      }
    }

    if (ecgIdx >= NUM_SAMPLES && mpuIdx >= MPU_NUM_SAMPLES) {
      useBufferA = !useBufferA;
      ecgIdx = 0;
      mpuIdx = 0;
      xSemaphoreGive(readySemaphore);
    }
  }
}

// Hàm gửi telemetry từ buffer đã đầy bằng MQTT + ACK retry policy.
void senderTask(void *param) {
  while (true) {
    xSemaphoreTake(readySemaphore, portMAX_DELAY);

    // Nếu Sensor đang dùng A -> batch vừa đầy nằm trong buffer B (và ngược lại).
    bool sendA = !useBufferA;

    // Tạo message_id duy nhất cho batch này.
    String messageId = makeMessageId();

    // Gửi batch qua MQTT với cơ chế retry + ACK ứng dụng.
    bool ok = publishWithRetry(messageId, sendA);
    if (!ok) {
      enqueueRetry(messageId, sendA, MAX_RETRY);
      Serial.printf("Queue retry: %s (queue=%u)\n", messageId.c_str(), retryCount);
    } else {
      Serial.printf("Publish ok: %s\n", messageId.c_str());
    }

    drainRetryQueue();
  }
}

// Hàm khởi tạo toàn bộ phần cứng và tạo task thu/gửi dữ liệu.
void setup() {
  Serial.begin(9600);
  analogReadResolution(12);

  pinMode(SDN_PIN, OUTPUT);
  digitalWrite(SDN_PIN, LOW);

  Wire.setClock(40000);
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found");
    while (true) delay(100);
  } 
  Serial.println("MPU6050 Ready");
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  connectWifi();

  secureClient.setInsecure();
  mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  // Buffer MQTT nhỏ (4KB) là đủ cho header + nội dung control, vì payload được stream dần.
  mqttClient.setBufferSize(4096);
  mqttClient.setCallback(mqttCallback);
  ensureMqttConnected();

  readySemaphore = xSemaphoreCreateBinary();

  xTaskCreatePinnedToCore(sensorTask, "SensorTask", 8192, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(senderTask, "SenderTask", 16384, NULL, 1, NULL, 0);
}

// Hàm loop chính không chạy mqttClient.loop() để đảm bảo thread-safe.
// Toàn bộ việc xử lý MQTT (loop + ACK) chỉ diễn ra trong senderTask / waitAppAck().
void loop() {
  delay(100);
}



