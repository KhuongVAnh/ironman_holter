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
static const char *WIFI_SSID = "";
static const char *WIFI_PASSWORD = "";
static const char *MQTT_BROKER_HOST = "blabla.s1.eu.hivemq.cloud";
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
static const uint32_t ACK_TIMEOUT_MS = 3500;
// Số lần thử gửi tối đa cho một batch trước khi đưa vào hàng đợi.
static const uint8_t MAX_RETRY = 3;
// Dung lượng hàng đợi retry trong RAM.
static const uint8_t RETRY_QUEUE_CAPACITY = 8;
// Kích thước chunk ghi xuống socket TLS mỗi lần flush.
static const size_t MQTT_STREAM_CHUNK_SIZE = 500;
// Độ dài tối đa của topic và message_id được giữ cố định để tránh cấp phát heap bằng String.
static const size_t MQTT_TOPIC_MAX_LEN = 96;
static const size_t MESSAGE_ID_MAX_LEN = 56;
static const size_t ACK_STATUS_MAX_LEN = 16;
static const size_t ACK_PAYLOAD_MAX_LEN = 192;
// PubSubClient vẫn cần buffer nội bộ cho packet nhỏ như SUBSCRIBE/ACK; payload telemetry đã stream nên không cần 8KB.
static const size_t MQTT_CLIENT_BUFFER_SIZE = 1024;
// Chu kỳ log runtime đủ thưa để không làm nghẽn Serial nhưng vẫn thấy heap thấp nhất khi chạy lâu.
static const uint32_t RUNTIME_STATS_INTERVAL_MS = 30000;

Adafruit_MPU6050 mpu;
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

// Mỗi phần tử trong queue đại diện một batch cần gửi lại.
struct RetryItem
{
  char messageId[MESSAGE_ID_MAX_LEN];
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
char ackMessageId[MESSAGE_ID_MAX_LEN] = "";
char ackStatus[ACK_STATUS_MAX_LEN] = "";
bool ackDuplicate = false;

// Topic MQTT được build một lần trong setup để tránh tạo String lặp lại mỗi lần publish/subscribe.
char uplinkTopic[MQTT_TOPIC_MAX_LEN] = "";
char ackTopic[MQTT_TOPIC_MAX_LEN] = "";

// Ring-buffer queue cho các batch gửi lỗi cần thử lại sau.
RetryItem retryQueue[RETRY_QUEUE_CAPACITY];
uint8_t retryHead = 0;
uint8_t retryTail = 0;
uint8_t retryCount = 0;

// Copy chuỗi C có giới hạn kích thước để luôn kết thúc bằng '\0'.
// Dùng helper này thay cho String để giảm cấp phát heap động và giảm rủi ro fragmentation khi chạy lâu.
void copyCString(char *dst, size_t dstSize, const char *src)
{
  if (dstSize == 0)
    return;
  if (src == nullptr)
  {
    dst[0] = '\0';
    return;
  }
  strncpy(dst, src, dstSize - 1);
  dst[dstSize - 1] = '\0';
}

// Build topic MQTT một lần lúc khởi động.
// Topic là dữ liệu cấu hình cố định theo serial nên không nên ghép bằng String trong hot path.
void buildMqttTopics()
{
  snprintf(uplinkTopic, sizeof(uplinkTopic), "devices/%s/telemetry", SERIAL_NUMBER);
  snprintf(ackTopic, sizeof(ackTopic), "devices/%s/ack", SERIAL_NUMBER);
}

// Log RAM runtime thật trên thiết bị.
// Build log chỉ biết RAM tĩnh từ file ELF; các giá trị này mới phản ánh heap còn lại sau WiFi/TLS/MQTT.
void logRuntimeStats(const char *tag)
{
  Serial.printf("RAM runtime [%s] heap_free=%u min_free=%u max_alloc=%u stack_hwm=%u\n",
                tag,
                static_cast<unsigned int>(ESP.getFreeHeap()),
                static_cast<unsigned int>(ESP.getMinFreeHeap()),
                static_cast<unsigned int>(ESP.getMaxAllocHeap()),
                static_cast<unsigned int>(uxTaskGetStackHighWaterMark(NULL)));
}

// ---------------------------------------------------------------------------
// HỖ TRỢ STREAM JSON TRỰC TIẾP RA MQTT (KHÔNG DÙNG STRING LỚN TRÊN HEAP)
// ---------------------------------------------------------------------------

// Writer đếm độ dài JSON mà không cấp phát bộ nhớ.
struct JsonLengthCounter
{
  size_t total;
  JsonLengthCounter() : total(0) {}
  // Chỉ cộng độ dài, không ghi thật ra mạng.
  void write(const char *s, size_t len) { total += len; }
  void writeChar(char) { total += 1; }
};

// Writer ghi trực tiếp từng chunk ra PubSubClient (streaming MQTT).
struct JsonMqttWriter
{
  PubSubClient &client;
  bool ok;
  char chunk[MQTT_STREAM_CHUNK_SIZE];
  size_t pending;
  size_t totalWritten;
  size_t lastChunkRequested;
  size_t lastChunkWritten;

