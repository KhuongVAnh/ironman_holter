#include <WiFi.h>
#include <HTTPClient.h>
#include <Arduino.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
// #include <ArduinoJson.h>
// #include "soc/soc.h"
// #include "soc/rtc_cntl_reg.h"

// ---------- CẤU HÌNH ----------
const char *ssid = "Nhan Home";
const char *password = "nhanhome";
const char *serverUrl = "http://192.168.1.139:5000/api/readings/telemetry";
const char *serialNumber = "SN-ECG-0001";

#define ECG_PIN 34
#define SDN_PIN 25

#define SAMPLE_RATE 250
#define DURATION 5
#define NUM_SAMPLES (SAMPLE_RATE * DURATION)

#define MPU_SAMPLE_RATE 50
#define MPU_NUM_SAMPLES (MPU_SAMPLE_RATE * DURATION)

Adafruit_MPU6050 mpu;

// Buffer toàn cục
float ecgBufA[NUM_SAMPLES];
float ecgBufB[NUM_SAMPLES];

// MPU buffers (gộp chung struct cho gọn nếu muốn, ở đây giữ nguyên mảng rời)
float accelX_A[MPU_NUM_SAMPLES];
float accelY_A[MPU_NUM_SAMPLES];
float accelZ_A[MPU_NUM_SAMPLES];
float gyroX_A[MPU_NUM_SAMPLES];
float gyroY_A[MPU_NUM_SAMPLES];
float gyroZ_A[MPU_NUM_SAMPLES];

float accelX_B[MPU_NUM_SAMPLES];
float accelY_B[MPU_NUM_SAMPLES];
float accelZ_B[MPU_NUM_SAMPLES];
float gyroX_B[MPU_NUM_SAMPLES];
float gyroY_B[MPU_NUM_SAMPLES];
float gyroZ_B[MPU_NUM_SAMPLES];

char *payloadBuf; // toàn cục
size_t bufSize;

// Cờ quản lý buffer
volatile bool useBufferA = true;

// Semaphore để báo hiệu "Đã có dữ liệu đầy"
SemaphoreHandle_t readySemaphore;

// ---------- BỘ LỌC NOTCH 50Hz ----------
float x1_ = 0, x2_ = 0;
float y1_ = 0, y2_ = 0;
const float b0 = 0.9723, b1 = -1.8478, b2 = 0.9723;
const float a1 = -1.8478, a2 = 0.9446;

float notchFilter(float x)
{
  float y = b0 * x + b1 * x1_ + b2 * x2_ - a1 * y1_ - a2 * y2_;
  x2_ = x1_;
  x1_ = x;
  y2_ = y1_;
  y1_ = y;
  return y;
}

// hàm tính dung lương json
size_t calcJsonCapacity(int ecgRate, int mpuRate, int durationSec)
{
  int ecgSamples = ecgRate * durationSec;
  int mpuSamples = mpuRate * durationSec;

  // Mỗi mẫu ~ 6 byte số + 1 byte dấu phẩy
  size_t ecgSize = ecgSamples * 7;
  size_t mpuSize = mpuSamples * 7 * 6; // 6 trục

  size_t overhead = 3000; // key, ngoặc, meta, margin

  size_t raw = ecgSize + mpuSize + overhead;

  return raw + 2048; // thêm 2KB cho chắc
}

// ---------- TASK 1: Sensor reading (Core 1) ----------
void SensorTask(void *param)
{
  unsigned long lastECG = micros();
  unsigned long lastMPU = micros();
  int ecgIdx = 0, mpuIdx = 0;

  // Chu kỳ tính bằng micros
  const unsigned long ecgInterval = 1000000 / SAMPLE_RATE;
  const unsigned long mpuInterval = 1000000 / MPU_SAMPLE_RATE;

  while (true)
  {
    unsigned long currentMicros = micros();

    // --- Đọc ECG ---
    if ((currentMicros - lastECG) >= ecgInterval)
    {
      lastECG += ecgInterval;

      if (ecgIdx < NUM_SAMPLES)
      {
        int ecgValue = analogRead(ECG_PIN);
        float V = ((float)ecgValue / 4095.0f) * 3.3f - 1.65f;
        V = notchFilter(V);

        // Ghi trực tiếp, không cần Mutex vì Sender đang đọc buffer kia
        if (useBufferA)
          ecgBufA[ecgIdx] = V;
        else
          ecgBufB[ecgIdx] = V;

        ecgIdx++;
      }
    }

    // --- Đọc MPU ---
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

    // --- Kiểm tra đầy buffer ---
    if (ecgIdx >= NUM_SAMPLES && mpuIdx >= MPU_NUM_SAMPLES)
    {
      // Swap buffer
      useBufferA = !useBufferA;

      // Reset index
      ecgIdx = 0;
      mpuIdx = 0;

      // Reset filter (SỬA LỖI SCOPE)
      // x1_ = 0;
      // x2_ = 0;
      // y1_ = 0;
      // y2_ = 0;

      // Đánh thức SenderTask ngay lập tức
      xSemaphoreGive(readySemaphore); // tăng semaphore lên 1
    }

    // Delay cực ngắn hoặc taskYIELD để tránh watchdog cắn, nhưng đảm bảo realtime
    // vTaskDelay(1) ở đây có thể làm lỡ nhịp nếu sensor đọc chậm.
    // Tốt nhất dùng delay(0) hoặc taskYIELD()
  }
}

