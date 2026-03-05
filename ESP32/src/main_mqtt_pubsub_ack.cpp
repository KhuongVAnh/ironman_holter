#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

/*
 * Ý tưởng triển khai:
 * - Mục tiêu: gửi telemetry ECG/MPU qua MQTT với payload lớn nhưng không tạo String lớn trên heap.
 * - Chiến lược: dùng double-buffer để thu mẫu liên tục, 1 buffer đọc data, 1 buffer gửi data + stream JSON trực tiếp ra MQTT.
 * - Tối ưu hiệu năng:
 *   1) Chờ ACK ứng dụng theo timeout ngắn, nếu nhận ack sai hoặc timeout thì gửi lại, retry tối đa 3 lần và đưa vào hàng đợi nếu vẫn lỗi.
 *   2) Gộp dữ liệu thành chunk trước khi ghi xuống socket TLS để giảm số lần write nhỏ.
 *   3) Gọi mqttClient.loop() định kỳ trong senderTask để giữ kết nối sống, giảm reconnect.
 * - Kết quả mong muốn: giữ ổn định RAM và giảm publish_ms khi payload lớn.
 */

// Cấu hình Wi-Fi và MQTT.
static const char *WIFI_SSID = "Nhan Home";
static const char *WIFI_PASSWORD = "nhanhome";
static const char *MQTT_BROKER_HOST = "7fca0eea573545b996b5e3b23e7e5613.s1.eu.hivemq.cloud";
static const int MQTT_BROKER_PORT = 8883;
static const char *MQTT_USERNAME = "iron-holter";
static const char *MQTT_PASSWORD = "Vanh080105";
static const char *MQTT_CLIENT_ID = "esp32-holter-pubsub";
static const char *SERIAL_NUMBER = "SN-ECG-0001";

static const int SAMPLE_RATE_ECG = 250;
static const int BATCH_DURATION_SEC = 5;
static const int NUM_SAMPLES = SAMPLE_RATE_ECG * BATCH_DURATION_SEC;

static const int MPU_SAMPLE_RATE = 50;
static const int MPU_NUM_SAMPLES = MPU_SAMPLE_RATE * BATCH_DURATION_SEC;

static const int ECG_PIN = 34;
static const int SDN_PIN = 25;
// Timeout chờ ACK ứng dụng sau mỗi lần thử gửi.
static const uint32_t ACK_TIMEOUT_MS = 3000;
// Số lần thử gửi tối đa cho một batch trước khi đưa vào hàng đợi.
static const uint8_t MAX_RETRY = 3;
// Dung lượng hàng đợi retry trong RAM.
static const uint8_t RETRY_QUEUE_CAPACITY = 8;
// Kích thước chunk ghi xuống socket TLS mỗi lần flush.
static const size_t MQTT_STREAM_CHUNK_SIZE = 768;

Adafruit_MPU6050 mpu;
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

// Mỗi phần tử trong queue đại diện một batch cần gửi lại.
struct RetryItem {
  String messageId;
  bool useBufferA;
  bool inUse;
};

// Double-buffer cho ECG để vừa thu mẫu vừa gửi batch trước đó mà không ghi đè dữ liệu.
float ecgBufA[NUM_SAMPLES];
float ecgBufB[NUM_SAMPLES];
// Double-buffer cho dữ liệu MPU.
float accelX_A[MPU_NUM_SAMPLES], accelY_A[MPU_NUM_SAMPLES], accelZ_A[MPU_NUM_SAMPLES];
float gyroX_A[MPU_NUM_SAMPLES], gyroY_A[MPU_NUM_SAMPLES], gyroZ_A[MPU_NUM_SAMPLES];
float accelX_B[MPU_NUM_SAMPLES], accelY_B[MPU_NUM_SAMPLES], accelZ_B[MPU_NUM_SAMPLES];
float gyroX_B[MPU_NUM_SAMPLES], gyroY_B[MPU_NUM_SAMPLES], gyroZ_B[MPU_NUM_SAMPLES];

// Cờ chỉ buffer đang được task sensor ghi dữ liệu.
volatile bool useBufferA = true;
// Semaphore báo "đã đủ 1 batch 5 giây" cho senderTask.
SemaphoreHandle_t readySemaphore;
// Counter tạo message_id duy nhất theo từng batch.
uint32_t messageCounter = 0;

// Trạng thái ACK ứng dụng mới nhất nhận từ topic devices/{serial}/ack.
volatile bool ackReceived = false;
String ackMessageId = "";
String ackStatus = "";
bool ackDuplicate = false;