  JsonMqttWriter(PubSubClient &c)
      : client(c), ok(true), pending(0), totalWritten(0), lastChunkRequested(0), lastChunkWritten(0) {} // constructor khởi tạo

  // Đẩy phần dữ liệu đang pending xuống socket TLS.
  // Trả false nếu (lỗi mạng hoặc lỗi client).
  bool flush()
  {
    if (!ok)
      return false;
    if (pending == 0)
      return true;

    size_t offset = 0;
    uint32_t startAt = millis();

    while (offset < pending)
    {
      size_t written = client.write(
          reinterpret_cast<const uint8_t *>(chunk + offset),
          pending - offset);

      lastChunkRequested = pending - offset;
      lastChunkWritten = written;
      totalWritten += written;

      if (written > 0)
      {
        offset += written;
        continue;
      }

      if (!client.connected() || millis() - startAt > 2000)
      {
        ok = false;
        return false;
      }

      delay(1);
    }

    pending = 0;
    return true;
  }

  // Ghi chuỗi bất kỳ vào chunk nội bộ.
  // Khi chunk đầy sẽ tự flush để giảm số lần write nhỏ xuống socket.
  void write(const char *s, size_t len)
  { // ghi len byte từ chuỗi s vào chunk
    if (!ok)
      return;
    size_t offset = 0;
    while (offset < len && ok)
    {
      size_t space = MQTT_STREAM_CHUNK_SIZE - pending; // không gian còn lại của chunk
      if (space == 0)
      { // chunk đã đầy thì đẩy xuống socket
        flush();
        space = MQTT_STREAM_CHUNK_SIZE - pending;
      }
      size_t copyLen = len - offset;
      if (copyLen > space)
        copyLen = space;
      memcpy(chunk + pending, s + offset, copyLen); // copy copyLen byte từ s+offset vào chunk+pending
      pending += copyLen;
      offset += copyLen;
    }
  }