// ---------- TASK 2: SENDER HTTP (CORE 0) ----------
// Nhiệm vụ: Đóng gói JSON và gửi HTTP (Tốn thời gian)

inline void floatTo6(char *dst, float v)
{
  char tmp[24];
  // width = 0 -> không padding, precision = 6 cho dư dữ liệu
  dtostrf(v, 0, 6, tmp);

  // copy tối đa 6 ký tự đầu
  int i = 0;
  while (i < 6 && tmp[i] != '\0')
  {
    dst[i] = tmp[i];
    i++;
  }
  // nếu ít hơn 6 ký tự -> pad bằng '0'
  while (i < 6)
  {
    dst[i] = '0';
    i++;
  }
}

// -------------------------------------------------------
//  Build JSON thủ công với buffer trong PSRAM
//  Tái tạo đúng cấu trúc:
//
//  {
//    "ecg_signal": [...],
//    "accel": { "x": [...], "y": [...], "z": [...] },
//    "gyro":  { "x": [...], "y": [...], "z": [...] },
//    "sampling_rate": { "ecg_hz": 250, "mpu_hz": 50, "duration": 5 }
//  }
// -------------------------------------------------------

size_t buildPayloadToBufferFast_6byte(
    char *buf, size_t bufSize,
    const char *deviceSerialNumber,
    float *ecg, int ecgCount,
    float *ax, float *ay, float *az,
    float *gx, float *gy, float *gz,
    int mpuCount,
    int ecgHz, int mpuHz, int duration)
{
  size_t pos = 0;

  auto WRITE = [&](const char *s)
  {
    size_t len = strlen(s);
    if (pos + len >= bufSize)
      return;
    memcpy(buf + pos, s, len);
    pos += len;
  };

  char num[8]; // "xx.xx\0" tối đa 7 ký tự

  WRITE("{");
  WRITE("\"serial_number\":\"");
  WRITE(deviceSerialNumber ? deviceSerialNumber : "");
  WRITE("\",");

  // ---------- ECG ----------
  WRITE("\"ecg_signal\":[");
  for (int i = 0; i < ecgCount; i++)
  {
    floatTo6(num, ecg[i]); // 6 bytes
    memcpy(buf + pos, num, 6);
    pos += 6;
    if (i < ecgCount - 1)
    {
      buf[pos++] = ',';
    }
  }
  WRITE("],");

  // ---------- ACCEL ----------
  WRITE("\"accel\":{");

  // ax
  WRITE("\"x\":[");
  for (int i = 0; i < mpuCount; i++)
  {
    floatTo6(num, ax[i]);
    memcpy(buf + pos, num, 6);
    pos += 6;
    if (i < mpuCount - 1)
      buf[pos++] = ',';
  }
  WRITE("],");

  // ay
  WRITE("\"y\":[");
  for (int i = 0; i < mpuCount; i++)
  {
    floatTo6(num, ay[i]);
    memcpy(buf + pos, num, 6);
    pos += 6;
    if (i < mpuCount - 1)
      buf[pos++] = ',';
  }
  WRITE("],");

  // az
  WRITE("\"z\":[");
  for (int i = 0; i < mpuCount; i++)
  {
    floatTo6(num, az[i]);
    memcpy(buf + pos, num, 6);
    pos += 6;
    if (i < mpuCount - 1)
      buf[pos++] = ',';
  }
  WRITE("]},"); // end accel

  // ---------- GYRO ----------
  WRITE("\"gyro\":{");

  // gx
  WRITE("\"x\":[");
  for (int i = 0; i < mpuCount; i++)
  {
    floatTo6(num, gx[i]);
    memcpy(buf + pos, num, 6);
    pos += 6;
    if (i < mpuCount - 1)
      buf[pos++] = ',';
  }
  WRITE("],");

  // gy
  WRITE("\"y\":[");
  for (int i = 0; i < mpuCount; i++)
  {
    floatTo6(num, gy[i]);
    memcpy(buf + pos, num, 6);
    pos += 6;
    if (i < mpuCount - 1)
      buf[pos++] = ',';
  }
  WRITE("],");

  // gz
  WRITE("\"z\":[");
  for (int i = 0; i < mpuCount; i++)
  {
    floatTo6(num, gz[i]);
    memcpy(buf + pos, num, 6);
    pos += 6;
    if (i < mpuCount - 1)
      buf[pos++] = ',';
  }
  WRITE("]},");

  // ---------- Metadata ----------
  char meta[64];
  int n = snprintf(meta, sizeof(meta),
                   "\"sampling_rate\":{\"ecg_hz\":%d,\"mpu_hz\":%d,\"duration\":%d}",
                   ecgHz, mpuHz, duration);

  memcpy(buf + pos, meta, n);
  pos += n;

  WRITE("}");

  return pos;
}