// Ring-buffer queue cho các batch gửi lỗi cần thử lại sau.
RetryItem retryQueue[RETRY_QUEUE_CAPACITY];
uint8_t retryHead = 0;
uint8_t retryTail = 0;
uint8_t retryCount = 0;

// Trạng thái bộ lọc notch IIR 50Hz cho kênh ECG.
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
  // Chỉ cộng độ dài, không ghi thật ra mạng.
  void write(const char *s, size_t len) { total += len; }
  void writeChar(char) { total += 1; }
};

// Writer ghi trực tiếp từng chunk ra PubSubClient (streaming MQTT).
struct JsonMqttWriter {
  PubSubClient &client;
  bool ok;
  char chunk[MQTT_STREAM_CHUNK_SIZE];
  size_t pending;

  JsonMqttWriter(PubSubClient &c) : client(c), ok(true), pending(0) {}

  // Đẩy phần dữ liệu đang pending xuống socket TLS.
  // Trả false nếu ghi không đủ byte (lỗi mạng hoặc lỗi client).
  bool flush() {
    if (!ok) return false;
    if (pending == 0) return true;
    size_t written = client.write(reinterpret_cast<const uint8_t *>(chunk), pending);
    if (written != pending) {
      ok = false;
      return false;
    }
    pending = 0;
    return true;
  }

  // Ghi chuỗi bất kỳ vào chunk nội bộ.
  // Khi chunk đầy sẽ tự flush để giảm số lần write nhỏ xuống socket.
  void write(const char *s, size_t len) {
    if (!ok) return;
    size_t offset = 0;
    while (offset < len && ok) {
      size_t space = MQTT_STREAM_CHUNK_SIZE - pending;
      if (space == 0) {
        flush();
        space = MQTT_STREAM_CHUNK_SIZE - pending;
      }
      size_t copyLen = len - offset;
      if (copyLen > space) copyLen = space;
      memcpy(chunk + pending, s + offset, copyLen);
      pending += copyLen;
      offset += copyLen;
    }
  }

  // Ghi 1 ký tự bằng cùng cơ chế chunk.
  void writeChar(char c) {
    write(&c, 1);
  }
};

// Ghi số nguyên không dấu ra JSON (dạng thập phân) dùng chung cho cả 2 writer.
template <typename Writer>
void jsonWriteUnsigned(Writer &w, uint64_t value) {
  char buf[21];
  int idx = 0;

  // Chuyển số sang chuỗi thập phân thủ công để tránh cấp phát động.
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
  // Giữ 4 chữ số thập phân để cân bằng giữa độ chính xác và kích thước payload.
  dtostrf(value, 0, 4, numberBuf);

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
  // Header metadata: định danh message + thiết bị + thời điểm gửi.
  w.write("{", 1);
  w.write("\"message_id\":\"", sizeof("\"message_id\":\"") - 1);
  w.write(messageId.c_str(), static_cast<size_t>(messageId.length()));
  w.write("\",\"serial_number\":\"", sizeof("\",\"serial_number\":\"") - 1);
  w.write(SERIAL_NUMBER, strlen(SERIAL_NUMBER));
  w.write("\",\"sent_at\":", sizeof("\",\"sent_at\":") - 1);
  jsonWriteUnsigned(w, sentAt);

  // Dữ liệu ECG của batch 5 giây.
  w.write(",\"ecg_signal\":[", sizeof(",\"ecg_signal\":[") - 1);
  for (int i = 0; i < NUM_SAMPLES; i++) {
    jsonWriteFloat(w, ecg[i]);
    if (i < NUM_SAMPLES - 1) {
      w.writeChar(',');
    }
  }
  w.write("]", 1);

  // Dữ liệu gia tốc 3 trục.
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

  // Dữ liệu con quay 3 trục.
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

  // Metadata tần số lấy mẫu để backend hiểu đúng dữ liệu đầu vào.
  w.write(",\"sampling_rate\":{\"ecg_hz\":", sizeof(",\"sampling_rate\":{\"ecg_hz\":") - 1);
  jsonWriteUnsigned(w, static_cast<uint64_t>(SAMPLE_RATE_ECG));
  w.write(",\"mpu_hz\":", sizeof(",\"mpu_hz\":") - 1);
  jsonWriteUnsigned(w, static_cast<uint64_t>(MPU_SAMPLE_RATE));
  w.write(",\"duration\":", sizeof(",\"duration\":") - 1);
  jsonWriteUnsigned(w, static_cast<uint64_t>(BATCH_DURATION_SEC));
  w.write("}}", 2);
}

