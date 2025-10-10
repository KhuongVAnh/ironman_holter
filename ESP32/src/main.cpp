#include <WiFi.h>
#include <HTTPClient.h>
#include <math.h>

// ====================== CẤU HÌNH WI-FI ======================
const char *ssid = "LOFI 108 Le Thanh Nghi"; // 🔧 Thay bằng SSID thật
const char *password = "camonquykhach";      // 🔧 Thay bằng password thật

// ====================== CẤU HÌNH SERVER ======================
const char *serverURL = "http://192.168.1.163:8888/api/readings/telemetry"; // 🔧 Địa chỉ backend Node.js

// ====================== CẤU HÌNH HỆ THỐNG ======================
#define ECG_PIN 34
#define FS 250           // Tần số lấy mẫu (Hz)
#define BUFFER_SIZE 1250 // 5s × 250Hz
#define DEVICE_ID "device_1"

hw_timer_t *timer = NULL;
portMUX_TYPE timerMux = portMUX_INITIALIZER_UNLOCKED;

volatile bool sampleFlag = false;
float ecgBuffer[BUFFER_SIZE];
int bufferIndex = 0;

// ====================== CẤU TRÚC BỘ LỌC ======================
struct Biquad
{
  float b0, b1, b2, a1, a2;
  float x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  float process(float x)
  {
    float y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  }
};

// Khai báo bộ lọc
Biquad highpass;
Biquad notch;
Biquad lowpass;

// ====================== NGẮT TIMER 4 ms (250 Hz) ======================
void IRAM_ATTR onTimer()
{
  portENTER_CRITICAL_ISR(&timerMux);
  sampleFlag = true;
  portEXIT_CRITICAL_ISR(&timerMux);
}

// ====================== KẾT NỐI WI-FI ======================
void setupWiFi()
{
  Serial.print("🔌 Kết nối Wi-Fi tới: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Wi-Fi đã kết nối!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// ====================== GỬI DỮ LIỆU LÊN SERVER ======================
void sendDataToServer(float *data, int length, float hr)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("⚠️ Mất kết nối Wi-Fi, bỏ qua gói này.");
    return;
  }

  String json = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"heart_rate\":" + String(hr) + ",\"ecg_signal\":[";
  for (int i = 0; i < length; i++)
  {
    json += String(data[i], 4);
    if (i < length - 1)
      json += ",";
  }
  json += "]}";

  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(json);

  if (code > 0)
    Serial.printf("📡 Gửi thành công! Mã phản hồi: %d\n", code);
  else
    Serial.printf("❌ Gửi thất bại! Lỗi: %d\n", code);

  http.end();
}

// ====================== SETUP ======================
void setup()
{
  Serial.begin(115200);
  setupWiFi();

  // ===== Khởi tạo bộ lọc High-pass (0.5 Hz) =====
  highpass.b0 = 0.995;
  highpass.b1 = -1.99;
  highpass.b2 = 0.995;
  highpass.a1 = -1.99;
  highpass.a2 = 0.99;

  // ===== Khởi tạo bộ lọc Notch (50 Hz) =====
  float f0 = 50.0;
  float r = 0.95;
  float w0 = 2 * PI * f0 / FS;
  notch.b0 = 1.0;
  notch.b1 = -2 * cos(w0);
  notch.b2 = 1.0;
  notch.a1 = -2 * r * cos(w0);
  notch.a2 = r * r;

  // ===== Khởi tạo bộ lọc Low-pass (40 Hz) =====
  lowpass.b0 = 0.1311;
  lowpass.b1 = 0.2622;
  lowpass.b2 = 0.1311;
  lowpass.a1 = -0.7478;
  lowpass.a2 = 0.2722;

  // ===== Bật timer lấy mẫu 250 Hz =====
  timer = timerBegin(0, 80, true); // Prescaler 80 → 1 tick = 1 µs
  timerAttachInterrupt(timer, &onTimer, true);
  timerAlarmWrite(timer, 4000, true); // 4000 µs = 4 ms
  timerAlarmEnable(timer);

  Serial.println("✅ Bắt đầu lấy tín hiệu ECG @250 Hz với 3 bộ lọc DSP...");
}

// ====================== LOOP ======================
void loop()
{
  if (sampleFlag)
  {
    portENTER_CRITICAL(&timerMux);
    sampleFlag = false;
    portEXIT_CRITICAL(&timerMux);

    // ---- 1️⃣ Đọc tín hiệu từ AD8232 ----
    int raw = analogRead(ECG_PIN);
    float voltage = (raw / 4095.0) * 3.3; // 0–3.3 V
    float centered = voltage - 1.65;      // Dịch baseline về 0 V

    // ---- 2️⃣ Lọc qua 3 tầng ----
    float y1 = highpass.process(centered);
    float y2 = notch.process(y1);
    float y3 = lowpass.process(y2);

    // ---- 3️⃣ Lưu vào buffer ----
    ecgBuffer[bufferIndex++] = y3;

    // ---- 4️⃣ Gửi mỗi 5 giây ----
    if (bufferIndex >= BUFFER_SIZE)
    {
      Serial.println("🚀 Đã thu đủ 5 s dữ liệu, gửi lên server...");
      float hr = 75.0; // Tạm, sẽ thay bằng HR thật sau
      sendDataToServer(ecgBuffer, BUFFER_SIZE, hr);
      bufferIndex = 0;
    }
  }
}