void SenderTask(void *param)
{
  while (true)
  {
    // CHỜ TÍN HIỆU TỪ SENSOR TASK
    // Task này sẽ ngủ đông (Blocked) cho đến khi SensorTask gọi xSemaphoreGive
    xSemaphoreTake(readySemaphore, portMAX_DELAY);
    unsigned long startTime = millis();

    // Xác định Buffer cần gửi
    // Nếu Sensor đang dùng A -> nghĩa là vừa ghi xong B -> Gửi B
    // Nếu Sensor đang dùng B -> nghĩa là vừa ghi xong A -> Gửi A
    bool sendA = !useBufferA;

    // Trỏ con trỏ vào vùng nhớ cần gửi
    float *ecg = sendA ? ecgBufA : ecgBufB;
    float *ax = sendA ? accelX_A : accelX_B;
    float *ay = sendA ? accelY_A : accelY_B;
    float *az = sendA ? accelZ_A : accelZ_B;
    float *gx = sendA ? gyroX_A : gyroX_B;
    float *gy = sendA ? gyroY_A : gyroY_B;
    float *gz = sendA ? gyroZ_A : gyroZ_B;

    // build JSON vào buffer PSRAM đã cấp phát
    size_t len = buildPayloadToBufferFast_6byte(
        payloadBuf, bufSize,
        serialNumber,
        ecg, NUM_SAMPLES,
        ax, ay, az,
        gx, gy, gz,
        MPU_NUM_SAMPLES,
        SAMPLE_RATE, MPU_SAMPLE_RATE, DURATION);

    // --- Gửi HTTP ---
    if (WiFi.status() == WL_CONNECTED)
    {
      HTTPClient http;
      // Tăng timeout nếu gói tin lớn
      http.setTimeout(5000);

      http.begin(serverUrl);
      http.addHeader("Content-Type", "application/json");

      int code = http.POST((uint8_t *)payloadBuf, len);
      http.end();

      unsigned long duration = millis() - startTime;
      Serial.printf("📡 POST [Batch %s] Size: %d bytes -> Time: %lu ms -> Code: %d\n",
                    sendA ? "A" : "B", len, duration, code);
    }
    else
    {
      Serial.println("⚠️ WiFi Disconnected, skipping send");
    }

    // Task sẽ tự quay lại đầu vòng lặp while và chờ Semaphore tiếp theo
    // delay để không chiếm cpu
  }
}

void setup()
{
  // Tắt bộ phát hiện sụt áp ngay dòng đầu tiên của setup
  // WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(9600); // Nên dùng 115200 cho nhanh
  analogReadResolution(12);

  pinMode(SDN_PIN, OUTPUT);
  digitalWrite(SDN_PIN, LOW);

  // --- Kết nối WiFi ---
  WiFi.begin(ssid, password);
  Wire.setClock(400000);

  // Giảm công suất phát xuống mức thấp hơn (WIFI_POWER_8_5dBm hoặc WIFI_POWER_11dBm)
  // Mặc định là 19.5dBm (rất ngốn điện)
  // hi sinh tầm ra hoạt động của wifi
  // WiFi.setTxPower(WIFI_POWER_8_5dBm);

  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n WiFi connected");

  // --- Khởi động MPU6050 ---
  if (!mpu.begin())
  {
    Serial.println("MPU6050 not found!");
    while (1)
      delay(100);
  }
  Serial.println("MPU6050 Ready");
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // --- Khởi tạo Semaphore ---
  // Tạo Binary Semaphore, ban đầu là Empty (0) -> SenderTask sẽ chờ
  readySemaphore = xSemaphoreCreateBinary();

  bufSize = calcJsonCapacity(SAMPLE_RATE, MPU_SAMPLE_RATE, DURATION);
  payloadBuf = (char *)malloc(bufSize);

  if (!payloadBuf)
  {
    Serial.println("Không cấp phát được PSRAM!");
    while (1)
      delay(100);
  }

  // --- Khởi tạo Tasks ---

  // Task 1: SensorTask chạy trên Core 1 (App Core - Ít việc hệ thống hơn)
  // Stack size: 8192 bytes (8KB) là đủ cho việc đọc sensor
  xTaskCreatePinnedToCore(SensorTask, "SensorTask", 8192, NULL, 2, NULL, 1);

  // Task 2: SenderTask chạy trên Core 0 (Pro Core - Chạy WiFi/BT)
  // Stack size: Tăng lên 16KB (16384) vì xử lý JSON lớn rất tốn bộ nhớ Stack
  xTaskCreatePinnedToCore(SenderTask, "SenderTask", 16384, NULL, 1, NULL, 0);
}

void loop()
{
  // Loop chính không làm gì cả, xóa đi để tiết kiệm RAM
  vTaskDelete(NULL);
}