// Tính chính xác độ dài JSON để truyền cho beginPublish().
size_t calcPayloadLength(
  const String &messageId,
  uint64_t sentAt,
  float *ecg,
  float *ax, float *ay, float *az,
  float *gx, float *gy, float *gz
) {
  // beginPublish cần payload length chính xác, nên phải đếm trước 1 lượt.
  JsonLengthCounter counter;
  buildTelemetryJsonStream(counter, messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
  return counter.total;
}

// Hàm tạo topic uplink theo serial thiết bị.
String topicUplink() {
  // Chuẩn topic đã khóa trong backend migration plan.
  return String("devices/") + SERIAL_NUMBER + "/telemetry";
}

// Hàm tạo topic ACK ứng dụng để nhận phản hồi ingest từ backend.
String topicAck() {
  return String("devices/") + SERIAL_NUMBER + "/ack";
}

// Stream JSON trực tiếp ra MQTT (không tạo String payload lớn trên heap).
bool streamTelemetryJson(
  const String &messageId,
  uint64_t sentAt,
  float *ecg,
  float *ax, float *ay, float *az,
  float *gx, float *gy, float *gz
) {
  // B1: Đếm chính xác payload length.
  const size_t payloadLen = calcPayloadLength(messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);

  // B2: Mở gói MQTT kiểu streaming.
  if (!mqttClient.beginPublish(topicUplink().c_str(), static_cast<unsigned int>(payloadLen), false)) {
    Serial.printf("⚠️ beginPublish thất bại cho message_id=%s\n", messageId.c_str());
    return false;
  }

  // B3: Stream JSON từng phần, không giữ payload lớn trên heap.
  JsonMqttWriter writer(mqttClient);
  buildTelemetryJsonStream(writer, messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
  // Flush phần còn tồn trong chunk.
  writer.flush();

  // B4: Kết thúc publish.
  bool okEnd = mqttClient.endPublish();
  if (!writer.ok || !okEnd) {
    Serial.printf("⚠️ endPublish hoặc ghi MQTT thất bại cho message_id=%s\n", messageId.c_str());
  } else {
    Serial.printf("✅ Đã gửi payload MQTT tới broker (message_id=%s, length=%u)\n",
                  messageId.c_str(), static_cast<unsigned int>(payloadLen));
  }
  return writer.ok && okEnd;
}

// Hàm tạo message_id duy nhất theo serial + millis + counter.
String makeMessageId() {
  // message_id duy nhất theo thiết bị để truy vết từng batch.
  messageCounter += 1;
  return String(SERIAL_NUMBER) + "-" + String(millis()) + "-" + String(messageCounter);
}

// Hàm tách chuỗi JSON field dạng "key":"value" cho payload ACK đơn giản.
bool extractJsonStringField(const String &jsonText, const char *key, String &outValue) {
  const String pattern = String("\"") + key + "\":\"";
  const int start = jsonText.indexOf(pattern);
  if (start < 0) return false;
  const int valueStart = start + pattern.length();
  const int valueEnd = jsonText.indexOf('"', valueStart);
  if (valueEnd < 0) return false;
  outValue = jsonText.substring(valueStart, valueEnd);
  return true;
}

// Hàm tách chuỗi JSON field dạng "key":true/false cho payload ACK đơn giản.
bool extractJsonBoolField(const String &jsonText, const char *key, bool &outValue) {
  const String pattern = String("\"") + key + "\":";
  const int start = jsonText.indexOf(pattern);
  if (start < 0) return false;
  const int valueStart = start + pattern.length();
  if (jsonText.startsWith("true", valueStart)) {
    outValue = true;
    return true;
  }
  if (jsonText.startsWith("false", valueStart)) {
    outValue = false;
    return true;
  }
  return false;
}

// Hàm cập nhật trạng thái ACK khi nhận được message trên topic ACK của thiết bị.
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

// Hàm callback MQTT để nhận ACK ứng dụng từ server.
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  if (String(topic) != topicAck()) return;

  String payloadText;
  payloadText.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    payloadText += static_cast<char>(payload[i]);
  }
  Serial.printf("📥 Nhận ACK raw: %s\n", payloadText.c_str());
  updateAckState(payloadText);
}