  // Ghi 1 ký tự bằng cùng cơ chế chunk.
  void writeChar(char c)
  {
    write(&c, 1);
  }
};

// Ghi số nguyên không dấu ra JSON (dạng thập phân) dùng chung cho cả 2 writer.
template <typename Writer>
void jsonWriteUnsigned(Writer &w, uint64_t value)
{
  char buf[21];
  int idx = 0;

  // Chuyển số sang chuỗi thập phân thủ công để tránh cấp phát động.
  if (value == 0)
  {
    buf[idx++] = '0';
  }
  else
  {
    char tmp[21];
    int t = 0;
    while (value > 0 && t < 21)
    {
      uint8_t digit = static_cast<uint8_t>(value % 10ULL);
      tmp[t++] = static_cast<char>('0' + digit);
      value /= 10ULL;
    }
    while (t > 0)
    {
      buf[idx++] = tmp[--t];
    }
  }
  w.write(buf, static_cast<size_t>(idx));
}

// Ghi số thực ra JSON với 4 chữ số phần thập phân, không có khoảng trắng đầu.
template <typename Writer>
void jsonWriteFloat(Writer &w, float value)
{
  // dtostrf() tiện nhưng khá nặng vì xử lý format tổng quát.
  // Ở đây payload chỉ cần số thập phân 4 chữ số, nên scale float thành số nguyên rồi tự ghi:
  //   1.23456 -> 12346 -> "1.2346"
  // Cách này giữ nguyên contract JSON number, không tạo String và giảm CPU khi phải ghi hàng nghìn mẫu.
  if (isnan(value) || isinf(value))
  {
    value = 0.0f;
  }

  bool negative = value < 0.0f;
  float absValue = negative ? -value : value;
  uint32_t scaled = static_cast<uint32_t>(absValue * 10000.0f + 0.5f);

  // Chỉ ghi dấu âm khi phần số sau khi làm tròn vẫn khác 0.
  // Ví dụ value = -0.00001 sẽ được scale/làm tròn thành 0, nếu vẫn ghi '-' thì JSON sẽ ra "-0.0000".
  // "-0.0000" không sai cú pháp, nhưng gây nhiễu khi backend/biểu đồ đọc dữ liệu; vì vậy chuẩn hóa về "0.0000".
  if (negative && scaled > 0)
  {
    w.writeChar('-');
  }

  // Ghi phần nguyên trước dấu thập phân và dấu thập phân.
  jsonWriteUnsigned(w, static_cast<uint64_t>(scaled / 10000UL));
  w.writeChar('.');

  // Ghi phần thập phân 4 chữ số, luôn đủ 4 chữ số bằng cách pad '0' nếu cần.
  uint16_t frac = static_cast<uint16_t>(scaled % 10000UL);
  char fracBuf[4];
  fracBuf[0] = static_cast<char>('0' + (frac / 1000U) % 10U); // vd '0' + 2 = '2'
  fracBuf[1] = static_cast<char>('0' + (frac / 100U) % 10U);
  fracBuf[2] = static_cast<char>('0' + (frac / 10U) % 10U);
  fracBuf[3] = static_cast<char>('0' + frac % 10U);
  w.write(fracBuf, sizeof(fracBuf));
}

// Xây JSON telemetry chuẩn contract backend, nhưng thông qua Writer (đếm độ dài hoặc stream MQTT).
// Tham số sentAt được truyền từ bên ngoài để 2 lần build (đếm độ dài và stream)
// dùng chung một giá trị thời gian, tránh lệch payload length.
template <typename Writer>
void buildTelemetryJsonStream(
    Writer &w,
    const char *messageId,
    uint64_t sentAt,
    float *ecg,
    float *ax, float *ay, float *az,
    float *gx, float *gy, float *gz)
{
  // Header metadata: định danh message + thiết bị + thời điểm gửi.
  w.write("{", 1);
  w.write("\"message_id\":\"", sizeof("\"message_id\":\"") - 1);
  w.write(messageId, strlen(messageId));
  w.write("\",\"serial_number\":\"", sizeof("\",\"serial_number\":\"") - 1);
  w.write(SERIAL_NUMBER, strlen(SERIAL_NUMBER));
  w.write("\",\"sent_at\":", sizeof("\",\"sent_at\":") - 1);
  jsonWriteUnsigned(w, sentAt);

  // Dữ liệu ECG của batch 5 giây.
  w.write(",\"ecg_signal\":[", sizeof(",\"ecg_signal\":[") - 1);
  for (int i = 0; i < NUM_SAMPLES; i++)
  {
    jsonWriteFloat(w, ecg[i]);
    if (i < NUM_SAMPLES - 1)
    {
      w.writeChar(',');
    }
  }
  w.write("]", 1);

  // Dữ liệu gia tốc 3 trục.
  w.write(",\"accel\":{\"x\":[", sizeof(",\"accel\":{\"x\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++)
  {
    jsonWriteFloat(w, ax[i]);
    if (i < MPU_NUM_SAMPLES - 1)
    {
      w.writeChar(',');
    }
  }
  w.write("],\"y\":[", sizeof("],\"y\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++)
  {
    jsonWriteFloat(w, ay[i]);
    if (i < MPU_NUM_SAMPLES - 1)
    {
      w.writeChar(',');
    }
  }
  w.write("],\"z\":[", sizeof("],\"z\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++)
  {
    jsonWriteFloat(w, az[i]);
    if (i < MPU_NUM_SAMPLES - 1)
    {
      w.writeChar(',');
    }
  }
  w.write("]}", 2); // đóng accel

  // Dữ liệu con quay 3 trục.
  w.write(",\"gyro\":{\"x\":[", sizeof(",\"gyro\":{\"x\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++)
  {
    jsonWriteFloat(w, gx[i]);
    if (i < MPU_NUM_SAMPLES - 1)
    {
      w.writeChar(',');
    }
  }
  w.write("],\"y\":[", sizeof("],\"y\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++)
  {
    jsonWriteFloat(w, gy[i]);
    if (i < MPU_NUM_SAMPLES - 1)
    {
      w.writeChar(',');
    }
  }
  w.write("],\"z\":[", sizeof("],\"z\":[") - 1);
  for (int i = 0; i < MPU_NUM_SAMPLES; i++)
  {
    jsonWriteFloat(w, gz[i]);
    if (i < MPU_NUM_SAMPLES - 1)
    {
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
    const char *messageId,
    uint64_t sentAt,
    float *ecg,
    float *ax, float *ay, float *az,
    float *gx, float *gy, float *gz)
{
  // beginPublish cần payload length chính xác, nên phải đếm trước 1 lượt.
  JsonLengthCounter counter;
  buildTelemetryJsonStream(counter, messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
  return counter.total;
}

// Stream JSON trực tiếp ra MQTT (không tạo String payload lớn trên heap).
bool streamTelemetryJson(
    const char *messageId,
    uint64_t sentAt,
    float *ecg,
    float *ax, float *ay, float *az,
    float *gx, float *gy, float *gz)
{
  // B1: Đếm chính xác payload length.
  const size_t payloadLen = calcPayloadLength(messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);

  // B2: Mở gói MQTT kiểu streaming.
  if (!mqttClient.beginPublish(uplinkTopic, static_cast<unsigned int>(payloadLen), false))
  {
    Serial.printf("beginPublish thất bại cho message_id=%s\n", messageId);
    return false;
  }

  // B3: Stream JSON từng phần, không giữ payload lớn trên heap.
  JsonMqttWriter writer(mqttClient);
  buildTelemetryJsonStream(writer, messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
  // Flush phần còn tồn trong chunk. Nếu ghi thiếu byte thì dừng ngay, không endPublish.
  bool okFlush = writer.flush();
  if (!okFlush || !writer.ok)
  {
    Serial.printf("⚠️ MQTT short write cho message_id=%s | expected_len=%u | written_len=%u | last_chunk_requested=%u | last_chunk_written=%u\n",
                  messageId,
                  static_cast<unsigned int>(payloadLen),
                  static_cast<unsigned int>(writer.totalWritten),
                  static_cast<unsigned int>(writer.lastChunkRequested),
                  static_cast<unsigned int>(writer.lastChunkWritten));
    return false;
  }

  // B4: Kết thúc publish.
  bool okEnd = mqttClient.endPublish();
  if (!okEnd)
  {
    Serial.printf("⚠️ endPublish thất bại cho message_id=%s | expected_len=%u | written_len=%u\n",
                  messageId,
                  static_cast<unsigned int>(payloadLen),
                  static_cast<unsigned int>(writer.totalWritten));
  }
  else
  {
    Serial.printf("✅ Đã gửi payload MQTT tới broker (message_id=%s, length=%u, written=%u)\n",
                  messageId,
                  static_cast<unsigned int>(payloadLen),
                  static_cast<unsigned int>(writer.totalWritten));
  }
  return okEnd;
}

// Hàm tạo message_id duy nhất theo serial + millis + counter.
// Ghi trực tiếp vào buffer cố định để không tạo nhiều String ngắn trên heap.
void makeMessageId(char *out, size_t outSize)
{
  // message_id duy nhất theo thiết bị để truy vết từng batch.
  messageCounter += 1;
  snprintf(out, outSize, "%s-%lu-%lu",
           SERIAL_NUMBER,
           static_cast<unsigned long>(millis()),
           static_cast<unsigned long>(messageCounter));
}

// Hàm tách chuỗi JSON field dạng "key":"value" cho payload ACK đơn giản.
bool extractJsonStringField(const char *jsonText, const char *key, char *outValue, size_t outSize)
{
  char pattern[32];
  snprintf(pattern, sizeof(pattern), "\"%s\":\"", key);

  const char *start = strstr(jsonText, pattern);
  if (start == nullptr)
    return false;

  const char *valueStart = start + strlen(pattern);
  const char *valueEnd = strchr(valueStart, '"');
  if (valueEnd == nullptr)
    return false;

  size_t len = static_cast<size_t>(valueEnd - valueStart);
  if (len >= outSize)
    len = outSize - 1;
  memcpy(outValue, valueStart, len);
  outValue[len] = '\0';
  return true;
}

// Hàm tách chuỗi JSON field dạng "key":true/false cho payload ACK đơn giản.
bool extractJsonBoolField(const char *jsonText, const char *key, bool &outValue)
{
  char pattern[32];
  snprintf(pattern, sizeof(pattern), "\"%s\":", key);

  const char *start = strstr(jsonText, pattern);
  if (start == nullptr)
    return false;

  const char *valueStart = start + strlen(pattern);
  if (strncmp(valueStart, "true", 4) == 0)
  {
    outValue = true;
    return true;
  }
  if (strncmp(valueStart, "false", 5) == 0)
  {
    outValue = false;
    return true;
  }
  return false;
}

// Hàm cập nhật trạng thái ACK khi nhận được message trên topic ACK của thiết bị.
void updateAckState(const char *jsonText)
{
  char messageId[MESSAGE_ID_MAX_LEN] = "";
  char status[ACK_STATUS_MAX_LEN] = "";
  bool duplicate = false;
  if (!extractJsonStringField(jsonText, "message_id", messageId, sizeof(messageId)))
    return;
  if (!extractJsonStringField(jsonText, "status", status, sizeof(status)))
    return;
  extractJsonBoolField(jsonText, "duplicate", duplicate);

  copyCString(ackMessageId, sizeof(ackMessageId), messageId);
  copyCString(ackStatus, sizeof(ackStatus), status);
  ackDuplicate = duplicate;
  ackReceived = true;
}

// Hàm callback MQTT để nhận ACK ứng dụng từ server.
void mqttCallback(char *topic, byte *payload, unsigned int length)
{
  if (strcmp(topic, ackTopic) != 0)
    return;

  // ACK payload nhỏ nên dùng buffer cố định trên stack.
  // Nếu server gửi payload bất thường quá dài thì cắt bớt để bảo vệ RAM và vẫn kết thúc chuỗi hợp lệ.
  char payloadText[ACK_PAYLOAD_MAX_LEN];
  size_t copyLen = length;
  if (copyLen >= sizeof(payloadText))
    copyLen = sizeof(payloadText) - 1;
  memcpy(payloadText, payload, copyLen);
  payloadText[copyLen] = '\0';

  Serial.printf("📥 Nhận ACK raw: %s\n", payloadText);
  updateAckState(payloadText);
}

// Hàm chờ ACK ứng dụng đúng message_id trong tối đa timeoutMs.
bool waitAppAck(const char *messageId, uint32_t timeoutMs)
{
  ackReceived = false;
  ackMessageId[0] = '\0';
  ackStatus[0] = '\0';
  ackDuplicate = false;

  const uint32_t waitStart = millis();
  while (millis() - waitStart < timeoutMs)
  {
    mqttClient.loop();
    if (ackReceived)
    {
      ackReceived = false;
      if (strcmp(ackMessageId, messageId) != 0)
      {
        // Bỏ ACK không khớp message hiện tại.
        continue;
      }
      if (strcmp(ackStatus, "ok") == 0)
      {
        Serial.printf("✅ ACK OK cho message_id=%s (duplicate=%s)\n",
                      messageId, ackDuplicate ? "true" : "false");
        return true;
      }
      Serial.printf("⚠️ ACK ERROR cho message_id=%s (status=%s)\n",
                    messageId, ackStatus);
      return false;
    }
    delay(10);
  }
  Serial.printf("⌛ ACK timeout cho message_id=%s\n", messageId);
  return false;
}

// Hàm thêm batch vào hàng đợi retry theo cơ chế FIFO.
void enqueueRetry(const char *messageId, bool useBufferAForBatch)
{
  if (retryCount >= RETRY_QUEUE_CAPACITY)
  {
    // Queue đầy: bỏ phần tử cũ nhất để nhường chỗ cho batch mới.
    retryQueue[retryHead].inUse = false;
    retryHead = (retryHead + 1) % RETRY_QUEUE_CAPACITY;
    retryCount -= 1;
  }
  copyCString(retryQueue[retryTail].messageId, sizeof(retryQueue[retryTail].messageId), messageId);
  retryQueue[retryTail].useBufferA = useBufferAForBatch;
  retryQueue[retryTail].inUse = true;
  retryTail = (retryTail + 1) % RETRY_QUEUE_CAPACITY;
  retryCount += 1;
}

// Hàm lấy một phần tử từ queue retry theo thứ tự vào trước ra trước.
bool dequeueRetry(RetryItem &outItem)
{
  if (retryCount == 0)
    return false;
  outItem = retryQueue[retryHead];
  retryQueue[retryHead].inUse = false;
  retryHead = (retryHead + 1) % RETRY_QUEUE_CAPACITY;
  retryCount -= 1;
  return true;
}

// ---------- CẤU TRÚC BỘ LỌC TƯƠNG THÍCH ĐA TẦNG ----------
typedef struct
{
  float b0, b1, b2;
  float a1, a2;
  float x1, x2; // Biến trạng thái đầu vào, dùng float để tận dụng FPU single-precision của ESP32.
  float y1, y2; // Biến trạng thái đầu ra, tránh double vì double làm tốn CPU hơn trên firmware edge.
} BiquadFilter;

// Hệ số được tính toán cho fs = 250Hz
BiquadFilter hp05 = {0.991154f, -1.982307f, 0.991154f, -1.982229f, 0.982385f, 0, 0, 0, 0};
BiquadFilter lp40 = {0.145324f, 0.290648f, 0.145324f, -0.671029f, 0.252325f, 0, 0, 0, 0};
BiquadFilter nt50 = {0.979483f, -0.605354f, 0.979483f, -0.605354f, 0.958966f, 0, 0, 0, 0};

// Hàm xử lý Biquad chung
float processBiquad(BiquadFilter *f, float x)
{
  // Công thức Direct Form I:
  // y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
  // Toàn bộ phép tính dùng float để giảm chi phí CPU; độ chính xác này đủ cho tín hiệu ECG đã scale về Volt.
  float y = f->b0 * x + f->b1 * f->x1 + f->b2 * f->x2 - f->a1 * f->y1 - f->a2 * f->y2;

  // Chống lỗi số (NaN/Inf) khi nhiễu quá lớn
  if (isnan(y) || isinf(y))
    y = f->y1;

  f->x2 = f->x1;
  f->x1 = x;
  f->y2 = f->y1;
  f->y1 = y;
  return y;
}

// Hàm lọc tổng hợp (thay thế notchFilter cũ)
float applyFullECGFilter(float x)
{
  float out = processBiquad(&hp05, x); // Khử trôi đường nền 0.5Hz
  out = processBiquad(&lp40, out);     // Khử nhiễu cơ 40Hz
  out = processBiquad(&nt50, out);     // Khử nhiễu điện lưới 50Hz
  return out;
}

// Hàm kết nối Wi-Fi và đợi đến khi có mạng.
void connectWifi()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

// Hàm đảm bảo kết nối MQTT hoạt động trước khi publish telemetry.
bool ensureMqttConnected()
{
  // Nếu đang connected thì không reconnect để tránh tốn TLS handshake.
  if (mqttClient.connected())
    return true;
  const uint32_t startAt = millis();
  while (!mqttClient.connected() && millis() - startAt < 10000)
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      connectWifi();
    }

    // Connect có username/password theo cấu hình broker cloud.
    bool ok = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);
    if (ok)
    {
      mqttClient.subscribe(ackTopic, 1);
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
bool publishSingleAttemptWithAck(const char *messageId, bool useBufferAForBatch, uint8_t attemptNo)
{
  // Chọn buffer dữ liệu tương ứng với batch cần gửi (A hoặc B).
  float *ecg = useBufferAForBatch ? ecgBufA : ecgBufB;
  float *ax = useBufferAForBatch ? accelX_A : accelX_B;
  float *ay = useBufferAForBatch ? accelY_A : accelY_B;
  float *az = useBufferAForBatch ? accelZ_A : accelZ_B;
  float *gx = useBufferAForBatch ? gyroX_A : gyroX_B;
  float *gy = useBufferAForBatch ? gyroY_A : gyroY_B;
  float *gz = useBufferAForBatch ? gyroZ_A : gyroZ_B;

  // Đo riêng connect_ms để tách nghẽn do reconnect khỏi nghẽn do publish.
  unsigned long connectStartMs = millis();
  bool connected = ensureMqttConnected();
  unsigned long connectDurationMs = millis() - connectStartMs;
  if (!connected)
  {
    Serial.printf("⚠️ Không thể kết nối MQTT để gửi message_id=%s | connect_ms=%lu\n",
                  messageId, connectDurationMs);
    return false;
  }

  // Đo riêng publish_ms để theo dõi hiệu quả tối ưu stream/chunk.
  unsigned long publishStartMs = millis();
  const uint64_t sentAt = millis();
  bool published = streamTelemetryJson(messageId, sentAt, ecg, ax, ay, az, gx, gy, gz);
  unsigned long publishDurationMs = millis() - publishStartMs;
  Serial.printf("📊 MQTT timing message_id=%s | attempt=%u | connect_ms=%lu | publish_ms=%lu\n",
                messageId, static_cast<unsigned int>(attemptNo), connectDurationMs, publishDurationMs);
  if (!published)
    return false;
  return waitAppAck(messageId, ACK_TIMEOUT_MS);
}

// Hàm retry gửi telemetry tối đa MAX_RETRY lần theo logic ACK ban đầu.
bool publishWithRetry(const char *messageId, bool useBufferAForBatch)
{
  for (uint8_t attempt = 1; attempt <= MAX_RETRY; attempt++)
  {
    if (publishSingleAttemptWithAck(messageId, useBufferAForBatch, attempt))
    {
      return true;
    }
    delay(120);
  }
  return false;
}

// Hàm thử gửi lại một batch từ queue retry mỗi vòng gửi để tránh nghẽn dài.
void drainRetryQueue()
{
  if (retryCount == 0)
    return;
  RetryItem item;
  if (!dequeueRetry(item))
    return;
  if (!item.inUse)
    return;

  bool ok = publishWithRetry(item.messageId, item.useBufferA);
  if (!ok)
  {
    enqueueRetry(item.messageId, item.useBufferA);
    Serial.printf("↩️ Retry queue requeue: %s | queue=%u\n",
                  item.messageId, static_cast<unsigned int>(retryCount));
  }
  else
  {
    Serial.printf("✅ Retry queue delivered: %s\n", item.messageId);
  }
}

// Hàm thu mẫu ECG + MPU vào double buffer và báo sẵn sàng cho task gửi.
void sensorTask(void *param)
{
  unsigned long lastECG = micros();
  unsigned long lastMPU = micros();
  TickType_t lastWakeTick = xTaskGetTickCount();
  int ecgIdx = 0;
  int mpuIdx = 0;

  // Chu kỳ lấy mẫu theo micro-second để giữ nhịp thời gian chính xác.
  const unsigned long ecgInterval = 1000000UL / SAMPLE_RATE_ECG;
  const unsigned long mpuInterval = 1000000UL / MPU_SAMPLE_RATE;
  // Wake mỗi 1ms để kiểm tra lịch lấy mẫu nhưng không busy-loop 100% CPU.
  // ECG 250Hz có chu kỳ 4ms, nên tick 1ms cho jitter nhỏ hơn so với ngủ thẳng 4ms.
  const TickType_t sensorWakeTicks = pdMS_TO_TICKS(1) > 0 ? pdMS_TO_TICKS(1) : 1;

  while (true)
  {
    unsigned long currentMicros = micros();

    if ((currentMicros - lastECG) >= ecgInterval)
    {
      lastECG += ecgInterval;
      if (ecgIdx < NUM_SAMPLES)
      {
        int ecgRaw = analogRead(ECG_PIN);
        float v = ((float)ecgRaw / 4095.0f) * 3.3f - 1.65f;
        v = applyFullECGFilter(v);
        if (useBufferA)
          ecgBufA[ecgIdx] = v;
        else
          ecgBufB[ecgIdx] = v;
        ecgIdx++;
      }
    }

    if ((currentMicros - lastMPU) >= mpuInterval)
    {
      lastMPU += mpuInterval;
      if (mpuIdx < MPU_NUM_SAMPLES)
      {
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        if (useBufferA)
        {
          accelX_A[mpuIdx] = a.acceleration.x;
          accelY_A[mpuIdx] = a.acceleration.y;
          accelZ_A[mpuIdx] = a.acceleration.z;
          gyroX_A[mpuIdx] = g.gyro.x;
          gyroY_A[mpuIdx] = g.gyro.y;
          gyroZ_A[mpuIdx] = g.gyro.z;
        }
        else
        {
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
    if (ecgIdx >= NUM_SAMPLES && mpuIdx >= MPU_NUM_SAMPLES)
    {
      useBufferA = !useBufferA;
      ecgIdx = 0;
      mpuIdx = 0;
      xSemaphoreGive(readySemaphore);
    }

    // Nhường CPU cho WiFi/TLS/MQTT và các task hệ thống.
    // vTaskDelayUntil giữ chu kỳ thức dậy đều hơn delay(1), giúp giảm CPU/power mà vẫn bám lịch micros ở trên.
    vTaskDelayUntil(&lastWakeTick, sensorWakeTicks);
  }
}

// Hàm gửi telemetry từ buffer đã đầy bằng MQTT + ACK + retry.
void senderTask(void *param)
{
  const TickType_t idleWaitTicks = pdMS_TO_TICKS(250);
  const uint32_t mqttLoopIntervalMs = 200;
  const uint32_t reconnectIntervalMs = 1000;
  const uint32_t retryDrainIntervalMs = 750;

  uint32_t lastMqttLoopMs = 0;
  uint32_t lastReconnectMs = 0;
  uint32_t lastRetryDrainMs = 0;
  uint32_t lastRuntimeStatsMs = 0;

  while (true)
  {
    // Block lâu hơn để giảm wake-up CPU vô ích; vẫn thức dậy định kỳ để nuôi keepalive MQTT.
    if (xSemaphoreTake(readySemaphore, idleWaitTicks) != pdTRUE) // 250ms check 1 lần, ko chiếm cpu
    {
      const uint32_t nowMs = millis();

      if (mqttClient.connected())
      {
        // loop() không cần gọi dày 20ms; nhịp 200ms vẫn đủ cho keepalive nhưng tiết kiệm điện hơn.
        if (nowMs - lastMqttLoopMs >= mqttLoopIntervalMs)
        {
          mqttClient.loop();
          lastMqttLoopMs = nowMs;
        }
      }
      else if (nowMs - lastReconnectMs >= reconnectIntervalMs)
      {
        // Giãn reconnect để tránh dựng lại TLS quá thường xuyên khi đang rớt mạng.
        ensureMqttConnected();
        lastReconnectMs = nowMs;
      }

      // Khi rảnh vẫn drain retry queue theo nhịp vừa phải, không polling liên tục.
      if (retryCount > 0 && nowMs - lastRetryDrainMs >= retryDrainIntervalMs)
      {
        drainRetryQueue();
        lastRetryDrainMs = nowMs;
      }

      if (nowMs - lastRuntimeStatsMs >= RUNTIME_STATS_INTERVAL_MS)
      {
        logRuntimeStats("sender idle");
        lastRuntimeStatsMs = nowMs;
      }
      continue;
    }

    // Nếu Sensor đang dùng A -> batch vừa đầy nằm trong buffer B (và ngược lại).
    bool sendA = !useBufferA;

    // Tạo message_id duy nhất cho batch này.
    char messageId[MESSAGE_ID_MAX_LEN];
    makeMessageId(messageId, sizeof(messageId));
    // duration_ms là thời gian tổng của một lần gửi batch (gồm connect nếu có).
    unsigned long sendStartMs = millis();

    // Gửi batch theo cơ chế retry ACK chuẩn.
    // cần delay 1 chút để plush nốt phần data cuối
    delay(500); // delay không chiếm cpu
    bool ok = publishWithRetry(messageId, sendA);
    unsigned long sendDurationMs = millis() - sendStartMs;
    if (!ok)
    {
      enqueueRetry(messageId, sendA);
      Serial.printf("⚠️ Publish/ACK fail, đã đưa vào queue: %s | duration_ms=%lu | queue=%u\n",
                    messageId, sendDurationMs, static_cast<unsigned int>(retryCount));
    }
    else
    {
      Serial.printf("Publish ok: %s | duration_ms=%lu\n", messageId, sendDurationMs);
    }

    // Mỗi vòng gửi xong sẽ thử đẩy thêm 1 phần tử từ retry queue.
    drainRetryQueue();
    lastMqttLoopMs = millis();
    lastRetryDrainMs = lastMqttLoopMs;
    if (lastMqttLoopMs - lastRuntimeStatsMs >= RUNTIME_STATS_INTERVAL_MS)
    {
      logRuntimeStats("sender after publish");
      lastRuntimeStatsMs = lastMqttLoopMs;
    }
  }
}

// Hàm khởi tạo toàn bộ phần cứng và tạo task thu/gửi dữ liệu.
void setup()
{
  Serial.begin(115200);
  buildMqttTopics();
  logRuntimeStats("setup start");
  analogReadResolution(12);

  pinMode(SDN_PIN, OUTPUT);
  digitalWrite(SDN_PIN, LOW);

  if (!mpu.begin())
  {
    Serial.println("MPU6050 not found");
    while (true)
      delay(100);
  }
  Serial.println("MPU6050 Ready");
  // Tăng I2C lên 400kHz sau khi MPU đã init để giảm thời gian đọc 6 trục trong sensorTask.
  // Nếu dây dài/nhiễu làm đọc sai thì hạ lại 100kHz để đổi lấy độ ổn định bus.
  Wire.setClock(400000);
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  connectWifi();
  logRuntimeStats("after wifi");

  // Demo/dev mode: bỏ verify cert để dễ chạy nhanh.
  // Khi production nên dùng CA cert thay vì setInsecure().
  secureClient.setInsecure();
  // Tắt Nagle để giảm trễ với luồng ghi nhiều chunk.
  // secureClient.setNoDelay(true);
  mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
  // Buffer MQTT chỉ cần vừa phải vì payload đã stream dần, không cần chứa toàn bộ JSON.
  // Giữ 1024 byte để đủ cho topic/header/ACK nhưng trả lại khoảng 7KB heap so với 8192.
  mqttClient.setBufferSize(MQTT_CLIENT_BUFFER_SIZE);
  mqttClient.setCallback(mqttCallback);
  ensureMqttConnected();
  logRuntimeStats("after mqtt");

  readySemaphore = xSemaphoreCreateBinary();

  xTaskCreatePinnedToCore(sensorTask, "SensorTask", 8192, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(senderTask, "SenderTask", 16384, NULL, 1, NULL, 0);
}

// Hàm loop chính không dùng, toàn bộ xử lý nằm trong các FreeRTOS task.
void loop()
{
  // Kiến trúc này dùng FreeRTOS task, loop() không còn nhiệm vụ.
  vTaskDelete(NULL);
}