// Hàm chờ ACK ứng dụng đúng message_id trong tối đa timeoutMs.
bool waitAppAck(const String &messageId, uint32_t timeoutMs) {
  ackReceived = false;
  ackMessageId = "";
  ackStatus = "";
  ackDuplicate = false;

  const uint32_t waitStart = millis();
  while (millis() - waitStart < timeoutMs) {
    mqttClient.loop();
    if (ackReceived) {
      ackReceived = false;
      if (ackMessageId != messageId) {
        // Bỏ ACK không khớp message hiện tại.
        continue;
      }
      if (ackStatus == "ok") {
        Serial.printf("✅ ACK OK cho message_id=%s (duplicate=%s)\n",
                      messageId.c_str(), ackDuplicate ? "true" : "false");
        return true;
      }
      Serial.printf("⚠️ ACK ERROR cho message_id=%s (status=%s)\n",
                    messageId.c_str(), ackStatus.c_str());
      return false;
    }
    delay(10);
  }
  Serial.printf("⌛ ACK timeout cho message_id=%s\n", messageId.c_str());
  return false;
}

// Hàm thêm batch vào hàng đợi retry theo cơ chế FIFO.
void enqueueRetry(const String &messageId, bool useBufferAForBatch) {
  if (retryCount >= RETRY_QUEUE_CAPACITY) {
    // Queue đầy: bỏ phần tử cũ nhất để nhường chỗ cho batch mới.
    retryQueue[retryHead].inUse = false;
    retryHead = (retryHead + 1) % RETRY_QUEUE_CAPACITY;
    retryCount -= 1;
  }
  retryQueue[retryTail] = { messageId, useBufferAForBatch, true };
  retryTail = (retryTail + 1) % RETRY_QUEUE_CAPACITY;
  retryCount += 1;
}

// Hàm lấy một phần tử từ queue retry theo thứ tự vào trước ra trước.
bool dequeueRetry(RetryItem &outItem) {
  if (retryCount == 0) return false;
  outItem = retryQueue[retryHead];
  retryQueue[retryHead].inUse = false;
  retryHead = (retryHead + 1) % RETRY_QUEUE_CAPACITY;
  retryCount -= 1;
  return true;
}

// Hàm lọc notch 50Hz để giảm nhiễu lưới điện trên kênh ECG.
float notchFilter(float x) {
  // Lọc notch 50Hz theo dạng IIR bậc 2.
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

// Hàm đảm bảo kết nối MQTT hoạt động trước khi publish telemetry.
bool ensureMqttConnected() {
  // Nếu đang connected thì không reconnect để tránh tốn TLS handshake.
  if (mqttClient.connected()) return true;
  const uint32_t startAt = millis();
  while (!mqttClient.connected() && millis() - startAt < 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      connectWifi();
    }

    // Connect có username/password theo cấu hình broker cloud.
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

// Hàm publish telemetry một lần rồi chờ ACK theo timeout cấu hình.
bool publishSingleAttemptWithAck(const String &messageId, bool useBufferAForBatch, uint8_t attemptNo) {
  // Chọn buffer dữ liệu tương ứng với batch cần gửi (A hoặc B).
  float *ecg = useBufferAForBatch ? ecgBufA : ecgBufB;
  float *ax  = useBufferAForBatch ? accelX_A : accelX_B;
  float *ay  = useBufferAForBatch ? accelY_A : accelY_B;
  float *az  = useBufferAForBatch ? accelZ_A : accelZ_B;
  float *gx  = useBufferAForBatch ? gyroX_A  : gyroX_B;
  float *gy  = useBufferAForBatch ? gyroY_A  : gyroY_B;
  float *gz  = useBufferAForBatch ? gyroZ_A  : gyroZ_B;

  // Đo riêng connect_ms để tách nghẽn do reconnect khỏi nghẽn do publish.
  unsigned long connectStartMs = millis();
  bool connected = ensureMqttConnected();
  unsigned long connectDurationMs = millis() - connectStartMs;
  if (!connected) {
    Serial.printf("⚠️ Không thể kết nối MQTT để gửi message_id=%s | connect_ms=%lu\n",
                  messageId.c_str(), connectDurationMs);
    return false;
  }

  // Đo riêng publish_ms để theo dõi hiệu quả tối ưu stream/chunk.
  unsigned long publishStartMs = millis();
  const uint64_t sentAt = millis();
  bool published = streamTelemetryJson(messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
  unsigned long publishDurationMs = millis() - publishStartMs;
  Serial.printf("📊 MQTT timing message_id=%s | attempt=%u | connect_ms=%lu | publish_ms=%lu\n",
                messageId.c_str(), static_cast<unsigned int>(attemptNo), connectDurationMs, publishDurationMs);
  if (!published) return false;
  return waitAppAck(messageId, ACK_TIMEOUT_MS);
}

// Hàm retry gửi telemetry tối đa MAX_RETRY lần theo logic ACK ban đầu.
bool publishWithRetry(const String &messageId, bool useBufferAForBatch) {
  for (uint8_t attempt = 1; attempt <= MAX_RETRY; attempt++) {
    if (publishSingleAttemptWithAck(messageId, useBufferAForBatch, attempt)) {
      return true;
    }
    delay(120);
  }
  return false;
}

// Hàm thử gửi lại một batch từ queue retry mỗi vòng gửi để tránh nghẽn dài.
void drainRetryQueue() {
  if (retryCount == 0) return;
  RetryItem item;
  if (!dequeueRetry(item)) return;
  if (!item.inUse) return;

  bool ok = publishWithRetry(item.messageId, item.useBufferA);
  if (!ok) {
    enqueueRetry(item.messageId, item.useBufferA);
    Serial.printf("↩️ Retry queue requeue: %s | queue=%u\n",
                  item.messageId.c_str(), static_cast<unsigned int>(retryCount));
  } else {
    Serial.printf("✅ Retry queue delivered: %s\n", item.messageId.c_str());
  }
}

// Hàm thu mẫu ECG + MPU vào double buffer và báo sẵn sàng cho task gửi.
void sensorTask(void *param) {
  unsigned long lastECG = micros();
  unsigned long lastMPU = micros();
  int ecgIdx = 0;
  int mpuIdx = 0;

  // Chu kỳ lấy mẫu theo micro-second để giữ nhịp thời gian chính xác.
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

    // Khi đủ 1 batch, đảo buffer và đánh thức senderTask gửi batch vừa đầy.
    if (ecgIdx >= NUM_SAMPLES && mpuIdx >= MPU_NUM_SAMPLES) {
      useBufferA = !useBufferA;
      ecgIdx = 0;
      mpuIdx = 0;
      xSemaphoreGive(readySemaphore);
    }
  }
}

// Hàm gửi telemetry từ buffer đã đầy bằng MQTT + ACK + retry.
void senderTask(void *param) {
  while (true) {
    // Không block vô hạn để vẫn gọi mqttClient.loop() giữ keepalive MQTT.
    if (xSemaphoreTake(readySemaphore, pdMS_TO_TICKS(20)) != pdTRUE) {
      if (mqttClient.connected()) {
        // loop() xử lý keepalive/ping để tránh broker ngắt kết nối rỗi.
        mqttClient.loop();
      } else {
        // Chủ động dựng lại kết nối nếu đã rớt.
        ensureMqttConnected();
      }
      continue;
    }

    // Nếu Sensor đang dùng A -> batch vừa đầy nằm trong buffer B (và ngược lại).
    bool sendA = !useBufferA;

    // Tạo message_id duy nhất cho batch này.
    String messageId = makeMessageId();
    // duration_ms là thời gian tổng của một lần gửi batch (gồm connect nếu có).
    unsigned long sendStartMs = millis();

    // Gửi batch theo cơ chế retry ACK chuẩn.
    bool ok = publishWithRetry(messageId, sendA);
    unsigned long sendDurationMs = millis() - sendStartMs;
    if (!ok) {
      enqueueRetry(messageId, sendA);
      Serial.printf("⚠️ Publish/ACK fail, đã đưa vào queue: %s | duration_ms=%lu | queue=%u\n",
                    messageId.c_str(), sendDurationMs, static_cast<unsigned int>(retryCount));
    } else {
      Serial.printf("Publish ok: %s | duration_ms=%lu\n", messageId.c_str(), sendDurationMs);
    }

    // Mỗi vòng gửi xong sẽ thử đẩy thêm 1 phần tử từ retry queue.
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

  // Demo/dev mode: bỏ verify cert để dễ chạy nhanh.
  // Khi production nên dùng CA cert thay vì setInsecure().
  secureClient.setInsecure();
  // Tắt Nagle để giảm trễ với luồng ghi nhiều chunk.
  secureClient.setNoDelay(true);
  mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  // Buffer MQTT chỉ cần vừa phải vì payload đã stream dần, không cần chứa toàn bộ JSON.
  mqttClient.setBufferSize(4096);
  mqttClient.setCallback(mqttCallback);
  ensureMqttConnected();

  readySemaphore = xSemaphoreCreateBinary();

  xTaskCreatePinnedToCore(sensorTask, "SensorTask", 8192, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(senderTask, "SenderTask", 16384, NULL, 1, NULL, 0);
}

// Hàm loop chính không dùng, toàn bộ xử lý nằm trong các FreeRTOS task.
void loop() {
  // Kiến trúc này dùng FreeRTOS task, loop() không còn nhiệm vụ.
  vTaskDelete(NULL);
}
